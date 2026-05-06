export type StrokeKind =
    | "ace"
    | "albatross"
    | "eagle"
    | "birdie"
    | "par"
    | "bogey"
    | "double-bogey"
    | "triple-bogey-plus";

export function classifyStrokes(strokes: number, par: number): StrokeKind {
    if (strokes === 1) return "ace";
    const diff = strokes - par;
    if (diff <= -3) return "albatross";
    if (diff === -2) return "eagle";
    if (diff === -1) return "birdie";
    if (diff === 0) return "par";
    if (diff === 1) return "bogey";
    if (diff === 2) return "double-bogey";
    return "triple-bogey-plus";
}

export const STROKE_BG: Record<StrokeKind, string> = {
    ace: "bg-amber-500 text-white",
    albatross: "bg-amber-400 text-amber-950",
    eagle: "bg-emerald-700 text-white",
    birdie: "bg-emerald-500 text-white",
    par: "bg-sky-500 text-white",
    bogey: "bg-orange-500 text-white",
    "double-bogey": "bg-red-500 text-white",
    "triple-bogey-plus": "bg-red-700 text-white",
};

export function formatRelative(diff: number): string {
    if (diff === 0) return "E";
    return diff > 0 ? `+${diff}` : `${diff}`;
}

/**
 * Stable map key combining a game_player_id and a hole_id. Used by the
 * scorecard, hole-play view, and grid to keep score lookups O(1).
 */
export function scoreKey(gamePlayerId: string, holeId: string): string {
    return `${gamePlayerId}:${holeId}`;
}
