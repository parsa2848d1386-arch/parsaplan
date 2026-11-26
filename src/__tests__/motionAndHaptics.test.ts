import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    projectSwipeOffset,
    resolveRtlTaskSwipe,
    SWIPE_COMMIT_THRESHOLD,
    SWIPE_HYSTERESIS_MIN,
    SWIPE_VELOCITY_FACTOR_SEC,
    TRANSITION_FAST,
    TRANSITION_STANDARD,
    TRANSITION_SLOW_IN_OUT,
    TRANSITION_SHAKE,
    TRANSITION_SQUASH,
    EASE_SLOW_IN_OUT,
    EXAGGERATED_SHAKE_KEYFRAMES,
    SQUASH_STRETCH_KEYFRAMES,
    ANTICIPATION_MESSAGE_VARIANTS,
    FOLLOW_THROUGH_VARIANTS,
    computeQuadraticArcPoints,
    SPRING_SNAPPY,
    SPRING_SHEET,
    SPRING_SWIPE,
} from '../../utils/motionPresets';
import { haptics, isHapticsEnabled, setHapticsEnabled, setupGlobalHapticListeners } from '../../utils/haptics';

describe('motionPresets — Apple Fluid Interfaces & RTL Swipe Physics', () => {
    it('enforces Doherty threshold (< 400ms) and UI timing bounds (100-500ms) across motion presets', () => {
        expect(TRANSITION_FAST.duration).toBeGreaterThanOrEqual(0.1);
        expect(TRANSITION_FAST.duration).toBeLessThan(0.4);
        expect(TRANSITION_STANDARD.duration).toBeGreaterThanOrEqual(0.1);
        expect(TRANSITION_STANDARD.duration).toBeLessThan(0.4);
        expect(TRANSITION_SLOW_IN_OUT.duration).toBeGreaterThanOrEqual(0.1);
        expect(TRANSITION_SLOW_IN_OUT.duration).toBeLessThan(0.4);
        expect(TRANSITION_SHAKE.duration).toBeGreaterThanOrEqual(0.1);
        expect(TRANSITION_SHAKE.duration).toBeLessThan(0.4);
        expect(TRANSITION_SQUASH.duration).toBeGreaterThanOrEqual(0.1);
        expect(TRANSITION_SQUASH.duration).toBeLessThan(0.4);

        const anticipationTransition = (ANTICIPATION_MESSAGE_VARIANTS.visible as { transition?: { duration?: number } }).transition;
        expect(anticipationTransition?.duration).toBeGreaterThanOrEqual(0.1);
        expect(anticipationTransition?.duration).toBeLessThan(0.4);

        const followTransition = (FOLLOW_THROUGH_VARIANTS.visible as { transition?: { duration?: number; delay?: number } }).transition;
        expect(followTransition?.duration).toBeGreaterThanOrEqual(0.1);
        expect((followTransition?.duration ?? 0) + (followTransition?.delay ?? 0)).toBeLessThan(0.4);

        expect(EASE_SLOW_IN_OUT).toEqual([0.42, 0, 0.58, 1]);
        expect(SPRING_SNAPPY.type).toBe('spring');
        expect(SPRING_SHEET.type).toBe('spring');
        expect(SPRING_SWIPE.type).toBe('spring');
    });

    it('defines balanced exaggeration shake and paired squash-and-stretch keyframes', () => {
        expect(EXAGGERATED_SHAKE_KEYFRAMES[0]).toBe(0);
        expect(EXAGGERATED_SHAKE_KEYFRAMES[EXAGGERATED_SHAKE_KEYFRAMES.length - 1]).toBe(0);
        expect(Math.max(...EXAGGERATED_SHAKE_KEYFRAMES.map(Math.abs))).toBeGreaterThanOrEqual(8);

        expect(SQUASH_STRETCH_KEYFRAMES.scaleX[0]).toBe(1);
        expect(SQUASH_STRETCH_KEYFRAMES.scaleY[0]).toBe(1);
        expect(SQUASH_STRETCH_KEYFRAMES.scaleX[SQUASH_STRETCH_KEYFRAMES.scaleX.length - 1]).toBe(1);
        expect(SQUASH_STRETCH_KEYFRAMES.scaleY[SQUASH_STRETCH_KEYFRAMES.scaleY.length - 1]).toBe(1);
        expect(Math.min(...SQUASH_STRETCH_KEYFRAMES.scaleX)).toBeLessThan(1);
        expect(Math.max(...SQUASH_STRETCH_KEYFRAMES.scaleY)).toBeGreaterThan(1);
    });

    it('computes non-linear quadratic Bezier arc waypoints rising above linear chord', () => {
        const points = computeQuadraticArcPoints(100, 400, 300, 40, 10);
        expect(points).toHaveLength(11);
        expect(points[0]).toEqual({ x: 100, y: 400 });
        expect(points[points.length - 1]).toEqual({ x: 300, y: 40 });

        // Compare midpoint (t = 0.5) against straight-line midpoint (200, 220)
        const midPoint = points[5];
        const linearMidY = (400 + 40) / 2;
        expect(midPoint.y).toBeLessThan(linearMidY);
        // Intermediate points deviate laterally from exact straight chord
        const linearMidX = (100 + 300) / 2;
        expect(midPoint.x).not.toBeCloseTo(linearMidX, 3);
    });

    it('projects swipe offset accurately using velocity lookahead', () => {
        const projected = projectSwipeOffset(-30, -250);
        expect(projected).toBeCloseTo(-30 + -250 * SWIPE_VELOCITY_FACTOR_SEC, 5);
    });

    it('resolves left drag past commit threshold to complete (exposes right emerald edge in RTL)', () => {
        expect(resolveRtlTaskSwipe(-80, 0)).toBe('complete');
        expect(resolveRtlTaskSwipe(-SWIPE_COMMIT_THRESHOLD, 0)).toBe('complete');
    });

    it('resolves right drag past commit threshold to delete (exposes left rose edge in RTL)', () => {
        expect(resolveRtlTaskSwipe(80, 0)).toBe('delete');
        expect(resolveRtlTaskSwipe(SWIPE_COMMIT_THRESHOLD, 0)).toBe('delete');
    });

    it('commits fast intentional flicks via velocity projection', () => {
        // -35 + (-250 * 0.2) = -85 <= -68 -> complete
        expect(resolveRtlTaskSwipe(-35, -250)).toBe('complete');
        // 35 + (250 * 0.2) = 85 >= 68 -> delete
        expect(resolveRtlTaskSwipe(35, 250)).toBe('delete');
    });

    it('blocks micro-jitter below hysteresis minimum even with high velocity', () => {
        expect(SWIPE_HYSTERESIS_MIN).toBeGreaterThan(15);
        expect(resolveRtlTaskSwipe(-15, -500)).toBe('none');
        expect(resolveRtlTaskSwipe(15, 500)).toBe('none');
    });

    it('cancels commit when user reverses direction mid-gesture (interruptibility)', () => {
        // Dragged left -40px, then flicked back right at +300px/s -> projected +20 -> none
        expect(resolveRtlTaskSwipe(-40, 300)).toBe('none');
        // Dragged right +40px, then flicked back left at -300px/s -> projected -20 -> none
        expect(resolveRtlTaskSwipe(40, -300)).toBe('none');
    });

    it('returns none for slow short drags below commit threshold', () => {
        expect(resolveRtlTaskSwipe(-40, 0)).toBe('none');
        expect(resolveRtlTaskSwipe(40, 0)).toBe('none');
    });
});

