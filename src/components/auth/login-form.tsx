"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

type FormValues = {
    email: string;
    password: string;
};

export function LoginForm({ next }: { next?: string }) {
    const router = useRouter();
    const t = useTranslations("auth.form");
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [forgotOpen, setForgotOpen] = useState(false);

    const schema = z.object({
        email: z
            .string()
            .trim()
            .min(1, { message: t("errorEmailPasswordRequired") })
            .email({ message: t("errorEmailPasswordRequired") }),
        password: z.string().min(1, { message: t("errorEmailPasswordRequired") }),
    });

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { email: "", password: "" },
        mode: "onSubmit",
    });

    function handleGoogleLogin() {
        setError(null);
        setMessage(null);
        startTransition(async () => {
            const supabase = createClient();
            const redirectTo = new URL("/auth/callback", getSiteUrl());
            if (next) redirectTo.searchParams.set("next", next);

            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: redirectTo.toString(),
                    queryParams: {
                        access_type: "offline",
                        prompt: "consent",
                    },
                },
            });

            if (error) setError(error.message);
        });
    }

    const handlePasswordLogin = form.handleSubmit((values) => {
        setError(null);
        setMessage(null);
        startTransition(async () => {
            const supabase = createClient();
            const { error } = await supabase.auth.signInWithPassword({
                email: values.email,
                password: values.password,
            });

            if (error) {
                setError(error.message);
                return;
            }

            router.replace(next ?? "/dashboard");
            router.refresh();
        });
    });

    const handleEmailSignUp = form.handleSubmit((values) => {
        setError(null);
        setMessage(null);
        startTransition(async () => {
            const supabase = createClient();
            const redirectTo = new URL("/auth/callback", getSiteUrl());
            if (next) redirectTo.searchParams.set("next", next);

            const { data, error } = await supabase.auth.signUp({
                email: values.email,
                password: values.password,
                options: {
                    emailRedirectTo: redirectTo.toString(),
                },
            });

            if (error) {
                setError(error.message);
                return;
            }

            if (data.session) {
                router.replace(next ?? "/dashboard");
                router.refresh();
                return;
            }

            setMessage(t("signUpSuccess"));
        });
    });

    return (
        <div className="space-y-3">
            <Button
                type="button"
                variant="outline"
                className="h-11 w-full gap-3"
                onClick={handleGoogleLogin}
                disabled={isPending}
            >
                <GoogleIcon className="h-5 w-5" />
                <span className="font-medium">
                    {isPending ? t("googleConnecting") : t("google")}
                </span>
            </Button>

            <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs uppercase text-muted-foreground">{t("divider")}</span>
                <Separator className="flex-1" />
            </div>

            <form className="space-y-3" noValidate onSubmit={handlePasswordLogin}>
                <div className="space-y-2">
                    <Label
                        htmlFor="email-login"
                        className={cn(form.formState.errors.email && "text-destructive")}
                    >
                        {t("emailLabel")}
                    </Label>
                    <Input
                        id="email-login"
                        type="email"
                        autoComplete="email"
                        placeholder={t("emailPlaceholder")}
                        className="h-11"
                        disabled={isPending}
                        aria-invalid={!!form.formState.errors.email}
                        {...form.register("email")}
                    />
                    {form.formState.errors.email ? (
                        <p className="text-xs text-destructive">
                            {form.formState.errors.email.message}
                        </p>
                    ) : null}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label
                            htmlFor="password-login"
                            className={cn(form.formState.errors.password && "text-destructive")}
                        >
                            {t("passwordLabel")}
                        </Label>
                        <button
                            type="button"
                            onClick={() => setForgotOpen(true)}
                            className="text-xs text-emerald-700 hover:underline dark:text-emerald-400"
                        >
                            {t("forgotPassword")}
                        </button>
                    </div>
                    <Input
                        id="password-login"
                        type="password"
                        autoComplete="current-password"
                        placeholder={t("passwordPlaceholder")}
                        className="h-11"
                        disabled={isPending}
                        aria-invalid={!!form.formState.errors.password}
                        {...form.register("password")}
                    />
                    {form.formState.errors.password ? (
                        <p className="text-xs text-destructive">
                            {form.formState.errors.password.message}
                        </p>
                    ) : null}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button type="submit" className="h-11" disabled={isPending}>
                        {isPending ? t("signingIn") : t("signIn")}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        onClick={handleEmailSignUp}
                        disabled={isPending}
                    >
                        {isPending ? t("creating") : t("signUp")}
                    </Button>
                </div>
            </form>

            {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
            {message ? (
                <p className="text-center text-sm text-emerald-600 dark:text-emerald-400">
                    {message}
                </p>
            ) : null}

            <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
        </div>
    );
}

function ForgotPasswordDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const t = useTranslations("auth.forgotPassword");
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);
    const [pending, startTransition] = useTransition();

    function reset() {
        setEmail("");
        setError(null);
        setSent(false);
    }

    function handleClose(next: boolean) {
        onOpenChange(next);
        if (!next) {
            // reset on close so the next opening is clean
            setTimeout(reset, 200);
        }
    }

    function handleSend() {
        setError(null);
        if (!email.trim()) {
            setError(t("errorRequired"));
            return;
        }
        startTransition(async () => {
            const supabase = createClient();
            const redirectTo = new URL("/auth/callback", getSiteUrl());
            redirectTo.searchParams.set("next", "/auth/reset-password");
            const { error: rpcError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: redirectTo.toString(),
            });
            if (rpcError) {
                setError(rpcError.message);
                return;
            }
            setSent(true);
        });
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>{t("body")}</DialogDescription>
                </DialogHeader>

                {sent ? (
                    <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {t("sent")}
                    </p>
                ) : (
                    <div className="space-y-2">
                        <Label htmlFor="forgot-email">{t("title")}</Label>
                        <Input
                            id="forgot-email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={pending}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSend();
                            }}
                        />
                        {error ? <p className="text-xs text-destructive">{error}</p> : null}
                    </div>
                )}

                <DialogFooter>
                    {sent ? (
                        <DialogClose render={<Button />}>{t("back")}</DialogClose>
                    ) : (
                        <>
                            <DialogClose render={<Button variant="outline" />}>
                                {t("back")}
                            </DialogClose>
                            <Button
                                onClick={handleSend}
                                disabled={pending}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {pending ? t("sending") : t("send")}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                fill="#EA4335"
                d="M12 11.5v3.4h4.78c-.21 1.2-1.4 3.5-4.78 3.5-2.87 0-5.22-2.4-5.22-5.4s2.35-5.4 5.22-5.4c1.64 0 2.74.7 3.37 1.3l2.3-2.2C16.13 5.3 14.27 4.4 12 4.4 7.6 4.4 4 8 4 12.4S7.6 20.4 12 20.4c6.92 0 8.4-6.5 7.78-9.4H12z"
            />
            <path fill="none" d="M0 0h24v24H0z" />
        </svg>
    );
}
