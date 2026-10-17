import type { Itinerary, SelectedPlace } from "@/lib/transit/types";
import { itineraryKey } from "./share";

export type PrintSheetRole = "selected" | "held" | "outbound" | "return";

export type PrintSheet = {
  key: string;
  role: PrintSheetRole;
  itinerary: Itinerary;
  from: SelectedPlace | null;
  to: SelectedPlace | null;
  url?: string;
};

type BuildPrintSheetsInput = {
  boardView: boolean;
  wantReturn: boolean;
  selected: Itinerary | null;
  outboundSelected: Itinerary | null;
  returnSelected: Itinerary | null;
  held: Itinerary | null;
  from: SelectedPlace | null;
  to: SelectedPlace | null;
  city: SelectedPlace | null;
  shareUrl?: string;
};

function pushSheet(
  sheets: PrintSheet[],
  seen: Set<string>,
  sheet: Omit<PrintSheet, "key"> & { key?: string },
) {
  const key = sheet.key ?? itineraryKey(sheet.itinerary);
  if (seen.has(key)) return;
  seen.add(key);
  sheets.push({ ...sheet, key });
}

/** Paper sheets for the browser print / Save as PDF dialog. */
export function buildPrintSheets(input: BuildPrintSheetsInput): PrintSheet[] {
  const sheets: PrintSheet[] = [];
  const seen = new Set<string>();
  const url = input.shareUrl || undefined;

  if (input.boardView) {
    if (input.selected) {
      pushSheet(sheets, seen, {
        role: "selected",
        itinerary: input.selected,
        from: input.from ?? input.city,
        to: input.to,
        url,
      });
    }
    return sheets;
  }

  if (input.wantReturn) {
    if (input.outboundSelected) {
      pushSheet(sheets, seen, {
        role: "outbound",
        itinerary: input.outboundSelected,
        from: input.from,
        to: input.to,
        url,
      });
    }
    if (input.returnSelected) {
      pushSheet(sheets, seen, {
        role: "return",
        itinerary: input.returnSelected,
        from: input.to,
        to: input.from,
        url,
      });
    }
  } else if (input.outboundSelected || input.selected) {
    const itinerary = input.outboundSelected ?? input.selected;
    if (itinerary) {
      pushSheet(sheets, seen, {
        role: "selected",
        itinerary,
        from: input.from,
        to: input.to,
        url,
      });
    }
  }

  if (input.held) {
    pushSheet(sheets, seen, {
      role: "held",
      itinerary: input.held,
      from: input.from,
      to: input.to,
      url,
    });
  }

  return sheets;
}
