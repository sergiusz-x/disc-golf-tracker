import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("privacyPage");
    return { title: t("title") };
}

export default async function PrivacyPage() {
    const t = await getTranslations("privacyPage");
    const tNav = await getTranslations("nav");
    const tCommon = await getTranslations("common");
    const supportEmail = tCommon("supportEmail");

    return (
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
            <div className="flex items-center justify-between gap-4">
                <Link href="/" className="text-sm text-muted-foreground hover:underline">
                    {tNav("home")}
                </Link>
                <LocaleSwitcher />
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
                {t("intro")}
            </p>

            <section className="mt-8 space-y-4 text-sm leading-6">
                <h2 className="text-base font-medium">{t("operator.title")}</h2>
                <p>{t("operator.body")}</p>

                <h2 className="text-base font-medium">{t("data.title")}</h2>
                <p>{t("data.intro")}</p>
                <ul className="list-disc space-y-1 pl-5">
                    <li>
                        <span className="font-medium">{t("data.items.account.label")}</span>{" "}
                        {t("data.items.account.body")}
                    </li>
                    <li>
                        <span className="font-medium">{t("data.items.profile.label")}</span>{" "}
                        {t("data.items.profile.body")}
                    </li>
                    <li>
                        <span className="font-medium">{t("data.items.gameplay.label")}</span>{" "}
                        {t("data.items.gameplay.body")}
                    </li>
                    <li>
                        <span className="font-medium">{t("data.items.technical.label")}</span>{" "}
                        {t("data.items.technical.body")}
                    </li>
                </ul>

                <h2 className="text-base font-medium">{t("use.title")}</h2>
                <ul className="list-disc space-y-1 pl-5">
                    <li>{t("use.items.auth")}</li>
                    <li>{t("use.items.profile")}</li>
                    <li>{t("use.items.features")}</li>
                    <li>{t("use.items.security")}</li>
                </ul>

                <h2 className="text-base font-medium">{t("email.title")}</h2>
                <p>{t("email.body")}</p>

                <h2 className="text-base font-medium">{t("sharing.title")}</h2>
                <p>{t("sharing.body1")}</p>
                <p>{t("sharing.body2")}</p>
                <ul className="list-disc space-y-1 pl-5">
                    <li>
                        <span className="font-medium">Supabase</span>{" "}
                        {t("sharing.items.supabase")}
                    </li>
                    <li>
                        <span className="font-medium">{t("sharing.items.hostingLabel")}</span>{" "}
                        {t("sharing.items.hosting")}
                    </li>
                    <li>
                        <span className="font-medium">Google</span>{" "}
                        {t("sharing.items.google")}
                    </li>
                </ul>

                <h2 className="text-base font-medium">{t("cookies.title")}</h2>
                <p>{t("cookies.body")}</p>

                <h2 className="text-base font-medium">{t("retention.title")}</h2>
                <p>{t("retention.body")}</p>

                <h2 className="text-base font-medium">{t("choices.title")}</h2>
                <ul className="list-disc space-y-1 pl-5">
                    <li>{t("choices.items.update")}</li>
                    <li>{t("choices.items.stop")}</li>
                </ul>

                <h2 className="text-base font-medium">{t("contact.title")}</h2>
                <p>
                    {t("contact.body")}{" "}
                    <a className="underline underline-offset-2" href={`mailto:${supportEmail}`}>
                        {supportEmail}
                    </a>
                    .
                </p>
            </section>
        </main>
    );
}
