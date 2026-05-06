import { NextResponse, type NextRequest } from "next/server";

import { ensureUserProfile } from "@/lib/profile";
import { safeRelativePath } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next");

    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=missing_code`);
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (user) await ensureUserProfile(supabase, user);

    return NextResponse.redirect(`${origin}${safeRelativePath(next) ?? "/dashboard"}`);
}
