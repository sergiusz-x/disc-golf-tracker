import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { DesktopBlocker } from "@/components/layout/desktop-blocker";
import { ServiceWorkerRegister } from "@/components/layout/sw-register";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteConfig, getSiteUrl } from "@/lib/site";

import "./globals.css";

const sans = Plus_Jakarta_Sans({
    variable: "--font-sans",
    subsets: ["latin", "latin-ext"],
    display: "swap",
});

const mono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
    display: "swap",
});

export const metadata: Metadata = {
    metadataBase: new URL(getSiteUrl()),
    title: {
        default: siteConfig.name,
        template: `%s · ${siteConfig.name}`,
    },
    description: siteConfig.description,
    applicationName: siteConfig.name,
    verification: {
        google: "3Orc8KNLWzXLP6t0hNb8ZZgkEHjo29aQYjdqHaBm_cY",
    },
    manifest: "/manifest.webmanifest",
    appleWebApp: {
        capable: true,
        title: siteConfig.shortName,
        statusBarStyle: "default",
    },
    formatDetection: { telephone: false },
};

export const viewport: Viewport = {
    themeColor: siteConfig.themeColor,
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const locale = await getLocale();
    const messages = await getMessages();

    return (
        <html
            lang={locale}
            className={`${sans.variable} ${mono.variable} h-full antialiased`}
            suppressHydrationWarning
        >
            <body className="flex min-h-full flex-col bg-background text-foreground">
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="system"
                        enableSystem
                        disableTransitionOnChange
                    >
                        <TooltipProvider delay={300}>
                            <DesktopBlocker />
                            <ServiceWorkerRegister />
                            {children}
                            <Toaster richColors position="top-center" />
                        </TooltipProvider>
                    </ThemeProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
