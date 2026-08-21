import { describe, expect, it } from "vitest";
import { berlin, dresden, prague, railItinerary } from "@/test/fixtures";
import {
  boardDestinations,
  itineraryEndPlace,
  itineraryFromStopTime,
  mapDestination,
  pathPointsForLeg,
  stopPointsForLeg,
} from "@/lib/transit/path";

describe("pathPointsForLeg", () => {
  it("traces stops when MOTIS leaves the suburban polyline blank", () => {
    const [leg] = railItinerary().legs;
    expect(leg?.legGeometry.points).toBe("");
    expect(pathPointsForLeg(leg!)).toEqual([
      [berlin.lat, berlin.lon],
      [dresden.lat, dresden.lon],
      [prague.lat, prague.lon],
    ]);
  });

  it("drops unmappable SAD coordinates from the stop chain", () => {
    const [leg] = railItinerary().legs;
    expect(
      stopPointsForLeg({
        ...leg!,
        intermediateStops: [
          { name: "Ghost", lat: -1, lon: -1 },
          { name: dresden.name, lat: dresden.lat, lon: dresden.lon },
        ],
      }),
    ).toEqual([
      [berlin.lat, berlin.lon],
      [dresden.lat, dresden.lon],
      [prague.lat, prague.lon],
    ]);
  });

  it("pins the end of a board trip", () => {
    const end = itineraryEndPlace(railItinerary());
    expect(end).toMatchObject({
      name: prague.name,
      lat: prague.lat,
      lon: prague.lon,
    });
  });

  it("sketches a suburban trip from the two board ends", () => {
    const trip = itineraryFromStopTime({
      place: {
        name: berlin.name,
        lat: berlin.lat,
        lon: berlin.lon,
        departure: "2026-08-14T08:00:00Z",
      },
      mode: "BUS",
      realTime: false,
      tripTo: { name: prague.name, lat: prague.lat, lon: prague.lon },
      tripId: "bus-1",
    });
    expect(pathPointsForLeg(trip!.legs[0]!)).toEqual([
      [berlin.lat, berlin.lon],
      [prague.lat, prague.lon],
    ]);
  });

  it("collects unique termini from a station board", () => {
    expect(
      boardDestinations([
        {
          place: berlin,
          mode: "BUS",
          realTime: false,
          tripTo: prague,
        },
        {
          place: berlin,
          mode: "BUS",
          realTime: false,
          tripTo: prague,
        },
        {
          place: berlin,
          mode: "BUS",
          realTime: false,
          tripTo: { name: "Ghost", lat: -1, lon: -1 },
        },
      ]),
    ).toMatchObject([{ name: prague.name, lat: prague.lat, lon: prague.lon }]);
  });

  it("falls back to the first mapped terminus when the trip has no end", () => {
    expect(
      mapDestination({
        itinerary: null,
        event: { place: berlin, mode: "BUS", realTime: false, headsign: "Praha" },
        ends: [
          {
            id: "prague",
            name: prague.name,
            type: "STOP",
            lat: prague.lat,
            lon: prague.lon,
          },
        ],
      }),
    ).toMatchObject({ name: prague.name });
  });
});
