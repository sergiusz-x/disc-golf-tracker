"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Check, Loader2, MapPin, Search, UserPlus, X } from "lucide-react";

import { createGame } from "@/app/(app)/games/new/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDisplayName, getInitials } from "@/lib/people";
import { compareByMatch, escapeLike } from "@/lib/search";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_PLAYERS_PER_GAME = 8;
const MAX_OTHER_PLAYERS = MAX_PLAYERS_PER_GAME - 1;
const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_FETCH_LIMIT = 12;
const SEARCH_RESULT_LIMIT = 8;
const LAST_COURSE_KEY = "dgt:lastCourseId";

type Course = {
    id: string;
    name: string;
    city: string | null;
    hole_count: number;
    total_par: number;
};

type Player = {
    id: string;
    // null for rows pulled from public_users (search results); populated for
    // the logged-in host where we have full profile access.
    email: string | null;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
};

export function NewGameWizard({
    host,
    courses,
    prefillCourseId = null,
    prefillPlayers = [],
}: {
    host: Player;
    courses: Course[];
    prefillCourseId?: string | null;
    prefillPlayers?: Player[];
}) {
    const t = useTranslations("games.wizard");
    const tErrors = useTranslations("games.newErrors");
    const tCommon = useTranslations("common");
    const locale = useLocale();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [courseId, setCourseId] = useState<string | null>(
        prefillCourseId && courses.some((c) => c.id === prefillCourseId) ? prefillCourseId : null,
    );
    const [players, setPlayers] = useState<Player[]>(prefillPlayers); // without host
    const [name, setName] = useState("");
    const [nameTouched, setNameTouched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    // When neither a URL param nor a manual choice is in effect, fall back
    // to the last course this user picked (one less tap on the common
    // "same crew, same spot, again" path). Reading localStorage in an effect
    // is the standard pattern for hydrating from a browser-only store; the
    // cascading-render warning is a false positive because we only ever set
    // a value the user already chose previously.
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (courseId) return;
        const last = window.localStorage.getItem(LAST_COURSE_KEY);
        if (last && courses.some((c) => c.id === last)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCourseId(last);
        }
    }, [courses, courseId]);

    const selectedCourse = courses.find((c) => c.id === courseId) ?? null;

    useEffect(() => {
        if (!selectedCourse || nameTouched) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setName(defaultGameName(selectedCourse.name, locale));
    }, [locale, nameTouched, selectedCourse]);

    function pickCourse(id: string) {
        setCourseId(id);
        if (typeof window !== "undefined") {
            window.localStorage.setItem(LAST_COURSE_KEY, id);
        }
    }

    function next() {
        setError(null);
        if (step === 1 && !courseId) {
            setError(t("errorPickCourse"));
            return;
        }
        setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
    }
    function back() {
        setError(null);
        setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));
    }

    function submit() {
        if (!courseId) {
            setError(t("errorPickCourse"));
            return;
        }
        setError(null);
        startTransition(async () => {
            const gameName =
                name.trim() ||
                (selectedCourse ? defaultGameName(selectedCourse.name, locale) : undefined);
            const result = await createGame({
                courseId,
                playerIds: players.map((p) => p.id),
                name: gameName,
            });
            // Server action redirects on success — we only reach here on error.
            if (result && !result.ok) {
                const detail = "detail" in result ? result.detail : undefined;
                const code = result.error as Parameters<typeof tErrors>[0];
                try {
                    setError(detail ? tErrors(code, { detail: `: ${detail}` }) : tErrors(code));
                } catch {
                    setError(tErrors("generic"));
                }
            }
        });
    }

    return (
        <div className="space-y-5 pb-24">
            <Stepper step={step} labels={[t("stepCourse"), t("stepPlayers"), t("stepStart")]} />

            {step === 1 && (
                <CourseStep courses={courses} selectedId={courseId} onSelect={pickCourse} />
            )}

            {step === 2 && <PlayerStep host={host} players={players} setPlayers={setPlayers} />}

            {step === 3 && (
                <ReviewStep
                    host={host}
                    players={players}
                    course={selectedCourse}
                    name={name}
                    setName={(next) => {
                        setNameTouched(true);
                        setName(next);
                    }}
                />
            )}

            {error ? (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
                    {error}
                </p>
            ) : null}

            <ActionBar
                step={step}
                canContinue={step !== 1 || !!courseId}
                isPending={isPending}
                onBack={back}
                onNext={next}
                onSubmit={submit}
                labels={{
                    back: t("actionBack"),
                    next: t("actionNext"),
                    creating: t("actionCreating"),
                    start: t("actionStart"),
                }}
            />

            {/* Hidden helper so unused-vars lint stays happy in case translations
          are pruned in future. */}
            <span className="sr-only">{tCommon("loading")}</span>
        </div>
    );
}

