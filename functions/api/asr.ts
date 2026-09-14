// 语音转写：前端录音（webm/mp4 等）转 base64 传来，用 Workers AI Whisper 出文字
// 移动端浏览器普遍不支持 Web Speech API，这条通道是手机端语音输入的唯一出路

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const ALLOWED_ORIGINS = new Set(["https://docs.nekodayo.top", "https://tools.nekodayo.top"]);

function originRejected(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin || ALLOWED_ORIGINS.has(origin)) return false;
  return !/^https:\/\/[a-z0-9-]+\.nekodayo-docs\.pages\.dev$/u.test(origin)
    && !/^http:\/\/localhost(:\d+)?$/u.test(origin);
}

const ASR_MODEL = "@cf/openai/whisper-large-v3-turbo";

// 30 秒 opus 录音不到 100KB，4MB 上限只是防滥用
const MAX_AUDIO_LENGTH = 4_000_000;
const MAX_TEXT_LENGTH = 300;

// 简易限流：单实例内按 IP 每分钟 30 次（移动端边录边转每 2.5 秒一次，上限留足余量）
const RATE_LIMIT: Record<string, { count: number; resetAt: number }> = {};
const RATE_MAX = 30;
const RATE_WINDOW = 60_000;
const RATE_ENTRIES_MAX = 1_000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const ips = Object.keys(RATE_LIMIT);
  if (ips.length >= RATE_ENTRIES_MAX) {
    for (const key of ips) {
      if (now > RATE_LIMIT[key].resetAt) delete RATE_LIMIT[key];
    }
  }
  const rec = RATE_LIMIT[ip];
  if (!rec || now > rec.resetAt) {
    RATE_LIMIT[ip] = { count: 1, resetAt: now + RATE_WINDOW };
    return false;
  }
  rec.count += 1;
  return rec.count > RATE_MAX;
}

type AiBinding = { run: (model: string, opts: Record<string, unknown>) => Promise<{ text?: string }> };

function json(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export const onRequestPost = async (context: {
  request: Request;
  env: Record<string, unknown>;
}) => {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    if (originRejected(request)) return new Response(null, { status: 403 });
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (originRejected(request)) {
    return new Response(JSON.stringify({ ok: false, error: "来源不被允许" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await request.json()) as { audio?: string };
    const audio = (body.audio ?? "").trim();
    if (!audio) return json({ ok: false, error: "audio 不能为空" }, 400);
    if (audio.length > MAX_AUDIO_LENGTH) return json({ ok: false, error: "录音太长了" }, 413);

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    if (rateLimited(ip)) return json({ ok: false, error: "请求过于频繁，请稍后再试" }, 429);

    const ai = (env as { AI?: AiBinding }).AI;
    if (!ai) return json({ ok: false, error: "语音识别服务未绑定" }, 503);

    const result = await ai.run(ASR_MODEL, {
      audio,
      task: "transcribe",
      language: "zh",
      vad_filter: true,
    });
    const text = (result.text ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);
    return json({ ok: true, text });
  } catch (error) {
    console.error("ASR error:", error);
    return json({ ok: false, error: "语音识别失败，请稍后再试" }, 500);
  }
};
