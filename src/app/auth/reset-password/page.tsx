import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
    // The recovery email from Supabase routes through /auth/callback first,
    // which exchanges the code for a session and redirects here. By the time
    // this page runs we should already be authenticated; if not, the link
    // expired or never went through the callback.
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login?error=Link%20wygas%C5%82.%20Popro%C5%9B%20o%20nowy.");
    }

    const t = await getTranslations("auth.resetPassword");

    // /auth lives outside the (auth) route group so we get root layout only;
    // mirror the centered card styling here so the page doesn't render
    // pinned to the top-left corner.
    return (
        <main className="min-h-dvh bg-gradient-to-b from-emerald-50 via-white to-emerald-50 dark:from-emerald-950/40 dark:via-background dark:to-emerald-950/40">
            <div className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-6 py-10">
                <Card className="w-full border-emerald-100 shadow-lg dark:border-emerald-900/40">
                    <CardHeader className="space-y-2 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl dark:bg-emerald-900/60">
                            🔒
                        </div>
                        <CardTitle className="text-2xl">{t("title")}</CardTitle>
                        <p className="text-sm text-muted-foreground">{t("body")}</p>
                    </CardHeader>
                    <CardContent>
                        <ResetPasswordForm />
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
