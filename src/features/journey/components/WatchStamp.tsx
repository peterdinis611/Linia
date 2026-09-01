"use client";

import { useI18n } from "@/i18n/provider";

export function WatchStamp({
  watching,
  denied = false,
  onToggle,
}: {
  watching: boolean;
  denied?: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="ticket-watch">
      <button
        type="button"
        className="stamp"
        data-on={watching}
        data-testid="watch-trip"
        aria-pressed={watching}
        onClick={onToggle}
      >
        {watching ? t("watch.watching") : t("watch.stamp")}
      </button>
      {denied ? (
        <p className="ticket-watch-denied" data-testid="watch-denied">
          {t("watch.denied")}
        </p>
      ) : null}
    </div>
  );
}
