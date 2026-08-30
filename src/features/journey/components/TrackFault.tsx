"use client";

import { useI18n } from "@/i18n/provider";
import type { Place } from "@/lib/transit/types";
import { trackChange } from "../lib/ticket-notes";

export function TrackFault({
  place,
  testId = "track-changed",
}: {
  place: Place;
  testId?: string;
}) {
  const { t } = useI18n();
  const change = trackChange(place);
  if (!change) return null;
  return (
    <span className="ticket-fault" data-testid={testId}>
      {t("detail.trackChange", { track: change.track, was: change.was })}
    </span>
  );
}
