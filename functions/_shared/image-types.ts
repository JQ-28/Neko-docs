// 截图允许的扩展名 → MIME 映射（服务端判定，不信任客户端 file.type）
export const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const ALLOWED_MIME_TYPES = new Set(Object.values(MIME_BY_EXT));

export function contentTypeOf(fileName: string): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? null;
}
