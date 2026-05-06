import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MapPinOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default async function AppNotFound() {
    const t = await getTranslations("notFound");
    const tCommon = await getTranslations("common");

    return (
        <EmptyState
            icon={MapPinOff}
            title={t("title")}
            body={t("body")}
            action={
                <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    render={<Link href="/dashboard" />}
                >
                    {tCommon("goHome")}
                </Button>
            }
        />
    );
}
