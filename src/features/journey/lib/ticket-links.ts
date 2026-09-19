/**
 * Maps known carriers to their own timetable boards.
 * Linia does not sell tickets — these links leave the hall.
 */

import { isTransitMode } from "@/lib/format";
import type { Itinerary } from "@/lib/transit/types";

export type TicketLink = {
  label: string;
  url: string;
  /** true when the link goes to an exact pre-filled search, false for the carrier homepage */
  prefilled: boolean;
};

type AgencyRule = {
  /** Substrings to match against the agency name (case-insensitive) */
  match: string[];
  buildUrl: (from: string, to: string, date: string) => string;
  label: string;
};

const RULES: AgencyRule[] = [
  // Slovak railways
  {
    match: ["zssk", "zeleznice", "železnice", "železničná", "železnicna"],
    label: "ZSSK",
    buildUrl: (from, to, date) =>
      `https://www.zssk.sk/sk/vyhladanie-spojenia/?from=${enc(from)}&to=${enc(to)}&date=${date}&time=00%3A00&type=departure`,
  },
  // Czech railways
  {
    match: ["cd ", "české dráhy", "ceske drahy", "czech railways", "čd"],
    label: "České dráhy",
    buildUrl: (from, to, date) =>
      `https://www.cd.cz/spojeni-a-jizdenky/vyhledat-spojeni/#from=${enc(from)}&to=${enc(to)}&date=${date}`,
  },
  // Austrian railways
  {
    match: ["öbb", "obb", "austrian federal railways", "austrian railways"],
    label: "ÖBB",
    buildUrl: (from, to, date) =>
      `https://www.oebb.at/de/fahrplan?from=${enc(from)}&to=${enc(to)}&date=${date}`,
  },
  // German railways
  {
    match: ["db ", "deutsche bahn", "dbag", "db regio", "db fernverkehr"],
    label: "DB",
    buildUrl: (from, to, date) =>
      `https://www.bahn.de/buchung/fahrplan/suche#sts=true&so=${enc(from)}&zo=${enc(to)}&kl=2&r=13:16:KLASSENLOS:1&soid=&zoid=&d=${date}`,
  },
  // RegioJet
  {
    match: ["regiojet", "student agency"],
    label: "RegioJet",
    buildUrl: (from, to, date) =>
      `https://regiojet.com/tickets/${enc(from)}/${enc(to)}/${date}/`,
  },
  // FlixBus / FlixTrain
  {
    match: ["flixbus", "flixtrain", "flix"],
    label: "FlixBus",
    buildUrl: (from, to) =>
      `https://global.flixbus.com/bus-tickets/?from=${enc(from)}&to=${enc(to)}`,
  },
  // SBB (Swiss railways)
  {
    match: ["sbb", "cff", "ffs", "swiss federal"],
    label: "SBB",
    buildUrl: (from, to, date) =>
      `https://www.sbb.ch/en/buying/pages/fahrplan/fahrplan.xhtml?von=${enc(from)}&nach=${enc(to)}&datum=${date}`,
  },
  // SNCF (French railways)
  {
    match: ["sncf", "tgv", "intercites", "ter "],
    label: "SNCF",
    buildUrl: (from, to, date) =>
      `https://www.sncf-connect.com/app/en-en/search?originLabel=${enc(from)}&destinationLabel=${enc(to)}&outwardDate=${date}`,
  },
  // NS (Dutch railways)
  {
    match: ["ns ", "nederlandse spoorwegen", "dutch railways"],
    label: "NS",
    buildUrl: (from, to, date) =>
      `https://www.ns.nl/reisplanner/#/?from=${enc(from)}&to=${enc(to)}&type=departure&dateTime=${date}T09%3A00`,
  },
  // PKP (Polish railways)
  {
    match: ["pkp", "polskie koleje", "polish railways", "ic "],
    label: "PKP",
    buildUrl: (from, to) =>
      `https://www.intercity.pl/en/site/for-passengers/information/train-search.html?from=${enc(from)}&to=${enc(to)}`,
  },
  // Trenitalia (Italian railways)
  {
    match: ["trenitalia", "rfi", "trenord", "italo"],
    label: "Trenitalia",
    buildUrl: (from, to, date) =>
      `https://www.trenitalia.com/en/html/trenitalia/timetables.html?fromStation=${enc(from)}&toStation=${enc(to)}&fromDate=${date}`,
  },
  // Renfe (Spanish railways)
  {
    match: ["renfe", "cercanias", "ave "],
    label: "Renfe",
    buildUrl: (from, to, date) =>
      `https://venta.renfe.com/vol/searchTrain.do?cdgoOrigen=${enc(from)}&cdgoDestino=${enc(to)}&fechaViaje=${date}`,
  },
  // MÁV (Hungarian railways)
  {
    match: ["mav", "máv", "hungarian state railways", "vo"],
    label: "MÁV",
    buildUrl: (from, to) =>
      `https://jegy.mav.hu/?from=${enc(from)}&to=${enc(to)}`,
  },
  // MAV-Start
  {
    match: ["mav-start", "mávstart"],
    label: "MÁV-START",
    buildUrl: (from, to) =>
      `https://jegy.mav.hu/?from=${enc(from)}&to=${enc(to)}`,
  },
  // Eurostar
  {
    match: ["eurostar"],
    label: "Eurostar",
    buildUrl: (from, to, date) =>
      `https://www.eurostar.com/uk-en/train-times/${enc(from)}-to-${enc(to)}/${date}`,
  },
  // Interrail / Rail Europe fallback for cross-border
  {
    match: ["rail europe", "raileurope"],
    label: "Rail Europe",
    buildUrl: (from, to, date) =>
      `https://www.raileurope.com/train-tickets/${enc(from)}-to-${enc(to)}/?date=${date}`,
  },
];

function enc(s: string) {
  return encodeURIComponent(s.trim());
}

/**
 * Returns a booking link for the given agency name, or null if not recognized.
 * @param agencyName  The agency/carrier name from the itinerary leg.
 * @param fromName    Human-readable origin place name.
 * @param toName      Human-readable destination place name.
 * @param isoDate     ISO date string (YYYY-MM-DD).
 */
export function ticketLinkForAgency(
  agencyName: string,
  fromName: string,
  toName: string,
  isoDate: string,
): TicketLink | null {
  const lower = agencyName.toLowerCase();
  for (const rule of RULES) {
    if (rule.match.some((m) => lower.includes(m.toLowerCase()))) {
      return {
        label: rule.label,
        url: rule.buildUrl(fromName, toName, isoDate),
        prefilled: true,
      };
    }
  }
  return null;
}

/**
 * Returns the YYYY-MM-DD date portion of an ISO datetime string.
 */
export function isoDateOnly(isoString: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(isoString)) return isoString.slice(0, 10);
  const instant = new Date(isoString);
  if (Number.isNaN(instant.getTime())) return isoString.slice(0, 10);
  const year = instant.getFullYear();
  const month = String(instant.getMonth() + 1).padStart(2, "0");
  const day = String(instant.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ticketLinkForItinerary(itinerary: Itinerary): TicketLink | null {
  const fromName = itinerary.legs[0]?.from.name ?? "";
  const toName = itinerary.legs.at(-1)?.to.name ?? "";
  const date = isoDateOnly(itinerary.startTime);
  for (const leg of itinerary.legs) {
    if (!isTransitMode(leg.mode) || !leg.agencyName) continue;
    const link = ticketLinkForAgency(leg.agencyName, fromName, toName, date);
    if (link) return link;
  }
  return null;
}
