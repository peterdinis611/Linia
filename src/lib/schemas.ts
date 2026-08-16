import { isValid } from "date-fns";
import { z } from "zod";

export const locationTypeSchema = z.enum(["ADDRESS", "PLACE", "STOP"]);
export const modeFilterSchema = z.enum(["all", "train", "bus"]);
export const transferFilterSchema = z.enum(["all", "direct", "transfers"]);

export const selectedPlaceSchema = z.object({
  id: z.string().trim().min(1, "validation.placeRequired").max(500),
  name: z.string().trim().min(1, "validation.placeRequired").max(200),
  type: locationTypeSchema,
  lat: z.number().gte(-90).lte(90),
  lon: z.number().gte(-180).lte(180),
  area: z.string().max(200).optional(),
});

export const reverseGeocodeInputSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lon: z.number().gte(-180).lte(180),
  preferStop: z.boolean().optional().default(false),
  language: z.string().trim().min(2).max(8).optional(),
});

export const geocodeInputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, "validation.queryTooShort")
    .max(120, "validation.queryTooLong"),
  language: z.string().trim().min(2).max(8).optional(),
});

function isValidDateTime(value: string | undefined) {
  if (!value) return true;
  return isValid(new Date(value));
}

function isDifferentPlace(
  from: { lat: number; lon: number } | null,
  to: { lat: number; lon: number } | null,
) {
  if (!from || !to) return true;
  return from.lat !== to.lat || from.lon !== to.lon;
}

export const planJourneyInputSchema = z
  .object({
    from: selectedPlaceSchema,
    to: selectedPlaceSchema,
    via: z.array(selectedPlaceSchema).max(2).optional().default([]),
    time: z.string().trim().min(1, "validation.timeRequired").optional(),
    language: z.string().trim().min(2).max(8).optional(),
    arriveBy: z.boolean().optional().default(false),
    allDay: z.boolean().optional().default(false),
    modeFilter: modeFilterSchema,
    transferFilter: transferFilterSchema,
    accessible: z.boolean().optional().default(false),
    bike: z.boolean().optional().default(false),
    night: z.boolean().optional().default(false),
    fresh: z.boolean().optional(),
  })
  .refine((value) => isValidDateTime(value.time), {
    message: "validation.timeInvalid",
    path: ["time"],
  })
  .refine((value) => isDifferentPlace(value.from, value.to), {
    message: "validation.placesDifferent",
    path: ["to"],
  })
  .superRefine((value, ctx) => {
    value.via.forEach((stop, index) => {
      if (!isDifferentPlace(value.from, stop) || !isDifferentPlace(value.to, stop)) {
        ctx.addIssue({
          code: "custom",
          path: ["via", index],
          message: "validation.viaDifferentEnds",
        });
      }
      const duplicate = value.via.findIndex(
        (other, otherIndex) =>
          otherIndex !== index && !isDifferentPlace(stop, other),
      );
      if (duplicate >= 0 && index > duplicate) {
        ctx.addIssue({
          code: "custom",
          path: ["via", index],
          message: "validation.viaDifferentStops",
        });
      }
    });
  });

