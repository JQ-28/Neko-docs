/* 由 neko-shared/sync.mjs 自动生成，请勿直接修改；改动请写在 neko-shared/src 下 */
/* 彩蛋进度双向同步：文档站只能读父域 cookie，功能站读写 localStorage，
   两端统一取并集后再双写，所以不论在哪一端点亮都不会丢进度 */
export const EGG_STORE_KEY = "neko-eggs";
export const EGG_COOKIE_ROOT_DOMAIN = "nekodayo.top";

const EGG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isKnownEgg(registry, id) {
  return Object.prototype.hasOwnProperty.call(registry, id);
}

export function readLocalEggIds() {
  try {
    const raw = JSON.parse(localStorage.getItem(EGG_STORE_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function readCookieEggIds() {
  const prefix = `${EGG_STORE_KEY}=`;
  const raw = document.cookie.split("; ").find((item) => item.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return [];
  try {
    return decodeURIComponent(raw).split(",").map((id) => id.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/* 本机 localStorage 与父域 cookie 的并集，即两端共同攒下的全部彩蛋 id */
export function readEggIdUnion() {
  return [...new Set([...readLocalEggIds(), ...readCookieEggIds()])];
}

export function writeEggIds(ids) {
  try {
    localStorage.setItem(EGG_STORE_KEY, JSON.stringify(ids));
  } catch {
    /* 隐私模式等场景忽略 */
  }
  const domain = location.hostname.endsWith(`.${EGG_COOKIE_ROOT_DOMAIN}`) ? `;domain=.${EGG_COOKIE_ROOT_DOMAIN}` : "";
  document.cookie = `${EGG_STORE_KEY}=${encodeURIComponent(ids.join(","))};path=/;max-age=${EGG_COOKIE_MAX_AGE};SameSite=Lax${domain}`;
}
