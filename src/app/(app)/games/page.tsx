import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Clock3, MapPin, Plus, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type GameStatus = "scheduled" | "in_progress" | "finished" | "cancelled";

type GameRow = {
    id: string;
    name: string | null;
    status: GameStatus;
    started_at: string | null;
    finished_at: string | null;
    created_at: string;
    course: { name: string; city: string | null } | null;
};

export default async function GamesPage() {
    const supabase = await createClient();

    const { data: games } = await supabase
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
        .limit(24);

    const rows = (games ?? []) as GameRow[];
    const recent = rows[0] ?? null;

    const t = await getTranslations("games.list");
    const tStatus = await getTranslations("games.statuses");
    const locale = await getLocale();

    const formatDate = (value: string) => formatRelativeDate(value, locale);

    return (
        <div className="space-y-5">
            <header className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
                <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            </header>

            <Card className="border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                            {t("ctaCardTitle")}
                        </p>
                        <p className="text-sm text-emerald-800/80 dark:text-emerald-200/80">
                            {t("ctaCardBody")}
                        </p>
                    </div>
                    <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        render={<Link href="/games/new" />}
                    >
                        <Plus className="mr-1 h-4 w-4" />
                        {t("ctaCardButton")}
                    </Button>
                </CardContent>
            </Card>

            {recent ? (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                        <CardTitle className="text-base">{t("recentTitle")}</CardTitle>
                        <Badge variant={badgeVariant(recent.status)}>
                            {tStatus(recent.status)}
                        </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-1">
                            <p className="font-medium">{recent.name ?? t("nameFallback")}</p>
                            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                {recent.course?.name ?? "—"}
                                {recent.course?.city ? ` · ${recent.course.city}` : ""}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                                <Clock3 className="h-3.5 w-3.5" />
                                {formatDate(recent.started_at ?? recent.created_at)}
                            </span>
                            {recent.finished_at ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <Trophy className="h-3.5 w-3.5" />
                                    {t("finishedAt", { date: formatDate(recent.finished_at) })}
                                </span>
                            ) : null}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            render={<Link href={`/games/${recent.id}`} />}
                        >
                            {t("openRound")}
                            <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <EmptyState
                    icon={Trophy}
                    body={t("empty")}
                    action={
                        <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            render={<Link href="/games/new" />}
                        >
                            <Plus className="mr-1 h-4 w-4" />
                            {t("ctaCardButton")}
                        </Button>
                    }
                />
            )}

            <section className="space-y-3">
                <h2 className="text-base font-semibold">{t("allRounds")}</h2>
                {rows.length === 0 ? null : (
                    <ul className="space-y-2">
                        {rows.map((game) => (
                            <li key={game.id}>
                                <Card className="transition-colors hover:bg-accent/40">
                                    <CardContent className="flex items-center gap-3 p-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                            <Trophy className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="truncate font-medium">
                                                    {game.name ?? t("nameFallback")}
                                                </p>
                                                <Badge variant={badgeVariant(game.status)}>
                                                    {tStatus(game.status)}
                                                </Badge>
                                            </div>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {game.course?.name ?? "—"}
                                                {game.course?.city ? ` · ${game.course.city}` : ""}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            render={<Link href={`/games/${game.id}`} />}
                                        >
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}

function badgeVariant(status: GameStatus) {
    switch (status) {
        case "finished":
            return "secondary";
        case "cancelled":
            return "destructive";
        default:
            return "default";
    }
}
