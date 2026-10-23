# Linia theme

## Compact token summary (use this first)

**Product:** European public-transport industrial departure hall — search journeys, board, map. No accounts/booking.

**Current fonts (Next Google fonts):**
- Display: **Barlow Condensed** (`--font-display`) — utilitarian condensed sans
- Body: **IBM Plex Sans** (`--font-sans`)
- Mono / stamps: **IBM Plex Mono** (`--font-mono`)

**Light (`:root`):**
| Token | Value | Role |
|---|---|---|
| `--paper` | `#d8dee8` | Cool enamel ground |
| `--paper-raised` | `#e8edf4` | Tickets, raised panels |
| `--paper-sunken` | `#c5cedb` | Recessed fields |
| `--ink` | `#12151a` | Primary text |
| `--ink-muted` | `#5c6b7e` | Secondary |
| `--signal` / `--amber` | `#ffb020` | LED accent / CTA / live |
| `--hazard` | `#e11d2e` | Delays / cancellations only |
| `--board` | `#12151a` | Dark board mast |
| `--rule` | `#a8b4c4` | Borders |

**Dark (`html.dark`):** `--paper #0c0e12`, `--ink #e8edf2`, `--signal/#amber #ffb020`, `--hazard #ff3b30`, charcoal enamel panels.

**CSS approach:** Tailwind v4 (`@import "tailwindcss"`) + large custom hall CSS in `src/app/globals.css`. Tokens mapped via `@theme inline` to `--color-*`.

**Locked direction:** Industrial departure board — charcoal enamel + LED amber. No cream paper, no Fraunces italic.

## Raw sources (pointers)

- Fonts: `src/lib/fonts.ts`
- Tokens + hall CSS: `src/app/globals.css` (`:root` / `html.dark` / `@theme inline` at top; hall layout from ~`.hall-shell` onward)
- Theme provider: `src/components/theme/ThemeProvider.tsx`
- No `tailwind.config.ts` — Tailwind 4 CSS-first

Do **not** pass entire `globals.css` as `--context-file`; use this summary + line-range `:1:120` if needed.
