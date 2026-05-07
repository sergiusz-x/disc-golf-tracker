import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("termsPage");
    return { title: t("title") };
}

export default async function TermsPage() {
    const t = await getTranslations("termsPage");
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
                <h2 className="text-base font-medium">{t("sections.overview.title")}</h2>
                <p>{t("sections.overview.body")}</p>

                <h2 className="text-base font-medium">{t("sections.accounts.title")}</h2>
                <p>{t("sections.accounts.body")}</p>

                <h2 className="text-base font-medium">{t("sections.acceptable.title")}</h2>
                <ul className="list-disc space-y-1 pl-5">
                    <li>{t("sections.acceptable.items.disrupt")}</li>
                    <li>{t("sections.acceptable.items.unlawful")}</li>
                    <li>{t("sections.acceptable.items.content")}</li>
                </ul>

                <h2 className="text-base font-medium">{t("sections.content.title")}</h2>
                <p>{t("sections.content.body")}</p>

                <h2 className="text-base font-medium">{t("sections.availability.title")}</h2>
                <p>{t("sections.availability.body")}</p>

                <h2 className="text-base font-medium">{t("sections.termination.title")}</h2>
                <p>{t("sections.termination.body")}</p>

                <h2 className="text-base font-medium">{t("sections.contact.title")}</h2>
                <p>
                    {t("sections.contact.bodyPrefix")} {" "}
                    <a
                        className="underline underline-offset-2"
                        href={`mailto:${supportEmail}`}
                    >
                        {supportEmail}
                    </a>
                    .
                </p>
            </section>
        </main>
    );
}
