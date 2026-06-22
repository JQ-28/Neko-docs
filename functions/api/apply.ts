// Cloudflare Pages Function for handling group application
export const onRequestPost = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { qq, groupNumber, groupName, groupSize, reason, captchaToken } = body;

    // 验证必填字段
    if (!qq || !groupNumber) {
      return new Response(JSON.stringify({ error: '请填写所有必填字段' }), {
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

    // Cloudflare Turnstile 验证
    if (captchaToken) {
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
    }

    // 存入 D1 数据库
    const result = await env.DB.prepare(
      `INSERT INTO applications 
       (qq, group_number, group_name, group_size, reason, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`
    ).bind(
      qq,
      groupNumber,
      groupName || '',
      groupSize || '',
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