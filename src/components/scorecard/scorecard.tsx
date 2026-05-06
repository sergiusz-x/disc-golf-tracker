"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Flag, ListOrdered, Loader2, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { finishGame, reopenGame } from "@/app/(app)/games/[id]/actions";
import { ShareGameButton } from "@/components/games/share-game-button";
import { GameNameEditor } from "@/components/scorecard/game-name-editor";
import { GameNotesDialog } from "@/components/scorecard/game-notes-dialog";
import { HolePlayView } from "@/components/scorecard/hole-play";
import { Leaderboard } from "@/components/scorecard/leaderboard";
import { PresenceStack } from "@/components/scorecard/presence-stack";
import { RoundSummaryDialog } from "@/components/scorecard/round-summary-dialog";
import { ScorecardGrid } from "@/components/scorecard/grid";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDisplayName } from "@/lib/people";
import { scoreKey } from "@/lib/strokes";
import { createClient } from "@/lib/supabase/client";

import type { GameStatus } from "@/types/database";

export type Player = {
    id: string; // game_player_id
    user_id: string;
    display_name: string | null;
    full_name: string | null;
    username: string | null;
    email: string;
    avatar_url: string | null;
    position: number;
};

export type Hole = {
    id: string;
    number: number;
    par: number;
    distance_m: number | null;
};

export type ScoreRow = {
    game_player_id: string;
    hole_id: string;
    strokes: number;
};

type ScoreBroadcastPayload =
    | (ScoreRow & { action: "upsert" })
    | { action: "delete"; game_player_id: string; hole_id: string };

type GameBroadcastPayload = {
    status: GameStatus;
};

export type GameMeta = {
    id: string;
    name: string | null;
    notes: string | null;
    status: GameStatus;
    host_id: string;
    course_id: string | null;
    course_name: string;
};

