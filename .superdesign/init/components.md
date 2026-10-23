# Shared UI primitives

Linia is **not** a shadcn app kit. Shared primitives are few; most UI is feature-local under `src/features/journey/components/` with hall CSS in `globals.css`.

## HallToaster — `src/components/ui/hall-toaster.tsx`

Paper-stamp Sonner mount. See layouts.md for full source.

## SplitFlapText — `src/components/ui/SplitFlapText.tsx`

Flip-board digit animation for live clocks / counts (~125 lines). Used by `BoardMast`, `StationClock`.

## FloatSheet — `src/components/FloatSheet.tsx`

Portaled `<dialog>` anchored under a trigger (calendar, clock, language). Full source:

```tsx
// see src/components/FloatSheet.tsx — useLightDismiss + FloatSheet portal
```

Key props: `anchorRef`, `align`, `onDismiss`, `testId`, children.

## ThemeSwitcher — `src/components/theme/ThemeSwitcher.tsx`

Light / dark / system stamp row. Full source in layouts.md.

## StatusScreen — `src/components/status/StatusScreen.tsx`

Full-bleed fault / empty / loading face with Linia brand, signal lamp, dashed frame. Used by error boundaries and empty states.

## Map (mapcn) — `src/components/ui/map.tsx`

Large MapLibre wrapper (~2700 lines). Journey map uses `RouteMap` / `RouteMapInner` which compose this. Do **not** pass whole file as context; treat as black-box map stage.

## Feature “stamps” (pattern, not a primitive)

Buttons use class `stamp` / `search-cta` / `ticket` — CSS-only paper hall language. No Button.tsx component.

## Icons — `src/components/icons.tsx`

Custom SVG icons for theme switcher and UI chrome.