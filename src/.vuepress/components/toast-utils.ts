/* 提示条共用的「显示一会儿再淡出移除」，外观与时长由各调用方决定 */
export function scheduleToastDismiss(
  card: HTMLElement,
  leaveClass: string,
  visibleMs: number,
  leaveMs: number,
): void {
  window.setTimeout(() => {
    card.classList.add(leaveClass);
    window.setTimeout(() => card.remove(), leaveMs);
  }, visibleMs);
}
