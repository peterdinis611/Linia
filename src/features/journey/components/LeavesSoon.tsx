"use client";

import { useI18n } from "@/i18n/provider";
import { useHallClock } from "../hooks/use-hall-clock";
import { waitToDepartSeconds } from "../lib/ticket-notes";

export function LeavesSoon({
  startTime,
  cancelled = false,
  testId = "ticket-soon",
}: {
  startTime: string;
  cancelled?: boolean;
  testId?: string;
}) {
  const { t } = useI18n();
  const waiting = !cancelled && waitToDepartSeconds(startTime) != null;
  const now = useHallClock(waiting);
  const seconds = cancelled ? null : waitToDepartSeconds(startTime, now);
  if (seconds == null) return null;
  const label =
    seconds < 45
      ? t("results.leavesNow")
      : t("results.leavesIn", { minutes: Math.max(1, Math.round(seconds / 60)) });
  return (
    <span className="ticket-soon" data-testid={testId}>
      {label}
    </span>
  );
}
