import { describe, expect, it } from "vitest";
import { shortCarrierName } from "@/lib/carriers";

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
