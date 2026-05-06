import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Friendly empty-state placeholder used across pages and cards. Centralises
 * the icon-bubble + title + body + action layout so the UI stays consistent
 * whether the empty list is "no rounds yet" or "no search results".
 */
export function EmptyState({
    icon: Icon,
    title,
    body,
    action,
    className,
}: {
    icon?: LucideIcon;
    title?: ReactNode;
    body?: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <Card className={cn("border-dashed bg-muted/20", className)}>
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                {Icon ? (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        <Icon className="h-5 w-5" />
                    </span>
                ) : null}
                {title ? <p className="text-base font-medium text-foreground">{title}</p> : null}
                {body ? <p className="text-sm text-muted-foreground">{body}</p> : null}
                {action ? <div className="mt-1">{action}</div> : null}
            </CardContent>
        </Card>
    );
}