export const journeySearchFormSchema = z
  .object({
    from: selectedPlaceSchema.nullable(),
    to: selectedPlaceSchema.nullable(),
    via: z.array(selectedPlaceSchema.nullable()).max(2).optional().default([]),
    time: z.string().trim().optional(),
    leaveNow: z.boolean(),
    arriveBy: z.boolean(),
    allDay: z.boolean().optional().default(false),
    modeFilter: modeFilterSchema,
    transferFilter: transferFilterSchema,
    board: z.boolean().optional().default(false),
    accessible: z.boolean().optional().default(false),
    bike: z.boolean().optional().default(false),
    night: z.boolean().optional().default(false),
    wantReturn: z.boolean().optional().default(false),
    returnTime: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.from) {
      ctx.addIssue({
        code: "custom",
        path: ["from"],
        message: "validation.originRequired",
      });
    }
    if (!value.board && !value.to) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "validation.destinationRequired",
      });
    }
    if (!value.board) {
      value.via.forEach((stop, index) => {
        if (!stop) {
          ctx.addIssue({
            code: "custom",
            path: ["via", index],
            message: "validation.viaRequired",
          });
        }
      });
    }
    if (!value.leaveNow && !value.allDay) {
      if (!value.time) {
        ctx.addIssue({
          code: "custom",
          path: ["time"],
          message: "validation.timeRequired",
        });
      } else if (!isValidDateTime(value.time)) {
        ctx.addIssue({
          code: "custom",
          path: ["time"],
          message: "validation.timeInvalid",
        });
      }
    }
    if (!value.board && !isDifferentPlace(value.from, value.to)) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "validation.placesDifferent",
      });
    }
    if (!value.board) {
      value.via.forEach((stop, index) => {
        if (!stop) return;
        if (!isDifferentPlace(value.from, stop) || !isDifferentPlace(value.to, stop)) {
          ctx.addIssue({
            code: "custom",
            path: ["via", index],
            message: "validation.viaDifferentEnds",
          });
        }
      });
    }
    if (value.wantReturn && !value.board) {
      if (!value.returnTime) {
        ctx.addIssue({
          code: "custom",
          path: ["returnTime"],
          message: "validation.returnTimeRequired",
        });
      } else if (!isValidDateTime(value.returnTime)) {
        ctx.addIssue({
          code: "custom",
          path: ["returnTime"],
          message: "validation.timeInvalid",
        });
      } else {
        const outboundStamp = value.leaveNow
          ? Date.now()
          : value.time
            ? new Date(value.time).getTime()
            : Number.NaN;
        const returnStamp = new Date(value.returnTime).getTime();
        if (
          Number.isFinite(outboundStamp) &&
          Number.isFinite(returnStamp) &&
          returnStamp < outboundStamp
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["returnTime"],
            message: "validation.returnAfterOutbound",
          });
        }
      }
    }
  });

export type JourneyFormField = "from" | "to" | "time" | "via" | "returnTime";
export type JourneyFormFieldErrors = Partial<
  Record<JourneyFormField, string> & Record<`via.${number}`, string>
>;

export function fieldErrorsFromZod(error: {
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>;
}): JourneyFormFieldErrors {
  const next: JourneyFormFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (key === "from" || key === "to" || key === "time" || key === "returnTime") {
      if (!next[key]) next[key] = issue.message;
      continue;
    }
    if (key === "via") {
      const index = issue.path[1];
      const viaKey =
        typeof index === "number" ? (`via.${index}` as const) : "via";
      if (!next[viaKey]) next[viaKey] = issue.message;
    }
  }
  return next;
}

export const tripInputSchema = z.object({
  tripId: z.string().trim().min(1, "validation.tripRequired").max(512),
});

export const areaSchema = z.looseObject({
  name: z.string(),
  adminLevel: z.number(),
  matched: z.boolean(),
  unique: z.boolean().optional(),
  default: z.boolean().optional(),
});

export const geocodeMatchSchema = z.looseObject({
  type: locationTypeSchema,
  name: z.string(),
  id: z.string(),
  lat: z.number(),
  lon: z.number(),
  score: z.number().optional().default(0),
  street: z.string().optional(),
  areas: z.array(areaSchema).optional().default([]),
});

export const geocodeOutputSchema = z.array(geocodeMatchSchema);

export const transitAlertSchema = z.looseObject({
  headerText: z.string().optional().default(""),
  descriptionText: z.string().optional().default(""),
  effect: z.string().optional(),
  severityLevel: z.string().optional(),
  cause: z.string().optional(),
  url: z.string().optional(),
});

export const placeSchema = z.looseObject({
  name: z.string(),
  stopId: z.string().optional(),
  lat: z.number(),
  lon: z.number(),
  level: z.number().optional(),
  track: z.string().optional(),
  scheduledTrack: z.string().optional(),
  arrival: z.string().optional(),
  departure: z.string().optional(),
  scheduledArrival: z.string().optional(),
  scheduledDeparture: z.string().optional(),
  alerts: z.array(transitAlertSchema).optional(),
});

