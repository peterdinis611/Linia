import { describe, expect, it } from "vitest";
import { buildPrintSheets } from "@/features/journey/lib/print-sheets";
import { berlin, prague, railItinerary } from "@/test/fixtures";

describe("buildPrintSheets", () => {
  it("inks one sheet for the chosen connection", () => {
    const selected = railItinerary();
    const sheets = buildPrintSheets({
      boardView: false,
      wantReturn: false,
      selected,
      outboundSelected: selected,
      returnSelected: null,
      held: null,
      from: berlin,
      to: prague,
      city: null,
      shareUrl: "https://linia.example/en",
    });
    expect(sheets).toHaveLength(1);
    expect(sheets[0]?.role).toBe("selected");
    expect(sheets[0]?.url).toBe("https://linia.example/en");
  });

  it("adds the held print beside the selected route", () => {
    const selected = railItinerary({
      startTime: "2026-08-14T08:00:00Z",
      endTime: "2026-08-14T12:30:00Z",
    });
    const held = railItinerary({
      startTime: "2026-08-14T09:00:00Z",
      endTime: "2026-08-14T13:45:00Z",
    });
    const sheets = buildPrintSheets({
      boardView: false,
      wantReturn: false,
      selected,
      outboundSelected: selected,
      returnSelected: null,
      held,
      from: berlin,
      to: prague,
      city: null,
    });
    expect(sheets.map((sheet) => sheet.role)).toEqual(["selected", "held"]);
  });

  it("prints outbound and return as two sheets", () => {
    const outbound = railItinerary({
      startTime: "2026-08-14T08:00:00Z",
      endTime: "2026-08-14T12:30:00Z",
    });
    const inbound = railItinerary({
      startTime: "2026-08-15T14:00:00Z",
      endTime: "2026-08-15T18:30:00Z",
    });
    const sheets = buildPrintSheets({
      boardView: false,
      wantReturn: true,
      selected: outbound,
      outboundSelected: outbound,
      returnSelected: inbound,
      held: null,
      from: berlin,
      to: prague,
      city: null,
    });
    expect(sheets.map((sheet) => sheet.role)).toEqual(["outbound", "return"]);
    expect(sheets[1]?.from).toEqual(prague);
    expect(sheets[1]?.to).toEqual(berlin);
  });

  it("does not duplicate a held print that is already selected", () => {
    const selected = railItinerary();
    const sheets = buildPrintSheets({
      boardView: false,
      wantReturn: false,
      selected,
      outboundSelected: selected,
      returnSelected: null,
      held: selected,
      from: berlin,
      to: prague,
      city: null,
    });
    expect(sheets).toHaveLength(1);
  });
});
