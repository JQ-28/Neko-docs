// 跨域与预检的统一出入口，所有对外 API 共用一份白名单，避免各文件各写一份慢慢跑偏

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const ALLOWED_ORIGINS = new Set(["https://docs.nekodayo.top", "https://tools.nekodayo.top"]);

export function originRejected(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin || ALLOWED_ORIGINS.has(origin)) return false;
  return !/^https:\/\/[a-z0-9-]+\.nekodayo-docs\.pages\.dev$/u.test(origin)
    && !/^http:\/\/localhost(:\d+)?$/u.test(origin);
}

// Pages Functions 只处理显式导出的方法，未导出 onRequestOptions 时预检会被框架直接 405 挡掉
export function handlePreflight(request: Request): Response {
  if (originRejected(request)) return new Response(null, { status: 403 });
  return new Response(null, { headers: CORS_HEADERS });
}
