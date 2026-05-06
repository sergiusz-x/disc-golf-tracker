import { createClient } from "@/lib/supabase/client";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // matches the bucket policy
export const AVATAR_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
] as const;

export type AvatarUploadError = "fileTooBig" | "unsupportedType" | "uploadFailed";

export type AvatarUploadResult =
    | { ok: true; url: string }
    | { ok: false; error: AvatarUploadError; detail?: string };

/**
 * Upload an image to the public `avatars` bucket under the user's folder.
 * Returns the resolvable public URL on success. Validation matches the
 * bucket-level constraints in the migration so the user gets a friendly
 * error message instead of a Supabase storage error code.
 */
export async function uploadAvatar(file: File, userId: string): Promise<AvatarUploadResult> {
    if (file.size > AVATAR_MAX_BYTES) {
        return { ok: false, error: "fileTooBig" };
    }
    const lowerType = file.type.toLowerCase();
    if (!AVATAR_MIME_TYPES.includes(lowerType as (typeof AVATAR_MIME_TYPES)[number])) {
        return { ok: false, error: "unsupportedType" };
    }

    const supabase = createClient();
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
        return { ok: false, error: "uploadFailed", detail: uploadError.message };
    }

    const {
        data: { publicUrl },
    } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

    return { ok: true, url: publicUrl };
}
