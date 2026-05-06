import { getTranslations } from "next-intl/server";
import { WifiOff } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-static";

export default async function OfflinePage() {
    const t = await getTranslations("offline");
    return (
        <main className="flex min-h-dvh items-center justify-center px-6 py-12">
            <Card className="max-w-md border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <CardContent className="space-y-3 p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-700 dark:text-emerald-300">
                        <WifiOff className="h-5 w-5" />
                    </div>
                    <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
                    <p className="text-sm text-muted-foreground">{t("body")}</p>
                </CardContent>
            </Card>
        </main>
    );
}
