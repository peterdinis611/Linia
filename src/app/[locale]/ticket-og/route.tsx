import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE } from "@/features/journey/lib/og-card";
import { parseShareQuery } from "@/features/journey/lib/share";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/translate";

export async function GET(
  request: Request,
  context: { params: Promise<{ locale: string }> },
) {
  const { locale } = await context.params;
  const dict = getDictionary(isLocale(locale) ? locale : "en");
  const snapshot = parseShareQuery(new URL(request.url).searchParams);
  const headline = snapshot
    ? interpolate(dict.meta.shareTitle, {
        from: snapshot.from.name,
        to: snapshot.to.name,
      })
    : dict.meta.title;

  return new ImageResponse(
    (
      <OgCard
        kicker={dict.brand.kicker}
        headline={headline}
        from={snapshot?.from.name}
        to={snapshot?.to.name}
      />
    ),
    OG_SIZE,
  );
}