export const encodedPolylineSchema = z.looseObject({
  points: z.string().optional().default(""),
  precision: z.number().optional().default(6),
  length: z.number().optional().default(0),
});

export const legSchema = z.looseObject({
  mode: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  scheduledStartTime: z.string().optional().default(""),
  scheduledEndTime: z.string().optional().default(""),
  realTime: z.boolean().optional().default(false),
  scheduled: z.boolean().optional().default(true),
  duration: z.number(),
  distance: z.number().optional(),
  from: placeSchema,
  to: placeSchema,
  headsign: z.string().nullable().optional(),
  routeColor: z.string().optional(),
  routeTextColor: z.string().optional(),
  routeShortName: z.string().optional(),
  routeLongName: z.string().optional(),
  displayName: z.string().optional(),
  agencyName: z.string().optional(),
  agencyId: z.string().optional(),
  tripId: z.string().optional(),
  cancelled: z.boolean().optional(),
  intermediateStops: z.array(placeSchema).nullable().optional(),
  alerts: z.array(transitAlertSchema).optional(),
  legGeometry: encodedPolylineSchema.optional().default({
    points: "",
    precision: 6,
    length: 0,
  }),
});

export const itinerarySchema = z.looseObject({
  duration: z.number(),
  startTime: z.string(),
  endTime: z.string(),
  transfers: z.number(),
  legs: z.array(legSchema),
});

export const planResponseSchema = z.looseObject({
  from: placeSchema.optional(),
  to: placeSchema.optional(),
  itineraries: z.array(itinerarySchema).optional().default([]),
  direct: z.array(itinerarySchema).optional().default([]),
});

export const stopTimesInputSchema = z.object({
  stop: selectedPlaceSchema,
  time: z.string().trim().min(1).optional(),
  arriveBy: z.boolean().optional().default(false),
  modeFilter: modeFilterSchema.optional().default("all"),
  night: z.boolean().optional().default(false),
  pageCursor: z.string().trim().max(2000).optional(),
  language: z.string().trim().min(2).max(8).optional(),
  n: z.number().int().min(1).max(50).optional().default(20),
});

export const stopTimeEventSchema = z.looseObject({
  place: placeSchema,
  mode: z.string(),
  realTime: z.boolean().optional().default(false),
  headsign: z.string().nullable().optional(),
  tripTo: placeSchema.optional(),
  agencyName: z.string().optional(),
  routeColor: z.string().optional(),
  routeTextColor: z.string().optional(),
  tripId: z.string().optional(),
  routeShortName: z.string().optional(),
  routeLongName: z.string().optional(),
  displayName: z.string().optional(),
  cancelled: z.boolean().optional().default(false),
  tripCancelled: z.boolean().optional().default(false),
  alerts: z.array(transitAlertSchema).optional(),
});

export const stopTimesResponseSchema = z.looseObject({
  place: placeSchema.optional(),
  stopTimes: z.array(stopTimeEventSchema).optional().default([]),
  previousPageCursor: z.string().optional(),
  nextPageCursor: z.string().optional(),
});

export type ModeFilter = z.infer<typeof modeFilterSchema>;
export type TransferFilter = z.infer<typeof transferFilterSchema>;
export type SelectedPlace = z.infer<typeof selectedPlaceSchema>;
export type GeocodeInput = z.infer<typeof geocodeInputSchema>;
export type ReverseGeocodeInput = z.infer<typeof reverseGeocodeInputSchema>;
export type PlanJourneyInput = z.infer<typeof planJourneyInputSchema>;
export type JourneySearchForm = z.infer<typeof journeySearchFormSchema>;
export type TripInput = z.infer<typeof tripInputSchema>;
export type StopTimesInput = z.infer<typeof stopTimesInputSchema>;
