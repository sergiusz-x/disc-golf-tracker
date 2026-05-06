export function getSiteUrl(): string {
    const explicit = process.env.NEXT_PUBLIC_SITE_URL;
    if (explicit) return explicit.replace(/\/$/, "");

    const vercel = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL;
    if (vercel) return `https://${vercel}`;

    return "http://localhost:3000";
}

/**
 * Whether `value` is a safe in-app redirect target — must be a single-slash
 * path on the current origin. Rejects `//evil.com` (protocol-relative) and
 * `/\evil.com` (some user agents normalise the backslash to `/`, again
 * leaking the host). Returns the trimmed path on success, null on rejection.
 */
export function safeRelativePath(value: string | null | undefined): string | null {
    if (!value) return null;
    if (!value.startsWith("/")) return null;
    if (value.startsWith("//")) return null;
    if (value.startsWith("/\\")) return null;
    return value;
}

export const siteConfig = {
    name: "Disc Golf Tracker",
    shortName: "DGT",
    description: "Śledź swoje rundy disc golfa, zapraszaj znajomych i prowadź scorecard na żywo.",
    themeColor: "#16a34a",
    backgroundColor: "#0a0a0a",
} as const;
