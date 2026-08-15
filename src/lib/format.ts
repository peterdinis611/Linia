import type { Leg, TransitMode } from "./transit/types";

const MODE_COLORS: Record<string, string> = {
  WALK: "#8a8378",
  BIKE: "#22c55e",
  BUS: "#f59e0b",
  COACH: "#d97706",
  RAIL: "#3b82f6",
  HIGHSPEED_RAIL: "#2563eb",
  LONG_DISTANCE: "#3b82f6",
  NIGHT_RAIL: "#6366f1",
  REGIONAL_RAIL: "#60a5fa",
  REGIONAL_FAST_RAIL: "#38bdf8",
  SUBURBAN: "#06b6d4",
  SUBWAY: "#a855f7",
  TRAM: "#ef4444",
  FERRY: "#0ea5e9",
  CABLE_CAR: "#f97316",
  FUNICULAR: "#fb7185",
  AERIAL_LIFT: "#e879f9",
  AIRPLANE: "#64748b",
  TRANSIT: "#14b8a6",
};

const MODE_LABELS: Record<string, string> = {
  WALK: "Walk",
  BIKE: "Bike",
  BUS: "Bus",
  COACH: "Coach",
  RAIL: "Train",
  HIGHSPEED_RAIL: "High-speed",
  LONG_DISTANCE: "Intercity",
  NIGHT_RAIL: "Night train",
  REGIONAL_RAIL: "Regional",
  REGIONAL_FAST_RAIL: "Regional express",
  SUBURBAN: "S-Bahn",
  SUBWAY: "Metro",
  TRAM: "Tram",
  FERRY: "Ferry",
  CABLE_CAR: "Cable car",
  FUNICULAR: "Funicular",
  AERIAL_LIFT: "Gondola",
  AIRPLANE: "Flight",
  TRANSIT: "Transit",
};

export type TranslateFn = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

export function formatDuration(seconds: number, t?: TranslateFn): string {
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (t) {
    if (hours === 0) return t("format.minutes", { count: minutes });
    if (minutes === 0) return t("format.hours", { count: hours });
    return t("format.hoursMinutes", { hours, minutes });
  }
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatTime(iso: string | undefined, locale?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatClockRange(
  startIso: string,
  endIso: string,
  locale?: string,
): string {
  return `${formatTime(startIso, locale)} – ${formatTime(endIso, locale)}`;
}

export function delayMinutes(leg: Leg): number | null {
  if (!leg.realTime) return null;
  const actual = new Date(leg.startTime).getTime();
  const scheduled = new Date(leg.scheduledStartTime).getTime();
  if (Number.isNaN(actual) || Number.isNaN(scheduled)) return null;
  const minutes = Math.round((actual - scheduled) / 60000);
  return minutes === 0 ? null : minutes;
}

export function arrivalDelayMinutes(leg: Leg): number | null {
  if (!leg.realTime) return null;
  const actual = new Date(leg.endTime).getTime();
  const scheduled = new Date(leg.scheduledEndTime).getTime();
  if (Number.isNaN(actual) || Number.isNaN(scheduled)) return null;
  const minutes = Math.round((actual - scheduled) / 60000);
  return minutes === 0 ? null : minutes;
}

export function formatDistance(meters: number | undefined): string | null {
  if (meters == null || Number.isNaN(meters) || meters <= 0) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function stopTime(
  place: {
    departure?: string;
    arrival?: string;
    scheduledDeparture?: string;
    scheduledArrival?: string;
  },
  locale?: string,
): string {
  return formatTime(
    place.departure ??
      place.arrival ??
      place.scheduledDeparture ??
      place.scheduledArrival,
    locale,
  );
}

export function modeLabel(mode: TransitMode): string {
  return MODE_LABELS[mode] ?? mode.replaceAll("_", " ").toLowerCase();
}

export function modeColor(mode: TransitMode): string {
  return MODE_COLORS[mode] ?? "#14b8a6";
}

export function routeHex(color: string | undefined): string | undefined {
  if (!color) return undefined;
  const value = color.startsWith("#") ? color.slice(1) : color;
  if (/^[0-9a-fA-F]{3}$/.test(value) || /^[0-9a-fA-F]{6}$/.test(value)) {
    return `#${value}`;
  }
  return undefined;
}

export function legColor(leg: Leg): string {
  return routeHex(leg.routeColor) ?? modeColor(leg.mode);
}

export function legName(leg: Leg): string {
  if (leg.mode === "WALK") return "Walk";
  return (
    leg.displayName ||
    leg.routeShortName ||
    leg.routeLongName ||
    modeLabel(leg.mode)
  );
}

export function contrastText(hex: string): string {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#161310" : "#faf6ec";
}

export function isTransitMode(mode: TransitMode): boolean {
  return mode !== "WALK" && mode !== "BIKE" && mode !== "CAR";
}

export function toLocalDateTimeValue(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function startOfLocalDay(value: string) {
  return `${value.slice(0, 10)}T00:00`;
}

export function isoOnLocalDate(iso: string, stamp: string) {
  return toLocalDateTimeValue(new Date(iso)).slice(0, 10) === stamp.slice(0, 10);
}
