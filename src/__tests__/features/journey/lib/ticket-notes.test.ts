import { describe, expect, it } from "vitest";
import {
  lastDepartureKey,
  ticketFault,
  ticketTightTransfer,
  ticketTrackChange,
  tightTransfers,
  trackChange,
  waitToDepartSeconds,
  walkNotes,
} from "@/features/journey/lib/ticket-notes";
import { berlin, dresden, prague, railItinerary } from "@/test/fixtures";
import type { Leg } from "@/lib/transit/types";

function walkLeg(overrides: Partial<Leg> = {}): Leg {
  const rail = railItinerary().legs[0]!;
  return {
    ...rail,
    mode: "WALK",
    duration: 480,
    agencyName: undefined,
    routeShortName: undefined,
    displayName: undefined,
    tripId: undefined,
    intermediateStops: [],
    ...overrides,
  };
}

describe("ticket notes", () => {
  it("prints access and transfer walks, not the last walk off the train", () => {
    const rail = railItinerary().legs[0]!;
    const itinerary = railItinerary({
      transfers: 1,
      legs: [
        walkLeg({
          duration: 480,
          startTime: "2026-08-14T07:52:00Z",
          endTime: "2026-08-14T08:00:00Z",
          from: { name: "Street", lat: berlin.lat, lon: berlin.lon },
          to: { name: berlin.name, lat: berlin.lat, lon: berlin.lon },
        }),
        {
          ...rail,
          from: { name: berlin.name, lat: berlin.lat, lon: berlin.lon },
          to: { name: dresden.name, lat: dresden.lat, lon: dresden.lon },
        },
        walkLeg({
          duration: 720,
          startTime: "2026-08-14T10:00:00Z",
          endTime: "2026-08-14T10:12:00Z",
          from: { name: dresden.name, lat: dresden.lat, lon: dresden.lon },
          to: { name: "Dresden transfer", lat: dresden.lat, lon: dresden.lon },
        }),
        {
          ...rail,
          startTime: "2026-08-14T10:12:00Z",
          endTime: "2026-08-14T12:30:00Z",
          from: { name: "Dresden transfer", lat: dresden.lat, lon: dresden.lon },
          to: { name: prague.name, lat: prague.lat, lon: prague.lon },
        },
        walkLeg({
          duration: 300,
          startTime: "2026-08-14T12:30:00Z",
          endTime: "2026-08-14T12:35:00Z",
          from: { name: prague.name, lat: prague.lat, lon: prague.lon },
          to: { name: "Hotel", lat: prague.lat, lon: prague.lon },
        }),
      ],
    });

    expect(walkNotes(itinerary)).toEqual([
      { kind: "access", seconds: 480, name: berlin.name },
      { kind: "transfer", seconds: 720 },
    ]);
  });

  it("stamps cancelled and delayed faults on a ticket", () => {
    const delayed = railItinerary({
      legs: [
        {
          ...railItinerary().legs[0]!,
          realTime: true,
          cancelled: true,
          startTime: "2026-08-14T08:12:00Z",
          scheduledStartTime: "2026-08-14T08:00:00Z",
        },
      ],
    });
    expect(ticketFault(delayed)).toEqual({
      cancelled: true,
      delayMinutes: 12,
    });
    expect(ticketFault(railItinerary())).toEqual({
      cancelled: false,
      delayMinutes: null,
    });
  });

  it("marks the last departure on the day's board", () => {
    const first = railItinerary();
    const last = railItinerary({
      startTime: "2026-08-14T21:40:00Z",
      endTime: "2026-08-14T23:10:00Z",
    });
    expect(lastDepartureKey([first, last])).toBe(
      `${last.startTime}|${last.endTime}`,
    );
  });

  it("stamps a platform change as loud as a delay", () => {
    expect(
      trackChange({
        name: berlin.name,
        lat: berlin.lat,
        lon: berlin.lon,
        track: "4",
        scheduledTrack: "12",
      }),
    ).toEqual({ track: "4", was: "12" });
    expect(
      trackChange({
        name: berlin.name,
        lat: berlin.lat,
        lon: berlin.lon,
        track: "12",
        scheduledTrack: "12",
      }),
    ).toBeNull();

    const moved = railItinerary({
      legs: [
        {
          ...railItinerary().legs[0]!,
          from: {
            name: berlin.name,
            lat: berlin.lat,
            lon: berlin.lon,
            track: "4",
            scheduledTrack: "12",
          },
        },
      ],
    });
    expect(ticketTrackChange(moved)).toEqual({ track: "4", was: "12" });
    expect(ticketTrackChange(railItinerary())).toBeNull();
  });

  it("stamps a tight change when the window is five minutes or less", () => {
    const rail = railItinerary().legs[0]!;
    const tight = railItinerary({
      transfers: 1,
      legs: [
        {
          ...rail,
          startTime: "2026-08-14T08:00:00Z",
          endTime: "2026-08-14T10:00:00Z",
          from: { name: berlin.name, lat: berlin.lat, lon: berlin.lon },
          to: { name: dresden.name, lat: dresden.lat, lon: dresden.lon },
        },
        {
          ...rail,
          startTime: "2026-08-14T10:03:00Z",
          endTime: "2026-08-14T12:30:00Z",
          from: { name: dresden.name, lat: dresden.lat, lon: dresden.lon },
          to: { name: prague.name, lat: prague.lat, lon: prague.lon },
        },
      ],
    });
    expect(ticketTightTransfer(tight)).toMatchObject({
      minutes: 3,
      name: dresden.name,
    });
    expect(tightTransfers(tight)).toHaveLength(1);

    const ample = railItinerary({
      transfers: 1,
      legs: [
        {
          ...rail,
          startTime: "2026-08-14T08:00:00Z",
          endTime: "2026-08-14T10:00:00Z",
          to: { name: dresden.name, lat: dresden.lat, lon: dresden.lon },
        },
        {
          ...rail,
          startTime: "2026-08-14T10:20:00Z",
          endTime: "2026-08-14T12:30:00Z",
          from: { name: dresden.name, lat: dresden.lat, lon: dresden.lon },
        },
      ],
    });
    expect(ticketTightTransfer(ample)).toBeNull();
  });

  it("stamps a long walk when there is almost no slack", () => {
    const rail = railItinerary().legs[0]!;
    const squeezed = railItinerary({
      transfers: 1,
      legs: [
        {
          ...rail,
          endTime: "2026-08-14T10:00:00Z",
          to: { name: dresden.name, lat: dresden.lat, lon: dresden.lon },
        },
        walkLeg({
          duration: 720,
          startTime: "2026-08-14T10:00:00Z",
          endTime: "2026-08-14T10:12:00Z",
          from: { name: dresden.name, lat: dresden.lat, lon: dresden.lon },
          to: { name: dresden.name, lat: dresden.lat, lon: dresden.lon },
        }),
        {
          ...rail,
          startTime: "2026-08-14T10:13:00Z",
          endTime: "2026-08-14T12:30:00Z",
          from: { name: dresden.name, lat: dresden.lat, lon: dresden.lon },
        },
      ],
    });
    expect(ticketTightTransfer(squeezed)?.minutes).toBe(13);
  });

  it("counts down only while the ticket is still waiting on the board", () => {
    const now = Date.parse("2026-08-14T07:52:00Z");
    expect(waitToDepartSeconds("2026-08-14T08:00:00Z", now)).toBe(480);
    expect(waitToDepartSeconds("2026-08-14T07:51:00Z", now)).toBeNull();
    expect(waitToDepartSeconds("2026-08-14T10:00:00Z", now)).toBeNull();
  });
});
