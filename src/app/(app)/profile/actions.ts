"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ensureUserProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;
const URL_RE = /^https?:\/\//;

const profileSchema = z.object({
    full_name: z
        .string()
        .trim()
        .max(80, "fullNameTooLong")
        .nullable()
        .transform((v) => (v && v.length > 0 ? v : null)),
    username: z
        .string()
        .trim()
        .nullable()
        .transform((v) => (v && v.length > 0 ? v : null))
        .refine((v) => v === null || USERNAME_RE.test(v), "usernameInvalid"),
    avatar_url: z
        .string()
        .trim()
        .nullable()
        .transform((v) => (v && v.length > 0 ? v : null))
        .refine((v) => v === null || URL_RE.test(v), "avatarInvalid"),
});

export type UpdateProfileError =
    | "auth"
    | "validation"
    | "fullNameTooLong"
    | "usernameInvalid"
    | "avatarInvalid"
    | "usernameTaken"
    | "db";

export type UpdateProfileResult =
    | { ok: true }
    | { ok: false; error: UpdateProfileError; detail?: string };

export async function updateProfile(
    input: z.input<typeof profileSchema>,
): Promise<UpdateProfileResult> {
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) {
        const message = parsed.error.issues[0]?.message;
        if (
            message === "fullNameTooLong" ||
            message === "usernameInvalid" ||
            message === "avatarInvalid"
        ) {
            return { ok: false, error: message };
        }
        return { ok: false, error: "validation" };
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "auth" };
    await ensureUserProfile(supabase, user);

    // Pre-check via public_users (no RLS) — gives a clean message instead of
    // surfacing the unique-constraint error code from the table.
    if (parsed.data.username) {
        const { data: taken } = await supabase
            .from("public_users")
            .select("id")
            .eq("username", parsed.data.username)
            .neq("id", user.id)
            .maybeSingle();

        if (taken) return { ok: false, error: "usernameTaken" };
    }

    const { error } = await supabase
        .from("users")
        .update({
            full_name: parsed.data.full_name,
            username: parsed.data.username,
            avatar_url: parsed.data.avatar_url,
        })
        .eq("id", user.id);

    if (error) {
        // 23505 = unique_violation (race against the pre-check)
        if (error.code === "23505") return { ok: false, error: "usernameTaken" };
        return { ok: false, error: "db", detail: error.message };
    }

    revalidatePath("/profile");
    // The TopBar avatar is rendered from the layout, so it needs to refresh too.
    revalidatePath("/", "layout");
    return { ok: true };
}

export type DeleteAccountError = "auth" | "db";

export type DeleteAccountResult =
    | { ok: true }
    | { ok: false; error: DeleteAccountError; detail?: string };

/**
 * Self-service account deletion. Calls the security-definer
 * `delete_my_account` RPC which removes the user from `auth.users` —
 * the FK cascade chain handles everything in `public`.
 *
 * On success the caller is signed out and bounced to /login. The redirect
 * throws (Next pattern), so the function never returns ok:true to the
 * client — it lands either on a redirect or an error.
 */
export async function deleteAccount(): Promise<DeleteAccountResult> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "auth" };

    const { error } = await supabase.rpc("delete_my_account");
    if (error) {
        return { ok: false, error: "db", detail: error.message };
    }

    // Burn the cookie session — the user no longer exists, but we still hold
    // a JWT signed with their (now-deleted) sub.
    await supabase.auth.signOut();
    redirect("/login");
}
