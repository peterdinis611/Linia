"use client";

import Link from "next/link";
import { StatusScreen } from "@/components/status/StatusScreen";
import { useI18n } from "@/i18n/provider";

export default function NotFound() {
  const { locale, t } = useI18n();
  return (
    <StatusScreen
      mark="404"
      kicker={t("status.notFoundKicker")}
      title={t("status.notFoundTitle")}
      body={t("status.notFoundBody")}
      brandKicker={t("brand.kicker")}
      actions={
        <Link
          href={`/${locale}`}
          className="search-cta inline-flex max-w-xs items-center justify-center no-underline"
        >
          {t("status.notFoundAction")}
        </Link>
      }
    />
  );
}
