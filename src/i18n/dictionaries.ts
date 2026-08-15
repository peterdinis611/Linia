import type { Locale } from "./config";
import { cs } from "./messages/cs";
import { de } from "./messages/de";
import { en, type Messages } from "./messages/en";
import { es } from "./messages/es";
import { fr } from "./messages/fr";
import { hr } from "./messages/hr";
import { hu } from "./messages/hu";
import { it } from "./messages/it";
import { nl } from "./messages/nl";
import { pl } from "./messages/pl";
import { ro } from "./messages/ro";
import { sk } from "./messages/sk";
import { uk } from "./messages/uk";

const dictionaries: Record<Locale, Messages> = {
  en,
  sk,
  cs,
  de,
  pl,
  hu,
  fr,
  it,
  es,
  nl,
  ro,
  hr,
  uk,
};

export function getDictionary(locale: Locale): Messages {
  return dictionaries[locale];
}
