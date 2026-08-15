import type { Itinerary, SelectedPlace } from "@/lib/transit/types";

export const berlin: SelectedPlace = {
  id: "stop-berlin",
  name: "Berlin Hbf",
  type: "STOP",
  lat: 52.525,
  lon: 13.369,
  area: "Berlin",
};

export const prague: SelectedPlace = {
  id: "stop-prague",
  name: "Praha hl.n.",
  type: "STOP",
  lat: 50.083,
  lon: 14.435,
  area: "Prague",
};

export const dresden: SelectedPlace = {
  id: "stop-dresden",
  name: "Dresden Hbf",
  type: "STOP",
  lat: 51.04,
  lon: 13.73,
  area: "Dresden",
};

export function railItinerary(overrides: Partial<Itinerary> = {}): Itinerary {
  return {
    duration: 16_200,
    startTime: "2026-08-14T08:00:00Z",
    endTime: "2026-08-14T12:30:00Z",
    transfers: 0,
    legs: [
      {
        mode: "RAIL",
        startTime: "2026-08-14T08:00:00Z",
        endTime: "2026-08-14T12:30:00Z",
        scheduledStartTime: "2026-08-14T08:00:00Z",
        scheduledEndTime: "2026-08-14T12:30:00Z",
        realTime: false,
        scheduled: true,
        duration: 16_200,
        from: { name: berlin.name, lat: berlin.lat, lon: berlin.lon },
        to: { name: prague.name, lat: prague.lat, lon: prague.lon },
        agencyName: "Deutsche Bahn",
        routeShortName: "EC 172",
        displayName: "EC 172",
        tripId: "trip-ec-172",
        intermediateStops: [
          {
            name: dresden.name,
            lat: dresden.lat,
            lon: dresden.lon,
            arrival: "2026-08-14T10:00:00Z",
            departure: "2026-08-14T10:05:00Z",
          },
        ],
        legGeometry: { points: "", precision: 6, length: 0 },
      },
    ],
    ...overrides,
  };
}

const AGENCIES = ["Deutsche Bahn", "ČD", "ÖBB", "PKP Intercity", "MÁV", "SNCF"];

export function manyJourneys(count: number): Itinerary[] {
  const seed = railItinerary();
  const origin = Date.parse("2026-08-14T12:00:00Z");
  return Array.from({ length: count }, (_, index) => {
    const start = origin + index * 3 * 60_000;
    const duration = 7_200 + (index % 19) * 240;
    const transfers = index % 5 === 0 ? 0 : (index % 3) + 1;
    const startIso = new Date(start).toISOString();
    const endIso = new Date(start + duration * 1000).toISOString();
    const agency = AGENCIES[index % AGENCIES.length]!;
    return {
      ...seed,
      duration,
      transfers,
      startTime: startIso,
      endTime: endIso,
      legs: [
        {
          ...seed.legs[0]!,
          startTime: startIso,
          endTime: endIso,
          scheduledStartTime: startIso,
          scheduledEndTime: endIso,
          duration,
          agencyName: agency,
          routeShortName: `EC ${100 + index}`,
          displayName: `EC ${100 + index}`,
          tripId: `trip-${index}`,
        },
      ],
    };
  });
}
