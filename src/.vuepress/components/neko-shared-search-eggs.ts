/* 由 neko-shared/sync.mjs 自动生成，请勿直接修改；改动请写在 neko-shared/src 下 */
/* 搜索框彩蛋关键词：两端共用同一张表，同一个词在哪端输入都点亮同一颗彩蛋 */
export const SEARCH_EGG_WORDS = [
  [["彩蛋", "eggs"], "docsEggsSearch"],
  [["neko", "猫"], "docsSearchNeko"],
  [["666"], "s666"],
  [["摸鱼", "上班"], "moyer"],
  [["404"], "s404"],
  [["miao", "喵"], "sMiao"],
];

/* 搜 neko 时顺带点亮另一端的同名彩蛋，保证两端进度一致 */
export const SEARCH_MIRROR_EGGS = {
  docsSearchNeko: ["nekoSearch"],
};

export function matchSearchEgg(keyword) {
  return SEARCH_EGG_WORDS.find(([words]) => words.includes(keyword))?.[1] ?? "";
}
