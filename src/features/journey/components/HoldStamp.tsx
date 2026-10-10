"use client";

import { useI18n } from "@/i18n/provider";

export function HoldStamp({
  holding,
  onToggle,
}: {
  holding: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="ticket-watch">
      <button
        type="button"
        className="stamp"
        data-on={holding}
        data-testid="hold-print"
        aria-pressed={holding}
        onClick={onToggle}
      >
        {holding ? t("results.heldPrint") : t("results.holdPrint")}
      </button>
    </div>
  );
}
