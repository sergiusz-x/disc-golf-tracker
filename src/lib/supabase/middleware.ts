import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/types/database";
import { getSupabaseKey, getSupabaseUrl } from "@/lib/supabase/env";

const PUBLIC_PATHS = ["/", "/login", "/auth", "/privacy", "/terms", "/offline"];

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient<Database>(getSupabaseUrl(), getSupabaseKey(), {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                for (const { name, value } of cookiesToSet) {
                    request.cookies.set(name, value);
                }
                supabaseResponse = NextResponse.next({ request });
                for (const { name, value, options } of cookiesToSet) {
                    supabaseResponse.cookies.set(name, value, options);
                }
            },
        },
    });

    // Required: refresh session if expired.
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;
    const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

    if (!user && !isPublic) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("next", pathname);
        return redirectWithCookies(url, supabaseResponse);
    }

    if (user && (pathname === "/login" || pathname === "/")) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";
        return redirectWithCookies(url, supabaseResponse);
    }

    return supabaseResponse;
}

// Carry refreshed Supabase auth cookies onto a redirect response so a session
// rotation triggered by getUser() above is not lost.
function redirectWithCookies(url: URL, source: NextResponse) {
    const response = NextResponse.redirect(url);
    for (const cookie of source.cookies.getAll()) {
        response.cookies.set(cookie);
    }
    return response;
}
