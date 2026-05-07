"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Check, Globe, LogOut, Mail, Moon, Sun, SunMoon, User2 } from "lucide-react";

import type { SessionUser } from "@/components/layout/app-shell";
import { InstallPwaItem } from "@/components/layout/install-pwa-item";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setLocaleAction } from "@/i18n/actions";
import { type Locale, locales, localeLabels } from "@/i18n/config";
import { getInitials } from "@/lib/people";

export function UserMenu({ user }: { user: SessionUser }) {
    const router = useRouter();
    const t = useTranslations("userMenu");
    const tCommon = useTranslations("common");
    const currentLocale = useLocale() as Locale;
    const { theme, setTheme } = useTheme();

    const initials = getInitials(user.fullName, user.email);

    async function handleSignOut() {
        // Drop the SW runtime cache so the next user on this device cannot see
        // pages cached while we were authenticated.
        if (typeof caches !== "undefined") {
            try {
                const keys = await caches.keys();
                await Promise.all(
                    keys.filter((k) => k.startsWith("runtime-")).map((k) => caches.delete(k)),
                );
            } catch {
                // best-effort — proceed with sign-out regardless
            }
        }
        await fetch("/auth/sign-out", { method: "POST" });
        router.replace("/login");
        router.refresh();
    }

    async function handleSetLocale(locale: Locale) {
        await setLocaleAction(locale);
    }

    function handleContact() {
        window.location.href = `mailto:${tCommon("supportEmail")}`;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full"
                        aria-label={t("ariaLabel")}
                    />
                }
            >
                <Avatar className="h-9 w-9">
                    {user.avatarUrl ? (
                        <AvatarImage src={user.avatarUrl} alt={user.fullName ?? user.email} />
                    ) : null}
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
                <div className="space-y-0.5 px-1.5 py-1 text-xs font-medium text-muted-foreground">
                    <p className="truncate text-sm font-medium text-foreground">
                        {user.fullName ?? t("nameFallback")}
                    </p>
                    <p className="truncate text-xs font-normal text-muted-foreground">
                        {user.email}
                    </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/profile")}>
                    <User2 className="mr-2 h-4 w-4" />
                    {t("profile")}
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
                    {t("theme.label")}
                </div>
                <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="mr-2 h-4 w-4" />
                    <span className="flex-1">{t("theme.light")}</span>
                    {theme === "light" ? <Check className="h-4 w-4" /> : null}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="mr-2 h-4 w-4" />
                    <span className="flex-1">{t("theme.dark")}</span>
                    {theme === "dark" ? <Check className="h-4 w-4" /> : null}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                    <SunMoon className="mr-2 h-4 w-4" />
                    <span className="flex-1">{t("theme.system")}</span>
                    {theme === "system" ? <Check className="h-4 w-4" /> : null}
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
                    {t("locale.label")}
                </div>
                {locales.map((loc) => (
                    <DropdownMenuItem key={loc} onClick={() => handleSetLocale(loc)}>
                        <Globe className="mr-2 h-4 w-4" />
                        <span className="flex-1">{localeLabels[loc]}</span>
                        {currentLocale === loc ? <Check className="h-4 w-4" /> : null}
                    </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleContact}>
                    <Mail className="mr-2 h-4 w-4" />
                    {t("support")}
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <InstallPwaItem />
                <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("signOut")}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
