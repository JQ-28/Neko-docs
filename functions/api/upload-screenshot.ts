// Cloudflare Pages Function for uploading screenshots to R2
export const onRequestPost = async (context) => {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const file = formData.get('screenshot');

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: '请上传截图文件' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: '仅支持 JPG、PNG、WebP 格式图片' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证文件大小 (最大 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: '图片大小不能超过 5MB' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = file.name.split('.').pop();
    const fileName = `${timestamp}-${randomStr}.${ext}`;

    // 上传到 R2
    const arrayBuffer = await file.arrayBuffer();
    await env.SCREENSHOTS.put(fileName, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    return new Response(JSON.stringify({ 
      success: true,
      fileName: fileName,
      url: `/api/screenshot/${fileName}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      error: '上传失败，请稍后重试' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};