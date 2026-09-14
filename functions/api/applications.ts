// 申请记录读写（供机器人使用，必须携带 API_TOKEN）
const ALLOWED_STATUSES = new Set(["pending", "approved", "rejected"]);
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function isAuthorized(env: { API_TOKEN?: string }, request: Request): boolean {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  return Boolean(env.API_TOKEN) && token === env.API_TOKEN;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const onRequestGet = async (context) => {
  const { request, env } = context;

  if (!isAuthorized(env, request)) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "pending";
  if (!ALLOWED_STATUSES.has(status)) return json({ error: "状态参数不合法" }, 400);

  const requested = Number.parseInt(url.searchParams.get("limit") || "", 10);
  const limit = Number.isFinite(requested)
    ? Math.min(Math.max(requested, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  try {
    const { results } = await env.DB.prepare(
      "SELECT * FROM applications WHERE status = ? ORDER BY created_at DESC LIMIT ?"
    )
      .bind(status, limit)
      .all();

    return json(results);
  } catch (error) {
    console.error("Applications query error:", error);
    return json({ error: "查询失败" }, 500);
  }
};

export const onRequestPatch = async (context) => {
  const { request, env } = context;

  if (!isAuthorized(env, request)) return new Response("Unauthorized", { status: 401 });

  try {
    const data = await request.json();
    const { id, status, admin_reply } = data;

    if (!id || !status) return json({ error: "缺少必要参数" }, 400);
    if (!ALLOWED_STATUSES.has(status)) return json({ error: "状态参数不合法" }, 400);

    await env.DB.prepare(
      `UPDATE applications 
       SET status = ?, admin_reply = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(status, admin_reply || "", id)
      .run();

    return json({ success: true });
  } catch (error) {
    console.error("Applications update error:", error);
    return json({ error: "更新失败" }, 500);
  }
};
