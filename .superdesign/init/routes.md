# Routes

**Framework:** Next.js App Router (`src/app`), locale segment.

| URL | File | Renders |
|---|---|---|
| `/` | middleware → locale redirect | — |
| `/[locale]` | `src/app/[locale]/page.tsx` | `<JourneySearch />` — entire product UI |
| `/[locale]/[...rest]` | `src/app/[locale]/[...rest]/page.tsx` | 404 catch-all |
| `/[locale]/not-found` | `src/app/[locale]/not-found.tsx` | Branded empty platform |
| `/[locale]/error` | `src/app/[locale]/error.tsx` | Error boundary |
| `/[locale]/opengraph-image` | OG image | Hall metadata art |
| `/[locale]/ticket-og` | ticket OG (if present) | Shared ticket card |
| `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/manifest.webmanifest` | app routes | SEO |

**Locales:** en, sk, cs, de, pl, hu, fr, it, es, nl, ro, hr, uk (`src/i18n/config.ts`).

**Layout:** `src/app/[locale]/layout.tsx` — fonts, i18n, theme, `HallToaster`, globals.css. No separate nav chrome; hall chrome lives inside `JourneySearch`.

**Home is the app:** one composition — desk (search + results) + wall map.