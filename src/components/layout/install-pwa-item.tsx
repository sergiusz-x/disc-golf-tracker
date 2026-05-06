"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Renders a UserMenu item that fires the browser's PWA install prompt.
 * Shown only when the page captured a `beforeinstallprompt` event — i.e.
 * Chrome/Edge on Android/Desktop where the manifest is valid and the app
 * isn't already installed. iOS uses Add to Home Screen from Safari Share
 * menu; nothing to wire here.
 */
export function InstallPwaItem() {
    const t = useTranslations("userMenu");
    const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        const captureEvent = (e: Event) => {
            // Browser's default mini-infobar — we want the app menu instead.
            e.preventDefault();
            setEvent(e as BeforeInstallPromptEvent);
        };
        const onInstalled = () => {
            setEvent(null);
            toast.success(t("installedToast"));
        };
        window.addEventListener("beforeinstallprompt", captureEvent);
        window.addEventListener("appinstalled", onInstalled);
        return () => {
            window.removeEventListener("beforeinstallprompt", captureEvent);
            window.removeEventListener("appinstalled", onInstalled);
        };
    }, [t]);

    if (!event) return null;

    async function handleInstall() {
        if (!event) return;
        await event.prompt();
        const choice = await event.userChoice;
        if (choice.outcome === "accepted") {
            // `appinstalled` will fire and clear the event; this is a safety net
            // for browsers that don't emit it.
            setEvent(null);
        }
    }

    return (
        <DropdownMenuItem onClick={handleInstall}>
            <Download className="mr-2 h-4 w-4" />
            {t("installPwa")}
        </DropdownMenuItem>
    );
}
