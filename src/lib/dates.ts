import { formatDistanceToNow } from "date-fns";
import { enUS, pl } from "date-fns/locale";

const LOCALE_MAP = {
    pl,
    en: enUS,
} as const;

/**
 * Format a date as a relative phrase ("2 hours ago", "godzinę temu").
 * Falls back to English when the locale is unknown so we never crash.
 */
export function formatRelativeDate(
    value: string | Date | null | undefined,
    locale: string,
): string {
    if (!value) return "—";
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return "—";
    const dfLocale = LOCALE_MAP[locale as keyof typeof LOCALE_MAP] ?? LOCALE_MAP.en;
    return formatDistanceToNow(date, { addSuffix: true, locale: dfLocale });
}
