import type { ReactNode } from "react";

import { MobileNav } from "@/components/layout/mobile-nav";
import { TopBar } from "@/components/layout/top-bar";

export type SessionUser = {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    username: string | null;
};

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
    return (
        <div className="flex min-h-dvh flex-col bg-background">
            <TopBar user={user} />
            <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-32 pt-4 sm:px-6 sm:pb-10">
                {children}
            </main>
            <MobileNav />
        </div>
    );
}
