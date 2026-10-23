# Extractable Superdesign components

## DeskStrip (header)
- Source: inline in `JourneySearch.tsx` (`.desk-strip`)
- Category: layout
- Description: Top hall strip — lang, theme, sound, live clock, Linia wordmark
- Extractable props: `localeCode` (string), `clockLabel` (string), `soundOn` (boolean)
- Hardcoded: brand name “Linia”, layout classes

## SearchForm
- Source: `src/features/journey/components/SearchForm.tsx`
- Category: basic
- Description: Origin/destination/via, when stamps, mode filters, find CTA
- Extractable props: `routeMode` (point|via|board), `leaveNow`, `allDay`, `wantReturn`
- Hardcoded: stamp labels via i18n, field structure

## TicketRow
- Source: `src/features/journey/components/ItineraryList.tsx` (`.ticket` option)
- Category: basic
- Description: One connection on the board — time range, duration, carriers, faults
- Extractable props: `selected` (boolean), `timeRange`, `duration`, `lineLabel`, `carrierLine`
- Hardcoded: ticket CSS, fault chips

## BoardMast
- Source: `src/features/journey/components/BoardMast.tsx`
- Category: layout
- Description: Results header with count, live lamp, share, earlier/later
- Extractable props: `countLabel`, `liveFresh`, `showShare`
- Hardcoded: split-flap styling

## MapPocket
- Source: `src/features/journey/components/RouteMap.tsx` (pocket button + stage)
- Category: layout
- Description: Foldable map caption + map stage
- Extractable props: `expanded` (boolean), `caption` (string)
- Hardcoded: map internals

## StampButton (pattern)
- Source: CSS `.stamp` / `.search-cta` in globals.css
- Category: basic
- Description: Paper hall pressable stamp
- Extractable props: `pressed` (boolean), `label`, `variant` (stamp|cta)
- Hardcoded: border, mono uppercase look

## StatusScreen
- Source: `src/components/status/StatusScreen.tsx`
- Category: layout
- Description: Full-hall fault/empty face
- Extractable props: `kicker`, `title`, `body`, `mark`
- Hardcoded: Linia brand block, signal lamp