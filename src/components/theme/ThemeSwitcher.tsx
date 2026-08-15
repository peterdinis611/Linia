"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { themes, type Theme } from "@/lib/theme";
import { useTheme } from "./ThemeProvider";

const ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function ThemeSwitcher() {
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-switch" role="group" aria-label={t("theme.label")}>
      {themes.map((item) => {
        const Icon = ICONS[item];
        const selected = item === theme;
        const label = t(`theme.${item}`);
        return (
          <button
            key={item}
            type="button"
            data-on={selected}
            aria-pressed={selected}
            aria-label={label}
            title={label}
            onClick={() => setTheme(item)}
          >
            <Icon className="mx-auto size-3.5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
