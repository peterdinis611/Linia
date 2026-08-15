import type { Locale } from "./config";
import type { Messages } from "./messages/en";

export function interpolate(
  template: string,
  vars?: Record<string, string | number>,
) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    vars[key] == null ? match : String(vars[key]),
  );
}

export function messageAt(messages: Messages, key: string): string | undefined {
  const parts = key.split(".");
  let current: unknown = messages;
  for (const part of parts) {
    if (typeof current !== "object" || current == null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function translate(
  messages: Messages,
  key: string,
  vars?: Record<string, string | number>,
) {
  const value = messageAt(messages, key);
  if (!value) return key;
  return interpolate(value, vars);
}

type PluralForms = Messages["plural"][keyof Messages["plural"]];

export function translatePlural(
  locale: Locale,
  forms: PluralForms,
  count: number,
  vars?: Record<string, string | number>,
) {
  const category = new Intl.PluralRules(locale).select(count);
  const formsRecord = forms as Record<string, string | undefined>;
  const template = formsRecord[category] || forms.other;
  return interpolate(template, { count, ...vars });
}
