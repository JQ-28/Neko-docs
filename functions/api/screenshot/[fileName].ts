// Cloudflare Pages Function for retrieving screenshots from R2
import { contentTypeOf } from "../../_shared/image-types";

export const onRequestGet = async (context) => {
  const { params, env } = context;
  const fileName = params.fileName;

  try {
    const object = await env.SCREENSHOTS.get(fileName);

    if (!object) {
      return new Response('Screenshot not found', { status: 404 });
    }

    // 强制按扩展名白名单输出 Content-Type，不信任 R2 存储元数据，防止伪造类型触发同源 XSS
    const contentType = contentTypeOf(fileName);
    if (!contentType) {
      return new Response('Screenshot not found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(object.body, {
      headers,
    });
  } catch (error) {
    console.error('Retrieve error:', error);
    return new Response('Error retrieving screenshot', { status: 500 });
  }
};