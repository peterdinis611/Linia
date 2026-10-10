"use client";

import type { ReactNode } from "react";
import { SplitFlapText } from "@/components/ui/SplitFlapText";
import { useI18n } from "@/i18n/provider";

type BoardMastProps = {
  kicker: string;
  headline: ReactNode;
  share?: ReactNode;
  liveAt?: number | null;
  liveFresh?: boolean;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onTimeShift?: (direction: "earlier" | "later") => void;
  children?: ReactNode;
};

export function BoardCount({
  count,
  label,
}: {
  count: number;
  label: string;
}) {
  const rest = label.replace(new RegExp(`^${count}\\s*`), "");
  return (
    <p className="board-count">
      <span className="sr-only">{label}</span>
      <span className="board-count-flaps" aria-hidden="true">
        {String(count)
          .split("")
          .map((digit, index) => (
            <span key={index} className="board-count-flap">
              <SplitFlapText text={digit} charWidth="0.7em" sound={false} />
            </span>
          ))}
      </span>
      <span className="board-count-copy" aria-hidden="true">
        {rest}
      </span>
    </p>
  );
}

export function BoardMast({
  kicker,
  headline,
  share,
  liveAt = null,
  liveFresh = false,
  loading = false,
  refreshing = false,
  onRefresh,
  onTimeShift,
  children,
}: BoardMastProps) {
  const { locale, t } = useI18n();
  const clock = liveAt
    ? new Date(liveAt).toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const liveLabel = liveFresh ? t("results.live") : t("results.stale");
  const updatedLabel = clock
    ? t("results.updated", { time: clock })
    : null;

  return (
    <div className="board-mast">
      <div className="board-mast-top">
        <div className="board-mast-lead">
          <div className="board-mast-meta">
            <p className="kicker">{kicker}</p>
            {liveAt ? (
              <p
                className="board-mast-live"
                data-fresh={liveFresh ? "true" : "false"}
                title={updatedLabel ?? liveLabel}
              >
                <span className="board-mast-dot" aria-hidden="true" />
                <span>{liveLabel}</span>
                {clock ? (
                  <time dateTime={new Date(liveAt).toISOString()}>{clock}</time>
                ) : null}
              </p>
            ) : null}
          </div>
          <div className="board-mast-headline">{headline}</div>
        </div>
        {share || onRefresh ? (
          <div className="board-mast-stamps">
            {share}
            {onRefresh ? (
              <button
                type="button"
                className="stamp"
                data-testid="refresh-live"
                onClick={onRefresh}
                disabled={refreshing || loading}
              >
                {t("results.refresh")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {onTimeShift ? (
        <div className="board-shift" role="group">
          <button
            type="button"
            className="board-shift-btn"
            data-dir="earlier"
            data-testid="earlier-connections"
            disabled={loading || refreshing}
            onClick={() => onTimeShift("earlier")}
          >
            {t("results.earlier")}
          </button>
          <span className="board-shift-rail" aria-hidden="true" />
          <button
            type="button"
            className="board-shift-btn"
            data-dir="later"
            data-testid="later-connections"
            disabled={loading || refreshing}
            onClick={() => onTimeShift("later")}
          >
            {t("results.later")}
          </button>
        </div>
      ) : null}
      {children}
    </div>
  );
}
