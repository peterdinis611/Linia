import { formatTime, isTransitMode, legName } from "@/lib/format";
import type { Itinerary, SelectedPlace } from "@/lib/transit/types";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toUtcStamp(iso: string) {
  const date = new Date(iso);
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function escapeIcs(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}

function foldLine(line: string) {
  const chunks: string[] = [];
  for (let index = 0; index < line.length; index += 73) {
    chunks.push(line.slice(index, index + 73));
  }
  return chunks.join("\r\n ");
}

export function itineraryIcs(input: {
  itinerary: Itinerary;
  from: SelectedPlace | null;
  to: SelectedPlace | null;
  url?: string;
}) {
  const origin = input.from?.name ?? input.itinerary.legs[0]?.from.name ?? "Origin";
  const destination =
    input.to?.name ??
    input.itinerary.legs[input.itinerary.legs.length - 1]?.to.name ??
    "Destination";
  const summary = `${origin} → ${destination}`;
  const lines = input.itinerary.legs.map((leg) => {
    const label = isTransitMode(leg.mode)
      ? [legName(leg), leg.agencyName].filter(Boolean).join(" · ")
      : leg.mode;
    return `${formatTime(leg.startTime)} ${leg.from.name} → ${formatTime(leg.endTime)} ${leg.to.name} (${label})`;
  });
  const description = [summary, ...lines, input.url ?? ""]
    .filter(Boolean)
    .join("\n");
  const uid = `linia-${toUtcStamp(input.itinerary.startTime)}-${origin}-${destination}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Linia//Journey//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    foldLine(`UID:${uid}@linia`),
    `DTSTAMP:${toUtcStamp(new Date().toISOString())}`,
    `DTSTART:${toUtcStamp(input.itinerary.startTime)}`,
    `DTEND:${toUtcStamp(input.itinerary.endTime)}`,
    foldLine(`SUMMARY:${escapeIcs(summary)}`),
    foldLine(`DESCRIPTION:${escapeIcs(description)}`),
    foldLine(`LOCATION:${escapeIcs(origin)}`),
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

export function icsFilename(from: string, to: string) {
  const slug = `${from}-${to}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `linia-${slug || "ticket"}.ics`;
}
