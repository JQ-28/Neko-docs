// 网站实时在线人数：前端每 30 秒上报一次心跳，接口顺带返回当前在线数
//
// 去重靠客户端生成的匿名 ID（存 localStorage，清掉浏览器数据就换新号），
// 不记录 IP、不记录 UA，库里除了随机 ID 和心跳时间戳没有别的信息。
//
// 项目没有 Durable Objects 也没有定时任务，所以沿用 bot-status 的老办法：
// 心跳只做写入，过期判定在读取时现算，顺手把太老的记录删掉防止表膨胀。

import { createRateLimiter } from "../_shared/rate-limit";
import type { D1Database } from "../_shared/d1";

/** 前端心跳间隔（秒），也是这里判定「多久没动静算掉线」的基准 */
const HEARTBEAT_SECONDS = 30;
/** 容忍连续 2 次丢包后才算离线 */
const ONLINE_WINDOW_SECONDS = HEARTBEAT_SECONDS * 3;
/** 超过这个时长仍无心跳的记录直接删除，避免表无限增长 */
const PURGE_SECONDS = 600;

const ID_MAX_LENGTH = 64;
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const TABLE_DDL = `CREATE TABLE IF NOT EXISTS online_visitors (
  id TEXT PRIMARY KEY,
  last_seen INTEGER NOT NULL
)`;

// 计数与清理都按时间筛，没有索引会全表扫
const INDEX_DDL =
  "CREATE INDEX IF NOT EXISTS idx_online_last_seen ON online_visitors (last_seen)";

const INSERT_SQL =
  "INSERT OR REPLACE INTO online_visitors (id, last_seen) VALUES (?, ?)";
const PURGE_SQL = "DELETE FROM online_visitors WHERE last_seen < ?";
const COUNT_SQL =
  "SELECT COUNT(*) AS total FROM online_visitors WHERE last_seen > ?";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
};

// 单实例内存限流，跨实例配额由 Cloudflare 侧规则兜底
const isRateLimited = createRateLimiter({
  max: 40,
  windowMs: 60_000,
  entriesMax: 2000,
});

interface OnlineEnv {
  DB: D1Database;
}

interface OnlineContext {
  request: Request;
  env: OnlineEnv;
}

let schemaReady = false;

async function ensureSchema(db: OnlineEnv["DB"]): Promise<void> {
  if (schemaReady) return;
  await db.prepare(TABLE_DDL).run();
  await db.prepare(INDEX_DDL).run();
  schemaReady = true;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function isValidVisitorId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= ID_MAX_LENGTH &&
    ID_PATTERN.test(value)
  );
}

export const onRequestPost = async (
  context: OnlineContext
): Promise<Response> => {
  const { request, env } = context;

  try {
    if (!env.DB) return jsonResponse({ error: "服务未就绪" }, 503);

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    if (isRateLimited(ip)) return jsonResponse({ error: "请求太频繁" }, 429);

    const body = (await request.json().catch(() => null)) as {
      id?: unknown;
    } | null;
    const visitorId = body?.id;
    if (!isValidVisitorId(visitorId)) {
      return jsonResponse({ error: "参数不合法" }, 400);
    }

    await ensureSchema(env.DB);

    // 以服务端时间戳为准，客户端改系统时间也刷不出假数据
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(INSERT_SQL).bind(visitorId, now).run();
    await env.DB.prepare(PURGE_SQL).bind(now - PURGE_SECONDS).run();

    const counted = await env.DB.prepare(COUNT_SQL)
      .bind(now - ONLINE_WINDOW_SECONDS)
      .all<{ total: number }>();
    const total = counted.results?.[0]?.total ?? 0;

    return jsonResponse({ count: total });
  } catch (error) {
    console.error("Online count error:", error);
    return jsonResponse({ error: "统计失败" }, 500);
  }
};

export const onRequestOptions = (): Response =>
  new Response(null, { status: 204, headers: JSON_HEADERS });
