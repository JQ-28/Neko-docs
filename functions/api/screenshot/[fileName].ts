// Cloudflare Pages Function for retrieving screenshots from R2
export const onRequestGet = async (context) => {
  const { params, env } = context;
  const fileName = params.fileName;

  try {
    const object = await env.SCREENSHOTS.get(fileName);

    if (!object) {
      return new Response('Screenshot not found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(object.body, {
      headers,
    });
  } catch (error) {
    console.error('Retrieve error:', error);
    return new Response('Error retrieving screenshot', { status: 500 });
  }
};