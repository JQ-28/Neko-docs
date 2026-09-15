import { EGG_HINTS, EGG_TIP } from "./neko-shared-eggs";

export { EGGS } from "./neko-shared-eggs";

export {
  EGG_TOTAL,
  closeEggPanel,
  countEggCopy,
  eggFound,
  eggPanelOpen,
  initEggs,
  markEgg,
  onEggUnlocked,
  openEggPanel,
  syncEggs,
} from "./egg-state";

export { showEggTip } from "./egg-toast";

export function eggHintOf(id: string): string {
  return EGG_HINTS[id] ?? EGG_TIP;
}
