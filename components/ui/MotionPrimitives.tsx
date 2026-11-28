import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion, useMotionValue, animate } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import {
    computeQuadraticArcPoints,
    EASE_SLOW_IN_OUT,
    PEAK_CHECKMARK_PATH_VARIANTS,
    RUBBER_BAND_ELASTIC,
    SPRING_SHEET,
    TRANSITION_SLOW_IN_OUT,
} from '../../utils/motionPresets';
import { haptics } from '../../utils/haptics';

// ============================================================================
// Principle 12: Arcs (Curved Flight Micro-Reward Overlay)
// ============================================================================
export interface ArcFlightEventDetail {
    startX: number;
    startY: number;
    targetSelector?: string;
    label?: string;
}

const ARC_EVENT_NAME = 'parsaplan:arc-fly';

export function triggerArcFlight({
    fromEl,
    targetSelector = '[data-arc-target="xp-badge"]',
    label = '+XP',
}: {
    fromEl?: HTMLElement | null;
    targetSelector?: string;
    label?: string;
}) {
    if (typeof window === 'undefined' || !fromEl) return;
    const rect = fromEl.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    window.dispatchEvent(
        new CustomEvent<ArcFlightEventDetail>(ARC_EVENT_NAME, {
            detail: {
                startX: rect.left + rect.width / 2,
                startY: rect.top + rect.height / 2,
                targetSelector,
                label,
            },
        })
    );
}

interface ActiveArcItem {
    id: string;
    xKeys: number[];
    yKeys: number[];
    label: string;
}

export const ArcFlightOverlay: React.FC = () => {
    const prefersReducedMotion = useReducedMotion();
    const [flights, setFlights] = useState<ActiveArcItem[]>([]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onArcEvent = (e: Event) => {
            if (prefersReducedMotion) return;
            const detail = (e as CustomEvent<ArcFlightEventDetail>).detail;
            if (!detail) return;

            // Find the best visible target element
            const candidates = Array.from(
                document.querySelectorAll<HTMLElement>(detail.targetSelector || '[data-arc-target="xp-badge"]')
            );
            const visibleTarget = candidates.find((el) => {
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
            });

            const endX = visibleTarget
                ? visibleTarget.getBoundingClientRect().left + visibleTarget.getBoundingClientRect().width / 2
                : window.innerWidth - 48;
            const endY = visibleTarget
                ? visibleTarget.getBoundingClientRect().top + visibleTarget.getBoundingClientRect().height / 2
                : 28;

            const pts = computeQuadraticArcPoints(detail.startX, detail.startY, endX, endY, 10);
            const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

            setFlights((prev) => [
                ...prev.slice(-3),
                {
                    id,
                    xKeys: pts.map((p) => p.x),
                    yKeys: pts.map((p) => p.y),
                    label: detail.label || '+XP',
                },
            ]);
        };

        window.addEventListener(ARC_EVENT_NAME, onArcEvent);
        return () => window.removeEventListener(ARC_EVENT_NAME, onArcEvent);
    }, [prefersReducedMotion]);

    if (typeof document === 'undefined' || flights.length === 0) return null;

    return createPortal(
        <div
            aria-hidden="true"
            className="fixed inset-0 pointer-events-none z-[var(--z-overlay)] overflow-hidden"
        >
            <AnimatePresence>
                {flights.map((f) => (
                    <motion.div
                        key={f.id}
                        initial={{
                            x: f.xKeys[0] - 18,
                            y: f.yKeys[0] - 14,
                            scale: 0.75,
                            opacity: 0.95,
                        }}
                        animate={{
                            x: f.xKeys.map((v) => v - 18),
                            y: f.yKeys.map((v) => v - 14),
                            scale: [0.85, 1.12, 0.95, 0.55],
                            opacity: [0.95, 1, 0.9, 0],
                        }}
                        transition={{ duration: 0.38, ease: EASE_SLOW_IN_OUT }}
                        onAnimationComplete={() =>
                            setFlights((prev) => prev.filter((item) => item.id !== f.id))
                        }
                        className="fixed top-0 left-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[11px] font-black shadow-lg will-change-transform"
                    >
                        <Sparkles size={11} />
                        <span dir="ltr">{f.label}</span>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>,
        document.body
    );
};

// ============================================================================
// Principle 5: Rubber Band (Elastic Overscroll Resistance & Snapback)
// ============================================================================
export const RubberBandScrollContainer: React.FC<{
    children: React.ReactNode;
    scrollContainerId?: string;
    className?: string;
}> = ({ children, scrollContainerId = 'main-content', className = '' }) => {
    const prefersReducedMotion = useReducedMotion();
    const y = useMotionValue(0);
    const touchStartYRef = useRef<number | null>(null);
    const activePullRef = useRef(false);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (prefersReducedMotion || e.touches.length !== 1) return;
        touchStartYRef.current = e.touches[0].clientY;
        activePullRef.current = false;
    }, [prefersReducedMotion]);

    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            if (prefersReducedMotion || touchStartYRef.current === null || e.touches.length !== 1) return;
            const scroller = document.getElementById(scrollContainerId);
            if (!scroller) return;

            const delta = e.touches[0].clientY - touchStartYRef.current;
            const atTop = scroller.scrollTop <= 1;
            const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;

            if (atTop && delta > 4) {
                activePullRef.current = true;
                const resisted = Math.min(48, (delta - 4) * RUBBER_BAND_ELASTIC);
                y.set(resisted);
            } else if (atBottom && delta < -4) {
                activePullRef.current = true;
                const resisted = Math.max(-48, (delta + 4) * RUBBER_BAND_ELASTIC);
                y.set(resisted);
            } else if (activePullRef.current) {
                y.set(0);
            }
        },
        [prefersReducedMotion, scrollContainerId, y]
    );

    const handleTouchEnd = useCallback(() => {
        touchStartYRef.current = null;
        if (activePullRef.current || y.get() !== 0) {
            activePullRef.current = false;
            animate(y, 0, SPRING_SHEET);
        }
    }, [y]);

    return (
        <motion.div
            style={prefersReducedMotion ? undefined : { y }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            className={className}
        >
            {children}
        </motion.div>
    );
};

