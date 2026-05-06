"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BarChart3, Home, MapPin, Plus, Users } from "lucide-react";

import { cn } from "@/lib/utils";

type NavKey = "home" | "courses" | "play" | "friends" | "stats";

type NavItem = {
    key: NavKey;
    href: string;
    icon: typeof Home;
    highlight?: boolean;
};

const items: NavItem[] = [
    { key: "home", href: "/dashboard", icon: Home },
    { key: "courses", href: "/courses", icon: MapPin },
    { key: "play", href: "/games/new", icon: Plus, highlight: true },
    { key: "friends", href: "/friends", icon: Users },
    { key: "stats", href: "/stats", icon: BarChart3 },
];

export function MobileNav() {
    const pathname = usePathname();
    const t = useTranslations("nav");

    return (
        <nav
            className="fixed inset-x-2 bottom-2 z-30 rounded-3xl border border-border/60 bg-background/92 shadow-[0_10px_30px_rgba(0,0,0,0.10)] backdrop-blur sm:hidden"
            aria-label={t("ariaLabel")}
        >
            <ul className="mx-auto flex h-16 max-w-md items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
                {items.map(({ key, href, icon: Icon, highlight }) => {
                    const active = pathname === href || pathname.startsWith(`${href}/`);
                    return (
                        <li key={href} className="flex flex-1">
                            <Link
                                href={href}
                                className={cn(
                                    "flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-medium transition-transform",
                                    active
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-muted-foreground hover:text-foreground",
                                    highlight && "-translate-y-3 text-white dark:text-white",
                                )}
                                aria-current={active ? "page" : undefined}
                            >
                                <span
                                    className={cn(
                                        "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                                        highlight
                                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-4 ring-background"
                                            : active
                                              ? "bg-emerald-100 dark:bg-emerald-900/40"
                                              : "",
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                </span>
                                <span>{t(key)}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
