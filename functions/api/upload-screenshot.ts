// 截图上传：落 R2，扩展名走白名单校验
import { contentTypeOf, extOf } from "../_shared/image-types";
import { CORS_HEADERS, handlePreflight, originRejected } from "../_shared/origin";
import { createRateLimiter } from "../_shared/rate-limit";

type R2Bucket = {
  put: (
    key: string,
    value: ArrayBuffer,
    opts: { httpMetadata: { contentType: string } }
  ) => Promise<unknown>;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ipRateLimited = createRateLimiter({ max: 10, windowMs: 60_000, entriesMax: 1_000 });

// 单 IP 每分钟 10 张之外再卡一道全局日总量：前者防脚本连续灌，后者防换 IP 轮询
const DAILY_QUOTA_MAX = 500;
let quotaDay = "";
let dailyUsed = 0;

function json(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function overDailyQuota(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== quotaDay) {
    quotaDay = today;
    dailyUsed = 0;
  }
  if (dailyUsed >= DAILY_QUOTA_MAX) return true;
  dailyUsed += 1;
  return false;
}

export const onRequestOptions = async (context: { request: Request }) =>
  handlePreflight(context.request);

export const onRequestPost = async (context: {
  request: Request;
  env: { SCREENSHOTS?: R2Bucket };
}) => {
  const { request, env } = context;

  if (originRejected(request)) {
    return json({ error: "来源不被允许" }, 403);
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  if (ipRateLimited(ip) || overDailyQuota()) {
    return json({ error: "上传太频繁了，请稍后再试" }, 429);
  }

  const bucket = env.SCREENSHOTS;
  if (!bucket) {
    return json({ error: "存储服务未绑定" }, 503);
  }

  // 非 multipart 时 request.formData() 会直接抛异常，先判类型给它一个正经的 400
  const contentTypeHeader = request.headers.get("Content-Type") ?? "";
  if (!contentTypeHeader.includes("multipart/form-data")) {
    return json({ error: "请上传截图文件" }, 400);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("screenshot");

    if (!file || !(file instanceof File)) {
      return json({ error: "请上传截图文件" }, 400);
    }

    // 服务端只按扩展名白名单判定，客户端 file.type 可伪造，一律不采信
    const contentType = contentTypeOf(file.name);
    if (!contentType) {
      return json({ error: "仅支持 JPG、PNG、WebP 格式图片" }, 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return json({ error: "图片大小不能超过 5MB" }, 400);
    }

    // 生成唯一文件名（扩展名已通过白名单校验，杜绝双扩展名注入）
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2, 15);
    const fileName = `${timestamp}-${randomStr}.${extOf(file.name)}`;

    // 上传到 R2（contentType 由服务端映射，忽略客户端声明）
    const arrayBuffer = await file.arrayBuffer();
    await bucket.put(fileName, arrayBuffer, {
      httpMetadata: {
        contentType,
      },
    });

    return json({
      success: true,
      fileName,
      url: `/api/screenshot/${fileName}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return json({ error: "上传失败，请稍后重试" }, 500);
  }
};
