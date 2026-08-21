import { describe, expect, it } from "vitest";
import { rankGeocodeMatches } from "@/lib/transit/geocode-rank";
import type { GeocodeMatch } from "@/lib/transit/types";

function address(
  name: string,
  area: string,
  score: number,
  extras: Partial<GeocodeMatch> = {},
): GeocodeMatch {
  return {
    type: "ADDRESS",
    name,
    id: name,
    lat: 49,
    lon: 21,
    score,
    areas: [{ name: area, adminLevel: 8, matched: true, default: true }],
    modes: [],
    ...extras,
  };
}

describe("rankGeocodeMatches", () => {
  it("keeps the typed street even when MOTIS scores the wrong square higher", () => {
    const legion = address("Námestie legionárov 2728/2", "Prešov", -33.25);
    const snp = address("Námestie SNP 352/2", "Nitrianske Pravno", -9.25);
    const ranked = rankGeocodeMatches(
      [legion, snp, address("Námestie SNP 186/2", "Partizánske", -9.25)],
      "Námestie legionárov 2728/2",
    );
    expect(ranked[0]?.name).toBe("Námestie legionárov 2728/2");
    expect(ranked[0]?.name).not.toMatch(/SNP/);
  });

  it("still prefers stations when the query is a stop name", () => {
    const stop: GeocodeMatch = {
      type: "STOP",
      name: "Prešov",
      id: "stop-presov",
      lat: 49,
      lon: 21.25,
      score: 0.4,
      modes: [],
      areas: [{ name: "Prešov", adminLevel: 8, matched: true, default: true }],
    };
    const place: GeocodeMatch = {
      type: "PLACE",
      name: "Prešov",
      id: "place-presov",
      lat: 49,
      lon: 21.24,
      score: 0.9,
      modes: [],
      areas: [{ name: "Prešov", adminLevel: 8, matched: true, default: true }],
    };
    expect(rankGeocodeMatches([place, stop], "Prešov")[0]?.type).toBe("STOP");
  });

  it("puts the suburban bus stop ahead of a same-named rail halt", () => {
    const rail: GeocodeMatch = {
      type: "STOP",
      name: "Veľký Šariš",
      id: "sk-zsr",
      lat: 49.04,
      lon: 21.19,
      score: -8,
      modes: ["REGIONAL_RAIL"],
      areas: [{ name: "Slovensko", adminLevel: 2, matched: true, default: true }],
    };
    const bus: GeocodeMatch = {
      type: "STOP",
      name: "Veľký Šariš",
      id: "sk-sad",
      lat: 49.04,
      lon: 21.19,
      score: -21,
      modes: ["BUS"],
      areas: [{ name: "Slovensko", adminLevel: 2, matched: true, default: true }],
    };
    const ranked = rankGeocodeMatches([rail, bus], "Veľký Šariš");
    expect(ranked[0]?.id).toBe("sk-sad");
    expect(ranked[1]?.id).toBe("sk-zsr");
  });

  it("keeps a rail halt first when the query asks for the station", () => {
    const rail: GeocodeMatch = {
      type: "STOP",
      name: "Veľký Šariš",
      id: "sk-zsr",
      lat: 49.04,
      lon: 21.19,
      score: -8,
      modes: ["REGIONAL_RAIL"],
      areas: [{ name: "Slovensko", adminLevel: 2, matched: true, default: true }],
    };
    const bus: GeocodeMatch = {
      type: "STOP",
      name: "Veľký Šariš",
      id: "sk-sad",
      lat: 49.04,
      lon: 21.19,
      score: -21,
      modes: ["BUS"],
      areas: [{ name: "Slovensko", adminLevel: 2, matched: true, default: true }],
    };
    expect(rankGeocodeMatches([rail, bus], "Veľký Šariš žst")[0]?.id).toBe("sk-zsr");
  });

  it("does not drop the best textual match behind eight weaker scores", () => {
    const wanted = address("Námestie legionárov 2728/2", "Prešov", -40);
    const noise = Array.from({ length: 9 }, (_, index) =>
      address(`Námestie SNP ${index}/2`, "Detva", -8),
    );
    const ranked = rankGeocodeMatches([wanted, ...noise], "Námestie legionárov");
    expect(ranked[0]).toEqual(wanted);
    expect(ranked).toHaveLength(8);
  });

  it("prefers a city place when the desk asks for a town", () => {
    const town: GeocodeMatch = {
      type: "PLACE",
      name: "Bardejov",
      id: "place-bardejov",
      lat: 49.29,
      lon: 21.27,
      score: -20,
      modes: [],
      areas: [{ name: "Slovensko", adminLevel: 2, matched: true, default: true }],
    };
    const stop: GeocodeMatch = {
      type: "STOP",
      name: "Bardejov",
      id: "sk-sad-bardejov",
      lat: 49.29,
      lon: 21.27,
      score: -4,
      modes: ["BUS"],
      areas: [{ name: "Slovensko", adminLevel: 2, matched: true, default: true }],
    };
    expect(rankGeocodeMatches([stop, town], "Bardejov")[0]?.type).toBe("STOP");
    expect(
      rankGeocodeMatches([stop, town], "Bardejov", { preferType: "PLACE" })[0]
        ?.type,
    ).toBe("PLACE");
  });

  it("keeps European towns and drops cities outside Europe", () => {
    const presov: GeocodeMatch = {
      type: "PLACE",
      name: "Prešov",
      id: "place-presov",
      lat: 48.998,
      lon: 21.24,
      score: -12,
      modes: [],
      areas: [{ name: "Slovensko", adminLevel: 2, matched: true, default: true }],
    };
    const parisTexas: GeocodeMatch = {
      type: "PLACE",
      name: "Paris",
      id: "place-paris-tx",
      lat: 33.661,
      lon: -95.555,
      score: -2,
      modes: [],
      areas: [{ name: "United States", adminLevel: 2, matched: true, default: true }],
    };
    const ranked = rankGeocodeMatches([parisTexas, presov], "Prešov", {
      preferType: "PLACE",
    });
    expect(ranked.map((match) => match.name)).toEqual(["Prešov"]);
  });
});
