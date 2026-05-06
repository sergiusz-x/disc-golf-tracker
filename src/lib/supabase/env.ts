/**
 * Single source of truth for Supabase URL + anon/publishable key. Keeps the
 * three client factories (browser / server / proxy) in lockstep so that
 * adding a new env var only requires one edit.
 */

export function getSupabaseUrl(): string {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) {
        throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
    }
    return url;
}

export function getSupabaseKey(): string {
    const key =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key) {
        throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or _ANON_KEY) is not set");
    }
    return key;
}
