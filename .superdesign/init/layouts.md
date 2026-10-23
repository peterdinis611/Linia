# Layouts

Linia has **no traditional app chrome** (no global sidebar/nav). The locale layout is a thin provider shell; the “hall” UI is entirely inside `JourneySearch`.

## Locale layout — `src/app/[locale]/layout.tsx`

- Sets `html` lang, font CSS variables (`hallFontClass`), dark class from cookie
- Providers: `I18nProvider` → `ThemeProvider` → children + `HallToaster`
- Imports `../globals.css`

## Hall shell (in-page) — `src/features/journey/components/JourneySearch.tsx`

Structure (desktop):
```
.hall-shell.no-print
  header.desk-strip          — LanguageSwitcher, ThemeSwitcher, SoundStamp, StationClock, brand “Linia”
  main.hall-body             — data-map pocket|open
    section.panel-desk       — SearchForm + results / board / empty
    section.hall-map         — RouteMap (MapLibre / mapcn)
  footer.hall-foot           — HowTo, sources, ShortcutsHint
PrintTicket sheets (print-only)
```

Mobile: map folds into `.map-pocket` stamp; desk scrolls in `.panel-scroll`.

Key CSS classes (globals): `.hall-shell`, `.desk-strip`, `.hall-body`, `.panel-desk`, `.hall-map`, `.map-pocket`, `.map-stage`, `.stamp`, `.ticket`, `.search-cta`, `.kicker`, `.board-mast`.

## ThemeSwitcher — `src/components/theme/ThemeSwitcher.tsx`

```tsx
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
```

## HallToaster — `src/components/ui/hall-toaster.tsx`

Sonner toaster, unstyled + `.hall-toast*` classes, bottom-center, theme from `useTheme().resolved`.