"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const userIdSchema = z.object({
    userId: z.string().uuid(),
});

const friendshipIdSchema = z.object({
    friendshipId: z.string().uuid(),
});

/**
 * Stable error codes mapped to translations under `friends.errors.*`. Server
 * actions return the code as part of a result object instead of redirecting
 * with a query-string message — the friends page surfaces them via toast,
 * which feels native compared to a full-page reload with `?error=…`.
 */
export type FriendActionError =
    | "auth"
    | "self_invite"
    | "target_not_found"
    | "already_friends"
    | "already_sent"
    | "already_received"
    | "invite_not_found"
    | "cannot_accept"
    | "relation_not_found"
    | "cannot_remove"
    | "validation"
    | "db";

export type FriendActionResult =
    | { ok: true }
    | { ok: false; error: FriendActionError; detail?: string };

function fail(error: FriendActionError, detail?: string): FriendActionResult {
    return { ok: false, error, detail };
}

export async function sendFriendInvite(
    input: z.input<typeof userIdSchema>,
): Promise<FriendActionResult> {
    const parsed = userIdSchema.safeParse(input);
    if (!parsed.success) return fail("validation");

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("auth");
    if (parsed.data.userId === user.id) return fail("self_invite");

    // Use the public_users view: RLS on users only allows reading self/friends
    // /co-game-players, so a stranger we are about to invite would not be
    // readable through the table directly.
    const { data: targetUser } = await supabase
        .from("public_users")
        .select("id")
        .eq("id", parsed.data.userId)
        .maybeSingle();

    if (!targetUser) return fail("target_not_found");

    const { data: existing } = await supabase
        .from("friendships")
        .select("id, requester_id, addressee_id, status")
        .or(
            `and(requester_id.eq.${user.id},addressee_id.eq.${parsed.data.userId}),and(requester_id.eq.${parsed.data.userId},addressee_id.eq.${user.id})`,
        )
        .maybeSingle();

    if (existing) {
        if (existing.status === "accepted") return fail("already_friends");
        if (existing.requester_id === user.id) return fail("already_sent");
        return fail("already_received");
    }

    const { error } = await supabase.from("friendships").insert({
        requester_id: user.id,
        addressee_id: parsed.data.userId,
        status: "pending",
    });

    if (error) return fail("db", error.message);

    revalidatePath("/friends");
    return { ok: true };
}

export async function acceptFriendInvite(
    input: z.input<typeof friendshipIdSchema>,
): Promise<FriendActionResult> {
    const parsed = friendshipIdSchema.safeParse(input);
    if (!parsed.success) return fail("validation");

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("auth");

    const { data: invite } = await supabase
        .from("friendships")
        .select("id, requester_id, addressee_id, status")
        .eq("id", parsed.data.friendshipId)
        .maybeSingle();

    if (!invite) return fail("invite_not_found");
    if (invite.addressee_id !== user.id) return fail("cannot_accept");

    const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", parsed.data.friendshipId);

    if (error) return fail("db", error.message);

    revalidatePath("/friends");
    return { ok: true };
}

export async function deleteFriendship(
    input: z.input<typeof friendshipIdSchema>,
): Promise<FriendActionResult> {
    const parsed = friendshipIdSchema.safeParse(input);
    if (!parsed.success) return fail("validation");

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("auth");

    const { data: friendship } = await supabase
        .from("friendships")
        .select("id, requester_id, addressee_id")
        .eq("id", parsed.data.friendshipId)
        .maybeSingle();

    if (!friendship) return fail("relation_not_found");
    if (friendship.requester_id !== user.id && friendship.addressee_id !== user.id) {
        return fail("cannot_remove");
    }

    const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", parsed.data.friendshipId);

    if (error) return fail("db", error.message);

    revalidatePath("/friends");
    return { ok: true };
}
