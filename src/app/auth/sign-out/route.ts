import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
    const { origin } = new URL(request.url);

    // CSRF guard — Supabase auth cookies are SameSite=Lax so cross-site POSTs
    // are already mitigated, but a top-level <form> submit still works against
    // Lax. Require Origin (or Referer) to match this deployment so a malicious
    // page cannot force-log-out the user.
    const requestOrigin =
        request.headers.get("origin") ?? extractOrigin(request.headers.get("referer"));
    if (requestOrigin !== origin) {
        return new NextResponse("forbidden", { status: 403 });
    }

    const supabase = await createClient();
    await supabase.auth.signOut();

    return NextResponse.redirect(`${origin}/login`, { status: 303 });
}

function extractOrigin(referer: string | null): string | null {
    if (!referer) return null;
    try {
        return new URL(referer).origin;
    } catch {
        return null;
    }
}