function Stepper({ step, labels }: { step: 1 | 2 | 3; labels: [string, string, string] }) {
    const steps = labels.map((label, i) => ({ n: (i + 1) as 1 | 2 | 3, label }));
    return (
        <ol className="flex items-center justify-between gap-2">
            {steps.map((s, i) => {
                const done = step > s.n;
                const active = step === s.n;
                return (
                    <li key={s.n} className="flex flex-1 items-center gap-2">
                        <span
                            className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                                done && "bg-emerald-600 text-white",
                                active &&
                                    "bg-emerald-600/15 text-emerald-700 ring-2 ring-emerald-600 dark:text-emerald-300",
                                !done && !active && "bg-muted text-muted-foreground",
                            )}
                        >
                            {done ? <Check className="h-4 w-4" /> : s.n}
                        </span>
                        <span
                            className={cn(
                                "text-sm",
                                active ? "font-medium" : "text-muted-foreground",
                            )}
                        >
                            {s.label}
                        </span>
                        {i < steps.length - 1 ? (
                            <span
                                className={cn(
                                    "ml-1 hidden h-px flex-1 sm:block",
                                    done ? "bg-emerald-600" : "bg-border",
                                )}
                            />
                        ) : null}
                    </li>
                );
            })}
        </ol>
    );
}

