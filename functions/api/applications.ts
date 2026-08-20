// 获取申请列表（供机器人使用）
export const onRequestGet = async (context) => {
  const { request, env } = context;
  
  // 验证 API Token
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (token !== env.API_TOKEN) {
    return new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'pending';
  const limit = parseInt(url.searchParams.get('limit') || '20');

  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM applications WHERE status = ? ORDER BY created_at DESC LIMIT ?'
    ).bind(status, limit).all();

    return new Response(JSON.stringify(results), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '查询失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// 更新申请状态（供机器人使用）
export const onRequestPatch = async (context) => {
  const { request, env } = context;
  
  // 验证 API Token
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (token !== env.API_TOKEN) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const data = await request.json();
    const { id, status, admin_reply } = data;

    if (!id || !status) {
      return new Response(JSON.stringify({ error: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await env.DB.prepare(
      `UPDATE applications 
       SET status = ?, admin_reply = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(status, admin_reply || '', id).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '更新失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};