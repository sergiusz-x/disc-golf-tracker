/**
 * Display helpers for user-like records (auth users, game players, friends).
 *
 * These exist because the same fallback chain — display_name → full_name →
 * username → email — was duplicated across 8+ places, with subtle
 * differences in punctuation and casing. Centralising it keeps the rendered
 * names consistent regardless of where the record was loaded from.
 */

const INITIALS_FALLBACK = "?";

/**
 * Returns the first non-empty source as the display name, or `null` when no
 * source has a value. Callers are expected to fall back to a translated
 * string, e.g. `getDisplayName(...) ?? t("common.noName")`.
 *
 *   getDisplayName(player.display_name, player.full_name, player.username, player.email)
 */
export function getDisplayName(...sources: Array<string | null | undefined>): string | null {
    for (const s of sources) {
        const trimmed = s?.trim();
        if (trimmed) return trimmed;
    }
    return null;
}

/**
 * Computes 1–2 letter initials from the first non-empty source. Always returns
 * a printable character so it can drop straight into <AvatarFallback>.
 */
export function getInitials(...sources: Array<string | null | undefined>): string {
    for (const s of sources) {
        const trimmed = s?.trim();
        if (!trimmed) continue;
        const initials = trimmed
            .split(/\s+/)
            .map((part) => part[0] ?? "")
            .join("")
            .slice(0, 2)
            .toUpperCase();
        if (initials) return initials;
    }
    return INITIALS_FALLBACK;
}
