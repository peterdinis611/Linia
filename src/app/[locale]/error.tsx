"use client";

import { useEffect } from "react";
import { StatusScreen } from "@/components/status/StatusScreen";
import { useI18n } from "@/i18n/provider";

type ErrorPageProps = {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
};

export default function ErrorPage({ error, retry, reset }: ErrorPageProps) {
  const recover = retry ?? reset;
  const { t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      mark={t("status.errorMark")}
      kicker={t("status.errorKicker")}
      title={t("status.errorTitle")}
      body={
        error.digest
          ? t("status.errorBodyDigest", { digest: error.digest })
          : t("status.errorBody")
      }
      brandKicker={t("brand.kicker")}
      actions={
        recover ? (
          <button type="button" className="search-cta max-w-xs" onClick={() => recover()}>
            {t("status.retry")}
          </button>
        ) : null
      }
    />
  );
}
