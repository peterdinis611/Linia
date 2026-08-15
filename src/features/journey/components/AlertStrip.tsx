"use client";

import { useI18n } from "@/i18n/provider";
import type { TransitAlert } from "@/lib/transit/types";
import { alertEffectKey } from "../lib/alerts";

type AlertStripProps = {
  alerts: TransitAlert[];
  compact?: boolean;
};

export function AlertStrip({ alerts, compact = false }: AlertStripProps) {
  const { t } = useI18n();
  if (alerts.length === 0) return null;

  const first = alerts[0]!;
  const stamp = t(alertEffectKey(first.effect));
  const headline = first.headerText.trim() || stamp;

  if (compact) {
    return (
      <p className="alert-ribbon" data-testid="alert-ribbon">
        <span className="alert-ribbon-stamp">{stamp}</span>
        <span className="alert-ribbon-copy">{headline}</span>
      </p>
    );
  }

  return (
    <details className="alert-notice" data-testid="alert-notice">
      <summary>
        <span className="alert-ribbon-stamp">{stamp}</span>
        <span>{headline}</span>
        {alerts.length > 1 ? (
          <span className="alert-ribbon-count">+{alerts.length - 1}</span>
        ) : null}
      </summary>
      <div className="alert-notice-body">
        {alerts.map((alert, index) => (
          <article key={`${alert.headerText}-${index}`}>
            {index > 0 && alert.headerText ? (
              <p className="alert-notice-head">{alert.headerText}</p>
            ) : null}
            {alert.descriptionText ? (
              <p>{alert.descriptionText}</p>
            ) : null}
            {alert.url ? (
              <a href={alert.url} target="_blank" rel="noreferrer">
                {t("alerts.more")}
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </details>
  );
}
