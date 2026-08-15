"use client";

import { useEffect } from "react";
import { StatusScreen } from "@/components/status/StatusScreen";
import { defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/translate";

type ErrorPageProps = {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
};

export default function RootError({ error, retry, reset }: ErrorPageProps) {
  const recover = retry ?? reset;
  const dict = getDictionary(defaultLocale);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      mark={dict.status.errorMark}
      kicker={dict.status.errorKicker}
      title={dict.status.errorTitle}
      body={
        error.digest
          ? interpolate(dict.status.errorBodyDigest, { digest: error.digest })
          : dict.status.errorBody
      }
      brandKicker={dict.brand.kicker}
      actions={
        recover ? (
          <button type="button" className="search-cta max-w-xs" onClick={() => recover()}>
            {dict.status.retry}
          </button>
        ) : null
      }
    />
  );
}
