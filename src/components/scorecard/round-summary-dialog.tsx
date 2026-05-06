"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";

import type { Hole, Player } from "@/components/scorecard/scorecard";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    STROKE_BG,
    classifyStrokes,
    formatRelative,
    scoreKey,
    type StrokeKind,
} from "@/lib/strokes";
import { cn } from "@/lib/utils";

type Total = {
    playerId: string;
    userId: string;
    total: number;
    played: number;
    relative: number;
};

const STROKE_ORDER: StrokeKind[] = [
    "ace",
    "albatross",
    "eagle",
    "birdie",
    "par",
    "bogey",
    "double-bogey",
    "triple-bogey-plus",
];

/**
 * Post-finish celebration dialog. Auto-opens once after the host finishes
 * the round, and is reachable later via a "Show summary" button so users
 * can revisit. Pulls everything from data already in memory (totals, holes,
 * scores) so there's no extra fetch.
 */
export function RoundSummaryDialog({
    open,
    onOpenChange,
    currentUserId,
    courseId,
    players,
    holes,
    scores,
    totals,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentUserId: string;
    courseId: string | null;
    players: Player[];
    holes: Hole[];
    scores: Map<string, number>;
    totals: Total[];
}) {
    const t = useTranslations("scorecard.summary");

    const summary = useMemo(() => {
        const me = players.find((p) => p.user_id === currentUserId) ?? players[0];
        if (!me) return null;
        const myTotal = totals.find((tt) => tt.playerId === me.id);
        if (!myTotal) return null;

        // Place — sort totals by relative ASC, ignore players who haven't played.
        const ranked = [...totals]
            .filter((tt) => tt.played > 0)
            .sort((a, b) => a.relative - b.relative);
        const place = ranked.findIndex((tt) => tt.playerId === me.id) + 1;

        // Best / worst holes for the current player.
        type HoleStat = {
            number: number;
            relative: number;
            strokes: number;
            par: number;
            kind: StrokeKind;
        };
        let best: HoleStat | null = null;
        let worst: HoleStat | null = null;
        const distribution: Partial<Record<StrokeKind, number>> = {};
        for (const hole of holes) {
            const s = scores.get(scoreKey(me.id, hole.id));
            if (s === undefined) continue;
            const relative = s - hole.par;
            const kind = classifyStrokes(s, hole.par);
            distribution[kind] = (distribution[kind] ?? 0) + 1;
            if (best === null || relative < best.relative) {
                best = { number: hole.number, relative, strokes: s, par: hole.par, kind };
            }
            if (worst === null || relative > worst.relative) {
                worst = { number: hole.number, relative, strokes: s, par: hole.par, kind };
            }
        }

        const otherUserIds = players
            .filter((p) => p.user_id !== currentUserId)
            .map((p) => p.user_id);

        return {
            total: myTotal.total,
            played: myTotal.played,
            relative: myTotal.relative,
            place,
            totalPlayers: ranked.length,
            best,
            worst,
            distribution,
            otherUserIds,
        };
    }, [currentUserId, players, totals, scores, holes]);

    if (!summary) return null;

    const rematchHref = (() => {
        const params = new URLSearchParams();
        if (courseId) params.set("course", courseId);
        if (summary.otherUserIds.length > 0) {
            params.set("playerIds", summary.otherUserIds.join(","));
        }
        const qs = params.toString();
        return qs ? `/games/new?${qs}` : "/games/new";
    })();

    const placeLabel =
        summary.place === 1
            ? t("yourPlaceFirst")
            : summary.place > 0
              ? t("yourPlace", { place: summary.place })
              : t("noScores");

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        <Trophy className="h-6 w-6" />
                    </span>
                    <AlertDialogTitle className="text-center text-lg">
                        {t("title")}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                        {placeLabel}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/30 p-3 text-center">
                        <div className="space-y-0.5">
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                {t("yourTotal")}
                            </p>
                            <p className="font-mono text-2xl font-bold">{summary.total}</p>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                {t("vsPar")}
                            </p>
                            <p className="font-mono text-2xl font-bold">
                                {summary.played > 0 ? formatRelative(summary.relative) : "—"}
                            </p>
                        </div>
                    </div>

                    {(summary.best || summary.worst) && (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {summary.best ? (
                                <HoleStat
                                    label={t("bestHole")}
                                    hole={summary.best}
                                    holeLabel={t("holeNumberValue", { n: summary.best.number })}
                                />
                            ) : (
                                <span />
                            )}
                            {summary.worst ? (
                                <HoleStat
                                    label={t("worstHole")}
                                    hole={summary.worst}
                                    holeLabel={t("holeNumberValue", { n: summary.worst.number })}
                                />
                            ) : (
                                <span />
                            )}
                        </div>
                    )}

                    {Object.keys(summary.distribution).length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                {t("distribution")}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {STROKE_ORDER.filter(
                                    (kind) => (summary.distribution[kind] ?? 0) > 0,
                                ).map((kind) => (
                                    <span
                                        key={kind}
                                        className={cn(
                                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-bold",
                                            STROKE_BG[kind],
                                        )}
                                    >
                                        <span className="capitalize opacity-90">{kind}</span>
                                        <span>×{summary.distribution[kind]}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel>{t("viewScorecard")}</AlertDialogCancel>
                    <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        render={<Link href={rematchHref} />}
                    >
                        {t("rematch")}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function HoleStat({
    label,
    hole,
    holeLabel,
}: {
    label: string;
    hole: { strokes: number; par: number; relative: number; kind: StrokeKind };
    holeLabel: string;
}) {
    return (
        <div className="space-y-1 rounded-xl border p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="font-medium">{holeLabel}</p>
            <div className="flex items-center gap-2">
                <span
                    className={cn(
                        "inline-flex h-7 min-w-[3rem] items-center justify-center rounded-md px-2 font-mono text-sm font-bold",
                        STROKE_BG[hole.kind],
                    )}
                >
                    {hole.strokes}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                    {formatRelative(hole.relative)}
                </span>
            </div>
        </div>
    );
}
