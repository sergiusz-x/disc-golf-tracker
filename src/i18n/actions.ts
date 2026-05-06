"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { LOCALE_COOKIE, type Locale, isLocale } from "@/i18n/config";

/**
 * Persist the user's preferred locale and revalidate every page so server
 * components re-render with the new translations on the next render pass.
 */
export async function setLocaleAction(locale: Locale): Promise<void> {
    if (!isLocale(locale)) return;

    const store = await cookies();
    store.set(LOCALE_COOKIE, locale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        httpOnly: false,
    });

    revalidatePath("/", "layout");
}
