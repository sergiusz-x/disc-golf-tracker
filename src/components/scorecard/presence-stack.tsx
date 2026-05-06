"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import type { Player } from "@/components/scorecard/scorecard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/people";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_AVATARS = 4;

/**
 * Shows which game players are currently viewing the round, using the
 * Supabase Realtime presence API. The channel is separate from the
 * postgres_changes channel to keep concerns split — disconnects are normal
 * here and don't affect score sync.
 */
export function PresenceStack({
    gameId,
    currentUserId,
    players,
}: {
    gameId: string;
    currentUserId: string;
    players: Player[];
}) {
    const t = useTranslations("scorecard.presence");
    const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set([currentUserId]));

    useEffect(() => {
        const supabase = createClient();
        const channel = supabase.channel(`presence:game:${gameId}`, {
            config: { presence: { key: currentUserId } },
        });

        channel
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState() as Record<string, unknown[]>;
                setOnlineUserIds(new Set(Object.keys(state)));
            })
            .subscribe(async (status) => {
                if (status === "SUBSCRIBED") {
                    await channel.track({
                        user_id: currentUserId,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [gameId, currentUserId]);

    const online = players.filter((p) => onlineUserIds.has(p.user_id));
    if (online.length <= 1) return null;

    const visible = online.slice(0, MAX_VISIBLE_AVATARS);
    const overflow = online.length - visible.length;

    return (
        <div className="flex items-center gap-2" aria-label={t("online", { n: online.length })}>
            <div className="flex -space-x-2">
                {visible.map((p) => {
                    const initials = getInitials(p.display_name, p.full_name, p.username, p.email);
                    return (
                        <Avatar
                            key={p.id}
                            className={cn(
                                "h-7 w-7 ring-2 ring-background",
                                p.user_id === currentUserId && "ring-emerald-500/50",
                            )}
                        >
                            {p.avatar_url ? <AvatarImage src={p.avatar_url} alt="" /> : null}
                            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                        </Avatar>
                    );
                })}
                {overflow > 0 ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-background">
                        +{overflow}
                    </span>
                ) : null}
            </div>
            <span className="text-xs text-muted-foreground">
                {t("online", { n: online.length })}
            </span>
        </div>
    );
}
