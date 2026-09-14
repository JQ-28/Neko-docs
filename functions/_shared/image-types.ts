// 截图允许的扩展名 → MIME 映射（服务端判定，不信任客户端 file.type）
export const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function extOf(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function contentTypeOf(fileName: string): string | null {
  return MIME_BY_EXT[extOf(fileName)] ?? null;
}
