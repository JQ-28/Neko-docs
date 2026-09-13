// 机器人状态：上报方 POST 快照，文档站前端 GET 合并展示
// 上报凭据复用 Pages 机密 API_TOKEN：Authorization: Bearer <API_TOKEN>
//
// 两个来源分开存储、互不覆盖，避免 nonebot 一挂就全站静默：
//   nonebot —— 上报账号在线情况与当日收发消息数（只有它能从 get_bots() 拿到真实连接状态）
//   watchdog —— 独立进程，上报 TCP/进程探测结果（含 nonebot 自身端口）与硬件读数，不依赖 nonebot

// 上报间隔 60 秒，容 2 次丢包；超过该时长未收到上报即视为「状态未知」
const STALE_SECONDS = 120;

const ACCOUNT_SOURCE = "nonebot";
const SERVICE_SOURCE = "watchdog";

// 账号以 nonebot 为准，服务以 watchdog 为准；前者缺失时退回另一来源
const ACCOUNT_SOURCE_ORDER = [ACCOUNT_SOURCE, SERVICE_SOURCE] as const;
const SERVICE_SOURCE_ORDER = [SERVICE_SOURCE, ACCOUNT_SOURCE] as const;

const SOURCES = new Set<string>([ACCOUNT_SOURCE, SERVICE_SOURCE]);

// 前端要展示的硬件读数，键与看门狗上报字段一一对应
const HARDWARE_KEYS = [
  "cpuTemp",
  "cpuLoad",
  "cpuPower",
  "gpuTemp",
  "uptime",
  "processes",
] as const;

type HardwareKey = (typeof HARDWARE_KEYS)[number];
type HardwareMetrics = Partial<Record<HardwareKey, number>>;

const TABLE_DDL = `CREATE TABLE IF NOT EXISTS bot_status (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)`;

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
};

interface StatusEntry {
  online: boolean;
  // 连续在线的起点（Unix 秒），前端据此显示「已运行 N 小时」；离线为 0
  since: number;
  // 今日收到的消息数与发出的消息数，仅 nonebot 上报的账号有值
  received: number;
  sent: number;
}

interface StatusSnapshot {
  accounts: Record<string, StatusEntry>;
  services: Record<string, StatusEntry>;
  hardware: HardwareMetrics | null;
  updatedAt: number;
}

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  run(): Promise<unknown>;
  all<T>(): Promise<{ results?: T[] }>;
}

interface StatusEnv {
  DB: { prepare(query: string): D1Statement };
  API_TOKEN: string;
}

interface StatusContext {
  request: Request;
  env: StatusEnv;
}

let schemaReady = false;

async function ensureSchema(db: StatusEnv["DB"]): Promise<void> {
  if (schemaReady) return;
  await db.prepare(TABLE_DDL).run();
  schemaReady = true;
}

function jsonResponse(body: unknown, status = 200, cacheControl?: string): Response {
  const headers: Record<string, string> = { ...JSON_HEADERS };
  if (cacheControl) headers["Cache-Control"] = cacheControl;
  return new Response(JSON.stringify(body), { status, headers });
}

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toCount(value: unknown): number | undefined {
  const count = toNumber(value);
  return count === undefined ? undefined : Math.max(Math.floor(count), 0);
}

function toHardwareMetrics(value: unknown): HardwareMetrics | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const metrics: HardwareMetrics = {};
  for (const key of HARDWARE_KEYS) {
    const metric = toNumber(record[key]);
    if (metric !== undefined) metrics[key] = metric;
  }
  return Object.keys(metrics).length > 0 ? metrics : null;
}

// 落库快照可能是旧版布尔值（部署后尚未重新上报），统一规整成 StatusEntry
function normalizeEntries(value: unknown): Record<string, StatusEntry> {
  if (!value || typeof value !== "object") return {};
  return Object.entries(value as Record<string, unknown>).reduce<
    Record<string, StatusEntry>
  >((map, [key, raw]) => {
    if (typeof raw === "boolean") {
      map[key] = { online: raw, since: 0, received: 0, sent: 0 };
    } else if (raw && typeof raw === "object") {
      const entry = raw as Record<string, unknown>;
      map[key] = {
        online: entry.online === true,
        since: toCount(entry.since) ?? 0,
        received: toCount(entry.received) ?? 0,
        sent: toCount(entry.sent) ?? 0,
      };
    }
    return map;
  }, {});
}

function parseSnapshot(payload: string | undefined, updatedAt: number): StatusSnapshot {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(payload ?? "{}") as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  return {
    accounts: normalizeEntries(parsed.accounts),
    services: normalizeEntries(parsed.services),
    hardware: toHardwareMetrics(parsed.hardware),
    updatedAt,
  };
}

