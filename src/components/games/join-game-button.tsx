"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { joinGame } from "@/app/(app)/games/[id]/actions";
import { Button } from "@/components/ui/button";

/**
 * Clicking calls the join_game RPC and (on success) the server action
 * redirects to the round — no local navigation needed.
 */
export function JoinGameButton({ gameId }: { gameId: string }) {
    const t = useTranslations("gameInvite");
    const tErrors = useTranslations("gameInvite.errors");
    const [pending, startTransition] = useTransition();

    function handleClick() {
        startTransition(async () => {
            const result = await joinGame(gameId);
            // The action redirects on success, so we only land here on failure.
            if (result && !result.ok) {
                try {
                    const key = result.error as Parameters<typeof tErrors>[0];
                    toast.error(
                        result.detail ? tErrors(key, { detail: result.detail }) : tErrors(key),
                    );
                } catch {
                    toast.error(result.error);
                }
            }
        });
    }

    return (
        <Button
            type="button"
            onClick={handleClick}
            disabled={pending}
            className="bg-emerald-600 hover:bg-emerald-700"
        >
            {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {pending ? t("joining") : t("join")}
        </Button>
    );
}
