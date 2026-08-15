import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE } from "@/features/journey/lib/og-card";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export const alt = "Linia";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(isLocale(locale) ? locale : "en");
  return new ImageResponse(
    <OgCard kicker={dict.brand.kicker} headline={dict.meta.title} />,
    size,
  );
}
