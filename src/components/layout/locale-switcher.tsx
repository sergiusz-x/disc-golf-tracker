"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setLocaleAction } from "@/i18n/actions";
import { type Locale, locales, localeLabels } from "@/i18n/config";

export function LocaleSwitcher({ align = "end" }: { align?: "start" | "end" }) {
    const router = useRouter();
    const tCommon = useTranslations("common");
    const currentLocale = useLocale() as Locale;

    async function handleSetLocale(locale: Locale) {
        if (locale === currentLocale) return;
        await setLocaleAction(locale);
        router.refresh();
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="sm"
                        aria-label={tCommon("language")}
                    />
                }
            >
                <Globe className="mr-1 h-3.5 w-3.5" />
                <span>{localeLabels[currentLocale]}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className="w-40">
                {locales.map((loc) => (
                    <DropdownMenuItem key={loc} onClick={() => handleSetLocale(loc)}>
                        <span className="flex-1">{localeLabels[loc]}</span>
                        {currentLocale === loc ? <Check className="h-4 w-4" /> : null}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
