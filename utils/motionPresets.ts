import type { Transition, Variants } from 'framer-motion';

/**
 * Apple Fluid Interfaces (iOS 26/27) spring physics presets.
 * Critically damped or very lightly underdamped — zero cartoonish bounce or overshoot.
 */
export const SPRING_SNAPPY: Transition = {
    type: 'spring',
    stiffness: 420,
    damping: 32,
    mass: 0.9,
};

export const SPRING_SHEET: Transition = {
    type: 'spring',
    stiffness: 360,
    damping: 34,
    mass: 1,
};

export const SPRING_GENTLE: Transition = {
    type: 'spring',
    stiffness: 280,
    damping: 30,
    mass: 1,
};

export const SPRING_SWIPE: Transition = {
    type: 'spring',
    stiffness: 380,
    damping: 30,
};

/**
 * Principle 9 (Slow in, Slow out) & Principle 6/14 (Doherty < 400ms & UI Timing 100-500ms).
 */
export const EASE_SLOW_IN_OUT = [0.42, 0, 0.58, 1] as const;

export const TRANSITION_FAST: Transition = {
    duration: 0.16,
    ease: [0.22, 1, 0.36, 1],
};

export const TRANSITION_STANDARD: Transition = {
    duration: 0.22,
    ease: [0.22, 1, 0.36, 1],
};

export const TRANSITION_SLOW_IN_OUT: Transition = {
    duration: 0.24,
    ease: EASE_SLOW_IN_OUT,
};

/**
 * Principle 1 (Exaggeration — Disney 1981):
 * Whole-card/modal horizontal error shake when validation or auth fails.
 */
export const EXAGGERATED_SHAKE_KEYFRAMES = [0, -11, 11, -8, 8, -4, 4, 0];

export const TRANSITION_SHAKE: Transition = {
    duration: 0.36,
    ease: EASE_SLOW_IN_OUT,
};

/**
 * Principle 4 (Squash & Stretch — Disney 1981):
 * Tactile organic deformation on likes, completion checkmarks, ratings, and mood icons.
 */
export const SQUASH_STRETCH_KEYFRAMES = {
    scaleX: [1, 0.84, 1.16, 0.96, 1],
    scaleY: [1, 1.16, 0.86, 1.04, 1],
};

export const TRANSITION_SQUASH: Transition = {
    duration: 0.32,
    ease: [0.22, 1, 0.36, 1],
};

/**
 * Principle 3 (Stagger — Motion choreography):
 * Sequential entry for lists, prompt cards, and leaderboard items (strictly under 350ms total feel).
 */
export const STAGGER_CONTAINER_VARIANTS: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.032,
            delayChildren: 0.015,
        },
    },
};

export const STAGGER_ITEM_VARIANTS: Variants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.2,
            ease: [0.22, 1, 0.36, 1],
        },
    },
};

/**
 * Principle 7 (Anticipation — Disney 1981):
 * Subtle dip/pull-back before launching upward into position.
 */
export const ANTICIPATION_MESSAGE_VARIANTS: Variants = {
    hidden: { opacity: 0, y: 12, scale: 0.96 },
    visible: {
        opacity: 1,
        y: [12, 15, -3, 0],
        scale: [0.96, 0.93, 1.02, 1],
        transition: {
            duration: 0.28,
            times: [0, 0.24, 0.72, 1],
            ease: [0.22, 1, 0.36, 1],
        },
    },
};

/**
 * Principle 11 (Follow-through — Disney 1981):
 * Inner controls settle a fraction of a second after the parent sheet lands.
 */
export const FOLLOW_THROUGH_VARIANTS: Variants = {
    hidden: { opacity: 0, y: 6 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.2,
            delay: 0.055,
            ease: EASE_SLOW_IN_OUT,
        },
    },
};

/**
 * Principle 19 (Peak-End Rule — Kahneman):
 * Animated SVG checkmark stroke reveal.
 */
export const PEAK_CHECKMARK_PATH_VARIANTS: Variants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
        pathLength: 1,
        opacity: 1,
        transition: {
            pathLength: { duration: 0.34, ease: EASE_SLOW_IN_OUT },
            opacity: { duration: 0.12 },
        },
    },
};

