import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { ensureUserProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const profile = await ensureUserProfile(supabase, user);

    return (
        <AppShell
            user={{
                id: user.id,
                email: profile?.email ?? user.email ?? "",
                fullName: profile?.full_name ?? null,
                avatarUrl: profile?.avatar_url ?? null,
                username: profile?.username ?? null,
            }}
        >
            {children}
        </AppShell>
    );
}
