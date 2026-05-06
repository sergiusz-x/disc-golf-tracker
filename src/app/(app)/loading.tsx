import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic loading skeleton applied to every protected route under (app).
 * Mirrors the structure of most pages: header, hero card, stat tiles, list.
 */
export default function AppLoading() {
    return (
        <div className="space-y-5">
            <header className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-48" />
            </header>

            <Card>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-5 w-44" />
                    </div>
                    <Skeleton className="h-9 w-20 rounded-lg" />
                </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                    <Card key={i}>
                        <CardContent className="flex items-center gap-3 p-4">
                            <Skeleton className="h-9 w-9 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-5 w-12" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent className="space-y-2">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl border p-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
