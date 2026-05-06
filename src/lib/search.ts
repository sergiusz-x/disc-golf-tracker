/**
 * Helpers for the user-facing search inputs (friends, new-game wizard).
 *
 * Both consumers send `%query%` ILIKE patterns to PostgREST, so the query
 * string must be sanitized to keep wildcards from leaking through and to
 * rank exact / prefix / substring matches consistently.
 */

// Strips LIKE wildcards (`%`, `_`) and the escape character (`\`) so the
// pattern stays literal — otherwise `_` would match any single character
// and `%` would match anything, letting users enumerate the directory.
export function escapeLike(value: string) {
    return value.replace(/[%_\\]/g, "");
}

type Rankable = {
    full_name: string | null;
    username: string | null;
};

/**
 * Lower number = better match. Used to sort merged ILIKE results so that
 * exact / prefix matches surface above arbitrary substring hits.
 */
export function matchRank(row: Rankable, query: string): number {
    const q = query.toLowerCase();
    const fn = (row.full_name ?? "").toLowerCase();
    const un = (row.username ?? "").toLowerCase();
    if (fn === q || un === q) return 0;
    if (fn.startsWith(q) || un.startsWith(q)) return 1;
    return 2;
}

export function compareByMatch<T extends Rankable>(query: string) {
    const q = query.toLowerCase();
    return (a: T, b: T) => {
        const ra = matchRank(a, q);
        const rb = matchRank(b, q);
        if (ra !== rb) return ra - rb;
        const an = (a.full_name ?? a.username ?? "").toLowerCase();
        const bn = (b.full_name ?? b.username ?? "").toLowerCase();
        return an.localeCompare(bn, "pl");
    };
}
