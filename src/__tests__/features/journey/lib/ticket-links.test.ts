import { describe, expect, it } from "vitest";
import {
  isoDateOnly,
  ticketLinkForAgency,
  ticketLinkForItinerary,
} from "@/features/journey/lib/ticket-links";
import { railItinerary } from "@/test/fixtures";

describe("ticket links", () => {
  it("maps known carriers to their own boards", () => {
    const db = ticketLinkForAgency("Deutsche Bahn", "Berlin Hbf", "Praha hl.n.", "2026-08-14");
    expect(db?.label).toBe("DB");
    expect(db?.url).toContain("bahn.de");

    const zssk = ticketLinkForAgency("Železničná spoločnosť Slovensko", "Bratislava", "Košice", "2026-08-14");
    expect(zssk?.label).toBe("ZSSK");
    expect(zssk?.url).toContain("zssk.sk");

    const oebb = ticketLinkForAgency("ÖBB", "Wien Hbf", "Salzburg Hbf", "2026-08-14");
    expect(oebb?.url).toContain("oebb.at");
    expect(oebb?.url).not.toContain("oeamtc");

    const cd = ticketLinkForAgency("ČD", "Praha hl.n.", "Brno hl.n.", "2026-08-14");
    expect(cd?.label).toBe("České dráhy");
  });

  it("prints a carrier board from the first transit agency", () => {
    const link = ticketLinkForItinerary(railItinerary());
    expect(link?.label).toBe("DB");
    expect(isoDateOnly("2026-08-14T08:00:00Z")).toBe("2026-08-14");
  });

  it("returns nothing for an unknown carrier", () => {
    expect(
      ticketLinkForAgency("City Bus Local", "A", "B", "2026-08-14"),
    ).toBeNull();
  });
});
