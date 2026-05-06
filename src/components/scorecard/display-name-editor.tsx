"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { updateDisplayName } from "@/app/(app)/games/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Inline editor for the per-round display name. The DB has had the column
 * since the initial migration but the UI never exposed it — players were
 * stuck with their auth full_name even when they wanted a nickname for a
 * specific tournament.
 */
export function DisplayNameEditor({
    gamePlayerId,
    initial,
    trigger,
}: {
    gamePlayerId: string;
    initial: string | null;
    trigger?: React.ReactNode;
}) {
    const t = useTranslations("scorecard.editDisplayName");
    const tErrors = useTranslations("scorecard.errors");

    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(initial ?? "");
    const [pending, startTransition] = useTransition();

    function commit() {
        startTransition(async () => {
            const r = await updateDisplayName(gamePlayerId, draft);
            if (r.ok) {
                setEditing(false);
                toast.success(t("savedToast"));
                return;
            }
            try {
                const key = r.error as Parameters<typeof tErrors>[0];
                toast.error(r.detail ? tErrors(key, { detail: r.detail }) : tErrors(key));
            } catch {
                toast.error(r.error);
            }
        });
    }

    function cancel() {
        setDraft(initial ?? "");
        setEditing(false);
    }

    if (!editing) {
        return (
            <Tooltip>
                <TooltipTrigger
                    render={
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => {
                                setDraft(initial ?? "");
                                setEditing(true);
                            }}
                            aria-label={t("trigger")}
                            className="text-muted-foreground"
                        />
                    }
                >
                    {trigger ?? <Pencil className="h-3 w-3" />}
                </TooltipTrigger>
                <TooltipContent>{t("trigger")}</TooltipContent>
            </Tooltip>
        );
    }

    return (
        <div className="flex items-center gap-1">
            <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t("placeholder")}
                className="h-8 w-40 text-sm"
                maxLength={40}
                autoFocus
                onKeyDown={(e) => {
                    if (e.key === "Enter") commit();
                    if (e.key === "Escape") cancel();
                }}
                disabled={pending}
            />
            <Button
                size="icon-sm"
                onClick={commit}
                disabled={pending}
                className="bg-emerald-600 hover:bg-emerald-700"
                aria-label={t("save")}
            >
                <Check className="h-4 w-4" />
            </Button>
            <Button
                size="icon-sm"
                variant="ghost"
                onClick={cancel}
                disabled={pending}
                aria-label={t("cancel")}
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
}
