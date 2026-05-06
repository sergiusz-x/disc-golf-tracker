"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { FriendActionResult } from "@/app/(app)/friends/actions";
import { Button } from "@/components/ui/button";

type Variant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";

type Size = "default" | "xs" | "sm" | "lg";

/**
 * Wraps a friend action server function with toast feedback so the page
 * stops relying on `?error=…` URL state. The `successMessage` is computed
 * server-side via `getTranslations` and passed in as a string so we don't
 * need to look up the same key in two locales.
 */
export function FriendActionButton({
    action,
    successMessage,
    variant = "default",
    size = "sm",
    className,
    children,
}: {
    action: () => Promise<FriendActionResult>;
    successMessage: string;
    variant?: Variant;
    size?: Size;
    className?: string;
    children: React.ReactNode;
}) {
    const tErrors = useTranslations("friends.errors");
    const [pending, startTransition] = useTransition();

    function handleClick() {
        startTransition(async () => {
            const result = await action();
            if (result.ok) {
                toast.success(successMessage);
                return;
            }
            try {
                const key = result.error as Parameters<typeof tErrors>[0];
                toast.error(result.detail ? tErrors(key, { detail: result.detail }) : tErrors(key));
            } catch {
                toast.error(result.error);
            }
        });
    }

    return (
        <Button
            type="button"
            variant={variant}
            size={size}
            className={className}
            onClick={handleClick}
            disabled={pending}
        >
            {children}
        </Button>
    );
}
