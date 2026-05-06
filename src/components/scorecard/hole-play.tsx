"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";

import { DisplayNameEditor } from "@/components/scorecard/display-name-editor";
import type { Hole, Player } from "@/components/scorecard/scorecard";
import { StrokesPicker } from "@/components/scorecard/strokes-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getDisplayName, getInitials } from "@/lib/people";
import { classifyStrokes, STROKE_BG, formatRelative, scoreKey } from "@/lib/strokes";
import { cn } from "@/lib/utils";

export function HolePlayView({
    hole,
    holes,
    currentHoleIdx,
    setCurrentHoleIdx,
    players,
    scores,
    currentUserId,
    isHost,
    isFinished,
    onSetScore,
    onClearScore,
}: {
    hole: Hole;
    holes: Hole[];
    currentHoleIdx: number;
    setCurrentHoleIdx: (n: number) => void;
    players: Player[];
    scores: Map<string, number>;
    currentUserId: string;
    isHost: boolean;
    isFinished: boolean;
    onSetScore: (gpId: string, holeId: string, n: number) => void;
    onClearScore: (gpId: string, holeId: string) => void;
}) {
    const t = useTranslations("holePlay");
    const tStrokes = useTranslations("strokes");
    const tCommon = useTranslations("common");

    const allScored = players.every((p) => scores.has(scoreKey(p.id, hole.id)));

    // Touch swipe between holes — left = next, right = previous. Triggers only
    // on dominantly-horizontal flicks so vertical scrolling stays unaffected.
    const swipeStartRef = useRef<{
        x: number;
        y: number;
        startedAt: number;
    } | null>(null);

    function handleTouchStart(event: React.TouchEvent) {
        const touch = event.touches[0];
        if (!touch) return;
        swipeStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            startedAt: Date.now(),
        };
    }

    function handleTouchEnd(event: React.TouchEvent) {
        const start = swipeStartRef.current;
        swipeStartRef.current = null;
        if (!start) return;
        const touch = event.changedTouches[0];
        if (!touch) return;
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        const elapsed = Date.now() - start.startedAt;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && elapsed < 500) {
            if (dx < 0 && currentHoleIdx < holes.length - 1) {
                setCurrentHoleIdx(currentHoleIdx + 1);
            } else if (dx > 0 && currentHoleIdx > 0) {
                setCurrentHoleIdx(currentHoleIdx - 1);
            }
        }
    }

    return (
        <div className="space-y-3" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <Card className="overflow-hidden border-emerald-200 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md dark:border-emerald-700">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    disabled={currentHoleIdx === 0}
                                    onClick={() => setCurrentHoleIdx(currentHoleIdx - 1)}
                                    aria-label={t("prevAriaLabel")}
                                />
                            }
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </TooltipTrigger>
                        <TooltipContent>{t("prevAriaLabel")}</TooltipContent>
                    </Tooltip>

                    <div className="flex flex-1 items-center justify-center gap-4 text-center">
                        <div>
                            <p className="text-[11px] uppercase tracking-wider opacity-80">
                                {t("hole")}
                            </p>
                            <p className="text-3xl font-bold leading-none">{hole.number}</p>
                            <p className="mt-0.5 text-[11px] opacity-80">
                                {t("holeOf", { n: holes.length })}
                            </p>
                        </div>
                        <div className="h-10 w-px bg-white/30" />
                        <div>
                            <p className="text-[11px] uppercase tracking-wider opacity-80">
                                {t("par")}
                            </p>
                            <p className="text-3xl font-bold leading-none">{hole.par}</p>
                            {hole.distance_m ? (
                                <p className="mt-0.5 text-[11px] opacity-80">
                                    {t("distance", { m: hole.distance_m })}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    disabled={currentHoleIdx === holes.length - 1}
                                    onClick={() => setCurrentHoleIdx(currentHoleIdx + 1)}
                                    aria-label={t("nextAriaLabel")}
                                />
                            }
                        >
                            <ChevronRight className="h-5 w-5" />
                        </TooltipTrigger>
                        <TooltipContent>{t("nextAriaLabel")}</TooltipContent>
                    </Tooltip>
                </CardContent>
            </Card>

            <ul className="space-y-2">
                {players.map((p) => {
                    const value = scores.get(scoreKey(p.id, hole.id));
                    const canEdit = !isFinished && (isHost || p.user_id === currentUserId);
                    const kind = value !== undefined ? classifyStrokes(value, hole.par) : null;
                    const initials = getInitials(p.display_name, p.full_name, p.username, p.email);

                    return (
                        <li key={p.id}>
                            <Card>
                                <CardContent className="space-y-2 p-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            {p.avatar_url ? (
                                                <AvatarImage src={p.avatar_url} alt="" />
                                            ) : null}
                                            <AvatarFallback>{initials}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1">
                                                <p className="truncate text-sm font-medium">
                                                    {getDisplayName(
                                                        p.display_name,
                                                        p.full_name,
                                                        p.username,
                                                        p.email,
                                                    ) ?? tCommon("noName")}
                                                </p>
                                                {p.user_id === currentUserId && !isFinished ? (
                                                    <DisplayNameEditor
                                                        gamePlayerId={p.id}
                                                        initial={p.display_name}
                                                        trigger={null}
                                                    />
                                                ) : null}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {kind ? tStrokes(kind) : "—"}
                                            </p>
                                        </div>
                                        {value !== undefined && kind ? (
                                            <span
                                                className={cn(
                                                    "flex h-9 min-w-[3rem] items-center justify-center rounded-lg px-2 font-mono text-sm font-bold",
                                                    STROKE_BG[kind],
                                                )}
                                            >
                                                {value}
                                                <span className="ml-1 text-[11px] opacity-80">
                                                    ({formatRelative(value - hole.par)})
                                                </span>
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                {t("noScore")}
                                            </span>
                                        )}
                                    </div>

                                    {canEdit ? (
                                        <StrokesPicker
                                            par={hole.par}
                                            value={value}
                                            onChange={(n) => onSetScore(p.id, hole.id, n)}
                                            onClear={() => onClearScore(p.id, hole.id)}
                                        />
                                    ) : (
                                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                            <Lock className="h-3 w-3" />
                                            {isFinished
                                                ? t("lockedFinished")
                                                : t("lockedNotAllowed")}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </li>
                    );
                })}
            </ul>

            {allScored && currentHoleIdx < holes.length - 1 && !isFinished ? (
                <Button
                    type="button"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setCurrentHoleIdx(currentHoleIdx + 1)}
                >
                    {t("nextCta", { n: hole.number + 1 })}
                    <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
            ) : null}
        </div>
    );
}
