import type {
  ModeFilter as SchemaModeFilter,
  SelectedPlace as SchemaSelectedPlace,
  TransferFilter as SchemaTransferFilter,
} from "@/lib/schemas";

export type ModeFilter = SchemaModeFilter;
export type TransferFilter = SchemaTransferFilter;
export type SelectedPlace = SchemaSelectedPlace;

export type LocationType = "ADDRESS" | "PLACE" | "STOP";

export type TransitMode =
  | "WALK"
  | "BIKE"
  | "TRANSIT"
  | "TRAM"
  | "SUBWAY"
  | "FERRY"
  | "AIRPLANE"
  | "BUS"
  | "COACH"
  | "RAIL"
  | "SUBURBAN"
  | "HIGHSPEED_RAIL"
  | "LONG_DISTANCE"
  | "NIGHT_RAIL"
  | "REGIONAL_FAST_RAIL"
  | "REGIONAL_RAIL"
  | "CABLE_CAR"
  | "FUNICULAR"
  | "AERIAL_LIFT"
  | "OTHER"
  | string;

export type Area = {
  name: string;
  adminLevel: number;
  matched: boolean;
  unique?: boolean;
  default?: boolean;
};

export type GeocodeMatch = {
  type: LocationType;
  name: string;
  id: string;
  lat: number;
  lon: number;
  score: number;
  street?: string;
  areas: Area[];
};

export type AlertEffect =
  | "NO_SERVICE"
  | "REDUCED_SERVICE"
  | "SIGNIFICANT_DELAYS"
  | "DETOUR"
  | "ADDITIONAL_SERVICE"
  | "MODIFIED_SERVICE"
  | "OTHER_EFFECT"
  | "UNKNOWN_EFFECT"
  | "STOP_MOVED"
  | "NO_EFFECT"
  | "ACCESSIBILITY_ISSUE"
  | string;

export type AlertSeverity = "UNKNOWN_SEVERITY" | "INFO" | "WARNING" | "SEVERE" | string;

export type TransitAlert = {
  headerText: string;
  descriptionText: string;
  effect?: AlertEffect;
  severityLevel?: AlertSeverity;
  cause?: string;
  url?: string;
};

export type Place = {
  name: string;
  stopId?: string;
  lat: number;
  lon: number;
  level?: number;
  track?: string;
  scheduledTrack?: string;
  arrival?: string;
  departure?: string;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  alerts?: TransitAlert[];
};

export type EncodedPolyline = {
  points: string;
  precision: number;
  length: number;
};

export type Leg = {
  mode: TransitMode;
  startTime: string;
  endTime: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  realTime: boolean;
  scheduled: boolean;
  duration: number;
  distance?: number;
  from: Place;
  to: Place;
  headsign?: string | null;
  routeColor?: string;
  routeTextColor?: string;
  routeShortName?: string;
  routeLongName?: string;
  displayName?: string;
  agencyName?: string;
  agencyId?: string;
  tripId?: string;
  cancelled?: boolean;
  intermediateStops?: Place[] | null;
  legGeometry: EncodedPolyline;
  alerts?: TransitAlert[];
};

export type Itinerary = {
  duration: number;
  startTime: string;
  endTime: string;
  transfers: number;
  legs: Leg[];
};

export type PlanResponse = {
  from?: Place;
  to?: Place;
  itineraries: Itinerary[];
  direct?: Itinerary[];
};

export type StopTimeEvent = {
  place: Place;
  mode: TransitMode;
  realTime: boolean;
  headsign?: string | null;
  tripTo?: Place;
  agencyName?: string;
  routeColor?: string;
  routeTextColor?: string;
  tripId?: string;
  routeShortName?: string;
  routeLongName?: string;
  displayName?: string;
  cancelled?: boolean;
  tripCancelled?: boolean;
  alerts?: TransitAlert[];
};

export type StopTimesResponse = {
  place?: Place;
  stopTimes: StopTimeEvent[];
  previousPageCursor?: string;
  nextPageCursor?: string;
};

export function areaLabel(areas: Area[] | undefined): string | undefined {
  if (!areas?.length) return undefined;
  const preferred =
    areas.find((area) => area.default) ??
    areas.find((area) => area.adminLevel >= 6 && area.adminLevel <= 8) ??
    areas[0];
  return preferred?.name;
}

export function stopsBetween(trip: Itinerary, from: Place, to: Place): Place[] {
  const transit = trip.legs.find(
    (leg) => leg.mode !== "WALK" && leg.mode !== "BIKE" && leg.mode !== "CAR",
  );
  if (!transit) return [];
  const sequence = [transit.from, ...(transit.intermediateStops ?? []), transit.to];
  const start = indexOfStop(sequence, from);
  const end = indexOfStop(sequence, to);
  if (start === -1 || end === -1 || end <= start) {
    return transit.intermediateStops ?? [];
  }
  return sequence.slice(start + 1, end);
}

function indexOfStop(stops: Place[], target: Place): number {
  if (target.stopId) {
    const byId = stops.findIndex(
      (stop) => stop.stopId && stop.stopId === target.stopId,
    );
    if (byId >= 0) return byId;
  }
  return stops.findIndex(
    (stop) =>
      stop.name === target.name && Math.abs(stop.lat - target.lat) < 0.002,
  );
}
