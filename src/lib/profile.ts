import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type UserProfile = Database["public"]["Tables"]["users"]["Row"];

export async function ensureUserProfile(
    supabase: SupabaseClient<Database>,
    user: User,
): Promise<UserProfile | null> {
    const { data, error } = await supabase.rpc("ensure_user_profile");
    if (!error && data) return data;

    const { data: profile } = await supabase
        .from("users")
        .select("id, email, full_name, avatar_url, username, created_at, updated_at")
        .eq("id", user.id)
        .maybeSingle();

    return profile;
}
