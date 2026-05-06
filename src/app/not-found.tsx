import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MapPinOff } from "lucide-react";

import { Button } from "@/components/ui/button";

export default async function NotFound() {
    const t = await getTranslations("notFound");
    const tCommon = await getTranslations("common");

    return (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <MapPinOff className="h-7 w-7" />
            </span>
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
                <p className="text-sm text-muted-foreground">{t("body")}</p>
            </div>
            <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                render={<Link href="/dashboard" />}
            >
                {tCommon("goHome")}
            </Button>
        </main>
    );
}
