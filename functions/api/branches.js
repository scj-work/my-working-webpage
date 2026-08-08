export async function onRequest(context) {
  try {
    // 读取项目根目录的 branches.json（由 Pages 托管）
    const origin = new URL(context.request.url).origin;
    const resp = await fetch(origin + '/branches.json', { cf: { cacheTtl: 300 } });
    if (!resp.ok) {
      return new Response(JSON.stringify({ ok: false, error: 'failed to load branches.json' }), {
        status: 500,
        headers: { 'content-type': 'application/json;charset=UTF-8', 'Access-Control-Allow-Origin': '*' }
      });
    }
    const branches = await resp.json();
    return new Response(JSON.stringify({ ok: true, branches }), {
      headers: { 'content-type': 'application/json;charset=UTF-8', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { 'content-type': 'application/json;charset=UTF-8', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