export function Scorecard({
    game: initialGame,
    currentUserId,
    players: initialPlayers,
    holes,
    initialScores,
}: {
    game: GameMeta;
    currentUserId: string;
    players: Player[];
    holes: Hole[];
    initialScores: ScoreRow[];
}) {
    const t = useTranslations("scorecard");
    const tErrors = useTranslations("scorecard.errors");

    const [game, setGame] = useState(initialGame);
    const [players, setPlayers] = useState(initialPlayers);
    const [scores, setScores] = useState<Map<string, number>>(() => {
        const m = new Map<string, number>();
        for (const s of initialScores) m.set(scoreKey(s.game_player_id, s.hole_id), s.strokes);
        return m;
    });
    const [currentHoleIdx, setCurrentHoleIdx] = useState<number>(() =>
        pickStartingHole(holes, initialPlayers, initialScores),
    );
    const [view, setView] = useState<"play" | "card">("play");
    const [finishOpen, setFinishOpen] = useState(false);
    const [finishConfirmArmed, setFinishConfirmArmed] = useState(false);
    const [summaryOpen, setSummaryOpen] = useState(false);
    const [finishing, startFinishTransition] = useTransition();
    const gameChannelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(
        null,
    );

    const isHost = currentUserId === game.host_id;
    const isFinished = game.status === "finished";
    const currentHole = holes[currentHoleIdx];

    // --- Realtime subscription -----------------------------------------------
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel(`game:${game.id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "scores",
                    filter: `game_id=eq.${game.id}`,
                },
                (payload) => {
                    setScores((prev) => {
                        const next = new Map(prev);
                        if (payload.eventType === "DELETE") {
                            const old = payload.old as Partial<ScoreRow>;
                            if (old.game_player_id && old.hole_id) {
                                next.delete(scoreKey(old.game_player_id, old.hole_id));
                            }
                        } else {
                            const row = payload.new as ScoreRow;
                            if (row?.game_player_id && row?.hole_id) {
                                next.set(scoreKey(row.game_player_id, row.hole_id), row.strokes);
                            }
                        }
                        return next;
                    });
                },
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "game_players",
                    filter: `game_id=eq.${game.id}`,
                },
                () => {
                    // Light refresh of player list.
                    void refreshPlayers(game.id, setPlayers);
                },
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "games",
                    filter: `id=eq.${game.id}`,
                },
                (payload) => {
                    const next = payload.new as { status?: GameStatus };
                    if (next.status) setGame((g) => ({ ...g, status: next.status! }));
                },
            )
            .on(
                "broadcast",
                { event: "score_change" },
                ({ payload }: { payload: ScoreBroadcastPayload }) => {
                    setScores((prev) => {
                        const next = new Map(prev);
                        const key = scoreKey(payload.game_player_id, payload.hole_id);
                        if (payload.action === "delete") {
                            next.delete(key);
                        } else {
                            next.set(key, payload.strokes);
                        }
                        return next;
                    });
                },
            )
            .on(
                "broadcast",
                { event: "game_change" },
                ({ payload }: { payload: GameBroadcastPayload }) => {
                    setGame((current) => ({ ...current, status: payload.status }));
                },
            )
            .subscribe();
        gameChannelRef.current = channel;

        return () => {
            gameChannelRef.current = null;
            void supabase.removeChannel(channel);
        };
    }, [game.id]);

    // --- Score mutators ------------------------------------------------------
    const setScore = useCallback(
        async (gpId: string, holeId: string, strokes: number) => {
            const k = scoreKey(gpId, holeId);
            const prev = scores.get(k);
            // optimistic
            setScores((m) => {
                const next = new Map(m);
                next.set(k, strokes);
                return next;
            });

            const supabase = createClient();
            const { error } = await supabase.from("scores").upsert(
                {
                    game_id: game.id,
                    game_player_id: gpId,
                    hole_id: holeId,
                    strokes,
                },
                { onConflict: "game_player_id,hole_id" },
            );
            if (error) {
                // rollback
                setScores((m) => {
                    const next = new Map(m);
                    if (prev === undefined) next.delete(k);
                    else next.set(k, prev);
                    return next;
                });
                toast.error(t("toast.scoreFailed"), { description: error.message });
                return;
            }

            void gameChannelRef.current?.send({
                type: "broadcast",
                event: "score_change",
                payload: {
                    action: "upsert",
                    game_player_id: gpId,
                    hole_id: holeId,
                    strokes,
                } satisfies ScoreBroadcastPayload,
            });
        },
        [scores, game.id, t],
    );

    const clearScore = useCallback(
        async (gpId: string, holeId: string) => {
            const k = scoreKey(gpId, holeId);
            const prev = scores.get(k);
            if (prev === undefined) return;

            setScores((m) => {
                const next = new Map(m);
                next.delete(k);
                return next;
            });

            const supabase = createClient();
            const { error } = await supabase
                .from("scores")
                .delete()
                .eq("game_player_id", gpId)
                .eq("hole_id", holeId);

            if (error) {
                // rollback
                setScores((m) => {
                    const next = new Map(m);
                    next.set(k, prev);
                    return next;
                });
                toast.error(t("toast.clearFailed"), { description: error.message });
                return;
            }

            void gameChannelRef.current?.send({
                type: "broadcast",
                event: "score_change",
                payload: {
                    action: "delete",
                    game_player_id: gpId,
                    hole_id: holeId,
                } satisfies ScoreBroadcastPayload,
            });
        },
        [scores, t],
    );

    // --- Aggregations --------------------------------------------------------
    const totals = useMemo(() => {
        return players.map((p) => {
            let total = 0;
            let played = 0;
            let parPlayed = 0;
            for (const h of holes) {
                const s = scores.get(scoreKey(p.id, h.id));
                if (s !== undefined) {
                    total += s;
                    played += 1;
                    parPlayed += h.par;
                }
            }
            return {
                playerId: p.id,
                userId: p.user_id,
                total,
                played,
                relative: total - parPlayed,
            };
        });
    }, [players, holes, scores]);

    const missingScores = useMemo(() => {
        return players
            .map((player) => {
                const missingHoles = holes
                    .filter((hole) => !scores.has(scoreKey(player.id, hole.id)))
                    .map((hole) => hole.number);

                return { player, missingHoles };
            })
            .filter((row) => row.missingHoles.length > 0);
    }, [players, holes, scores]);

    const hasMissingScores = missingScores.length > 0;

    // --- Finish / reopen -----------------------------------------------------
    function translateActionError(code: string, detail: string | undefined): string {
        try {
            const key = code as Parameters<typeof tErrors>[0];
            return detail ? tErrors(key, { detail }) : tErrors(key);
        } catch {
            return code;
        }
    }

    function performFinish() {
        setFinishOpen(false);
        setFinishConfirmArmed(false);
        startFinishTransition(async () => {
            const r = await finishGame(game.id);
            if (!r.ok) {
                toast.error(translateActionError(r.error, r.detail));
            } else {
                setGame((current) => ({ ...current, status: "finished" }));
                void gameChannelRef.current?.send({
                    type: "broadcast",
                    event: "game_change",
                    payload: { status: "finished" } satisfies GameBroadcastPayload,
                });
                toast.success(t("toast.finished"));
                // Lazy-load confetti — only shipped to the client when someone
                // actually finishes a round.
                void import("canvas-confetti").then(({ default: confetti }) => {
                    confetti({
                        particleCount: 120,
                        spread: 80,
                        origin: { y: 0.6 },
                        colors: ["#10b981", "#34d399", "#f59e0b", "#fbbf24"],
                    });
                });
                // Pop the summary right after — also accessible later via the
                // "Show summary" button on the now-finished card.
                setSummaryOpen(true);
            }
        });
    }
    function handleFinishConfirm() {
        if (hasMissingScores && !finishConfirmArmed) {
            setFinishConfirmArmed(true);
            return;
        }
        performFinish();
    }
    function handleReopen() {
        startFinishTransition(async () => {
            const r = await reopenGame(game.id);
            if (!r.ok) {
                toast.error(translateActionError(r.error, r.detail));
            } else {
                setGame((current) => ({ ...current, status: "in_progress" }));
                void gameChannelRef.current?.send({
                    type: "broadcast",
                    event: "game_change",
                    payload: { status: "in_progress" } satisfies GameBroadcastPayload,
                });
                toast.success(t("toast.reopened"));
            }
        });
    }

    return (
        <div className="space-y-4">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <div className="flex items-center gap-1">
                        <GameNameEditor
                            gameId={game.id}
                            initial={game.name}
                            fallback={t("titleFallback")}
                            canEdit={isHost && !isFinished}
                        />
                        <ShareGameButton gameId={game.id} />
                        <GameNotesDialog
                            gameId={game.id}
                            initial={game.notes}
                            canEdit={isHost && !isFinished}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{game.course_name}</span>
                        <span>·</span>
                        <Badge
                            variant={isFinished ? "secondary" : "default"}
                            className={
                                isFinished ? "" : "bg-emerald-600 text-white hover:bg-emerald-600"
                            }
                        >
                            {isFinished ? t("status.finished") : t("status.in_progress")}
                        </Badge>
                        <PresenceStack
                            gameId={game.id}
                            currentUserId={currentUserId}
                            players={players}
                        />
                    </div>
                </div>

                {isHost ? (
                    isFinished ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReopen}
                            disabled={finishing}
                        >
                            {finishing ? (
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                                <RotateCcw className="mr-1 h-4 w-4" />
                            )}
                            {t("reopen")}
                        </Button>
                    ) : (
                        <AlertDialog
                            open={finishOpen}
                            onOpenChange={(open) => {
                                setFinishOpen(open);
                                if (!open) setFinishConfirmArmed(false);
                            }}
                        >
                            <Button
                                size="sm"
                                onClick={() => setFinishOpen(true)}
                                disabled={finishing}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {finishing ? (
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                ) : (
                                    <Flag className="mr-1 h-4 w-4" />
                                )}
                                {t("finish")}
                            </Button>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{t("finishDialog.title")}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {hasMissingScores
                                            ? finishConfirmArmed
                                                ? t("finishDialog.missingSecondConfirm")
                                                : t("finishDialog.missingBody")
                                            : t("finishDialog.body")}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                {hasMissingScores ? (
                                    <div className="max-h-56 overflow-y-auto rounded-lg border bg-muted/40 p-3 text-left text-sm">
                                        <p className="mb-2 font-medium text-foreground">
                                            {t("finishDialog.missingTitle")}
                                        </p>
                                        <ul className="space-y-1.5 text-muted-foreground">
                                            {missingScores.map(({ player, missingHoles }) => (
                                                <li key={player.id}>
                                                    <span className="font-medium text-foreground">
                                                        {getDisplayName(
                                                            player.display_name,
                                                            player.full_name,
                                                            player.username,
                                                            player.email,
                                                        ) ?? t("finishDialog.unknownPlayer")}
                                                    </span>
                                                    {": "}
                                                    {t("finishDialog.missingHoles", {
                                                        holes: missingHoles.join(", "),
                                                    })}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={finishing}>
                                        {t("finishDialog.cancel")}
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleFinishConfirm}
                                        disabled={finishing}
                                        className={
                                            hasMissingScores && finishConfirmArmed
                                                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                : "bg-emerald-600 hover:bg-emerald-700"
                                        }
                                    >
                                        {hasMissingScores && !finishConfirmArmed
                                            ? t("finishDialog.reviewMissingConfirm")
                                            : t("finishDialog.confirm")}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )
                ) : null}
            </header>

            <Tabs value={view} onValueChange={(v) => setView(v === "card" ? "card" : "play")}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="play">
                        <Play className="mr-1 h-4 w-4" />
                        {t("tabs.play")}
                    </TabsTrigger>
                    <TabsTrigger value="card">
                        <ListOrdered className="mr-1 h-4 w-4" />
                        {t("tabs.card")}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="play" className="mt-4">
                    {currentHole ? (
                        <HolePlayView
                            hole={currentHole}
                            holes={holes}
                            currentHoleIdx={currentHoleIdx}
                            setCurrentHoleIdx={setCurrentHoleIdx}
                            players={players}
                            scores={scores}
                            currentUserId={currentUserId}
                            isHost={isHost}
                            isFinished={isFinished}
                            onSetScore={setScore}
                            onClearScore={clearScore}
                        />
                    ) : null}
                </TabsContent>

                <TabsContent value="card" className="mt-4">
                    <ScorecardGrid
                        players={players}
                        holes={holes}
                        scores={scores}
                        totals={totals}
                    />
                </TabsContent>
            </Tabs>

            <Leaderboard players={players} totals={totals} hostId={game.host_id} />

            {isFinished ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        {t("finishedBanner")}
                    </span>
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setSummaryOpen(true)}
                    >
                        {t("summary.openTrigger")}
                    </Button>
                </div>
            ) : null}

            <RoundSummaryDialog
                open={summaryOpen}
                onOpenChange={setSummaryOpen}
                currentUserId={currentUserId}
                courseId={game.course_id}
                players={players}
                holes={holes}
                scores={scores}
                totals={totals}
            />
        </div>
    );
}

function pickStartingHole(holes: Hole[], players: Player[], scores: ScoreRow[]): number {
    if (holes.length === 0) return 0;
    const filled = new Set(scores.map((s) => scoreKey(s.game_player_id, s.hole_id)));
    for (let i = 0; i < holes.length; i++) {
        const h = holes[i];
        const allDone = players.every((p) => filled.has(scoreKey(p.id, h.id)));
        if (!allDone) return i;
    }
    return holes.length - 1;
}

async function refreshPlayers(gameId: string, setPlayers: (p: Player[]) => void) {
    const supabase = createClient();
    const { data } = await supabase
        .from("game_players")
        .select(
            `
        id,
        user_id,
        display_name,
        position,
        user:users ( id, full_name, username, email, avatar_url )
      `,
        )
        .eq("game_id", gameId)
        .order("position", { ascending: true });

    if (!data) return;
    setPlayers(
        data.map((row) => ({
            id: row.id,
            user_id: row.user_id,
            display_name: row.display_name,
            position: row.position,
            full_name: row.user?.full_name ?? null,
            username: row.user?.username ?? null,
            email: row.user?.email ?? "",
            avatar_url: row.user?.avatar_url ?? null,
        })),
    );
}
