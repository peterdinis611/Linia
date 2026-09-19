"use client";

import { useI18n } from "@/i18n/provider";

export function ShortcutsHint() {
  const { t } = useI18n();
  return (
    <details className="hall-keys">
      <summary data-testid="keyboard-shortcuts">{t("shortcuts.hint")}</summary>
      <p>{t("shortcuts.focusSearch")}</p>
      <p>{t("shortcuts.swap")}</p>
      <p>{t("shortcuts.dismiss")}</p>
    </details>
  );
}
