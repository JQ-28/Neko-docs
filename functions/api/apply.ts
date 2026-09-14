// Cloudflare Pages Function for handling group application
// 只认本服务上传接口自己生成的路径（时间戳-随机串.扩展名），外链一律不收，否则外站图片能被拿来当同意凭证
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

export const onRequestPost = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { qq, groupNumber, groupName, groupSize, groupAtmosphere, applicantRole, screenshotUrl, reason, captchaToken } = body;

    // 验证必填字段
    if (!qq || !groupNumber || !groupSize || !groupAtmosphere || !applicantRole) {
      return new Response(JSON.stringify({ error: '请填写所有必填字段' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证截图上传（管理员和普通成员必须上传）
    if ((applicantRole === '管理员' || applicantRole === '普通成员') && !screenshotUrl) {
      return new Response(JSON.stringify({ error: '管理员和普通成员需要上传同意截图证明' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // QQ号格式验证
    if (!/^[0-9]{5,11}$/.test(qq)) {
      return new Response(JSON.stringify({ error: 'QQ号格式不正确' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 群号格式验证
    if (!/^[0-9]{6,11}$/.test(groupNumber)) {
      return new Response(JSON.stringify({ error: '群号格式不正确' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (isDuplicateSubmission(ip)) {
      return new Response(JSON.stringify({ error: '提交太频繁了，喝口水再来' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const textFields: Array<[string, unknown, number]> = [
      ['群名称', groupName, TEXT_LIMITS.groupName],
      ['群规模', groupSize, TEXT_LIMITS.groupSize],
      ['群氛围', groupAtmosphere, TEXT_LIMITS.groupAtmosphere],
      ['申请身份', applicantRole, TEXT_LIMITS.applicantRole],
      ['申请理由', reason, TEXT_LIMITS.reason],
    ];
    const overlong = textFields.find(([, value, max]) => typeof value === 'string' && value.length > max);
    if (overlong) {
      return new Response(JSON.stringify({ error: `${overlong[0]}太长了，请精简一下` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (screenshotUrl && !SCREENSHOT_URL_PATTERN.test(String(screenshotUrl))) {
      return new Response(JSON.stringify({ error: '截图地址不合法' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Cloudflare Turnstile 验证（强制，防止直接调接口绕过人机验证）
    if (!captchaToken) {
      return new Response(JSON.stringify({ error: '请完成人机验证' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const turnstileResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: captchaToken,
        }),
      }
    );

    const turnstileResult = await turnstileResponse.json();
    if (!turnstileResult.success) {
      return new Response(JSON.stringify({ error: '人机验证失败，请重试' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 存入 D1 数据库
    const result = await env.DB.prepare(
      `INSERT INTO applications 
       (qq, group_number, group_name, group_size, group_atmosphere, applicant_role, screenshot_url, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).bind(
      qq,
      groupNumber,
      groupName || '',
      groupSize,
      groupAtmosphere,
      applicantRole,
      screenshotUrl || '',
      reason || ''
    ).run();

    return new Response(JSON.stringify({ 
      success: true,
      message: '申请已提交，请耐心等待审核',
      id: result.meta.last_row_id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Apply error:', error);
    return new Response(JSON.stringify({ 
      error: '服务器错误，请稍后重试' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};