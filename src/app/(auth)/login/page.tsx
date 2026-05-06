import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeRelativePath } from "@/lib/site";

type SearchParams = Promise<{
    next?: string;
    error?: string;
}>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
    const { next: rawNext, error } = await searchParams;
    // Drop unsafe `next` (e.g. `//evil.com`) before it reaches the client form,
    // otherwise router.replace(next) becomes an open-redirect after sign-in.
    const next = safeRelativePath(rawNext) ?? undefined;
    const t = await getTranslations("auth.card");

    return (
        <Card className="w-full border-emerald-100 shadow-lg dark:border-emerald-900/40">
            <CardHeader className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl dark:bg-emerald-900/60">
                    🥏
                </div>
                <CardTitle className="text-2xl">{t("title")}</CardTitle>
                <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            </CardHeader>
            <CardContent className="space-y-4">
                <LoginForm next={next} />
                {error ? (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
                        {decodeURIComponent(error)}
                    </p>
                ) : null}
                <p className="text-center text-xs text-muted-foreground">
                    {t("termsPrefix")}{" "}
                    <Link href="/" className="underline underline-offset-2">
                        {t("termsLink")}
                    </Link>
                    .
                </p>
            </CardContent>
        </Card>
    );
}
