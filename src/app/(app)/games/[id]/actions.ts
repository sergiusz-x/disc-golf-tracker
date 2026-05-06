"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const gameIdSchema = z.string().uuid();

const MAX_GAME_NAME = 80;
const MAX_DISPLAY_NAME = 40;
const MAX_NOTES = 1000;

/**
 * Errors returned to the scorecard are stable codes mapped to translations
 * under `scorecard.errors.*`. `detail` carries an underlying Supabase
 * message when available.
 */
export type GameActionError =
    | "noGameId"
    | "auth"
    | "gameNotFound"
    | "onlyHostFinish"
    | "onlyHostReopen"
    | "alreadyFinished"
    | "notPlayer"
    | "nameTooLong"
    | "displayNameTooLong"
    | "notesTooLong"
    | "db";

// Backwards-compatible alias for the existing scorecard imports.
export type FinishGameError = GameActionError;

export type GameActionResult =
    | { ok: true }
    | { ok: false; error: GameActionError; detail?: string };

export type FinishGameState = GameActionResult;

export async function finishGame(gameId: string): Promise<GameActionResult> {
    if (!gameId) return { ok: false, error: "noGameId" };

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "auth" };

    // RLS allows update only for host — explicit check provides clearer error.
    const { data: game } = await supabase
        .from("games")
        .select("id, host_id, status")
        .eq("id", gameId)
        .maybeSingle();

    if (!game) return { ok: false, error: "gameNotFound" };
    if (game.host_id !== user.id) return { ok: false, error: "onlyHostFinish" };
    if (game.status === "finished") return { ok: false, error: "alreadyFinished" };

    const { error } = await supabase
        .from("games")
        .update({
            status: "finished",
            finished_at: new Date().toISOString(),
        })
        .eq("id", gameId);

    if (error) return { ok: false, error: "db", detail: error.message };

    revalidatePath(`/games/${gameId}`);
    revalidatePath("/games");
    return { ok: true };
}

export async function reopenGame(gameId: string): Promise<GameActionResult> {
    if (!gameId) return { ok: false, error: "noGameId" };

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "auth" };

    const { data: game } = await supabase
        .from("games")
        .select("id, host_id, status")
        .eq("id", gameId)
        .maybeSingle();

    if (!game) return { ok: false, error: "gameNotFound" };
    if (game.host_id !== user.id) return { ok: false, error: "onlyHostReopen" };

    const { error } = await supabase
        .from("games")
        .update({ status: "in_progress", finished_at: null })
        .eq("id", gameId);

    if (error) return { ok: false, error: "db", detail: error.message };

    revalidatePath(`/games/${gameId}`);
    return { ok: true };
}

export async function updateGameName(gameId: string, name: string): Promise<GameActionResult> {
    if (!gameId) return { ok: false, error: "noGameId" };

    const trimmed = name.trim();
    if (trimmed.length > MAX_GAME_NAME) {
        return { ok: false, error: "nameTooLong" };
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "auth" };

    // Pre-check ownership for a clean error rather than RLS denial.
    const { data: game } = await supabase
        .from("games")
        .select("id, host_id")
        .eq("id", gameId)
        .maybeSingle();

    if (!game) return { ok: false, error: "gameNotFound" };
    if (game.host_id !== user.id) return { ok: false, error: "onlyHostFinish" };

    const { error } = await supabase
        .from("games")
        .update({ name: trimmed.length > 0 ? trimmed : null })
        .eq("id", gameId);

    if (error) return { ok: false, error: "db", detail: error.message };

    revalidatePath(`/games/${gameId}`);
    revalidatePath("/games");
    return { ok: true };
}

export type JoinGameError = "auth" | "gameNotFound" | "cancelled" | "db";

export type JoinGameResult = { ok: true } | { ok: false; error: JoinGameError; detail?: string };

/**
 * Adds the current user to a game's player list via the `join_game` SQL
 * function (security definer — needed because game RLS blocks reads from
 * non-participants, so the client cannot compute the next position itself).
 *
 * Idempotent: if the caller is already a player the RPC is a no-op and we
 * fall through to the redirect.
 */
export async function joinGame(gameId: string): Promise<JoinGameResult> {
    if (!gameIdSchema.safeParse(gameId).success) {
        return { ok: false, error: "gameNotFound" };
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "auth" };

    const { error } = await supabase.rpc("join_game", { p_game_id: gameId });

    if (error) {
        // Function uses raise exception with our codes as the message
        if (error.message.includes("game_not_found")) return { ok: false, error: "gameNotFound" };
        if (error.message.includes("cancelled")) return { ok: false, error: "cancelled" };
        if (error.message.includes("auth")) return { ok: false, error: "auth" };
        return { ok: false, error: "db", detail: error.message };
    }

    revalidatePath(`/games/${gameId}`);
    redirect(`/games/${gameId}`);
}

export async function updateGameNotes(gameId: string, notes: string): Promise<GameActionResult> {
    if (!gameId) return { ok: false, error: "noGameId" };

    const trimmed = notes.trim();
    if (trimmed.length > MAX_NOTES) {
        return { ok: false, error: "notesTooLong" };
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "auth" };

    const { data: game } = await supabase
        .from("games")
        .select("id, host_id")
        .eq("id", gameId)
        .maybeSingle();

    if (!game) return { ok: false, error: "gameNotFound" };
    if (game.host_id !== user.id) return { ok: false, error: "onlyHostFinish" };

    const { error } = await supabase
        .from("games")
        .update({ notes: trimmed.length > 0 ? trimmed : null })
        .eq("id", gameId);

    if (error) return { ok: false, error: "db", detail: error.message };

    revalidatePath(`/games/${gameId}`);
    return { ok: true };
}

export async function updateDisplayName(
    gamePlayerId: string,
    displayName: string,
): Promise<GameActionResult> {
    if (!gamePlayerId) return { ok: false, error: "noGameId" };

    const trimmed = displayName.trim();
    if (trimmed.length > MAX_DISPLAY_NAME) {
        return { ok: false, error: "displayNameTooLong" };
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "auth" };

    // RLS allows player to update own row OR host to update any row in own
    // game. We let the database enforce that and translate denial to a clean
    // "you are not a player here" error.
    const { data: row } = await supabase
        .from("game_players")
        .select("id, user_id, game_id")
        .eq("id", gamePlayerId)
        .maybeSingle();

    if (!row) return { ok: false, error: "notPlayer" };

    const { error } = await supabase
        .from("game_players")
        .update({ display_name: trimmed.length > 0 ? trimmed : null })
        .eq("id", gamePlayerId);

    if (error) {
        if (error.code === "42501") return { ok: false, error: "notPlayer" };
        return { ok: false, error: "db", detail: error.message };
    }

    revalidatePath(`/games/${row.game_id}`);
    return { ok: true };
}
