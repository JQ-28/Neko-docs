// 群申请提交：Turnstile 人机验证 + 截图地址白名单 + 单 IP 间隔限制
// 只认本服务上传接口自己生成的路径（时间戳-随机串.扩展名），外链一律不收，否则外站图片能被拿来当同意凭证
import type { D1Database } from "../_shared/d1";

const SCREENSHOT_URL_PATTERN = /^\/api\/screenshot\/\d+-[a-z0-9]+\.(?:jpe?g|png|webp)$/u;
const TEXT_LIMITS = {
  groupName: 100,
  groupSize: 50,
  groupAtmosphere: 500,
  applicantRole: 50,
  reason: 1000,
};
const SUBMISSION_INTERVAL_MS = 60_000;
const recentSubmissions = new Map<string, number>();

interface ApplicationForm {
  qq?: string;
  groupNumber?: string;
  groupName?: string;
  groupSize?: string;
  groupAtmosphere?: string;
  applicantRole?: string;
  screenshotUrl?: string;
  reason?: string;
  captchaToken?: string;
}

interface ApplyContext {
  request: Request;
  env: { DB: D1Database; TURNSTILE_SECRET_KEY?: string };
}

function json(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isDuplicateSubmission(ip: string): boolean {
  const now = Date.now();
  // 只清过期项：整表 clear() 会让攻击者用 1000 个 IP 把限流表洗白
  if (recentSubmissions.size > 1000) {
    for (const [key, time] of recentSubmissions) {
      if (now - time >= SUBMISSION_INTERVAL_MS) recentSubmissions.delete(key);
    }
  }
  const last = recentSubmissions.get(ip);
  recentSubmissions.set(ip, now);
  return last !== undefined && now - last < SUBMISSION_INTERVAL_MS;
}

export const onRequestPost = async (context: ApplyContext) => {
  const { request, env } = context;

  try {
    const body = (await request.json()) as ApplicationForm;
    const {
      qq,
      groupNumber,
      groupName,
      groupSize,
      groupAtmosphere,
      applicantRole,
      screenshotUrl,
      reason,
      captchaToken,
    } = body;

    if (!qq || !groupNumber || !groupSize || !groupAtmosphere || !applicantRole) {
      return json({ error: "请填写所有必填字段" }, 400);
    }

    // 管理员和普通成员必须上传同意截图
    if ((applicantRole === "管理员" || applicantRole === "普通成员") && !screenshotUrl) {
      return json({ error: "管理员和普通成员需要上传同意截图证明" }, 400);
    }

    if (!/^[0-9]{5,11}$/.test(qq)) return json({ error: "QQ号格式不正确" }, 400);
    if (!/^[0-9]{6,11}$/.test(groupNumber)) return json({ error: "群号格式不正确" }, 400);

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    if (isDuplicateSubmission(ip)) return json({ error: "提交太频繁了，喝口水再来" }, 429);

    const textFields: Array<[string, string | undefined, number]> = [
      ["群名称", groupName, TEXT_LIMITS.groupName],
      ["群规模", groupSize, TEXT_LIMITS.groupSize],
      ["群氛围", groupAtmosphere, TEXT_LIMITS.groupAtmosphere],
      ["申请身份", applicantRole, TEXT_LIMITS.applicantRole],
      ["申请理由", reason, TEXT_LIMITS.reason],
    ];
    const overlong = textFields.find(([, value, max]) => (value?.length ?? 0) > max);
    if (overlong) return json({ error: `${overlong[0]}太长了，请精简一下` }, 400);

    if (screenshotUrl && !SCREENSHOT_URL_PATTERN.test(screenshotUrl)) {
      return json({ error: "截图地址不合法" }, 400);
    }

    // 人机验证强制走服务端，防止跳过前端直接调接口
    if (!captchaToken) return json({ error: "请完成人机验证" }, 400);

    const turnstileResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: captchaToken,
        }),
      }
    );

    const turnstileResult = (await turnstileResponse.json()) as { success?: boolean };
    if (!turnstileResult.success) return json({ error: "人机验证失败，请重试" }, 400);

    const result = await env.DB.prepare(
      `INSERT INTO applications
       (qq, group_number, group_name, group_size, group_atmosphere, applicant_role, screenshot_url, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    )
      .bind(
        qq,
        groupNumber,
        groupName || "",
        groupSize,
        groupAtmosphere,
        applicantRole,
        screenshotUrl || "",
        reason || ""
      )
      .run();

    return json({
      success: true,
      message: "申请已提交，请耐心等待审核",
      id: result.meta.last_row_id,
    });
  } catch (error) {
    console.error("Apply error:", error);
    return json({ error: "服务器错误，请稍后重试" }, 500);
  }
};
