"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type FormValues = {
    password: string;
};

export function ResetPasswordForm() {
    const t = useTranslations("auth.resetPassword");
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const schema = z.object({
        password: z.string().min(6, { message: t("errorTooShort") }),
    });

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { password: "" },
        mode: "onSubmit",
    });

    const onSubmit = form.handleSubmit((values) => {
        startTransition(async () => {
            const supabase = createClient();
            const { error } = await supabase.auth.updateUser({
                password: values.password,
            });
            if (error) {
                if (error.message.toLowerCase().includes("weak")) {
                    form.setError("password", { message: t("errorWeak") });
                } else {
                    form.setError("password", { message: error.message });
                }
                return;
            }
            toast.success(t("success"));
            router.replace("/dashboard");
            router.refresh();
        });
    });

    return (
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
            <div className="space-y-2">
                <Label
                    htmlFor="reset-password"
                    className={cn(form.formState.errors.password && "text-destructive")}
                >
                    {t("passwordLabel")}
                </Label>
                <Input
                    id="reset-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder={t("passwordPlaceholder")}
                    className="h-11"
                    disabled={pending}
                    aria-invalid={!!form.formState.errors.password}
                    {...form.register("password")}
                />
                {form.formState.errors.password ? (
                    <p className="text-xs text-destructive">
                        {form.formState.errors.password.message}
                    </p>
                ) : null}
            </div>
            <Button
                type="submit"
                className="h-11 w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={pending}
            >
                {pending ? t("saving") : t("submit")}
            </Button>
        </form>
    );
}
