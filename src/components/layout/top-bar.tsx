import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { SessionUser } from "@/components/layout/app-shell";
import { UserMenu } from "@/components/layout/user-menu";

export async function TopBar({ user }: { user: SessionUser }) {
    const t = await getTranslations("topBar");
    return (
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
            <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <span className="text-xl">🥏</span>
                    <span className="font-semibold">{t("appName")}</span>
                </Link>
                <UserMenu user={user} />
            </div>
        </header>
    );
}
