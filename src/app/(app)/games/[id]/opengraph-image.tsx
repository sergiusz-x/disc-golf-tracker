import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

import { getSupabaseKey, getSupabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

export const alt = "Disc Golf Tracker — round";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic Open Graph card rendered when a `/games/[id]` link is unfurled
 * in chat (Slack, WhatsApp, Twitter…). Uses an anon Supabase client because
 * link previews have no cookies; the `get_game_invite_info` RPC is granted
 * to anon and exposes only non-PII columns.
 */
export default async function GameOgImage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let invite: {
        name: string | null;
        host_full_name: string | null;
        host_username: string | null;
        course_name: string | null;
        course_city: string | null;
    } | null = null;

    try {
        const supabase = createClient<Database>(getSupabaseUrl(), getSupabaseKey());
        const { data } = await supabase.rpc("get_game_invite_info", {
            p_game_id: id,
        });
        invite = data?.[0] ?? null;
    } catch {
        // Fall through to the default card when the RPC is unreachable —
        // a missing image is worse than a generic one.
    }

    const title = invite?.name?.trim() || "Disc Golf · Live scorecard";
    const courseLine =
        [invite?.course_name, invite?.course_city].filter(Boolean).join(" · ") || "discgolftracker";
    const hostName = invite?.host_full_name ?? invite?.host_username ?? "Disc Golf Tracker";

    return new ImageResponse(
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                padding: 80,
                color: "white",
                background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    fontSize: 28,
                    opacity: 0.9,
                    fontWeight: 600,
                }}
            >
                <span style={{ fontSize: 40 }}>🥏</span>
                <span>Disc Golf Tracker</span>
            </div>

            <div
                style={{
                    marginTop: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                }}
            >
                <div
                    style={{
                        fontSize: 22,
                        letterSpacing: 4,
                        textTransform: "uppercase",
                        opacity: 0.75,
                    }}
                >
                    Zaproszenie do rundy
                </div>
                <div
                    style={{
                        fontSize: 88,
                        fontWeight: 700,
                        lineHeight: 1.05,
                        letterSpacing: -2,
                        maxWidth: "90%",
                    }}
                >
                    {title}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: 32, opacity: 0.95 }}>{courseLine}</div>
                    <div style={{ fontSize: 24, opacity: 0.7 }}>Host: {hostName}</div>
                </div>
            </div>
        </div>,
        size,
    );
}
