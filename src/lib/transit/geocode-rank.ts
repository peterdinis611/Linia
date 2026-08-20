import { areaLabel, type GeocodeMatch } from "./types";

const MAX_GUESSES = 8;

const RAIL_MODES = new Set([
  "RAIL",
  "HIGHSPEED_RAIL",
  "LONG_DISTANCE",
  "NIGHT_RAIL",
  "REGIONAL_RAIL",
  "REGIONAL_FAST_RAIL",
  "SUBURBAN",
  "SUBWAY",
  "TRAM",
]);

function fold(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function tokens(text: string) {
  return fold(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((part) => part.length >= 2);
}

function overlap(query: string, match: GeocodeMatch) {
  const needle = tokens(query);
  if (needle.length === 0) return 0;
  const hay = tokens(
    [match.name, match.street, areaLabel(match.areas)].filter(Boolean).join(" "),
  );
  let hit = 0;
  for (const token of needle) {
    if (hay.some((part) => part === token || part.startsWith(token) || token.startsWith(part))) {
      hit += 1;
    }
  }
  return hit / needle.length;
}

function typeRank(type: string, addressQuery: boolean) {
  if (addressQuery) {
    if (type === "ADDRESS") return 0;
    if (type === "STOP") return 1;
    return 2;
  }
  if (type === "STOP") return 0;
  if (type === "ADDRESS") return 1;
  return 2;
}

function queryWantsRail(query: string) {
  const text = fold(query);
  return /(hbf|hl\.?\s*n\.?|nadrazi|zeleznic|bahnhof|railway|hlavn[aay] stanic|\bzst\b)/.test(
    text,
  );
}

export function stopModeKind(
  match: GeocodeMatch,
): "bus" | "rail" | "mixed" | "other" {
  const modes = match.modes ?? [];
  const bus = modes.some((mode) => mode === "BUS" || mode === "COACH");
  const rail = modes.some((mode) => RAIL_MODES.has(mode));
  if (bus && rail) return "mixed";
  if (bus) return "bus";
  if (rail) return "rail";
  return "other";
}

function sameNameModeRank(match: GeocodeMatch, wantRail: boolean) {
  if (match.type !== "STOP") return 1;
  const kind = stopModeKind(match);
  if (wantRail) return kind === "rail" || kind === "mixed" ? 0 : 1;
  if (kind === "bus") return 0;
  if (kind === "mixed") return 1;
  if (kind === "rail") return 2;
  return 3;
}

export function rankGeocodeMatches(
  matches: GeocodeMatch[],
  query = "",
): GeocodeMatch[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [...matches]
      .sort((a, b) => {
        const byType = typeRank(a.type, false) - typeRank(b.type, false);
        if (byType !== 0) return byType;
        return (b.score ?? 0) - (a.score ?? 0);
      })
      .slice(0, MAX_GUESSES);
  }

  const addressQuery = /\d/.test(trimmed);
  const wantRail = queryWantsRail(trimmed);
  return matches
    .map((match, index) => ({
      match,
      index,
      overlap: overlap(trimmed, match),
    }))
    .sort((a, b) => {
      const byOverlap = b.overlap - a.overlap;
      if (Math.abs(byOverlap) > 0.04) return byOverlap;
      const byType =
        typeRank(a.match.type, addressQuery) - typeRank(b.match.type, addressQuery);
      if (byType !== 0) return byType;
      if (
        a.match.type === "STOP" &&
        b.match.type === "STOP" &&
        fold(a.match.name) === fold(b.match.name)
      ) {
        const byMode =
          sameNameModeRank(a.match, wantRail) - sameNameModeRank(b.match, wantRail);
        if (byMode !== 0) return byMode;
      }
      const byScore = (b.match.score ?? 0) - (a.match.score ?? 0);
      if (byScore !== 0) return byScore;
      return a.index - b.index;
    })
    .map((item) => item.match)
    .slice(0, MAX_GUESSES);
}
