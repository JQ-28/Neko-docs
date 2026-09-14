// Cloudflare Pages Function for uploading screenshots to R2
import { contentTypeOf } from "../_shared/image-types";

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

    // 服务端只按扩展名白名单判定，客户端 file.type 可伪造，一律不采信
    const contentType = contentTypeOf(file.name);
    if (!contentType) {
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

    // 生成唯一文件名（扩展名已通过白名单校验，杜绝双扩展名注入）
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = file.name.split('.').pop()!.toLowerCase();
    const fileName = `${timestamp}-${randomStr}.${ext}`;

    // 上传到 R2（contentType 由服务端映射，忽略客户端声明）
    const arrayBuffer = await file.arrayBuffer();
    await env.SCREENSHOTS.put(fileName, arrayBuffer, {
      httpMetadata: {
        contentType,
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