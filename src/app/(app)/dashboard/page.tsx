import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight, MapPin, Play, Plus, Trophy, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ensureUserProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RecentGame = {
    id: string;
    name: string | null;
    status: "scheduled" | "in_progress" | "finished" | "cancelled";
    started_at: string | null;
    finished_at: string | null;
    created_at: string;
    course: { name: string; city: string | null } | null;
};

export default async function DashboardPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const [
        profile,
        { count: gamesCount },
        { count: coursesCount },
        { count: friendsCount },
        { data: activeGamesData },
        { data: recentGamesData },
    ] = await Promise.all([
        ensureUserProfile(supabase, user),
        supabase
            .from("game_players")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        // RLS already restricts friendships to rows the current user participates in.
        supabase
            .from("friendships")
            .select("id", { count: "exact", head: true })
            .eq("status", "accepted"),
        supabase
            .from("games")
            .select(
                `
          id,
          name,
          status,
          started_at,
          finished_at,
          created_at,
          course:courses ( name, city )
        `,
            )
            .eq("status", "in_progress")
            .order("started_at", { ascending: false, nullsFirst: false })
            .limit(3),
        // RLS on `games` enforces is_game_participant — this only returns games
        // the user is in, no extra .eq needed.
        supabase
            .from("games")
            .select(
                `
          id,
          name,
          status,
          started_at,
          finished_at,
          created_at,
          course:courses ( name, city )
        `,
            )
            .order("created_at", { ascending: false })
            .limit(3),
    ]);

    const activeGames = (activeGamesData ?? []) as RecentGame[];
    const recentGames = (recentGamesData ?? []) as RecentGame[];

    const t = await getTranslations("dashboard");
    const tCommon = await getTranslations("common");
    const tGameStatuses = await getTranslations("games.statuses");
    const tGamesList = await getTranslations("games.list");

    const firstName = (profile?.full_name ?? "").trim().split(" ")[0];
    const displayName =
        profile?.username?.trim() ||
        firstName ||
        user.email?.split("@")[0] ||
        t("greetingFallback");

    return (
        <div className="space-y-6">
            <header className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("welcome")}</p>
                <h1 className="text-3xl font-semibold tracking-tight">{displayName} 👋</h1>
            </header>

            <Card className="overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg dark:border-emerald-700">
                <CardContent className="flex items-center justify-between gap-4 p-5">
                    <div>
                        <p className="text-sm/none opacity-80">{t("newGameCard.label")}</p>
                        <p className="mt-1 text-lg font-semibold">{t("newGameCard.body")}</p>
                    </div>
                    <Button
                        size="lg"
                        variant="secondary"
                        className="shrink-0"
                        render={<Link href="/games/new" />}
                    >
                        <Plus className="mr-1 h-4 w-4" />
                        {t("newGameCard.cta")}
                    </Button>
                </CardContent>
            </Card>

            {activeGames.length > 0 ? (
                <Card className="border-emerald-200 bg-emerald-50/70 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/30">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white">
                                <Play className="h-4 w-4 fill-current" />
                            </span>
                            {t("active.title")}
                        </CardTitle>
                        <Button variant="ghost" size="sm" render={<Link href="/games" />}>
                            {tCommon("viewAll")} <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {activeGames.map((game) => (
                                <li key={game.id}>
                                    <Link
                                        href={`/games/${game.id}`}
                                        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                    >
                                        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-background p-3 transition-colors hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950/40">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                                                <Play className="h-5 w-5 fill-current" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="truncate text-sm font-medium">
                                                        {game.name ?? tGamesList("nameFallback")}
                                                    </p>
                                                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                                                        {tGameStatuses(game.status)}
                                                    </Badge>
                                                </div>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {game.course?.name ?? "—"}
                                                    {game.course?.city
                                                        ? ` · ${game.course.city}`
                                                        : ""}
                                                </p>
                                            </div>
                                            <span className="inline-flex h-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 px-2.5 text-[0.8rem] font-medium text-white">
                                                {t("active.cta")}
                                            </span>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
                <StatTile
                    icon={<Trophy className="h-4 w-4" />}
                    label={t("tiles.rounds")}
                    value={gamesCount ?? 0}
                />
                <StatTile
                    icon={<MapPin className="h-4 w-4" />}
                    label={t("tiles.courses")}
                    value={coursesCount ?? 0}
                />
                <StatTile
                    icon={<Users className="h-4 w-4" />}
                    label={t("tiles.friends")}
                    value={friendsCount ?? 0}
                />
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{t("recent.title")}</CardTitle>
                    <Button variant="ghost" size="sm" render={<Link href="/games" />}>
                        {tCommon("viewAll")} <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                </CardHeader>
                <CardContent>
                    {recentGames.length === 0 ? (
                        <EmptyState
                            icon={Trophy}
                            body={t("recent.empty")}
                            action={
                                <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    render={<Link href="/games/new" />}
                                >
                                    <Plus className="mr-1 h-4 w-4" />
                                    {t("recent.emptyCta")}
                                </Button>
                            }
                        />
                    ) : (
                        <ul className="space-y-2">
                            {recentGames.map((game) => (
                                <li key={game.id}>
                                    <Link
                                        href={`/games/${game.id}`}
                                        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                    >
                                        <div className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-accent/40">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                <Trophy className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="truncate text-sm font-medium">
                                                        {game.name ?? tGamesList("nameFallback")}
                                                    </p>
                                                    <Badge variant={badgeVariant(game.status)}>
                                                        {tGameStatuses(game.status)}
                                                    </Badge>
                                                </div>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {game.course?.name ?? "—"}
                                                    {game.course?.city
                                                        ? ` · ${game.course.city}`
                                                        : ""}
                                                </p>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function badgeVariant(status: RecentGame["status"]) {
    switch (status) {
        case "finished":
            return "secondary" as const;
        case "cancelled":
            return "destructive" as const;
        default:
            return "default" as const;
    }
}

function StatTile({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
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
                </div>
            </CardContent>
        </Card>
    );
}
