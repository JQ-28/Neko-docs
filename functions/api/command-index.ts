// 把指令语义索引下发给前端，供接口不可用时本地降级匹配

import { ROUTE_INDEX } from "../_shared/route-index";

export const onRequestGet = (): Response =>
  new Response(JSON.stringify({ entries: ROUTE_INDEX.map(({ link, keywords }) => ({ link, keywords })) }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
