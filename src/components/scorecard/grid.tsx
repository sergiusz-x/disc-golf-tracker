"use client";

import { useTranslations } from "next-intl";

import type { Hole, Player } from "@/components/scorecard/scorecard";
import { Card, CardContent } from "@/components/ui/card";
import { getDisplayName } from "@/lib/people";
import { classifyStrokes, STROKE_BG, formatRelative, scoreKey } from "@/lib/strokes";
import { cn } from "@/lib/utils";

export function ScorecardGrid({
    players,
    holes,
    scores,
    totals,
}: {
    players: Player[];
    holes: Hole[];
    scores: Map<string, number>;
    totals: Array<{
        playerId: string;
        total: number;
        played: number;
        relative: number;
    }>;
}) {
    const t = useTranslations("grid");
    const tCommon = useTranslations("common");
    const totalPar = holes.reduce((sum, h) => sum + h.par, 0);

    return (
        <Card>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
                                <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t("headerPlayer")}
                                </th>
                                {holes.map((h) => (
                                    <th
                                        key={h.id}
                                        className="px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground"
                                        title={`${t("headerPlayer")} ${h.number} – ${t("headerPar")} ${h.par}`}
                                    >
                                        <div className="leading-none">{h.number}</div>
                                        <div className="text-[10px] font-normal opacity-70">
                                            {t("headerPar").toLowerCase()} {h.par}
                                        </div>
                                    </th>
                                ))}
                                <th className="sticky right-0 z-10 bg-muted/50 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t("headerTotal")}
                                </th>
                                <th className="bg-muted/50 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t("headerVs")}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {players.map((p) => {
                                const tt = totals.find((x) => x.playerId === p.id);
                                return (
                                    <tr
                                        key={p.id}
                                        className="border-b border-border/60 last:border-none"
                                    >
                                        <td className="sticky left-0 z-10 bg-card px-3 py-2 text-left">
                                            <p className="truncate text-sm font-medium">
                                                {getDisplayName(
                                                    p.display_name,
                                                    p.full_name,
                                                    p.username,
                                                    p.email,
                                                ) ?? tCommon("noName")}
                                            </p>
                                        </td>
                                        {holes.map((h) => {
                                            const v = scores.get(scoreKey(p.id, h.id));
                                            const kind =
                                                v !== undefined ? classifyStrokes(v, h.par) : null;
                                            return (
                                                <td
                                                    key={h.id}
                                                    className="px-1.5 py-1.5 text-center"
                                                >
                                                    {v !== undefined && kind ? (
                                                        <span
                                                            className={cn(
                                                                "inline-flex h-7 w-7 items-center justify-center rounded-md font-mono text-xs font-bold",
                                                                STROKE_BG[kind],
                                                            )}
                                                        >
                                                            {v}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground/50">
                                                            ·
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="sticky right-0 z-10 bg-card px-3 py-2 text-center font-mono text-sm font-bold">
                                            {tt?.total ?? 0}
                                        </td>
                                        <td className="bg-card px-2 py-2 text-center font-mono text-xs">
                                            {tt ? formatRelative(tt.relative) : "E"}
                                        </td>
                                    </tr>
                                );
                            })}
                            <tr className="bg-muted/30">
                                <td className="sticky left-0 z-10 bg-muted/30 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t("headerPar")}
                                </td>
                                {holes.map((h) => (
                                    <td
                                        key={h.id}
                                        className="px-1.5 py-1.5 text-center font-mono text-xs text-muted-foreground"
                                    >
                                        {h.par}
                                    </td>
                                ))}
                                <td className="sticky right-0 z-10 bg-muted/30 px-3 py-2 text-center font-mono text-sm font-bold text-muted-foreground">
                                    {totalPar}
                                </td>
                                <td className="bg-muted/30 px-2 py-2"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
