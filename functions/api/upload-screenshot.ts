// Cloudflare Pages Function for uploading screenshots to R2
import { contentTypeOf } from "../_shared/image-types";
import { CORS_HEADERS, handlePreflight, originRejected } from "../_shared/origin";

type R2Bucket = {
  put: (
    key: string,
    value: ArrayBuffer,
    opts: { httpMetadata: { contentType: string } }
  ) => Promise<unknown>;
};

// 单 IP 每分钟 10 张，同时卡全局日总量：前者防脚本连续灌，后者防换 IP 轮询
const IP_QUOTA_MAX = 10;
const IP_QUOTA_WINDOW = 60_000;
const DAILY_QUOTA_MAX = 500;
const IP_ENTRIES_MAX = 1_000;

const ipQuota = new Map<string, { count: number; resetAt: number }>();
let quotaDay = "";
let dailyUsed = 0;

function json(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function quotaExceeded(ip: string): boolean {
  const now = Date.now();

  if (ipQuota.size >= IP_ENTRIES_MAX) {
    for (const [key, rec] of ipQuota) {
      if (now > rec.resetAt) ipQuota.delete(key);
    }
  }

  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== quotaDay) {
    quotaDay = today;
    dailyUsed = 0;
  }
  if (dailyUsed >= DAILY_QUOTA_MAX) return true;

  const rec = ipQuota.get(ip);
  if (!rec || now > rec.resetAt) {
    ipQuota.set(ip, { count: 1, resetAt: now + IP_QUOTA_WINDOW });
  } else {
    rec.count += 1;
    if (rec.count > IP_QUOTA_MAX) return true;
  }

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

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (quotaExceeded(ip)) {
    return json({ error: "上传太频繁了，请稍后再试" }, 429);
  }

  const bucket = env.SCREENSHOTS;
  if (!bucket) {
    return json({ error: "存储服务未绑定" }, 503);
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

    // 验证文件大小 (最大 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return json({ error: "图片大小不能超过 5MB" }, 400);
    }

    // 生成唯一文件名（扩展名已通过白名单校验，杜绝双扩展名注入）
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = file.name.split(".").pop()!.toLowerCase();
    const fileName = `${timestamp}-${randomStr}.${ext}`;

    // 上传到 R2（contentType 由服务端映射，忽略客户端声明）
    const arrayBuffer = await file.arrayBuffer();
    await bucket.put(fileName, arrayBuffer, {
      httpMetadata: {
        contentType,
      },
    });

    return json({
      success: true,
      fileName: fileName,
      url: `/api/screenshot/${fileName}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return json({ error: "上传失败，请稍后重试" }, 500);
  }
};
