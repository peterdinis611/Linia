import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(isLocale(locale) ? locale : "en");
  return {
    title: dict.meta.notFoundTitle,
    description: dict.meta.notFoundDescription,
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default function CatchAll() {
  notFound();
}
