# Linia

Open European timetables. A paper hall for live bus and train connections.

Linia searches [Transitous](https://transitous.org/) (MOTIS) and prints the result as a station board: origin, destination, clock, carriers, and the line stop by stop. There are no accounts and no booking. You read the board, pick a ticket, and share the public link.

## What the hall does

- Search point-to-point or via up to two stops
- Leave now, arrive by, or stamp **That day** for every connection on a date
- Filter rail or coach, direct or transfers, then sort by departure, duration, or changes
- Pin places on the map, drag the pins, and follow the route
- Share a public link or a calendar file
- English, Slovak, Czech, German, Polish, Hungarian, French, Italian, Spanish, Dutch, Romanian, Croatian, and Ukrainian

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The hall talks to Transitous by default.

| Variable | Purpose |
| --- | --- |
| `MOTIS_BASE` | MOTIS API root. Defaults to `https://api.transitous.org/api`. |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL in production (sitemap, Open Graph, share links). |

## Scripts

```bash
npm run dev          # hall
npm run build        # production build
npm run lint
npm test             # Vitest from src/__tests__
npm run test:watch
npm run test:stress  # packed boards, stamp bursts
npm run test:e2e     # Playwright against a mock MOTIS
npm run test:e2e:stress
```

End-to-end tests start a mock MOTIS server and a Next.js app. They do not call the live Transitous API.

## Data

Routing and geocoding come from [Transitous](https://transitous.org/sources/), built on open timetable feeds. The map uses [OpenStreetMap](https://www.openstreetmap.org/copyright).
