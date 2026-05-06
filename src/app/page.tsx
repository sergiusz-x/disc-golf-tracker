import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export default async function HomePage() {
    const t = await getTranslations("landing");

    const features = [
        { title: t("features.live.title"), body: t("features.live.body") },
        { title: t("features.strokePlay.title"), body: t("features.strokePlay.body") },
        { title: t("features.stats.title"), body: t("features.stats.body") },
    ];

    return (
        <main className="relative isolate flex flex-1 flex-col">
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 dark:from-emerald-950/40 dark:via-background dark:to-emerald-900/30" />

            <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-10 px-6 py-20 text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    {t("pill")}
                </span>

                <div className="space-y-5">
                    <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                        {t("titleStart")}{" "}
                        <span className="text-emerald-600 dark:text-emerald-400">
                            {t("titleEnd")}
                        </span>
                    </h1>
                    <p className="mx-auto max-w-xl text-balance text-lg text-muted-foreground">
                        {t("description")}
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                        size="lg"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        render={<Link href="/login" />}
                    >
                        {t("ctaSignIn")}
                    </Button>
                    <Button size="lg" variant="outline" render={<Link href="/courses" />}>
                        {t("ctaCourses")}
                    </Button>
                </div>

                <ul className="mt-8 grid gap-4 text-left text-sm sm:grid-cols-3">
                    {features.map((f) => (
                        <li
                            key={f.title}
                            className="rounded-2xl border border-emerald-100 bg-white/70 p-4 backdrop-blur dark:border-emerald-900/40 dark:bg-background/50"
                        >
                            <p className="font-medium">{f.title}</p>
                            <p className="mt-1 text-muted-foreground">{f.body}</p>
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
}
