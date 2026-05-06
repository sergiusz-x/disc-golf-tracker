"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const COPIED_FEEDBACK_MS = 1500;

/**
 * Copy the canonical URL of the current round to the clipboard. Used in the
 * scorecard header so the host can blast it in a chat — recipients land on
 * `/games/[id]`, see the JoinGamePrompt, and become players in one click.
 */
export function ShareGameButton({ gameId }: { gameId: string }) {
    const t = useTranslations("share");
    const [copied, setCopied] = useState(false);
    const [, startTransition] = useTransition();

    function handleClick() {
        startTransition(async () => {
            const url = `${window.location.origin}/games/${gameId}`;

            // Native share if available (mobile), otherwise clipboard.
            if (typeof navigator !== "undefined" && "share" in navigator) {
                try {
                    await navigator.share({ url });
                    return;
                } catch {
                    // User dismissed — fall through to clipboard.
                }
            }

            try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                toast.success(t("copied"));
                window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
            } catch {
                toast.error(t("failed"));
            }
        });
    }

    return (
        <Tooltip>
            <TooltipTrigger
                render={
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClick}
                        aria-label={t("ariaLabel")}
                    />
                }
            >
                {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                    <Share2 className="h-4 w-4" />
                )}
                <span>{copied ? t("copied") : t("copy")}</span>
            </TooltipTrigger>
            <TooltipContent>{copied ? t("copied") : t("copy")}</TooltipContent>
        </Tooltip>
    );
}
