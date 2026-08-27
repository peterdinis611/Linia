import { describe, expect, it } from "vitest";
import { formatCarrierDurationTight, shortCarrierName } from "@/lib/carriers";

describe("shortCarrierName", () => {
  it("stamps known operators as hall marks", () => {
    expect(shortCarrierName("FlixBus-eu")).toBe("FlixBus");
    expect(shortCarrierName("Železničná spoločnosť Slovensko, a.s.")).toBe("ZSSK");
    expect(shortCarrierName("Dopravný podnik Bratislava, a.s.")).toBe("DPB");
    expect(shortCarrierName("OEBB Personenverkehr AG")).toBe("ÖBB");
    expect(shortCarrierName("Deutsche Bahn")).toBe("DB");
    expect(shortCarrierName("České dráhy, a.s.")).toBe("ČD");
  });

  it("clips legal suffixes on the rest", () => {
    expect(shortCarrierName("A-EXPRESS s.r.o.")).toBe("A-EXPRESS");
    expect(shortCarrierName("RegioJet")).toBe("RegioJet");
  });
});

describe("formatCarrierDurationTight", () => {
  it("prints a single timetable cell", () => {
    expect(formatCarrierDurationTight(16_200)).toBe("4h 30");
    expect(formatCarrierDurationTight(7 * 3600 + 9 * 60)).toBe("7h 09");
    expect(formatCarrierDurationTight(25 * 60)).toBe("25m");
    expect(formatCarrierDurationTight(8 * 3600)).toBe("8h");
  });
});

describe("shortCarrierName", () => {
  it("stamps known operators as hall marks", () => {
    expect(shortCarrierName("FlixBus-eu")).toBe("FlixBus");
    expect(shortCarrierName("Železničná spoločnosť Slovensko, a.s.")).toBe("ZSSK");
    expect(shortCarrierName("Dopravný podnik Bratislava, a.s.")).toBe("DPB");
    expect(shortCarrierName("OEBB Personenverkehr AG")).toBe("ÖBB");
    expect(shortCarrierName("Deutsche Bahn")).toBe("DB");
    expect(shortCarrierName("České dráhy, a.s.")).toBe("ČD");
  });

  it("clips legal suffixes on the rest", () => {
    expect(shortCarrierName("A-EXPRESS s.r.o.")).toBe("A-EXPRESS");
    expect(shortCarrierName("RegioJet")).toBe("RegioJet");
  });
});
