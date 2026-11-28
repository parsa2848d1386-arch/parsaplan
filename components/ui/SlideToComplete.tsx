import React, { useCallback, useRef, useState } from 'react';
import { Check, ChevronLeft, RotateCcw } from 'lucide-react';
import { haptics } from '../../utils/haptics';

interface SlideToCompleteProps {
    isCompleted: boolean;
    onComplete: (triggerEl?: HTMLElement | null) => void;
    label?: string;
    completedLabel?: string;
    disabled?: boolean;
}

const SLIDE_COMMIT_THRESHOLD = 78;

/**
 * Tactile RTL Slide-to-Complete action bar rendered inside TaskCard.
 * Uses a native `<input type="range">` overlay in `dir="rtl"` so touch, mouse,
 * and keyboard sliding work reliably without colliding with parent card swipe gestures.
 */
export const SlideToComplete: React.FC<SlideToCompleteProps> = ({
    isCompleted,
    onComplete,
    label = 'بکشید برای انجام',
    completedLabel = 'انجام شد ✓ — ضربه برای بازگشت',
    disabled = false,
}) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);
    const [progress, setProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const midHapticFiredRef = useRef(false);
    const committedRef = useRef(false);

    const handleCommit = useCallback(() => {
        if (committedRef.current) return;
        committedRef.current = true;
        haptics.success();
        onComplete(thumbRef.current);
        setProgress(0);
        setIsDragging(false);
        midHapticFiredRef.current = false;
        window.setTimeout(() => {
            committedRef.current = false;
        }, 120);
    }, [onComplete]);

    const handleRelease = useCallback(
        (currentVal: number) => {
            setIsDragging(false);
            midHapticFiredRef.current = false;
            if (currentVal >= SLIDE_COMMIT_THRESHOLD) {
                handleCommit();
            } else {
                setProgress(0);
            }
        },
        [handleCommit]
    );

    const stopParentDrag = (e: React.SyntheticEvent) => {
        e.stopPropagation();
    };

    if (isCompleted) {
        return (
            <button
                type="button"
                dir="rtl"
                disabled={disabled}
                onPointerDownCapture={stopParentDrag}
                onMouseDownCapture={stopParentDrag}
                onTouchStartCapture={stopParentDrag}
                onClick={(e) => {
                    e.stopPropagation();
                    haptics.light();
                    onComplete(e.currentTarget);
                }}
                aria-label={completedLabel}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-2xl bg-emerald-500/12 hover:bg-emerald-500/18 border border-emerald-500/30 flex items-center justify-between gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold transition cursor-pointer"
            >
                <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Check size={14} strokeWidth={2.75} />
                    </span>
                    <span>تکمیل شد</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold opacity-85">
                    <RotateCcw size={12} />
                    بازگشت به لیست
                </span>
            </button>
        );
    }

    const trackWidth = trackRef.current?.clientWidth || 280;
    const maxTravelPx = Math.max(80, trackWidth - 44 - 8);
    const thumbTranslateX = -((progress / 100) * maxTravelPx);
    const hintOpacity = Math.max(0, 1 - (progress / 100) * 1.45);

    return (
        <div
            ref={trackRef}
            dir="rtl"
            onPointerDownCapture={stopParentDrag}
            onMouseDownCapture={stopParentDrag}
            onTouchStartCapture={stopParentDrag}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full h-11 rounded-2xl border overflow-hidden select-none transition-colors ${
                isDragging
                    ? 'bg-emerald-500/10 border-emerald-500/45'
                    : 'bg-surface-container-low border-[var(--border-subtle)] hover:border-emerald-500/35'
            }`}
        >
            {/* Dynamic Liquid Progress Fill expanding from right edge */}
            <div
                aria-hidden="true"
                style={{
                    width: `${Math.min(100, Math.max(0, progress))}%`,
                }}
                className={`absolute inset-y-0 right-0 bg-gradient-to-l from-emerald-500/30 via-emerald-400/20 to-teal-400/25 pointer-events-none ${
                    isDragging ? '' : 'transition-[width] duration-200 ease-out'
                }`}
            />

            {/* End Target Icon on the left side */}
            <div
                aria-hidden="true"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-xl border border-dashed border-emerald-500/40 flex items-center justify-center text-emerald-500/70 pointer-events-none"
            >
                <Check size={14} strokeWidth={2.5} />
            </div>

            {/* Center Prompt + Left-Pointing Chevron */}
            <div
                aria-hidden="true"
                style={{ opacity: hintOpacity }}
                className="absolute inset-0 flex items-center justify-center gap-1.5 pointer-events-none px-14"
            >
                <span className="text-xs font-bold text-[var(--text-secondary)] truncate">{label}</span>
                <ChevronLeft size={14} className="text-emerald-500 animate-pulse shrink-0" />
            </div>

            {/* Visual Thumb pinned at right-1 */}
            <div
                ref={thumbRef}
                aria-hidden="true"
                style={{ transform: `translateX(${thumbTranslateX}px)` }}
                className={`absolute right-1 top-1 z-10 w-11 h-9 rounded-xl flex items-center justify-center shadow-sm pointer-events-none ${
                    isDragging
                        ? 'bg-emerald-600 text-white scale-[1.03]'
                        : 'bg-emerald-500 text-white transition-transform duration-200 ease-out'
                }`}
            >
                <ChevronLeft size={18} strokeWidth={2.5} />
            </div>

            {/* Native Range Input Overlay for 100% Reliable Touch, Mouse & Keyboard Interaction */}
            <input
                type="range"
                min={0}
                max={100}
                step={1}
                disabled={disabled}
                value={progress}
                aria-label={label}
                onPointerDown={(e) => {
                    e.stopPropagation();
                    setIsDragging(true);
                    haptics.light();
                }}
                onTouchStart={(e) => {
                    e.stopPropagation();
                    setIsDragging(true);
                }}
                onChange={(e) => {
                    e.stopPropagation();
                    const nextVal = Number(e.target.value);
                    setProgress(nextVal);
                    if (nextVal >= 50 && !midHapticFiredRef.current) {
                        midHapticFiredRef.current = true;
                        haptics.selection();
                    }
                    if (nextVal >= 90) {
                        handleCommit();
                    }
                }}
                onPointerUp={(e) => {
                    e.stopPropagation();
                    handleRelease(Number((e.target as HTMLInputElement).value));
                }}
                onMouseUp={(e) => {
                    e.stopPropagation();
                    handleRelease(Number((e.target as HTMLInputElement).value));
                }}
                onTouchEnd={(e) => {
                    e.stopPropagation();
                    handleRelease(Number((e.target as HTMLInputElement).value));
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCommit();
                    }
                }}
                className="absolute inset-0 z-20 w-full h-full opacity-0 cursor-grab active:cursor-grabbing touch-none"
            />
        </div>
    );
};