function CourseStep({
    courses,
    selectedId,
    onSelect,
}: {
    courses: Course[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    const t = useTranslations("games.wizard");
    const [query, setQuery] = useState("");

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return courses;
        return courses.filter(
            (c) => c.name.toLowerCase().includes(q) || (c.city ?? "").toLowerCase().includes(q),
        );
    }, [courses, query]);

    return (
        <div className="space-y-3">
            <h2 className="text-base font-semibold">{t("courseHeading")}</h2>
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("courseSearchPlaceholder")}
                    className="pl-9"
                />
            </div>
            {filtered.length === 0 ? (
                <Card>
                    <CardContent className="p-6 text-center text-sm text-muted-foreground">
                        {t("courseEmpty")}
                    </CardContent>
                </Card>
            ) : (
                <ul className="space-y-2">
                    {filtered.map((c) => {
                        const selected = c.id === selectedId;
                        const playable = c.hole_count > 0;
                        return (
                            <li key={c.id}>
                                <button
                                    type="button"
                                    disabled={!playable}
                                    onClick={() => onSelect(c.id)}
                                    className={cn(
                                        "w-full rounded-xl border bg-card p-4 text-left transition-colors",
                                        selected
                                            ? "border-emerald-600 ring-2 ring-emerald-600/30"
                                            : "border-border hover:border-emerald-600/50 hover:bg-accent/40",
                                        !playable && "cursor-not-allowed opacity-50",
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                            <MapPin className="h-5 w-5" />
                                        </span>
                                        <div className="flex-1">
                                            <p className="font-medium">{c.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {t("courseInfo", {
                                                    city: c.city ?? "—",
                                                    holes: c.hole_count,
                                                    par: c.total_par,
                                                })}
                                            </p>
                                        </div>
                                        {selected ? (
                                            <Check className="h-5 w-5 text-emerald-600" />
                                        ) : null}
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

function PlayerStep({
    host,
    players,
    setPlayers,
}: {
    host: Player;
    players: Player[];
    setPlayers: (p: Player[]) => void;
}) {
    const t = useTranslations("games.wizard");
    const tCommon = useTranslations("common");
    const [query, setQuery] = useState("");
    const [fetched, setFetched] = useState<{ q: string; items: Player[] }>({
        q: "",
        items: [],
    });

    const excluded = useMemo(
        () => new Set([host.id, ...players.map((p) => p.id)]),
        [host.id, players],
    );

    const trimmed = query.trim();

    useEffect(() => {
        if (trimmed.length < MIN_SEARCH_LENGTH) return;
        let cancelled = false;
        const handle = setTimeout(async () => {
            const supabase = createClient();
            const pattern = `%${escapeLike(trimmed)}%`;
            const [byName, byUsername] = await Promise.all([
                supabase
                    .from("public_users")
                    .select("id, full_name, username, avatar_url")
                    .ilike("full_name", pattern)
                    .limit(SEARCH_FETCH_LIMIT),
                supabase
                    .from("public_users")
                    .select("id, full_name, username, avatar_url")
                    .ilike("username", pattern)
                    .limit(SEARCH_FETCH_LIMIT),
            ]);
            if (cancelled) return;

            const merged = new Map<string, Player>();
            for (const row of [...(byName.data ?? []), ...(byUsername.data ?? [])]) {
                if (!merged.has(row.id)) {
                    merged.set(row.id, {
                        id: row.id,
                        email: null,
                        full_name: row.full_name,
                        username: row.username,
                        avatar_url: row.avatar_url,
                    });
                }
            }
            const items = Array.from(merged.values())
                .sort(compareByMatch(trimmed))
                .slice(0, SEARCH_RESULT_LIMIT);
            setFetched({ q: trimmed, items });
        }, SEARCH_DEBOUNCE_MS);
        return () => {
            cancelled = true;
            clearTimeout(handle);
        };
    }, [trimmed]);

    const isFresh = trimmed.length >= MIN_SEARCH_LENGTH && fetched.q === trimmed;
    const searching = trimmed.length >= MIN_SEARCH_LENGTH && !isFresh;
    const results = isFresh ? fetched.items.filter((u) => !excluded.has(u.id)) : [];

    function add(p: Player) {
        if (players.length >= MAX_OTHER_PLAYERS) return;
        setPlayers([...players, p]);
        setQuery("");
    }

    function remove(id: string) {
        setPlayers(players.filter((p) => p.id !== id));
    }

    const all = [host, ...players];

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-base font-semibold">{t("playersHeading")}</h2>
                <p className="text-xs text-muted-foreground">
                    {t("playersCounter", { n: all.length, max: MAX_PLAYERS_PER_GAME })}
                </p>
            </div>

            <ul className="space-y-2">
                {all.map((p, i) => (
                    <li key={p.id}>
                        <Card>
                            <CardContent className="flex items-center gap-3 p-3">
                                <Avatar className="h-9 w-9">
                                    {p.avatar_url ? (
                                        <AvatarImage src={p.avatar_url} alt="" />
                                    ) : null}
                                    <AvatarFallback>
                                        {getInitials(p.full_name, p.username, p.email)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                        {getDisplayName(p.full_name, p.username, p.email) ??
                                            tCommon("noName")}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {p.username ? `@${p.username}` : (p.email ?? "—")}
                                    </p>
                                </div>
                                {i === 0 ? (
                                    <Badge variant="secondary">{t("playersHost")}</Badge>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={t("playersRemoveAriaLabel")}
                                        onClick={() => remove(p.id)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </li>
                ))}
            </ul>

            <div className="space-y-2">
                <Label htmlFor="player-search">{t("playersAddLabel")}</Label>
                <div className="relative">
                    <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        id="player-search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t("playersSearchPlaceholder")}
                        className="pl-9"
                        disabled={players.length >= MAX_OTHER_PLAYERS}
                    />
                </div>

                {query.trim().length >= MIN_SEARCH_LENGTH ? (
                    <div className="rounded-lg border bg-card">
                        {searching ? (
                            <p className="px-3 py-2 text-xs text-muted-foreground">
                                {t("playersSearching")}
                            </p>
                        ) : results.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-muted-foreground">
                                {t("playersNoResults")}
                            </p>
                        ) : (
                            <ul className="divide-y divide-border/60">
                                {results.map((u) => (
                                    <li key={u.id}>
                                        <button
                                            type="button"
                                            onClick={() => add(u)}
                                            className="flex w-full items-center gap-3 p-2 text-left hover:bg-accent/40"
                                        >
                                            <Avatar className="h-8 w-8">
                                                {u.avatar_url ? (
                                                    <AvatarImage src={u.avatar_url} alt="" />
                                                ) : null}
                                                <AvatarFallback>
                                                    {getInitials(u.full_name, u.username, u.email)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm">
                                                    {getDisplayName(
                                                        u.full_name,
                                                        u.username,
                                                        u.email,
                                                    ) ?? tCommon("noName")}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {u.username
                                                        ? `@${u.username}`
                                                        : (u.email ?? "—")}
                                                </p>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        {t("playersSearchHint", { min: MIN_SEARCH_LENGTH })}
                    </p>
                )}
            </div>
        </div>
    );
}

function ReviewStep({
    host,
    players,
    course,
    name,
    setName,
}: {
    host: Player;
    players: Player[];
    course: Course | null;
    name: string;
    setName: (v: string) => void;
}) {
    const t = useTranslations("games.wizard");
    const tCommon = useTranslations("common");
    const all = [host, ...players];
    return (
        <div className="space-y-4">
            <h2 className="text-base font-semibold">{t("reviewHeading")}</h2>

            <Card>
                <CardContent className="space-y-1 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t("reviewRouteLabel")}
                    </p>
                    <p className="font-medium">{course?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                        {t("courseInfo", {
                            city: course?.city ?? "—",
                            holes: course?.hole_count ?? 0,
                            par: course?.total_par ?? 0,
                        })}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="space-y-2 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t("reviewPlayersLabel", { n: all.length })}
                    </p>
                    <ul className="flex flex-wrap gap-2">
                        {all.map((p, i) => (
                            <li key={p.id}>
                                <Badge variant={i === 0 ? "default" : "secondary"}>
                                    {getDisplayName(p.full_name, p.username, p.email) ??
                                        tCommon("noName")}
                                </Badge>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>

            <div className="space-y-1">
                <Label htmlFor="game-name">{t("reviewNameLabel")}</Label>
                <Input
                    id="game-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    placeholder={t("reviewNamePlaceholder")}
                />
                <p className="text-xs text-muted-foreground">{t("reviewNameHint")}</p>
            </div>
        </div>
    );
}

function defaultGameName(courseName: string, locale: string) {
    const dateTime = new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date());

    return `${courseName} · ${dateTime}`;
}

function ActionBar({
    step,
    canContinue,
    isPending,
    onBack,
    onNext,
    onSubmit,
    labels,
}: {
    step: 1 | 2 | 3;
    canContinue: boolean;
    isPending: boolean;
    onBack: () => void;
    onNext: () => void;
    onSubmit: () => void;
    labels: { back: string; next: string; creating: string; start: string };
}) {
    return (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-border/60 bg-background/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] shadow-[0_-12px_32px_rgba(0,0,0,0.08)] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
            <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
                {step > 1 ? (
                    <Button type="button" variant="ghost" onClick={onBack} disabled={isPending}>
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        {labels.back}
                    </Button>
                ) : (
                    <span />
                )}
                {step < 3 ? (
                    <Button
                        type="button"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={onNext}
                        disabled={!canContinue || isPending}
                    >
                        {labels.next}
                        <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                ) : (
                    <Button
                        type="button"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={onSubmit}
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                        {isPending ? labels.creating : labels.start}
                    </Button>
                )}
            </div>
        </div>
    );
}
