"use client";

import { useI18n } from "@/i18n/provider";

const STEPS = [1, 2, 3, 4] as const;

export function HowToGuide({ onTour }: { onTour?: () => void }) {
  const { t } = useI18n();

  return (
    <div>
      <ol className="howto-list">
        {STEPS.map((step) => (
          <li key={step} className="howto-step">
            <span className="howto-num" aria-hidden="true">
              {step}
            </span>
            <div>
              <p className="howto-step-title">{t(`guide.step${step}Title`)}</p>
              <p className="howto-step-body">{t(`guide.step${step}Body`)}</p>
            </div>
          </li>
        ))}
      </ol>
      {onTour ? (
        <button type="button" className="stamp mt-4" onClick={onTour}>
          {t("guide.walk")}
        </button>
      ) : null}
    </div>
  );
}

export function HowToButton({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n();

  return (
    <button type="button" className="howto-open" onClick={onOpen}>
      {t("guide.open")}
    </button>
  );
}
