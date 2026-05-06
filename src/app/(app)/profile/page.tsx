import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { DeleteAccountCard } from "@/components/profile/delete-account-card";
import { ProfileForm } from "@/components/profile/profile-form";
import { Card, CardContent } from "@/components/ui/card";
import { ensureUserProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const profile = await ensureUserProfile(supabase, user);

    const t = await getTranslations("profile");
    const locale = await getLocale();

    const initial = {
        id: user.id,
        email: profile?.email ?? user.email ?? "",
        full_name: profile?.full_name ?? null,
        username: profile?.username ?? null,
        avatar_url: profile?.avatar_url ?? null,
    };

    return (
        <div className="space-y-4">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            </header>

            <ProfileForm initial={initial} />

            <Card>
                <CardContent className="space-y-2 p-4 text-sm">
                    <Row
                        label={t("createdLabel")}
                        value={
                            profile?.created_at || user.created_at
                                ? new Date(
                                      profile?.created_at ?? user.created_at,
                                  ).toLocaleDateString(locale)
                                : "—"
                        }
                    />
                </CardContent>
            </Card>

            <DeleteAccountCard />
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between border-b border-border/50 py-2 last:border-none">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}
