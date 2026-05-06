import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
    const supabase = await createClient();
    const { data: courses } = await supabase
        .from("courses")
        .select("id, name, slug, city, hole_count, total_par")
        .order("name", { ascending: true });

    const t = await getTranslations("courses");

    return (
        <div className="space-y-4">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
                <p className="text-sm text-muted-foreground">
                    {t("countSubtitle", { count: courses?.length ?? 0 })}
                </p>
            </header>

            {!courses?.length ? (
                <EmptyState
                    icon={MapPin}
                    body={t.rich("empty", {
                        code: (chunks) => <code className="rounded bg-muted px-1">{chunks}</code>,
                    })}
                />
            ) : (
                <ul className="space-y-2">
                    {courses.map((c) => (
                        <li key={c.id}>
                            <Link
                                href={`/courses/${c.slug}`}
                                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
                            >
                                <Card className="transition-colors hover:bg-accent/50">
                                    <CardContent className="flex items-center gap-3 p-4">
                                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                            <MapPin className="h-5 w-5" />
                                        </span>
                                        <div className="flex-1">
                                            <p className="font-medium">{c.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {t("row.info", {
                                                    city: c.city ?? t("row.noCity"),
                                                    holes: c.hole_count,
                                                    par: c.total_par,
                                                })}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
