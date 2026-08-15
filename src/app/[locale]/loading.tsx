"use client";

import { StatusScreen } from "@/components/status/StatusScreen";
import { useI18n } from "@/i18n/provider";

export default function Loading() {
  const { t } = useI18n();
  return (
    <StatusScreen
      kicker={t("status.loadingKicker")}
      title={t("status.loadingTitle")}
      body={t("status.loadingBody")}
      brandKicker={t("brand.kicker")}
      busyLabel={t("brand.liveBoard")}
      busy
    />
  );
}
