import { getTranslations } from "next-intl/server";

export async function DesktopBlocker() {
    const t = await getTranslations("desktopBlocker");

    return (
        <div className="fixed inset-0 z-50 hidden flex-col items-center justify-center gap-4 bg-background px-8 text-center sm:flex">
            <span className="text-6xl">🥏</span>
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">{t("message")}</p>
            <p className="text-muted-foreground">{t("hint")}</p>
            <p className="mt-2 font-mono text-sm text-emerald-600 dark:text-emerald-400">
                {t("url")}
            </p>
        </div>
    );
}
