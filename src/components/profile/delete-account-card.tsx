"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { deleteAccount } from "@/app/(app)/profile/actions";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Wraps the irreversible "delete my account" flow behind a destructive
 * AlertDialog. The server action calls a security-definer SQL function
 * that wipes auth.users + cascades; on success it signs the user out and
 * redirects to /login (the redirect throws, so the awaited Promise here
 * never resolves on success — only on failure).
 */
export function DeleteAccountCard() {
    const t = useTranslations("profile.danger");
    const tErrors = useTranslations("profile.danger.errors");
    const [pending, startTransition] = useTransition();

    function performDelete() {
        startTransition(async () => {
            // Show the toast eagerly so it has a chance to render before the
            // navigation kicks in (sonner persists across route changes).
            toast.success(t("deletedToast"));
            const result = await deleteAccount();
            if (result && !result.ok) {
                toast.dismiss();
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
        <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-destructive">
                    <ShieldAlert className="h-4 w-4" />
                    {t("cardTitle")}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("description")}</p>

                <AlertDialog>
                    <AlertDialogTrigger
                        render={<Button variant="destructive" size="sm" disabled={pending} />}
                    >
                        {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                        {pending ? t("deleting") : t("deleteCta")}
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t("dialogTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>{t("dialogBody")}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={pending}>
                                {t("dialogCancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={performDelete}
                                disabled={pending}
                                variant="destructive"
                            >
                                {t("dialogConfirm")}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}
