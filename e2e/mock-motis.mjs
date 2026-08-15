import http from "node:http";

const PORT = Number(process.env.MOCK_MOTIS_PORT ?? 4010);

const PLACES = {
  berlin: {
    type: "STOP",
    name: "Berlin Hbf",
    id: "stop-berlin",
    lat: 52.525,
    lon: 13.369,
    score: 1,
    areas: [{ name: "Berlin", adminLevel: 8, matched: true, default: true }],
  },
  prague: {
    type: "STOP",
    name: "Praha hl.n.",
    id: "stop-prague",
    lat: 50.083,
    lon: 14.435,
    score: 1,
    areas: [{ name: "Prague", adminLevel: 8, matched: true, default: true }],
  },
  dresden: {
    type: "STOP",
    name: "Dresden Hbf",
    id: "stop-dresden",
    lat: 51.04,
    lon: 13.73,
    score: 1,
    areas: [{ name: "Dresden", adminLevel: 8, matched: true, default: true }],
  },
};

function geocode(text) {
  const query = text.toLowerCase();
  const matches = [];
  if (query.includes("berl")) matches.push(PLACES.berlin);
  if (query.includes("prah") || query.includes("prague")) {
    matches.push(PLACES.prague);
  }
  if (query.includes("dres")) matches.push(PLACES.dresden);
  return matches;
}

function isoPlusHours(iso, hours) {
  return new Date(new Date(iso).getTime() + hours * 3_600_000)
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");
}

function itinerary(start = "2026-08-14T08:00:00Z", extras = {}) {
  const end = isoPlusHours(start, 4.5);
  const route = extras.routeShortName ?? "EC 172";
  const fromPlace = extras.from ?? {
    name: "Berlin Hbf",
    lat: 52.525,
    lon: 13.369,
    stopId: "stop-berlin",
  };
  const toPlace = extras.to ?? {
    name: "Praha hl.n.",
    lat: 50.083,
    lon: 14.435,
    stopId: "stop-prague",
  };
  return {
    duration: 16200,
    startTime: start,
    endTime: end,
    transfers: 0,
    legs: [
      {
        mode: "RAIL",
        startTime: start,
        endTime: end,
        scheduledStartTime: start,
        scheduledEndTime: end,
        realTime: false,
        scheduled: true,
        duration: 16200,
        from: fromPlace,
        to: toPlace,
        agencyName: extras.agencyName ?? "Deutsche Bahn",
        routeShortName: route,
        displayName: extras.displayName ?? route,
        headsign: toPlace.name,
        tripId: extras.tripId ?? "trip-ec-172",
        alerts: extras.alerts ?? [
          {
            headerText: "Replacement coaches Dresden–Praha",
            descriptionText: "Rail replacement between Dresden and Praha.",
            effect: "MODIFIED_SERVICE",
            severityLevel: "WARNING",
          },
        ],
        intermediateStops: [
          {
            name: "Dresden Hbf",
            lat: 51.04,
            lon: 13.73,
            stopId: "stop-dresden",
            arrival: isoPlusHours(start, 2),
            departure: isoPlusHours(start, 2 + 5 / 60),
          },
        ],
        legGeometry: { points: "", precision: 6, length: 0 },
      },
    ],
  };
}

function send(response, status, body) {
  const json = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(json),
  });
  response.end(json);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${PORT}`);

  if (url.pathname === "/health") {
    send(response, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/v1/geocode") {
    const text = url.searchParams.get("text") ?? "";
    if (text.toLowerCase().includes("failnet")) {
      send(response, 503, { error: "geocode unavailable" });
      return;
    }
    send(response, 200, geocode(text));
    return;
  }

  if (url.pathname === "/api/v1/reverse-geocode") {
    const [lat, lon] = (url.searchParams.get("place") ?? "0,0")
      .split(",")
      .map(Number);
    const nearest = Object.values(PLACES).sort((a, b) => {
      const da = (a.lat - lat) ** 2 + (a.lon - lon) ** 2;
      const db = (b.lat - lat) ** 2 + (b.lon - lon) ** 2;
      return da - db;
    })[0];
    send(response, 200, nearest ? [nearest] : []);
    return;
  }

  if (url.pathname === "/api/v5/plan") {
    const searchWindow = url.searchParams.get("searchWindow");
    const time = url.searchParams.get("time");
    const fromPlace = url.searchParams.get("fromPlace") ?? "";
    const reverse = fromPlace.includes("prague") || fromPlace.includes("stop-prague");
    const extras = reverse
      ? {
          from: {
            name: "Praha hl.n.",
            lat: 50.083,
            lon: 14.435,
            stopId: "stop-prague",
          },
          to: {
            name: "Berlin Hbf",
            lat: 52.525,
            lon: 13.369,
            stopId: "stop-berlin",
          },
          routeShortName: "EC 173",
          displayName: "EC 173",
          tripId: "trip-ec-173",
          agencyName: "ČD",
          alerts: [],
        }
      : {};
    if (searchWindow === "86400" && time) {
      send(response, 200, {
        itineraries: [
          itinerary(isoPlusHours(time, 8), extras),
          itinerary(isoPlusHours(time, 16), {
            ...extras,
            routeShortName: reverse ? "EC 179" : "EC 178",
            tripId: reverse ? "trip-ec-179" : "trip-ec-178",
          }),
        ],
        direct: [],
      });
      return;
    }
    send(response, 200, {
      itineraries: [itinerary(undefined, extras)],
      direct: [],
    });
    return;
  }

  if (url.pathname === "/api/v5/stoptimes") {
    const arriveBy = url.searchParams.get("arriveBy") === "true";
    const stopId = url.searchParams.get("stopId") ?? "stop-berlin";
    const place =
      stopId.includes("prague")
        ? {
            name: "Praha hl.n.",
            lat: 50.083,
            lon: 14.435,
            stopId: "stop-prague",
            track: "5",
          }
        : {
            name: "Berlin Hbf",
            lat: 52.525,
            lon: 13.369,
            stopId: "stop-berlin",
            track: "12",
          };
    const start = "2026-08-14T08:00:00Z";
    send(response, 200, {
      place,
      stopTimes: [
        {
          place: {
            ...place,
            departure: start,
            scheduledDeparture: start,
          },
          mode: "RAIL",
          realTime: false,
          headsign: arriveBy ? "Berlin Hbf" : "Praha hl.n.",
          tripTo: arriveBy
            ? { name: "Berlin Hbf", lat: 52.525, lon: 13.369 }
            : { name: "Praha hl.n.", lat: 50.083, lon: 14.435 },
          agencyName: "Deutsche Bahn",
          displayName: "EC 172",
          routeShortName: "EC 172",
          tripId: "trip-ec-172",
          cancelled: false,
          tripCancelled: false,
        },
      ],
      previousPageCursor: "prev",
      nextPageCursor: "next",
    });
    return;
  }

  if (url.pathname === "/api/v5/trip") {
    send(response, 200, itinerary());
    return;
  }

  send(response, 404, { error: "Not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Mock MOTIS listening on http://127.0.0.1:${PORT}`);
});