/**
 * Principle 5 (Rubber Band): Elastic resistance ratio for overscroll boundaries.
 */
export const RUBBER_BAND_ELASTIC = 0.28;

/**
 * Principle 12 (Arcs — Disney 1981):
 * Computes quadratic Bezier arc waypoints so micro-rewards travel along a natural curved path
 * toward a target header badge rather than a robotic straight line.
 */
export interface ArcPoint {
    x: number;
    y: number;
}

export function computeQuadraticArcPoints(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    steps = 12
): ArcPoint[] {
    const midX = (startX + endX) / 2;
    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.hypot(dx, dy);
    // Curve upward/outward naturally proportional to distance
    const arcLift = Math.min(130, Math.max(44, dist * 0.26));
    const ctrlX = midX + (dx >= 0 ? -Math.min(56, dist * 0.12) : Math.min(56, dist * 0.12));
    const ctrlY = Math.min(startY, endY) - arcLift;

    const points: ArcPoint[] = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const omt = 1 - t;
        const x = omt * omt * startX + 2 * omt * t * ctrlX + t * t * endX;
        const y = omt * omt * startY + 2 * omt * t * ctrlY + t * t * endY;
        points.push({ x, y });
    }
    return points;
}

/**
 * Reusable Framer Motion variants replacing dead `tailwindcss-animate` (`animate-in`) classes.
 */
export const fadeSlideUpVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: TRANSITION_STANDARD },
    exit: { opacity: 0, y: -6, transition: TRANSITION_FAST },
};

export const toastVariants: Variants = {
    hidden: { opacity: 0, y: 16, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1, transition: SPRING_SNAPPY },
    exit: { opacity: 0, y: 12, scale: 0.96, transition: TRANSITION_FAST },
};

export const modalScaleVariants: Variants = {
    hidden: { opacity: 0, scale: 0.96, y: 6 },
    visible: { opacity: 1, scale: 1, y: 0, transition: SPRING_SHEET },
    exit: { opacity: 0, scale: 0.97, y: 4, transition: TRANSITION_FAST },
};

export const popoverVariants: Variants = {
    hidden: { opacity: 0, y: -4, scale: 0.86 },
    visible: { opacity: 1, y: 0, scale: 1, transition: SPRING_SNAPPY },
    exit: { opacity: 0, y: -4, scale: 0.88, transition: { duration: 0.14, ease: EASE_SLOW_IN_OUT } },
};

/**
 * Pure Fluid-Interface RTL swipe projection & hysteresis engine.
 *
 * Physical geometry in RTL (`dir="rtl"`):
 * - Right edge is the Leading/Start side (checkbox side).
 *   Dragging card LEFT (`offsetX < 0`) uncovers the RIGHT edge -> `'complete'`.
 * - Left edge is the Trailing/End side (action/delete side).
 *   Dragging card RIGHT (`offsetX > 0`) uncovers the LEFT edge -> `'delete'`.
 */
export const SWIPE_COMMIT_THRESHOLD = 68;
export const SWIPE_HYSTERESIS_MIN = 26;
export const SWIPE_VELOCITY_FACTOR_SEC = 0.2;

export type RtlSwipeAction = 'complete' | 'delete' | 'none';

export function projectSwipeOffset(offsetX: number, velocityX: number): number {
    return offsetX + velocityX * SWIPE_VELOCITY_FACTOR_SEC;
}

export function resolveRtlTaskSwipe(offsetX: number, velocityX: number): RtlSwipeAction {
    // Hysteresis guard: tiny accidental drags never commit even with velocity noise
    if (Math.abs(offsetX) < SWIPE_HYSTERESIS_MIN) {
        return 'none';
    }

    const projected = projectSwipeOffset(offsetX, velocityX);

    // Must agree in sign so reversing mid-gesture cancels cleanly (interruptibility)
    if (offsetX < 0 && projected <= -SWIPE_COMMIT_THRESHOLD) {
        return 'complete';
    }
    if (offsetX > 0 && projected >= SWIPE_COMMIT_THRESHOLD) {
        return 'delete';
    }
    return 'none';
}