describe('haptics — Taptic Calibration & Reduced Motion Guard', () => {
    const originalVibrate = navigator.vibrate;
    const originalMatchMedia = window.matchMedia;
    let vibrateSpy: ReturnType<typeof vi.fn>;

    const mockReducedMotion = (matches: boolean) => {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            configurable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: query === '(prefers-reduced-motion: reduce)' ? matches : false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    };

    beforeEach(() => {
        vibrateSpy = vi.fn().mockReturnValue(true);
        Object.defineProperty(navigator, 'vibrate', {
            writable: true,
            configurable: true,
            value: vibrateSpy,
        });
        mockReducedMotion(false);
        setHapticsEnabled(true);
    });

    afterEach(() => {
        Object.defineProperty(navigator, 'vibrate', {
            writable: true,
            configurable: true,
            value: originalVibrate,
        });
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            configurable: true,
            value: originalMatchMedia,
        });
        setHapticsEnabled(true);
    });

    it('dispatches subtle Apple Taptic-calibrated vibration patterns', () => {
        haptics.selection();
        expect(vibrateSpy).toHaveBeenLastCalledWith(8);

        haptics.light();
        expect(vibrateSpy).toHaveBeenLastCalledWith(12);

        haptics.medium();
        expect(vibrateSpy).toHaveBeenLastCalledWith(18);

        haptics.heavy();
        expect(vibrateSpy).toHaveBeenLastCalledWith(28);

        haptics.success();
        expect(vibrateSpy).toHaveBeenLastCalledWith([10, 40, 14]);

        haptics.warning();
        expect(vibrateSpy).toHaveBeenLastCalledWith([16, 40, 16]);
    });

    it('suppresses all haptics when prefers-reduced-motion: reduce is active', () => {
        mockReducedMotion(true);
        haptics.selection();
        haptics.success();
        haptics.heavy();
        expect(vibrateSpy).not.toHaveBeenCalled();
    });

    it('respects user haptics preference toggle and persists to localStorage', () => {
        expect(isHapticsEnabled()).toBe(true);
        setHapticsEnabled(false);
        expect(isHapticsEnabled()).toBe(false);
        expect(window.localStorage.getItem('parsaplan_haptics_enabled')).toBe('false');

        haptics.medium();
        expect(vibrateSpy).not.toHaveBeenCalled();

        setHapticsEnabled(true);
        expect(window.localStorage.getItem('parsaplan_haptics_enabled')).toBe('true');
        haptics.medium();
        expect(vibrateSpy).toHaveBeenCalledWith(18);
    });

    it('delegates global capture-phase clicks, range sliders, and honors data-haptic="custom"', () => {
        const teardown = setupGlobalHapticListeners();

        const regularBtn = document.createElement('button');
        regularBtn.textContent = 'تست';
        document.body.appendChild(regularBtn);

        const customBtn = document.createElement('button');
        customBtn.setAttribute('data-haptic', 'custom');
        customBtn.textContent = 'سفارشی';
        document.body.appendChild(customBtn);

        const slider = document.createElement('input');
        slider.type = 'range';
        document.body.appendChild(slider);

        regularBtn.click();
        expect(vibrateSpy).toHaveBeenCalledTimes(1);
        expect(vibrateSpy).toHaveBeenLastCalledWith(8);

        vibrateSpy.mockClear();
        customBtn.click();
        expect(vibrateSpy).not.toHaveBeenCalled();

        slider.dispatchEvent(new Event('input', { bubbles: true }));
        expect(vibrateSpy).toHaveBeenCalledTimes(1);
        expect(vibrateSpy).toHaveBeenLastCalledWith(8);

        vibrateSpy.mockClear();
        setHapticsEnabled(false);
        regularBtn.click();
        expect(vibrateSpy).not.toHaveBeenCalled();

        teardown();
        regularBtn.remove();
        customBtn.remove();
        slider.remove();
    });
});
