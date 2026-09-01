"use client";

import { useI18n } from "@/i18n/provider";
import type { TightTransfer } from "../lib/ticket-notes";

export function TightFault({
  transfer,
  testId = "tight-transfer",
}: {
  transfer: TightTransfer;
  testId?: string;
}) {
  const { t } = useI18n();
  return (
    <span className="ticket-fault" data-testid={testId}>
      {t("detail.tightTransfer", { minutes: transfer.minutes })}
    </span>
  );
}
