// 上报类接口的凭据校验，凭据复用 Pages 机密 API_TOKEN：Authorization: Bearer <API_TOKEN>

// 逐字符累积差异再统一比较，避免用 === 时按首个不同字符提前返回、被逐位试探出前缀
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

export function tokenMatches(request: Request, expected: string | undefined): boolean {
  if (!expected) return false;
  const header = request.headers.get("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return token.length > 0 && safeEqual(token, expected);
}
