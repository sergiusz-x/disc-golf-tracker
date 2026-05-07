"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { ImageUp, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { updateProfile } from "@/app/(app)/profile/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getInitials } from "@/lib/people";
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPES, uploadAvatar } from "@/lib/storage";
import { cn } from "@/lib/utils";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

type ProfileShape = {
    id: string;
    email: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
};

type FormValues = {
    full_name: string;
    username: string;
    avatar_url: string;
};

export function ProfileForm({ initial }: { initial: ProfileShape }) {
    const t = useTranslations("profile.edit");
    const tErrors = useTranslations("profile.edit.errors");
    const tCommon = useTranslations("common");
    const [pending, startTransition] = useTransition();
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const schema = z.object({
        full_name: z
            .string()
            .trim()
            .max(80, { message: tErrors("fullNameTooLong") }),
        username: z
            .string()
            .trim()
            .refine((v) => v === "" || USERNAME_RE.test(v), {
                message: tErrors("usernameInvalid"),
            }),
        avatar_url: z.string().trim(),
    });

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            full_name: initial.full_name ?? "",
            username: initial.username ?? "",
            avatar_url: initial.avatar_url ?? "",
        },
        mode: "onBlur",
    });

    const watched = useWatch({ control: form.control });
    const watchedAvatar = watched.avatar_url ?? "";
    const watchedFullName = watched.full_name ?? "";
    const watchedUsername = watched.username ?? "";

    const displayedAvatar = previewUrl ?? watchedAvatar;

    // Revoke object URLs when they change or unmount — leaks add up over a
    // long-lived session.
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    function pickFile(file: File | null) {
        if (!file) return;
        if (file.size > AVATAR_MAX_BYTES) {
            toast.error(tErrors("fileTooBig"));
            return;
        }
        const lowerType = file.type.toLowerCase();
        if (!AVATAR_MIME_TYPES.includes(lowerType as (typeof AVATAR_MIME_TYPES)[number])) {
            toast.error(tErrors("unsupportedType"));
            return;
        }
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(file));
        setPendingFile(file);
        form.setValue("avatar_url", "", { shouldDirty: true });
    }

    function clearAvatar() {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setPendingFile(null);
        form.setValue("avatar_url", "", { shouldDirty: true });
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    const onSubmit = form.handleSubmit((values) => {
        startTransition(async () => {
            let avatarUrl = values.avatar_url.trim() || null;

            // If the user picked a file, upload it before persisting the profile
            // — otherwise we'd save a blob: URL which dies with the page.
            if (pendingFile) {
                setUploading(true);
                const upload = await uploadAvatar(pendingFile, initial.id);
                setUploading(false);
                if (!upload.ok) {
                    try {
                        const key = upload.error as Parameters<typeof tErrors>[0];
                        toast.error(
                            upload.detail ? tErrors(key, { detail: upload.detail }) : tErrors(key),
                        );
                    } catch {
                        toast.error(upload.error);
                    }
                    return;
                }
                avatarUrl = upload.url;
            }

            const payload: Parameters<typeof updateProfile>[0] = {};
            const dirtyFields = form.formState.dirtyFields;
            if (dirtyFields.full_name) payload.full_name = values.full_name.trim() || null;
            if (dirtyFields.username) payload.username = values.username.trim() || null;
            if (dirtyFields.avatar_url || pendingFile) payload.avatar_url = avatarUrl;

            const result = await updateProfile(payload);

            if (result.ok) {
                toast.success(t("savedToast"));
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
                setPendingFile(null);
                form.reset({
                    full_name: values.full_name,
                    username: values.username,
                    avatar_url: avatarUrl ?? "",
                });
                return;
            }

            switch (result.error) {
                case "usernameTaken":
                case "usernameInvalid":
                    form.setError("username", { message: tErrors(result.error) });
                    break;
                case "fullNameTooLong":
                    form.setError("full_name", { message: tErrors(result.error) });
                    break;
                case "avatarInvalid":
                    form.setError("avatar_url", { message: tErrors(result.error) });
                    break;
                default:
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
    });

    const isBusy = pending || uploading;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <Avatar className="h-14 w-14">
                        {displayedAvatar ? (
                            <AvatarImage
                                src={displayedAvatar}
                                alt={watchedFullName || initial.email}
                            />
                        ) : null}
                        <AvatarFallback>
                            {getInitials(watchedFullName, watchedUsername, initial.email)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-base">{t("title")}</p>
                        <p className="truncate text-xs font-normal text-muted-foreground">
                            {initial.email}
                        </p>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={onSubmit} className="space-y-4" noValidate>
                    <div className="space-y-2">
                        <Label>{t("avatarLabel")}</Label>
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={AVATAR_MIME_TYPES.join(",")}
                                className="sr-only"
                                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                                disabled={isBusy}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isBusy}
                            >
                                {uploading ? (
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                ) : (
                                    <ImageUp className="mr-1 h-4 w-4" />
                                )}
                                {uploading ? t("avatarUploading") : t("avatarUpload")}
                            </Button>
                            {(displayedAvatar || pendingFile) && !isBusy ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearAvatar}
                                >
                                    <X className="mr-1 h-4 w-4" />
                                    {t("avatarRemove")}
                                </Button>
                            ) : null}
                        </div>
                        {form.formState.errors.avatar_url ? (
                            <p className="text-xs text-destructive">
                                {form.formState.errors.avatar_url.message}
                            </p>
                        ) : null}
                    </div>

                    <Field
                        id="profile-full-name"
                        label={t("fullNameLabel")}
                        error={form.formState.errors.full_name?.message}
                    >
                        <Input
                            id="profile-full-name"
                            placeholder={t("fullNamePlaceholder")}
                            maxLength={80}
                            disabled={isBusy}
                            aria-invalid={!!form.formState.errors.full_name}
                            {...form.register("full_name")}
                        />
                    </Field>

                    <Field
                        id="profile-username"
                        label={t("usernameLabel")}
                        error={form.formState.errors.username?.message}
                        hint={t("usernameHint")}
                    >
                        <Input
                            id="profile-username"
                            placeholder={t("usernamePlaceholder")}
                            maxLength={24}
                            autoCapitalize="none"
                            autoCorrect="off"
                            disabled={isBusy}
                            aria-invalid={!!form.formState.errors.username}
                            {...form.register("username")}
                        />
                    </Field>

                    <Button
                        type="submit"
                        disabled={isBusy || (!form.formState.isDirty && !pendingFile)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {isBusy ? tCommon("saving") : tCommon("save")}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

function Field({
    id,
    label,
    hint,
    error,
    children,
}: {
    id: string;
    label: string;
    hint?: string;
    error?: string;
    children: React.ReactNode;
}) {
    const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className={cn(error && "text-destructive")}>
                {label}
            </Label>
            <div aria-describedby={describedBy || undefined}>{children}</div>
            {hint ? (
                <p id={`${id}-hint`} className="text-xs text-muted-foreground">
                    {hint}
                </p>
            ) : null}
            {error ? (
                <p id={`${id}-error`} className="text-xs text-destructive">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
