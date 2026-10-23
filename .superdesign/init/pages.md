# Page dependency trees

## `/[locale]` — Home / Journey hall

Entry: `src/app/[locale]/page.tsx` → `JourneySearch`

Dependencies (UI-touching):
- `src/features/journey/components/JourneySearch.tsx`
  - `SearchForm.tsx`
    - `PlaceAutocomplete.tsx`
    - `HallWhen.tsx` → `FloatSheet`
  - `JourneyResults.tsx`
    - `BoardMast.tsx` → `SplitFlapText`
    - `CarrierCompare.tsx`
    - `ItineraryList.tsx` → `HoldStamp`, `WatchStamp`, `LeavesSoon`, `AlertStrip`
    - `ItineraryDetail.tsx`
    - `ShareJourney.tsx`
  - `StationBoard.tsx` (board mode)
  - `Board.tsx` (`EmptyBoard`, `SearchingBoard`, `StationClock`)
  - `RouteMap.tsx` → `RouteMapInner.tsx` → `@/components/ui/map`
  - `PinLine.tsx`, `PrintTicket.tsx`, `HowToUse.tsx`, `ShortcutsHint.tsx`, `SoundStamp.tsx`, `HallLift.tsx`, `AlertStrip.tsx`
  - `ThemeSwitcher`, `LanguageSwitcher`
- Layout shell: `src/app/[locale]/layout.tsx`
- Tokens: `.superdesign/init/theme.md` (prefer over full globals.css)

**Render branch (desktop):** split `hall-body` — left desk panel (search + board), right map stage always visible; `.map-pocket` `display:none` ≥64rem.

**Render branch (mobile):** map pocketed until unfolded; desk scrolls.

## `/[locale]` not-found / error

- `src/app/[locale]/not-found.tsx` → `StatusScreen`
- `src/app/[locale]/error.tsx` → `StatusScreen`
- `src/app/global-error.tsx` → `StatusScreen` + `global-error.css`

## Context budget tip

For Superdesign reproduction of the home hall, pass:
1. `JourneySearch.tsx` (render JSX sections via line ranges if needed)
2. `SearchForm.tsx` (structure)
3. `theme.md` compact summary
4. Optional: `BoardMast.tsx`, `ItineraryList.tsx` ticket markup
Skip: `map.tsx`, hooks, actions, i18n message dumps.