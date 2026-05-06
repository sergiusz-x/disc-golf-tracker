"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { ensureUserProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

const createGameSchema = z.object({
    courseId: z.string().uuid(),
    name: z
        .string()
        .trim()
        .max(80)
        .optional()
        .transform((v) => (v && v.length > 0 ? v : undefined)),
    playerIds: z.array(z.string().uuid()).max(8),
});

/**
 * Errors returned to the client are stable codes mapped to translations under
 * `games.newErrors.*`. The optional `detail` is appended verbatim — used to
 * surface an underlying Supabase error message to power-users without
 * forcing a translation.
 */
export type CreateGameError =
    | "auth"
    | "validation"
    | "courseMissing"
    | "noHoles"
    | "createFailed"
    | "playersFailed"
    | "generic";

export type CreateGameState =
    | { ok: true; gameId: string }
    | { ok: false; error: CreateGameError; detail?: string };

export async function createGame(
    input: z.input<typeof createGameSchema>,
): Promise<CreateGameState> {
    const parsed = createGameSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, error: "validation" };
    }
    const { courseId, name, playerIds } = parsed.data;

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "auth" };

    const profile = await ensureUserProfile(supabase, user);
    if (!profile) {
        return { ok: false, error: "createFailed", detail: "Missing user profile" };
    }

    // Host always plays. Skip duplicate if client already added them.
    const uniquePlayerIds = Array.from(new Set([profile.id, ...playerIds]));

    const { data: gameId, error: gameErr } = await supabase.rpc("create_game", {
        p_course_id: courseId,
        p_name: name ?? null,
        p_player_ids: uniquePlayerIds,
    });

    if (gameErr || !gameId) {
        if (gameErr?.message.includes("course_missing")) {
            return { ok: false, error: "courseMissing" };
        }
        if (gameErr?.message.includes("no_holes")) {
            return { ok: false, error: "noHoles" };
        }
        return {
            ok: false,
            error: "createFailed",
            detail: gameErr?.message ?? "Unknown database error",
        };
    }

    redirect(`/games/${gameId}`);
}
