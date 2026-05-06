"use client";

import { useTranslations } from "next-intl";
import { Crown, Trophy } from "lucide-react";

import type { Player } from "@/components/scorecard/scorecard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { getDisplayName, getInitials } from "@/lib/people";
import { formatRelative } from "@/lib/strokes";
import { cn } from "@/lib/utils";

export function Leaderboard({
    players,
    totals,
    hostId,
}: {
    players: Player[];
    totals: Array<{
        playerId: string;
        userId: string;
        total: number;
        played: number;
        relative: number;
    }>;
    hostId: string;
}) {
    const t = useTranslations("leaderboard");
    const tCommon = useTranslations("common");

    const ranked = [...totals].sort((a, b) => {
        if (a.played === 0 && b.played === 0) return 0;
        if (a.played === 0) return 1;
        if (b.played === 0) return -1;
        return a.relative - b.relative;
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-4 w-4 text-emerald-600" />
                    {t("title")}
                </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
                <ol className="space-y-1">
                    {ranked.map((tt, idx) => {
                        const player = players.find((p) => p.id === tt.playerId);
                        if (!player) return null;
                        const initials = getInitials(
                            player.display_name,
                            player.full_name,
                            player.username,
                            player.email,
                        );
                        const place = idx + 1;
                        const isLeader = place === 1 && tt.played > 0;
                        const displayName =
                            getDisplayName(
                                player.display_name,
                                player.full_name,
                                player.username,
                                player.email,
                            ) ?? tCommon("noName");
                        return (
                            <li
                                key={tt.playerId}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg p-2",
                                    isLeader
                                        ? "bg-emerald-50 dark:bg-emerald-950/40"
                                        : "hover:bg-muted/50",
                                )}
                            >
                                <span
                                    className={cn(
                                        "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
                                        isLeader
                                            ? "bg-emerald-600 text-white"
                                            : "bg-muted text-muted-foreground",
                                    )}
                                >
                                    {place}
                                </span>
                                <HoverCard>
                                    <HoverCardTrigger
                                        render={
                                            <button
                                                type="button"
                                                className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                                            />
                                        }
                                    >
                                        <Avatar className="h-8 w-8">
                                            {player.avatar_url ? (
                                                <AvatarImage src={player.avatar_url} alt="" />
                                            ) : null}
                                            <AvatarFallback>{initials}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                                                {displayName}
                                                {player.user_id === hostId ? (
                                                    <Crown
                                                        className="h-3.5 w-3.5 text-amber-500"
                                                        aria-label={t("hostAriaLabel")}
                                                    />
                                                ) : null}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {t("holesPlayed", { count: tt.played })}
                                            </p>
                                        </div>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-72">
                                        <div className="flex items-start gap-3">
                                            <Avatar className="h-12 w-12">
                                                {player.avatar_url ? (
                                                    <AvatarImage src={player.avatar_url} alt="" />
                                                ) : null}
                                                <AvatarFallback>{initials}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1 space-y-0.5">
                                                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                                                    {displayName}
                                                    {player.user_id === hostId ? (
                                                        <Crown className="h-3 w-3 text-amber-500" />
                                                    ) : null}
                                                </p>
                                                {player.username ? (
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        @{player.username}
                                                    </p>
                                                ) : null}
                                                {player.email ? (
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {player.email}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center">
                                            <Stat
                                                value={tt.played === 0 ? "—" : String(tt.total)}
                                                label={t("title")}
                                            />
                                            <Stat
                                                value={
                                                    tt.played > 0
                                                        ? formatRelative(tt.relative)
                                                        : "—"
                                                }
                                                label="vs par"
                                            />
                                            <Stat
                                                value={String(tt.played)}
                                                label={t("holesPlayed", {
                                                    count: tt.played,
                                                }).replace(/^\d+\s*/, "")}
                                            />
                                        </div>
                                    </HoverCardContent>
                                </HoverCard>
                                <div className="text-right">
                                    <p className="font-mono text-base font-bold leading-none">
                                        {tt.total || "—"}
                                    </p>
                                    <Badge
                                        variant="secondary"
                                        className={cn(
                                            "mt-0.5 font-mono text-[10px]",
                                            tt.relative < 0 &&
                                                "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
                                            tt.relative > 0 &&
                                                "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200",
                                        )}
                                    >
                                        {tt.played > 0 ? formatRelative(tt.relative) : "—"}
                                    </Badge>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </CardContent>
        </Card>
    );
}

function Stat({ value, label }: { value: string; label: string }) {
    return (
        <div className="space-y-0.5">
            <p className="font-mono text-sm font-bold">{value}</p>
            <p className="truncate text-[10px] text-muted-foreground">{label}</p>
        </div>
    );
}
