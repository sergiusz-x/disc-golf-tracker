import { getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "./locale-switcher";
import { QrCode } from "./qr-code";

export async function DesktopBlocker() {
    const t = await getTranslations("desktopBlocker");
    const url = `https://${t("url")}`;

    return (
        <div className="fixed inset-0 z-50 hidden flex-col items-center justify-center gap-5 bg-background px-8 text-center sm:flex">
            <div className="absolute right-4 top-4">
                <LocaleSwitcher align="end" />
            </div>

            <span className="text-6xl">🥏</span>
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
                <p className="text-muted-foreground">{t("message")}</p>
                <p className="text-muted-foreground">{t("hint")}</p>
            </div>

            <QrCode value={url} />

            <p className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                {t("url")}
            </p>
        </div>
    );
}
