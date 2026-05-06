import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/types/database";
import { getSupabaseKey, getSupabaseUrl } from "@/lib/supabase/env";

export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient<Database>(getSupabaseUrl(), getSupabaseKey(), {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    for (const { name, value, options } of cookiesToSet) {
                        cookieStore.set(name, value, options);
                    }
                } catch {
                    // Called from a Server Component — middleware handles refresh.
                }
            },
        },
    });
}
