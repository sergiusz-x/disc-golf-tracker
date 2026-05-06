import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, MapPin } from "lucide-react";

import { JoinGameButton } from "@/components/games/join-game-button";
import {
    Scorecard,
    type GameMeta,
    type Hole,
    type Player,
    type ScoreRow,
} from "@/components/scorecard/scorecard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: gameRow } = await supabase
        .from("games")
        .select(
            `
        id,
        name,
        notes,
        status,
        host_id,
        course:courses ( id, name, hole_count, total_par )
      `,
        )
        .eq("id", id)
        .maybeSingle();

    // RLS hides games we're not in. If we got nothing back, check via the
    // security-definer RPC whether the game actually exists — if so, render a
    // join prompt so the user can accept the invite.
    if (!gameRow) {
        const { data: invite } = await supabase.rpc("get_game_invite_info", {
            p_game_id: id,
        });
        const inviteRow = invite?.[0];
        if (inviteRow) {
            return <JoinGamePrompt gameId={id} invite={inviteRow} />;
        }
        notFound();
    }

    const t = await getTranslations("games.detail");

    const courseId = gameRow.course?.id ?? null;
    if (!courseId) {
        return <ErrorState message={t("noCourse")} />;
    }

    const [{ data: playersData }, { data: holesData }, { data: scoresData }] = await Promise.all([
        supabase
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
            .eq("game_id", id)
            .order("position", { ascending: true }),
        supabase
            .from("holes")
            .select("id, number, par, distance_m")
            .eq("course_id", courseId)
            .order("number", { ascending: true }),
        supabase.from("scores").select("game_player_id, hole_id, strokes").eq("game_id", id),
    ]);

    if (!holesData || holesData.length === 0) {
        return <ErrorState message={t("noHoles")} />;
    }
    if (!playersData || playersData.length === 0) {
        return <ErrorState message={t("noPlayers")} />;
    }

    const players: Player[] = playersData.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        display_name: row.display_name,
        position: row.position,
        full_name: row.user?.full_name ?? null,
        username: row.user?.username ?? null,
        email: row.user?.email ?? "",
        avatar_url: row.user?.avatar_url ?? null,
    }));

    const holes: Hole[] = holesData.map((h) => ({
        id: h.id,
        number: h.number,
        par: h.par,
        distance_m: h.distance_m,
    }));

    const scores: ScoreRow[] = (scoresData ?? []).map((s) => ({
        game_player_id: s.game_player_id,
        hole_id: s.hole_id,
        strokes: s.strokes,
    }));

    const gameMeta: GameMeta = {
        id: gameRow.id,
        name: gameRow.name,
        notes: gameRow.notes,
        status: gameRow.status,
        host_id: gameRow.host_id,
        course_id: gameRow.course?.id ?? null,
        course_name: gameRow.course?.name ?? "—",
    };

    return (
        <div className="space-y-3">
            <Button variant="ghost" size="sm" render={<Link href="/games" />}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                {t("backToList")}
            </Button>

            <Scorecard
                game={gameMeta}
                currentUserId={user.id}
                players={players}
                holes={holes}
                initialScores={scores}
            />
        </div>
    );
}

function ErrorState({ message }: { message: string }) {
    return (
        <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
                {message}
            </CardContent>
        </Card>
    );
}

type InviteRow = {
    game_id: string;
    name: string | null;
    status: "scheduled" | "in_progress" | "finished" | "cancelled";
    host_full_name: string | null;
    host_username: string | null;
    course_name: string | null;
    course_city: string | null;
};

async function JoinGamePrompt({ gameId, invite }: { gameId: string; invite: InviteRow }) {
    const t = await getTranslations("gameInvite");
    const tGamesList = await getTranslations("games.list");
    const tCommon = await getTranslations("common");

    const hostName = invite.host_full_name ?? invite.host_username ?? "—";
    const courseName = invite.course_name ?? "—";
    const courseLine = invite.course_city ? `${courseName} · ${invite.course_city}` : courseName;

    return (
        <div className="mx-auto max-w-md space-y-4 py-4">
            <Button variant="ghost" size="sm" render={<Link href="/games" />}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                {tCommon("back")}
            </Button>

            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg dark:border-emerald-700">
                <CardContent className="space-y-3 p-6 text-center">
                    <p className="text-xs uppercase tracking-wider opacity-80">{t("title")}</p>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {invite.name ?? tGamesList("nameFallback")}
                    </h1>
                    <p className="text-sm opacity-90">{t("host", { name: hostName })}</p>
                    <p className="flex items-center justify-center gap-1.5 text-sm opacity-90">
                        <MapPin className="h-4 w-4" />
                        {courseLine}
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-2">
                        <JoinGameButton gameId={gameId} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
