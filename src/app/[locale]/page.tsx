import type { Metadata } from "next";
import { JourneySearch } from "@/features/journey";
import {
  encodeShareQuery,
  flattenSearchParams,
  parseShareQuery,
} from "@/features/journey/lib/share";
import { isLocale, localeOg } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/translate";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  const snapshot = parseShareQuery(flattenSearchParams(await searchParams));
  if (!snapshot) return {};

  if (snapshot.board) {
    const title = interpolate(dict.meta.shareBoardTitle, {
      from: snapshot.from.name,
    });
    const description = interpolate(dict.meta.shareBoardDescription, {
      from: snapshot.from.name,
    });
    const image = `/${locale}/ticket-og?${encodeShareQuery(snapshot)}`;
    return {
      title,
      description,
      robots: { index: false, follow: true },
      openGraph: {
        title,
        description,
        type: "website",
        locale: localeOg[locale],
        images: [{ url: image, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [image],
      },
    };
  }

  if (!snapshot.to) return {};

  const title = interpolate(dict.meta.shareTitle, {
    from: snapshot.from.name,
    to: snapshot.to.name,
  });
  const description = interpolate(dict.meta.shareDescription, {
    from: snapshot.from.name,
    to: snapshot.to.name,
  });
  const image = `/${locale}/ticket-og?${encodeShareQuery(snapshot)}`;

  return {
    title,
    description,
    robots: {
      index: false,
      follow: true,
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale: localeOg[locale],
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function Home() {
  return <JourneySearch />;
}