// ============================================================================
// Principle 17: Solid Drawing (Tactile 3D Depth, Hairline Specular Rim & Sheen)
// ============================================================================
export const TactileDepthCard: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = ({ children, className = '' }) => {
    const prefersReducedMotion = useReducedMotion();
    const [tilt, setTilt] = useState<{ rx: number; ry: number; glareX: number; glareY: number } | null>(null);

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (prefersReducedMotion || e.pointerType !== 'mouse') return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        setTilt({
            rx: (0.5 - py) * 4.5,
            ry: (px - 0.5) * 4.5,
            glareX: Math.round(px * 100),
            glareY: Math.round(py * 100),
        });
    };

    const handlePointerLeave = () => setTilt(null);

    return (
        <motion.div
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            animate={
                prefersReducedMotion || !tilt
                    ? { rotateX: 0, rotateY: 0 }
                    : { rotateX: tilt.rx, rotateY: tilt.ry }
            }
            transition={{ duration: 0.18, ease: EASE_SLOW_IN_OUT }}
            style={{
                transformPerspective: 1000,
                transformStyle: 'preserve-3d',
            }}
            className={`relative squircle-glass ${className}`}
        >
            {tilt && !prefersReducedMotion && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-200"
                    style={{
                        background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.14) 0%, transparent 55%)`,
                    }}
                />
            )}
            {children}
        </motion.div>
    );
};

// ============================================================================
// Principle 19: Peak-End Rule (Animated Emerald Checkmark Celebratory Reveal)
// ============================================================================
export const PeakEndCheckmark: React.FC<{
    size?: number;
    className?: string;
}> = ({ size = 64, className = '' }) => {
    const prefersReducedMotion = useReducedMotion();

    return (
        <motion.div
            initial={prefersReducedMotion ? false : { scale: 0.72, opacity: 0 }}
            animate={{ scale: [0.72, 1.08, 1], opacity: 1 }}
            transition={{ duration: 0.34, ease: EASE_SLOW_IN_OUT }}
            className={`inline-flex items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 ring-4 ring-emerald-500/20 ${className}`}
            style={{ width: size, height: size }}
        >
            <svg
                width={size * 0.62}
                height={size * 0.62}
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
            >
                <motion.path
                    d="M5 12.5L9.5 17L19 7"
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    variants={PEAK_CHECKMARK_PATH_VARIANTS}
                    initial={prefersReducedMotion ? 'visible' : 'hidden'}
                    animate="visible"
                />
            </svg>
        </motion.div>
    );
};

// ============================================================================
// Principle 9: Slow in, Slow out (Ease-in-out Interactive Toggle Switch)
// ============================================================================
export const AnimatedSwitch: React.FC<{
    checked: boolean;
    onChange: () => void;
    label: React.ReactNode;
    className?: string;
}> = ({ checked, onChange, label, className = '' }) => {
    const prefersReducedMotion = useReducedMotion();

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => {
                haptics.selection();
                onChange();
            }}
            className={`w-full flex justify-between items-center gap-3 p-2.5 min-h-[44px] bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer ${className}`}
        >
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 text-start">
                {label}
            </span>
            <div
                dir="ltr"
                className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 relative shrink-0 ${
                    checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
            >
                <motion.div
                    initial={false}
                    animate={{ x: checked ? 18 : 0 }}
                    transition={prefersReducedMotion ? { duration: 0 } : TRANSITION_SLOW_IN_OUT}
                    className="w-4.5 h-4.5 bg-white rounded-full shadow-xs"
                />
            </div>
        </button>
    );
};
