import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Search, UserPlus, Users } from "lucide-react";

import {
    acceptFriendInvite,
    deleteFriendship,
    sendFriendInvite,
} from "@/app/(app)/friends/actions";
import { FriendActionButton } from "@/components/friends/friend-action-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { getDisplayName, getInitials } from "@/lib/people";
import { compareByMatch, escapeLike } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MIN_SEARCH_LENGTH = 2;

type SearchParams = Promise<{ q?: string }>;

type RelationRow = {
    id: string;
    status: "pending" | "accepted" | "blocked";
    requester_id: string;
    addressee_id: string;
};

// Sourced from the `public_users` view, which intentionally exposes only
// non-PII columns. Email is never read here — RLS on `public.users` only
// allows it for self / accepted friends / co-game-players.
type UserRow = {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
};

export default async function FriendsPage({ searchParams }: { searchParams: SearchParams }) {
    const { q = "" } = await searchParams;
    const query = q.trim();

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const [{ data: relations }, searchUsersAll] = await Promise.all([
        supabase
            .from("friendships")
            .select("id, status, requester_id, addressee_id")
            .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
            .order("created_at", { ascending: false }),
        query.length >= MIN_SEARCH_LENGTH
            ? searchPublicUsers(supabase, query)
            : Promise.resolve([] as UserRow[]),
    ]);

    const rows = (relations ?? []) as RelationRow[];

    // Hydrate the "other side" of each relation through public_users so we can
    // render names/avatars even for pending invites — `public.users` no longer
    // returns rows for pending counterparties under RLS.
    const otherIds = Array.from(
        new Set(rows.map((r) => (r.requester_id === user.id ? r.addressee_id : r.requester_id))),
    );
    const userMap = new Map<string, UserRow>();
    if (otherIds.length > 0) {
        const { data: otherUsers } = await supabase
            .from("public_users")
            .select("id, full_name, username, avatar_url")
            .in("id", otherIds);
        for (const u of otherUsers ?? []) {
            userMap.set(u.id, u);
        }
    }

    const accepted = rows.filter((row) => row.status === "accepted");
    const incoming = rows.filter((row) => row.status === "pending" && row.addressee_id === user.id);
    const outgoing = rows.filter((row) => row.status === "pending" && row.requester_id === user.id);

    const connectedIds = new Set<string>([user.id]);
    for (const row of rows) {
        connectedIds.add(row.requester_id);
        connectedIds.add(row.addressee_id);
    }

    const searchUsers = searchUsersAll.filter((candidate) => !connectedIds.has(candidate.id));

    const t = await getTranslations("friends");
    const tToast = await getTranslations("friends.toast");
    const tCommon = await getTranslations("common");

    function otherSide(relation: RelationRow): UserRow | null {
        const otherId =
            relation.requester_id === user!.id ? relation.addressee_id : relation.requester_id;
        return userMap.get(otherId) ?? null;
    }

    return (
        <div className="space-y-5">
            <header className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
                <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <UserPlus className="h-4 w-4 text-emerald-600" />
                        {t("addCardTitle")}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form className="flex gap-2" action="/friends" method="get">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                name="q"
                                defaultValue={query}
                                placeholder={t("searchPlaceholder")}
                                className="pl-9"
                            />
                        </div>
                        <Button type="submit">{t("searchButton")}</Button>
                    </form>

                    {query.length >= MIN_SEARCH_LENGTH ? (
                        searchUsers.length ? (
                            <ul className="space-y-2">
                                {searchUsers.map((candidate) => (
                                    <li key={candidate.id}>
                                        <div className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
                                            <UserRowView
                                                user={candidate}
                                                fallback={tCommon("noName")}
                                            />
                                            <FriendActionButton
                                                action={sendFriendInvite.bind(null, {
                                                    userId: candidate.id,
                                                })}
                                                successMessage={tToast("inviteSent")}
                                                className="bg-emerald-600 hover:bg-emerald-700"
                                            >
                                                {t("send")}
                                            </FriendActionButton>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EmptyState icon={Search} body={t("noResults")} />
                        )
                    ) : (
                        <EmptyState
                            icon={UserPlus}
                            body={t("minHint", { min: MIN_SEARCH_LENGTH })}
                        />
                    )}
                </CardContent>
            </Card>

            <Section title={t("pendingHeading", { n: incoming.length + outgoing.length })}>
                {incoming.length === 0 && outgoing.length === 0 ? (
                    <EmptyState body={t("pendingEmpty")} />
                ) : (
                    <div className="grid gap-3">
                        {incoming.map((relation) => {
                            const other = otherSide(relation);
                            if (!other) return null;
                            return (
                                <Card key={relation.id}>
                                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <UserRowView
                                            user={other}
                                            fallback={tCommon("noName")}
                                            subtitle={t("incomingSubtitle")}
                                        />
                                        <div className="flex gap-2">
                                            <FriendActionButton
                                                action={acceptFriendInvite.bind(null, {
                                                    friendshipId: relation.id,
                                                })}
                                                successMessage={tToast("inviteAccepted")}
                                                className="bg-emerald-600 hover:bg-emerald-700"
                                            >
                                                {t("accept")}
                                            </FriendActionButton>
                                            <FriendActionButton
                                                action={deleteFriendship.bind(null, {
                                                    friendshipId: relation.id,
                                                })}
                                                successMessage={tToast("inviteRejected")}
                                                variant="outline"
                                            >
                                                {t("reject")}
                                            </FriendActionButton>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                        {outgoing.map((relation) => {
                            const other = otherSide(relation);
                            if (!other) return null;
                            return (
                                <Card key={relation.id}>
                                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <UserRowView
                                            user={other}
                                            fallback={tCommon("noName")}
                                            subtitle={t("outgoingSubtitle")}
                                        />
                                        <FriendActionButton
                                            action={deleteFriendship.bind(null, {
                                                friendshipId: relation.id,
                                            })}
                                            successMessage={tToast("cancelled")}
                                            variant="outline"
                                        >
                                            {t("cancelInvite")}
                                        </FriendActionButton>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </Section>

            <Section title={t("acceptedHeading", { n: accepted.length })}>
                {accepted.length === 0 ? (
                    <EmptyState icon={Users} body={t("acceptedEmpty")} />
                ) : (
                    <ul className="grid gap-3">
                        {accepted.map((relation) => {
                            const other = otherSide(relation);
                            if (!other) return null;
                            return (
                                <li key={relation.id}>
                                    <Card>
                                        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                            <UserRowView
                                                user={other}
                                                fallback={tCommon("noName")}
                                                subtitle={t("friendSubtitle")}
                                            />
                                            <FriendActionButton
                                                action={deleteFriendship.bind(null, {
                                                    friendshipId: relation.id,
                                                })}
                                                successMessage={tToast("removed")}
                                                variant="ghost"
                                            >
                                                {t("remove")}
                                            </FriendActionButton>
                                        </CardContent>
                                    </Card>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Section>
        </div>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-3">
            <h2 className="text-base font-semibold">{title}</h2>
            {children}
        </section>
    );
}

function UserRowView({
    user,
    subtitle,
    fallback,
}: {
    user: UserRow;
    subtitle?: string;
    fallback: string;
}) {
    const initials = getInitials(user.full_name, user.username);
    const primary = getDisplayName(user.full_name, user.username) ?? fallback;
    const secondary = user.username ? `@${user.username}` : "—";

    return (
        <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-10 w-10">
                {user.avatar_url ? <AvatarImage src={user.avatar_url} alt="" /> : null}
                <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
                <p className="truncate text-sm font-medium">{primary}</p>
                <p className="truncate text-xs text-muted-foreground">{secondary}</p>
                {subtitle ? (
                    <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                        {subtitle}
                    </p>
                ) : null}
            </div>
        </div>
    );
}

async function searchPublicUsers(
    supabase: Awaited<ReturnType<typeof createClient>>,
    query: string,
): Promise<UserRow[]> {
    const pattern = `%${escapeLike(query)}%`;
    const [byName, byUsername] = await Promise.all([
        supabase
            .from("public_users")
            .select("id, full_name, username, avatar_url")
            .ilike("full_name", pattern)
            .limit(12),
        supabase
            .from("public_users")
            .select("id, full_name, username, avatar_url")
            .ilike("username", pattern)
            .limit(12),
    ]);

    const merged = new Map<string, UserRow>();
    for (const row of [...(byName.data ?? []), ...(byUsername.data ?? [])]) {
        if (!merged.has(row.id)) {
            merged.set(row.id, row);
        }
    }
    return Array.from(merged.values()).sort(compareByMatch(query)).slice(0, 8);
}
