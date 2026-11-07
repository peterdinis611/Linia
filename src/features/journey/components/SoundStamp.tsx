"use client";

import { useSyncExternalStore } from "react";
import {
  getSoundEnabledSnapshot,
  subscribeSoundEnabled,
  toggleSound,
} from "@/lib/board-sound";
import { useI18n } from "@/i18n/provider";

export function SoundStamp() {
  const { t } = useI18n();
  const on = useSyncExternalStore(
    subscribeSoundEnabled,
    getSoundEnabledSnapshot,
    () => true,
  );

  return (
    <button
      type="button"
      className="sound-stamp"
      data-on={on}
      data-testid="board-sound"
      aria-pressed={on}
      aria-label={t("sound.toggle")}
      title={on ? t("sound.on") : t("sound.off")}
      onClick={() => toggleSound()}
    >
      {on ? t("sound.on") : t("sound.off")}
    </button>
  );
}
