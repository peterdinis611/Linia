"use client";

import { IconMonitor, IconMoon, IconSun } from "@/components/icons";
import { useI18n } from "@/i18n/provider";
import { themes, type Theme } from "@/lib/theme";
import { useTheme } from "./ThemeProvider";

const ICONS: Record<Theme, typeof IconSun> = {
  light: IconSun,
  dark: IconMoon,
  system: IconMonitor,
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
            <Icon />
          </button>
        );
      })}
    </div>
  );
}
