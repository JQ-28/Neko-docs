// 语音转写：前端录音（webm/mp4 等）转 base64 传来，用 Workers AI Whisper 出文字
// 移动端浏览器普遍不支持 Web Speech API，这条通道是手机端语音输入的唯一出路

import { CORS_HEADERS, handlePreflight, originRejected } from "../_shared/origin";
import { createRateLimiter } from "../_shared/rate-limit";

const ASR_MODEL = "@cf/openai/whisper-large-v3-turbo";

// 30 秒 opus 录音不到 100KB，4MB 上限只是防滥用
const MAX_AUDIO_LENGTH = 4_000_000;
const MAX_TEXT_LENGTH = 300;

// 简易限流：单实例内按 IP 每分钟 30 次（移动端边录边转每 2.5 秒一次，上限留足余量）
const rateLimited = createRateLimiter({ max: 30, windowMs: 60_000, entriesMax: 1_000 });

type AiBinding = {
  run: (model: string, options: Record<string, unknown>) => Promise<{ text?: string }>;
};

function json(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export const onRequestOptions = async (context: { request: Request }) => handlePreflight(context.request);

export const onRequestPost = async (context: {
  request: Request;
  env: { AI?: AiBinding };
}) => {
  const { request, env } = context;

  if (originRejected(request)) return json({ ok: false, error: "来源不被允许" }, 403);

  // 限流先于 body 解析：超额请求不必为 4MB 的 base64 白付一次解析成本
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  if (rateLimited(ip)) return json({ ok: false, error: "请求过于频繁，请稍后再试" }, 429);

  try {
    const body = (await request.json()) as { audio?: string };
    const audio = (body.audio ?? "").trim();
    if (!audio) return json({ ok: false, error: "audio 不能为空" }, 400);
    if (audio.length > MAX_AUDIO_LENGTH) return json({ ok: false, error: "录音太长了" }, 413);

    const ai = env.AI;
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
