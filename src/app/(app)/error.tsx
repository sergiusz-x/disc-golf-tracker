"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function AppError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const t = useTranslations("errorPage");
    const tCommon = useTranslations("common");

    useEffect(() => {
        // Log to the browser console at minimum so devs see something during
        // development; production telemetry is a future ticket.
        console.error("App error boundary caught:", error);
    }, [error]);

    return (
        <EmptyState
            icon={AlertTriangle}
            title={t("title")}
            body={t("body")}
            action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button size="sm" onClick={reset}>
                        <RotateCcw className="mr-1 h-4 w-4" />
                        {tCommon("tryAgain")}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href="/dashboard" />}
                    >
                        <Home className="mr-1 h-4 w-4" />
                        {tCommon("goHome")}
                    </Button>
                </div>
            }
        />
    );
}
