import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { LOCALE_COOKIE, defaultLocale, isLocale } from "@/i18n/config";

export default getRequestConfig(async () => {
    const store = await cookies();
    const cookieValue = store.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieValue) ? cookieValue : defaultLocale;

    const messages = (await import(`./messages/${locale}.json`)).default;

    return { locale, messages };
});
