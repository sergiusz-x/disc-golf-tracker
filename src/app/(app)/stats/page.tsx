import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Medal, Target, TrendingUp, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/strokes";

export const dynamic = "force-dynamic";

type LeaderboardRow = {
    game_id: string | null;
    user_id: string | null;
    display_name: string | null;
    full_name: string | null;
    total_strokes: number | null;
    holes_played: number | null;
    relative_to_par: number | null;
};

type RecentGame = {
    id: string;
    name: string | null;
    started_at: string | null;
    finished_at: string | null;
    course: { name: string; city: string | null } | null;
};

export default async function StatsPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const [{ data: games }, { data: leaderboard }] = await Promise.all([
        supabase
            .from("games")
            .select(
                `
          id,
          name,
          started_at,
          finished_at,
          course:courses ( name, city )
        `,
            )
            .eq("status", "finished")
            .order("finished_at", { ascending: false })
            .limit(12),
        supabase
            .from("game_leaderboard")
            .select(
                "game_id, user_id, display_name, full_name, total_strokes, holes_played, relative_to_par",
            )
            .eq("user_id", user.id),
    ]);

    const rounds = (leaderboard ?? []) as LeaderboardRow[];
    const finishedGames = (games ?? []) as RecentGame[];
    const totalRounds = rounds.length;
    const totalHoles = rounds.reduce((sum, row) => sum + (row.holes_played ?? 0), 0);
    const avgScore =
        totalRounds > 0
            ? rounds.reduce((sum, row) => sum + (row.total_strokes ?? 0), 0) / totalRounds
            : null;

    const bestRound =
        rounds
            .filter((row) => row.holes_played && row.holes_played > 0)
            .sort((a, b) => (a.relative_to_par ?? 0) - (b.relative_to_par ?? 0))[0] ?? null;

    const friendLeaderboardRows = await loadFriendLeaderboardRows(supabase);
    const friendLeaderboard = buildFriendLeaderboard(rowsByUser(friendLeaderboardRows));

    const t = await getTranslations("stats");
    const tCommon = await getTranslations("common");
    const tGameStatuses = await getTranslations("games.statuses");
    const tGamesList = await getTranslations("games.list");

    return (
        <div className="space-y-5">
            <header className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
                <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            </header>

            <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard
                    icon={<TrendingUp className="h-4 w-4" />}
                    label={t("metrics.roundsLabel")}
                    value={String(totalRounds)}
                    description={
                        totalHoles
                            ? t("metrics.roundsHoles", { count: totalHoles })
                            : t("metrics.roundsEmpty")
                    }
                />
                <MetricCard
                    icon={<Target className="h-4 w-4" />}
                    label={t("metrics.averageLabel")}
                    value={avgScore ? avgScore.toFixed(1) : "—"}
                    description={
                        avgScore ? t("metrics.averageDescription") : t("metrics.averageEmpty")
                    }
                />
                <MetricCard
                    icon={<Medal className="h-4 w-4" />}
                    label={t("metrics.bestLabel")}
                    value={bestRound ? formatRelative(bestRound.relative_to_par ?? 0) : "—"}
                    description={
                        bestRound
                            ? t("metrics.bestStrokes", {
                                  count: bestRound.total_strokes ?? 0,
                              })
                            : t("metrics.bestEmpty")
                    }
                />
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <CardTitle className="text-base">{t("recent.title")}</CardTitle>
                    <Button variant="ghost" size="sm" render={<Link href="/games" />}>
                        {tCommon("viewAll")} <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                    {finishedGames.length === 0 ? (
                        <EmptyState icon={Medal} body={t("recent.empty")} />
                    ) : (
                        <ul className="space-y-2">
                            {finishedGames.map((game) => (
                                <li key={game.id}>
                                    <Card className="transition-colors hover:bg-accent/40">
                                        <CardContent className="flex items-center gap-3 p-4">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium">
                                                    {game.name ?? tGamesList("nameFallback")}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {game.course?.name ?? "—"}
                                                    {game.course?.city
                                                        ? ` · ${game.course.city}`
                                                        : ""}
                                                </p>
                                            </div>
                                            <Badge variant="secondary">
                                                {tGameStatuses("finished")}
                                            </Badge>
                                        </CardContent>
                                    </Card>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Users className="h-4 w-4 text-emerald-600" />
                            {t("leaderboard.title")}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            {t("leaderboard.scopeHint")}
                        </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                        {t("leaderboard.peopleBadge", { count: friendLeaderboard.length })}
                    </Badge>
                </CardHeader>
                <CardContent>
                    {friendLeaderboard.length === 0 ? (
                        <EmptyState icon={Users} body={t("leaderboard.empty")} />
                    ) : (
                        <ol className="space-y-2">
                            {friendLeaderboard.map((row, index) => (
                                <li key={row.user_id}>
                                    <div className="flex items-center gap-3 rounded-xl border p-3">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                            {index + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {row.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {t("leaderboard.summary", {
                                                    rounds: row.rounds,
                                                    holes: row.holes_played,
                                                })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono text-sm font-bold">
                                                {formatRelative(row.relative_to_par)}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {t("leaderboard.average", {
                                                    avg: row.averageRelative.toFixed(1),
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

async function loadFriendLeaderboardRows(supabase: Awaited<ReturnType<typeof createClient>>) {
    const { data } = await supabase
        .from("game_leaderboard")
        .select("user_id, display_name, full_name, total_strokes, holes_played, relative_to_par");

    return (data ?? []) as LeaderboardRow[];
}

function rowsByUser(rows: LeaderboardRow[]) {
    const map = new Map<
        string,
        {
            name: string;
            total_strokes: number;
            holes_played: number;
            relative_to_par: number;
            rounds: number;
        }
    >();
    for (const row of rows) {
        const userId = row.user_id;
        if (!userId) continue;
        const holes = row.holes_played ?? 0;
        // Skip rounds with zero played holes — they would dilute the per-round
        // average (relative_to_par / rounds) used for ranking.
        if (holes <= 0) continue;
        const current = map.get(userId) ?? {
            name: row.display_name ?? row.full_name ?? userId,
            total_strokes: 0,
            holes_played: 0,
            relative_to_par: 0,
            rounds: 0,
        };
        current.total_strokes += row.total_strokes ?? 0;
        current.holes_played += holes;
        current.relative_to_par += row.relative_to_par ?? 0;
        current.rounds += 1;
        map.set(userId, current);
    }
    return map;
}

function buildFriendLeaderboard(
    grouped: Map<
        string,
        {
            name: string;
            total_strokes: number;
            holes_played: number;
            relative_to_par: number;
            rounds: number;
        }
    >,
) {
    return Array.from(grouped.entries())
        .map(([userId, stats]) => ({
            user_id: userId,
            ...stats,
            averageRelative: stats.rounds > 0 ? stats.relative_to_par / stats.rounds : 0,
        }))
        .sort((a, b) => a.relative_to_par - b.relative_to_par);
}

function MetricCard({
    icon,
    label,
    value,
    description,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    description: string;
}) {
    return (
        <Card>
            <CardContent className="flex items-center gap-3 p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {icon}
                </span>
                <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-xl font-semibold">{value}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
            </CardContent>
        </Card>
    );
}
