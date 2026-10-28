"use client";

import { useEffect, useState } from "react";
import { hydrateSoundPref, toggleSound } from "@/lib/board-sound";
import { useI18n } from "@/i18n/provider";
import { subscribeHallPrefs } from "../lib/hall-prefs";

export function SoundStamp() {
  const { t } = useI18n();
  const [on, setOn] = useState(true);

  useEffect(() => {
    void hydrateSoundPref().then(setOn);
    return subscribeHallPrefs(() => {
      void hydrateSoundPref().then(setOn);
    });
  }, []);

  return (
    <button
      type="button"
      className="sound-stamp"
      data-on={on}
      data-testid="board-sound"
      aria-pressed={on}
      aria-label={t("sound.toggle")}
      title={on ? t("sound.on") : t("sound.off")}
      onClick={() => setOn(toggleSound())}
    >
      {on ? t("sound.on") : t("sound.off")}
    </button>
  );
}
