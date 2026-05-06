import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Tighter skeleton for the live scorecard route — the generic (app) one
 * doesn't match the per-hole layout users hit most often.
 */
export default function GameLoading() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-9 w-72" />

            <Card className="overflow-hidden border-emerald-200">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <div className="flex flex-1 items-center justify-center gap-6">
                        <div className="space-y-1.5 text-center">
                            <Skeleton className="mx-auto h-3 w-12" />
                            <Skeleton className="mx-auto h-7 w-10" />
                        </div>
                        <div className="space-y-1.5 text-center">
                            <Skeleton className="mx-auto h-3 w-10" />
                            <Skeleton className="mx-auto h-7 w-8" />
                        </div>
                    </div>
                    <Skeleton className="h-9 w-9 rounded-md" />
                </CardContent>
            </Card>

            {[0, 1, 2].map((i) => (
                <Card key={i}>
                    <CardContent className="space-y-2 p-3">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-9 w-9 rounded-full" />
                            <div className="flex-1 space-y-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                            <Skeleton className="h-9 w-12 rounded-lg" />
                        </div>
                        <Skeleton className="h-9 w-full rounded-lg" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
