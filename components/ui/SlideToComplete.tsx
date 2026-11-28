import React, { useCallback, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion';
import { Check, ChevronLeft, RotateCcw } from 'lucide-react';
import { haptics } from '../../utils/haptics';

interface SlideToCompleteProps {
    isCompleted: boolean;
    onComplete: (triggerEl?: HTMLElement | null) => void;
    label?: string;
    completedLabel?: string;
    disabled?: boolean;
}

const SLIDE_COMMIT_THRESHOLD = 0.82;

/**
 * Tactile RTL Slide-to-Complete action bar rendered inside TaskCard.
 * In RTL (`dir="rtl"`), dragging the thumb toward the end (left, negative X) reveals the
 * emerald progress fill and commits task completion past 82% track travel.
 */
export const SlideToComplete: React.FC<SlideToCompleteProps> = ({
    isCompleted,
    onComplete,
    label = 'بکشید برای انجام',
    completedLabel = 'انجام شد ✓ — ضربه برای بازگشت',
    disabled = false,
}) => {
    const prefersReducedMotion = useReducedMotion();
    const trackRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);
    const dragX = useMotionValue(0);
    const [maxTravel, setMaxTravel] = useState(200);
    const [isDragging, setIsDragging] = useState(false);

    const pointerStateRef = useRef<{
        active: boolean;
        pointerId: number;
        startX: number;
        maxPx: number;
        midHapticFired: boolean;
    }>({
        active: false,
        pointerId: -1,
        startX: 0,
        maxPx: 200,
        midHapticFired: false,
    });

    const fillScale = useTransform(dragX, (val) => {
        if (maxTravel <= 0) return 0;
        return Math.min(1, Math.max(0, Math.abs(val) / maxTravel));
    });

    const hintOpacity = useTransform(dragX, (val) => {
        if (maxTravel <= 0) return 1;
        return Math.max(0, 1 - (Math.abs(val) / maxTravel) * 1.45);
    });

    const measureMaxTravel = useCallback(() => {
        const trackW = trackRef.current?.clientWidth || 260;
        const thumbW = thumbRef.current?.clientWidth || 44;
        const computed = Math.max(80, trackW - thumbW - 8);
        setMaxTravel(computed);
        return computed;
    }, []);

    const resetSlider = useCallback(() => {
        if (prefersReducedMotion) {
            dragX.set(0);
            return;
        }
        animate(dragX, 0, {
            type: 'spring',
            stiffness: 420,
            damping: 32,
        });
    }, [dragX, prefersReducedMotion]);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (disabled || isCompleted) return;
        e.stopPropagation();

        const computedMax = measureMaxTravel();
        pointerStateRef.current = {
            active: true,
            pointerId: e.pointerId,
            startX: e.clientX,
            maxPx: computedMax,
            midHapticFired: false,
        };
        setIsDragging(true);
        haptics.light();

        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            // Pointer capture may fail in synthetic test environments
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const state = pointerStateRef.current;
        if (!state.active || state.pointerId !== e.pointerId) return;
        e.stopPropagation();

        // RTL: thumb sits at start (right edge) and slides leftward (deltaX <= 0).
        // Support slight tolerance if track is LTR in isolation by picking directional delta.
        const isRtl =
            trackRef.current ? getComputedStyle(trackRef.current).direction === 'rtl' : true;
        const rawDelta = e.clientX - state.startX;
        const clamped = isRtl
            ? Math.max(-state.maxPx, Math.min(0, rawDelta))
            : Math.min(state.maxPx, Math.max(0, rawDelta));

        dragX.set(clamped);

        const ratio = Math.abs(clamped) / state.maxPx;
        if (ratio >= 0.5 && !state.midHapticFired) {
            state.midHapticFired = true;
            haptics.selection();
        }
    };

    const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
        const state = pointerStateRef.current;
        if (!state.active || state.pointerId !== e.pointerId) return;
        e.stopPropagation();

        state.active = false;
        setIsDragging(false);

        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            // Ignore in synthetic environments
        }

        const ratio = Math.abs(dragX.get()) / state.maxPx;
        if (ratio >= SLIDE_COMMIT_THRESHOLD) {
            haptics.success();
            onComplete(thumbRef.current);
            dragX.set(0);
        } else {
            resetSlider();
        }
    };

    if (isCompleted) {
        return (
            <button
                type="button"
                disabled={disabled}
                onPointerDownCapture={(e) => e.stopPropagation()}
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

    return (
        <div
            ref={trackRef}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={isCompleted ? 100 : 0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    haptics.success();
                    onComplete(thumbRef.current);
                }
            }}
            onPointerDownCapture={(e) => e.stopPropagation()}
            className={`relative w-full h-11 rounded-2xl border overflow-hidden select-none flex items-center p-1 transition-colors ${
                isDragging
                    ? 'bg-emerald-500/10 border-emerald-500/40'
                    : 'bg-surface-container-low border-[var(--border-subtle)] hover:border-emerald-500/35'
            }`}
        >
            {/* Dynamic Liquid Progress Fill */}
            <motion.div
                style={{
                    scaleX: fillScale,
                    transformOrigin: 'right center',
                }}
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-l from-emerald-500/25 via-emerald-400/20 to-teal-400/25 pointer-events-none"
            />

            {/* End Target Icon */}
            <div
                aria-hidden="true"
                className="absolute end-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-xl border border-dashed border-emerald-500/35 flex items-center justify-center text-emerald-500/60 pointer-events-none"
            >
                <Check size={14} strokeWidth={2.5} />
            </div>

            {/* Center Prompt + Subtle Chevrons */}
            <motion.div
                style={{ opacity: hintOpacity }}
                aria-hidden="true"
                className="w-full flex items-center justify-center gap-1.5 pointer-events-none px-12"
            >
                <span className="text-xs font-bold text-[var(--text-secondary)] truncate">{label}</span>
                <ChevronLeft size={14} className="text-emerald-500 animate-pulse shrink-0" />
            </motion.div>

            {/* Draggable Thumb */}
            <motion.div
                ref={thumbRef}
                style={{ x: dragX }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                className={`relative z-10 w-11 h-9 rounded-xl flex items-center justify-center shrink-0 touch-none shadow-sm transition-colors ${
                    isDragging
                        ? 'bg-emerald-600 text-white cursor-grabbing scale-[1.03]'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600 cursor-grab'
                }`}
            >
                <ChevronLeft size={18} strokeWidth={2.5} />
            </motion.div>
        </div>
    );
};
