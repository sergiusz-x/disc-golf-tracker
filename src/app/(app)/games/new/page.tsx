import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { NewGameWizard } from "@/components/games/new-game-wizard";
import { Card, CardContent } from "@/components/ui/card";
import { ensureUserProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SearchParams = Promise<{ course?: string; playerIds?: string }>;

export default async function NewGamePage({ searchParams }: { searchParams: SearchParams }) {
    const params = await searchParams;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Validate the rematch query params before they hit the wizard so we
    // don't pass garbage IDs into Supabase.
    const prefillCourseId = params.course && UUID_RE.test(params.course) ? params.course : null;
    const prefillPlayerIds = (params.playerIds ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => UUID_RE.test(s) && s !== user.id);

    const [profile, { data: courses }, { data: prefillPlayersData }] = await Promise.all([
        ensureUserProfile(supabase, user),
        supabase
            .from("courses")
            .select("id, name, city, hole_count, total_par")
            .order("name", { ascending: true }),
        prefillPlayerIds.length > 0
            ? supabase
                  .from("public_users")
                  .select("id, full_name, username, avatar_url")
                  .in("id", prefillPlayerIds)
            : Promise.resolve({ data: [] }),
    ]);

    const prefillPlayers = (prefillPlayersData ?? []).map((u) => ({
        id: u.id,
        email: null as string | null,
        full_name: u.full_name,
        username: u.username,
        avatar_url: u.avatar_url,
    }));

    const t = await getTranslations("games.new");

    return (
        <div className="space-y-4">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
                <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            </header>

            {!profile ? (
                <Card>
                    <CardContent className="p-6 text-center text-sm text-muted-foreground">
                        {t("profileError")}
                    </CardContent>
                </Card>
            ) : !courses?.length ? (
                <Card>
                    <CardContent className="p-6 text-center text-sm text-muted-foreground">
                        {t.rich("noCourses", {
                            code: (chunks) => (
                                <code className="rounded bg-muted px-1">{chunks}</code>
                            ),
                        })}
                    </CardContent>
                </Card>
            ) : (
                <NewGameWizard
                    host={{
                        id: profile.id,
                        email: profile.email,
                        full_name: profile.full_name,
                        username: profile.username,
                        avatar_url: profile.avatar_url,
                    }}
                    courses={courses}
                    prefillCourseId={prefillCourseId}
                    prefillPlayers={prefillPlayers}
                />
            )}
        </div>
    );
}
