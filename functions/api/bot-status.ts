// 机器人状态：上报方 POST 快照，文档站前端 GET 合并展示
// 上报凭据复用 Pages 机密 API_TOKEN：Authorization: Bearer <API_TOKEN>
//
// 两个来源分开存储、互不覆盖，避免 nonebot 一挂就全站静默：
//   nonebot —— 上报账号在线情况（只有它能从 get_bots() 拿到真实连接状态）
//   watchdog —— 独立进程，上报 TCP/进程探测结果（含 nonebot 自身端口），不依赖 nonebot

const STALE_SECONDS = 300;

const ACCOUNT_SOURCE = "nonebot";
const SERVICE_SOURCE = "watchdog";

// 账号以 nonebot 为准，服务以 watchdog 为准；前者缺失时退回另一来源
const ACCOUNT_SOURCE_ORDER = [ACCOUNT_SOURCE, SERVICE_SOURCE] as const;
const SERVICE_SOURCE_ORDER = [SERVICE_SOURCE, ACCOUNT_SOURCE] as const;

const SOURCES = new Set<string>([ACCOUNT_SOURCE, SERVICE_SOURCE]);

const TABLE_DDL = `CREATE TABLE IF NOT EXISTS bot_status (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)`;

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
};

interface StatusSnapshot {
  accounts: Record<string, boolean>;
  services: Record<string, boolean>;
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

function toStatusMap(items: unknown, keyName: string): Record<string, boolean> {
  if (!Array.isArray(items)) return {};
  return items.reduce<Record<string, boolean>>((map, item) => {
    if (!item || typeof item !== "object") return map;
    const record = item as Record<string, unknown>;
    const key = record[keyName];
    if (typeof key === "string" && key) map[key] = record.online === true;
    return map;
  }, {});
}

async function readSnapshots(db: StatusEnv["DB"]): Promise<Record<string, StatusSnapshot>> {
  const { results } = await db
    .prepare("SELECT id, payload, updated_at FROM bot_status")
    .all<{ id: string; payload: string; updated_at: number }>();

  return (results ?? []).reduce<Record<string, StatusSnapshot>>((map, row) => {
    let parsed: Partial<StatusSnapshot> = {};
    try {
      parsed = JSON.parse(row.payload) as Partial<StatusSnapshot>;
    } catch {
      parsed = {};
    }
    map[row.id] = {
      accounts: parsed.accounts ?? {},
      services: parsed.services ?? {},
      updatedAt: Number(row.updated_at) || 0,
    };
    return map;
  }, {});
}

function resolveField(
  snapshots: Record<string, StatusSnapshot>,
  order: readonly string[],
  field: "accounts" | "services"
): { data: Record<string, boolean>; updatedAt: number } {
  for (const source of order) {
    const snapshot = snapshots[source];
    if (snapshot && Object.keys(snapshot[field]).length > 0) {
      return { data: snapshot[field], updatedAt: snapshot.updatedAt };
    }
  }
  return { data: {}, updatedAt: 0 };
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

  const payload = {
    accounts: toStatusMap(body.accounts, "qq"),
    services: toStatusMap(body.services, "id"),
  };

  try {
    await ensureSchema(env.DB);
    await env.DB.prepare(
      "INSERT OR REPLACE INTO bot_status (id, payload, updated_at) VALUES (?, ?, ?)"
    )
      .bind(source, JSON.stringify(payload), Math.floor(Date.now() / 1000))
      .run();
  } catch {
    return jsonResponse({ error: "状态写入失败" }, 500);
  }

  return jsonResponse({
    success: true,
    source,
    accounts: Object.keys(payload.accounts).length,
    services: Object.keys(payload.services).length,
  });
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
    },
    200,
    "no-store"
  );
};
