import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, MapPin, Plus, Trophy } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getDisplayName, getInitials } from "@/lib/people";
import { formatRelative } from "@/lib/strokes";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const LEADERBOARD_LIMIT = 10;

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: course } = await supabase
        .from("courses")
        .select("id, name, slug, city, region, country, hole_count, total_par, description")
        .eq("slug", slug)
        .maybeSingle();

    if (!course) notFound();

    const [{ data: holes }, { data: leaderboard }] = await Promise.all([
        supabase
            .from("holes")
            .select("id, number, par, distance_m")
            .eq("course_id", course.id)
            .order("number", { ascending: true }),
        supabase.rpc("get_course_leaderboard", {
            p_course_id: course.id,
            p_limit: LEADERBOARD_LIMIT,
        }),
    ]);

    const t = await getTranslations("courses.detail");
    const tCommon = await getTranslations("common");

    const region = [course.city, course.region].filter(Boolean).join(" · ");
    const ranked = leaderboard ?? [];

    return (
        <div className="space-y-4">
            <Button variant="ghost" size="sm" render={<Link href="/courses" />}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                {t("back")}
            </Button>

            <Card className="overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg dark:border-emerald-700">
                <CardContent className="space-y-2 p-5">
                    <p className="text-xs uppercase tracking-wider opacity-80">{t("subtitle")}</p>
                    <h1 className="text-2xl font-semibold tracking-tight">{course.name}</h1>
                    {region ? (
                        <p className="flex items-center gap-1.5 text-sm opacity-90">
                            <MapPin className="h-4 w-4" />
                            {region}
                        </p>
                    ) : null}
                    <p className="text-sm opacity-80">
                        {t("stats", {
                            holes: course.hole_count,
                            par: course.total_par,
                        })}
                    </p>
                    {course.description ? (
                        <p className="pt-2 text-sm leading-relaxed opacity-90">
                            {course.description}
                        </p>
                    ) : null}
                    <div className="pt-2">
                        <Button size="sm" variant="secondary" render={<Link href="/games/new" />}>
                            <Plus className="mr-1 h-4 w-4" />
                            {t("startCta")}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="space-y-1 pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Trophy className="h-4 w-4 text-emerald-600" />
                        {t("leaderboardTitle")}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{t("leaderboardSubtitle")}</p>
                </CardHeader>
                <CardContent>
                    {ranked.length === 0 ? (
                        <EmptyState icon={Trophy} body={t("leaderboardEmpty")} />
                    ) : (
                        <ol className="space-y-2">
                            {ranked.map((row, index) => {
                                const place = index + 1;
                                const isLeader = place === 1;
                                const name =
                                    getDisplayName(row.display_name, row.username) ??
                                    tCommon("noName");
                                return (
                                    <li key={row.user_id}>
                                        <div
                                            className={cn(
                                                "flex items-center gap-3 rounded-xl border p-3",
                                                isLeader &&
                                                    "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/30",
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                                                    isLeader
                                                        ? "bg-emerald-600 text-white"
                                                        : "bg-muted text-muted-foreground",
                                                )}
                                            >
                                                {place}
                                            </span>
                                            <Avatar className="h-9 w-9">
                                                {row.avatar_url ? (
                                                    <AvatarImage src={row.avatar_url} alt="" />
                                                ) : null}
                                                <AvatarFallback>
                                                    {getInitials(row.display_name, row.username)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">
                                                    {name}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {t("leaderboardRounds", { count: row.rounds })}
                                                    {" · "}
                                                    {t("leaderboardBest", {
                                                        best: formatRelative(row.best_relative),
                                                    })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-mono text-sm font-bold leading-none">
                                                    {formatRelative(Math.round(row.avg_relative))}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {t("leaderboardAvg", {
                                                        avg: row.avg_relative.toFixed(1),
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("holesTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                    {!holes?.length ? (
                        <EmptyState body={t("noHoles")} />
                    ) : (
                        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {holes.map((h) => (
                                <li
                                    key={h.id}
                                    className="flex items-center gap-3 rounded-xl border bg-card p-3"
                                >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                        {h.number}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium">
                                            {t("holePar")} {h.par}
                                        </p>
                                        {h.distance_m ? (
                                            <p className="text-xs text-muted-foreground">
                                                {h.distance_m} m
                                            </p>
                                        ) : null}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
