"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Minus, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { classifyStrokes, STROKE_BG, type StrokeKind } from "@/lib/strokes";
import { cn } from "@/lib/utils";

const QUICK = [1, 2, 3, 4, 5, 6, 7] as const;
const MAX_STROKES = 20;
const MIN_STROKES = 1;

export function StrokesPicker({
    par,
    value,
    disabled,
    onChange,
    onClear,
}: {
    par: number;
    value: number | undefined;
    disabled?: boolean;
    onChange: (n: number) => void;
    onClear: () => void;
}) {
    const t = useTranslations("strokesPicker");
    const tStrokes = useTranslations("strokes");

    const [customOpen, setCustomOpen] = useState(false);
    const [custom, setCustom] = useState<string>(value && value > 7 ? String(value) : "");

    function selectQuick(n: number) {
        if (disabled) return;
        onChange(n);
        setCustomOpen(false);
    }

    function commitCustom() {
        const n = Number.parseInt(custom, 10);
        if (Number.isFinite(n) && n >= MIN_STROKES && n <= MAX_STROKES) {
            onChange(n);
            setCustomOpen(false);
        }
    }

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {QUICK.map((n) => {
                const isSelected = value === n;
                const kind: StrokeKind = classifyStrokes(n, par);
                return (
                    <button
                        key={n}
                        type="button"
                        disabled={disabled}
                        onClick={() => selectQuick(n)}
                        aria-label={t("ariaQuick", { n, label: tStrokes(kind) })}
                        className={cn(
                            "h-9 w-9 rounded-lg text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40",
                            isSelected
                                ? `${STROKE_BG[kind]} ring-2 ring-offset-2 ring-offset-background ring-foreground/40 shadow-sm`
                                : "bg-muted hover:bg-muted/70 text-foreground/80",
                        )}
                    >
                        {n}
                    </button>
                );
            })}

            {customOpen ? (
                <div className="flex items-center gap-1">
                    <Input
                        type="number"
                        inputMode="numeric"
                        min={MIN_STROKES}
                        max={MAX_STROKES}
                        autoFocus
                        value={custom}
                        onChange={(e) => setCustom(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") commitCustom();
                            if (e.key === "Escape") setCustomOpen(false);
                        }}
                        className="h-9 w-16"
                    />
                    <Button
                        type="button"
                        size="icon"
                        variant="default"
                        className="h-9 w-9 bg-emerald-600 hover:bg-emerald-700"
                        onClick={commitCustom}
                        aria-label={t("ariaSave")}
                    >
                        <Check className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9"
                        onClick={() => setCustomOpen(false)}
                        aria-label={t("ariaCancel")}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                        setCustom(value && value > 7 ? String(value) : "");
                        setCustomOpen(true);
                    }}
                    aria-label={t("ariaCustom")}
                    className={cn(
                        "flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                        value && value > 7 ? "bg-red-700 text-white" : "bg-muted hover:bg-muted/70",
                    )}
                >
                    {value && value > 7 ? value : <Plus className="h-4 w-4" />}
                    {!(value && value > 7) ? <span>8+</span> : null}
                </button>
            )}

            <button
                type="button"
                disabled={disabled || value === undefined}
                onClick={onClear}
                aria-label={t("ariaClear")}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
            >
                <Minus className="h-4 w-4" />
            </button>
        </div>
    );
}
