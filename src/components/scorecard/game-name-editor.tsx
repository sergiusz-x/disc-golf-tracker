"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { updateGameName } from "@/app/(app)/games/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Inline-editable game title shown at the top of the scorecard. Read-only
 * for non-hosts (renders as plain heading); host gets a hover pencil + click
 * to edit. Used here instead of opening a separate dialog because users
 * tend to want to rename a round just after creating it.
 */
export function GameNameEditor({
    gameId,
    initial,
    fallback,
    canEdit,
}: {
    gameId: string;
    initial: string | null;
    fallback: string;
    canEdit: boolean;
}) {
    const t = useTranslations("scorecard.editName");
    const tErrors = useTranslations("scorecard.errors");
    const tCommon = useTranslations("common");

    const [editing, setEditing] = useState(false);
    const [committed, setCommitted] = useState(initial ?? "");
    const [draft, setDraft] = useState(initial ?? "");
    const [pending, startTransition] = useTransition();

    function commit() {
        startTransition(async () => {
            const r = await updateGameName(gameId, draft);
            if (r.ok) {
                setCommitted(draft.trim());
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
        setDraft(committed);
        setEditing(false);
    }

    if (!canEdit) {
        return <h1 className="text-2xl font-semibold tracking-tight">{committed || fallback}</h1>;
    }

    if (editing) {
        return (
            <div className="flex items-center gap-2">
                <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={t("placeholder")}
                    className="h-9 text-lg font-semibold"
                    maxLength={80}
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === "Enter") commit();
                        if (e.key === "Escape") cancel();
                    }}
                    disabled={pending}
                />
                <Tooltip>
                    <TooltipTrigger
                        render={
                            <Button
                                size="icon-sm"
                                onClick={commit}
                                disabled={pending}
                                className="bg-emerald-600 hover:bg-emerald-700"
                                aria-label={t("save")}
                            />
                        }
                    >
                        <Check className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>{t("save")}</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger
                        render={
                            <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={cancel}
                                disabled={pending}
                                aria-label={t("cancel")}
                            />
                        }
                    >
                        <X className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>{t("cancel")}</TooltipContent>
                </Tooltip>
            </div>
        );
    }

    return (
        <Tooltip>
            <TooltipTrigger
                render={
                    <button
                        type="button"
                        onClick={() => {
                            setDraft(committed);
                            setEditing(true);
                        }}
                        className="group flex items-center gap-1.5 text-left text-2xl font-semibold tracking-tight transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
                    />
                }
            >
                <span>{committed || fallback}</span>
                <Pencil className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
            </TooltipTrigger>
            <TooltipContent>{tCommon("edit")}</TooltipContent>
        </Tooltip>
    );
}
