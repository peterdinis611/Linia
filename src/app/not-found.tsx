import type { Metadata } from "next";
import Link from "next/link";
import { StatusScreen } from "@/components/status/StatusScreen";
import { defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

const dict = getDictionary(defaultLocale);

export const metadata: Metadata = {
  title: dict.meta.notFoundTitle,
  description: dict.meta.notFoundDescription,
  robots: {
    index: false,
    follow: true,
  },
};

export default function RootNotFound() {
  return (
    <StatusScreen
      mark="404"
      kicker={dict.status.notFoundKicker}
      title={dict.status.notFoundTitle}
      body={dict.status.notFoundBody}
      brandKicker={dict.brand.kicker}
      actions={
        <Link
          href={`/${defaultLocale}`}
          className="search-cta inline-flex max-w-xs items-center justify-center no-underline"
        >
          {dict.status.notFoundAction}
        </Link>
      }
    />
  );
}
