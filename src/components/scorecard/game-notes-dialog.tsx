"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { NotebookPen } from "lucide-react";
import { toast } from "sonner";

import { updateGameNotes } from "@/app/(app)/games/[id]/actions";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const MAX_NOTES = 1000;

/**
 * Round-level free-text note. Visible to all participants (read-only for
 * non-hosts), edited by the host. Lives behind a small icon button next to
 * the round title — present-but-out-of-the-way until someone needs it.
 */
export function GameNotesDialog({
    gameId,
    initial,
    canEdit,
}: {
    gameId: string;
    initial: string | null;
    canEdit: boolean;
}) {
    const t = useTranslations("scorecard.notes");
    const tErrors = useTranslations("scorecard.errors");
    const [open, setOpen] = useState(false);
    const [committed, setCommitted] = useState(initial ?? "");
    const [draft, setDraft] = useState(initial ?? "");
    const [pending, startTransition] = useTransition();

    function commit() {
        startTransition(async () => {
            const r = await updateGameNotes(gameId, draft);
            if (r.ok) {
                setCommitted(draft.trim());
                setOpen(false);
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

    function openDialog() {
        setDraft(committed);
        setOpen(true);
    }

    const hasNote = committed.trim().length > 0;
    const remaining = MAX_NOTES - draft.length;

    return (
        <>
            <Tooltip>
                <TooltipTrigger
                    render={
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={openDialog}
                            aria-label={t("ariaLabel")}
                            className={cn(hasNote && "text-emerald-600 dark:text-emerald-400")}
                        />
                    }
                >
                    <NotebookPen className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>{t("trigger")}</TooltipContent>
            </Tooltip>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("title")}</DialogTitle>
                        <DialogDescription>
                            {canEdit ? t("empty") : t("readOnly")}
                        </DialogDescription>
                    </DialogHeader>

                    {canEdit ? (
                        <div className="space-y-1.5">
                            <textarea
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                placeholder={t("placeholder")}
                                maxLength={MAX_NOTES}
                                rows={5}
                                disabled={pending}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <p
                                className={cn(
                                    "text-right text-[11px]",
                                    remaining < 50 ? "text-destructive" : "text-muted-foreground",
                                )}
                            >
                                {draft.length} / {MAX_NOTES}
                            </p>
                        </div>
                    ) : (
                        <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">
                            {committed.trim() || t("empty")}
                        </p>
                    )}

                    <DialogFooter>
                        {canEdit ? (
                            <>
                                <DialogClose render={<Button variant="outline" />}>
                                    {t("cancel")}
                                </DialogClose>
                                <Button
                                    onClick={commit}
                                    disabled={pending}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    {t("save")}
                                </Button>
                            </>
                        ) : (
                            <DialogClose render={<Button variant="outline" />}>
                                {t("cancel")}
                            </DialogClose>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