// 把上报数组转成以业务键为索引的快照；since 沿用上一轮的值以累计连续在线时长
function toEntries(
  items: unknown,
  keyName: string,
  now: number,
  previous: Record<string, StatusEntry>
): Record<string, StatusEntry> {
  if (!Array.isArray(items)) return {};
  return items.reduce<Record<string, StatusEntry>>((map, item) => {
    if (!item || typeof item !== "object") return map;
    const record = item as Record<string, unknown>;
    const key = record[keyName];
    if (typeof key !== "string" || !key) return map;
    const online = record.online === true;
    const last = previous[key];
    map[key] = {
      online,
      // 上一轮在线且带有效起点才沿用；since 为 0（旧布尔格式或从未在线）时以当前时间重新起算
      since: online ? (last?.online && last.since > 0 ? last.since : now) : 0,
      received: toCount(record.received) ?? last?.received ?? 0,
      sent: toCount(record.sent) ?? last?.sent ?? 0,
    };
    return map;
  }, {});
}

async function readSnapshot(db: StatusEnv["DB"], source: string): Promise<StatusSnapshot> {
  const { results } = await db
    .prepare("SELECT payload FROM bot_status WHERE id = ?")
    .bind(source)
    .all<{ payload: string }>();
  return parseSnapshot(results?.[0]?.payload, 0);
}

async function readSnapshots(db: StatusEnv["DB"]): Promise<Record<string, StatusSnapshot>> {
  const { results } = await db
    .prepare("SELECT id, payload, updated_at FROM bot_status")
    .all<{ id: string; payload: string; updated_at: number }>();

  return (results ?? []).reduce<Record<string, StatusSnapshot>>((map, row) => {
    map[row.id] = parseSnapshot(row.payload, Number(row.updated_at) || 0);
    return map;
  }, {});
}

function resolveField(
  snapshots: Record<string, StatusSnapshot>,
  order: readonly string[],
  field: "accounts" | "services"
): { data: Record<string, StatusEntry>; updatedAt: number } {
  for (const source of order) {
    const snapshot = snapshots[source];
    if (snapshot && Object.keys(snapshot[field]).length > 0) {
      return { data: snapshot[field], updatedAt: snapshot.updatedAt };
    }
  }
  return { data: {}, updatedAt: 0 };
}

function resolveHardware(
  snapshots: Record<string, StatusSnapshot>,
  order: readonly string[]
): { data: HardwareMetrics | null; updatedAt: number } {
  for (const source of order) {
    const snapshot = snapshots[source];
    if (snapshot?.hardware) {
      return { data: snapshot.hardware, updatedAt: snapshot.updatedAt };
    }
  }
  return { data: null, updatedAt: 0 };
}

export const onRequestPost = async (context: StatusContext) => {
  const { request, env } = context;
  const token = request.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token || token !== env.API_TOKEN) return new Response("Unauthorized", { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "请求体不是合法 JSON" }, 400);
  }

  const rawSource = typeof body.source === "string" ? body.source : ACCOUNT_SOURCE;
  const source = SOURCES.has(rawSource) ? rawSource : ACCOUNT_SOURCE;
  const now = Math.floor(Date.now() / 1000);

  try {
    await ensureSchema(env.DB);
    const previous = await readSnapshot(env.DB, source);
    const payload: Omit<StatusSnapshot, "updatedAt"> = {
      accounts: toEntries(body.accounts, "qq", now, previous.accounts),
      services: toEntries(body.services, "id", now, previous.services),
      hardware: toHardwareMetrics(body.hardware),
    };

    await env.DB.prepare(
      "INSERT OR REPLACE INTO bot_status (id, payload, updated_at) VALUES (?, ?, ?)"
    )
      .bind(source, JSON.stringify(payload), now)
      .run();

    return jsonResponse({
      success: true,
      source,
      accounts: Object.keys(payload.accounts).length,
      services: Object.keys(payload.services).length,
    });
  } catch {
    return jsonResponse({ error: "状态写入失败" }, 500);
  }
};

export const onRequestGet = async (context: StatusContext) => {
  const { env } = context;

  let snapshots: Record<string, StatusSnapshot>;
  try {
    await ensureSchema(env.DB);
    snapshots = await readSnapshots(env.DB);
  } catch {
    return jsonResponse({ error: "状态读取失败" }, 500);
  }

  const accounts = resolveField(snapshots, ACCOUNT_SOURCE_ORDER, "accounts");
  const services = resolveField(snapshots, SERVICE_SOURCE_ORDER, "services");
  const hardware = resolveHardware(snapshots, SERVICE_SOURCE_ORDER);
  const now = Math.floor(Date.now() / 1000);
  const isStale = (updatedAt: number) => updatedAt === 0 || now - updatedAt > STALE_SECONDS;

  return jsonResponse(
    {
      updatedAt: Math.max(accounts.updatedAt, services.updatedAt) || null,
      accounts: accounts.data,
      accountsUpdatedAt: accounts.updatedAt || null,
      accountsStale: isStale(accounts.updatedAt),
      services: services.data,
      servicesUpdatedAt: services.updatedAt || null,
      servicesStale: isStale(services.updatedAt),
      hardware: hardware.data,
      hardwareUpdatedAt: hardware.updatedAt || null,
      hardwareStale: isStale(hardware.updatedAt),
      // 前端用服务端时间算「已运行 N 小时」，避免浏览器时钟偏差
      serverTime: now,
    },
    200,
    "no-store"
  );
};
