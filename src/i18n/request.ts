import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { LOCALE_COOKIE, defaultLocale, isLocale, locales, type Locale } from "@/i18n/config";

function detectLocaleFromAcceptLanguage(value: string | null): Locale | null {
    if (!value) return null;

    const candidates = value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
            const [tagRaw, ...params] = part.split(";").map((p) => p.trim());
            let q = 1;
            for (const param of params) {
                if (param.startsWith("q=")) {
                    const parsed = Number.parseFloat(param.slice(2));
                    if (!Number.isNaN(parsed)) q = parsed;
                }
            }
            return { tag: (tagRaw ?? "").toLowerCase(), q };
        })
        .sort((a, b) => b.q - a.q);

    for (const { tag } of candidates) {
        for (const locale of locales) {
            if (tag === locale || tag.startsWith(`${locale}-`)) return locale;
        }
    }

    return null;
}

export default getRequestConfig(async () => {
    const store = await cookies();
    const cookieValue = store.get(LOCALE_COOKIE)?.value;
    const localeCookie = isLocale(cookieValue) ? cookieValue : null;
    const headerStore = await headers();
    const detectedLocale = detectLocaleFromAcceptLanguage(headerStore.get("accept-language"));
    const locale = localeCookie ?? detectedLocale ?? defaultLocale;

    const messages = (await import(`./messages/${locale}.json`)).default;

    return { locale, messages };
});
