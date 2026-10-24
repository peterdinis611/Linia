import type { Itinerary, Leg } from "@/lib/transit/types";

export type AccessNote = {
  kind: "wheelchair" | "elevator" | "level" | "platform";
  labelKey: string;
  params?: Record<string, string | number>;
};

/** Walk / transfer steps that involve an elevator (MOTIS StepInstruction). */
export function elevatorSteps(leg: Leg) {
  return (leg.steps ?? []).filter(
    (step) =>
      String(step.relativeDirection ?? "").toUpperCase() === "ELEVATOR",
  );
}

export function accessNotesForLeg(leg: Leg): AccessNote[] {
  const notes: AccessNote[] = [];
  if (leg.wheelchairAccessible === true) {
    notes.push({ kind: "wheelchair", labelKey: "detail.wheelchairOk" });
  } else if (leg.wheelchairAccessible === false) {
    notes.push({ kind: "wheelchair", labelKey: "detail.wheelchairNo" });
  }
  const elevators = elevatorSteps(leg);
  if (elevators.length > 0) {
    notes.push({
      kind: "elevator",
      labelKey: "detail.elevator",
      params: { count: elevators.length },
    });
  }
  if (leg.from.level != null && leg.to.level != null && leg.from.level !== leg.to.level) {
    notes.push({
      kind: "level",
      labelKey: "detail.levelChange",
      params: { from: leg.from.level, to: leg.to.level },
    });
  }
  return notes;
}

export function itineraryAccessNotes(itinerary: Itinerary): AccessNote[] {
  const seen = new Set<string>();
  const out: AccessNote[] = [];
  for (const leg of itinerary.legs) {
    for (const note of accessNotesForLeg(leg)) {
      const key = `${note.kind}|${note.labelKey}|${JSON.stringify(note.params ?? {})}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(note);
    }
  }
  return out;
}
