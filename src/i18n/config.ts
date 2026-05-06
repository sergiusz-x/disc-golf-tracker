/**
 * Locale registry. Add new languages here, then drop a matching JSON file
 * into `messages/`.
 */

export const locales = ["pl", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pl";

export const LOCALE_COOKIE = "locale";

export const localeLabels: Record<Locale, string> = {
    pl: "Polski",
    en: "English",
};

export function isLocale(value: unknown): value is Locale {
    return typeof value === "string" && (locales as readonly string[]).includes(value);
}
