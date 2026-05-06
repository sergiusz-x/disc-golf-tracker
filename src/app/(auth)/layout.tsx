import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <main className="min-h-dvh bg-gradient-to-b from-emerald-50 via-white to-emerald-50 dark:from-emerald-950/40 dark:via-background dark:to-emerald-950/40">
            <div className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-6 py-10">
                {children}
            </div>
        </main>
    );
}
