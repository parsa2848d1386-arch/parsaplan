/**
 * Subtle Taptic-calibrated haptic feedback utility.
 * Automatically honors `prefers-reduced-motion: reduce` and persisted user disable toggle.
 */

const HAPTICS_STORAGE_KEY = 'parsaplan_haptics_enabled';

const readInitialHapticsEnabled = (): boolean => {
    if (typeof window === 'undefined') return true;
    try {
        const stored = window.localStorage.getItem(HAPTICS_STORAGE_KEY);
        if (stored === 'false') return false;
        if (stored === 'true') return true;
    } catch {
        // Ignore storage restrictions
    }
    return true;
};

let hapticsEnabled = readInitialHapticsEnabled();
let lastSliderTickAt = 0;

export const setHapticsEnabled = (enabled: boolean): void => {
    hapticsEnabled = enabled;
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(HAPTICS_STORAGE_KEY, String(enabled));
        } catch {
            // Ignore storage restrictions
        }
    }
};

export const isHapticsEnabled = (): boolean => hapticsEnabled;

export const prefersReducedMotion = (): boolean => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
        return false;
    }
};

export const vibrate = (pattern: number | number[] = 12): boolean => {
    if (!hapticsEnabled || prefersReducedMotion()) {
        return false;
    }
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
            return Boolean(navigator.vibrate(pattern));
        } catch {
            return false;
        }
    }
    return false;
};

/**
 * Refined, low-fatigue haptic patterns aligned with Apple iOS Taptic Engine guidance.
 */
export const haptics = {
    selection: () => vibrate(8),
    light: () => vibrate(12),
    medium: () => vibrate(18),
    heavy: () => vibrate(28),
    success: () => vibrate([10, 40, 14]),
    warning: () => vibrate([16, 40, 16]),
    error: () => vibrate([20, 45, 24]),
    impact: () => vibrate([10, 24, 12]),
};

const INTERACTIVE_CLICK_SELECTOR = [
    'button:not(:disabled):not([aria-disabled="true"])',
    'a[href]',
    '[role="button"]:not([aria-disabled="true"])',
    '[role="tab"]:not([aria-disabled="true"])',
    '[role="switch"]:not([aria-disabled="true"])',
    '[role="menuitem"]:not([aria-disabled="true"])',
    '[role="option"]:not([aria-disabled="true"])',
    'summary',
    'label[for]',
    '[data-haptic]',
].join(', ');

const GESTURE_POINTER_SELECTOR = [
    '.cursor-grab',
    '[data-haptic-gesture]',
    '[draggable="true"]',
].join(', ');

/**
 * Registers global capture-phase haptic listeners so every button press, tab switch,
 * range slider scrub, select change, and drag/swipe gesture delivers subtle tactile feedback.
 */
export const setupGlobalHapticListeners = (): (() => void) => {
    if (typeof document === 'undefined') {
        return () => {};
    }

    const handleGlobalClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement | null;
        if (!target || typeof target.closest !== 'function') return;

        const interactiveEl = target.closest(INTERACTIVE_CLICK_SELECTOR) as HTMLElement | null;
        if (!interactiveEl) return;

        const mode = interactiveEl.getAttribute('data-haptic');
        if (mode === 'off' || mode === 'custom') return;
        if (mode === 'light') {
            haptics.light();
            return;
        }
        if (mode === 'medium') {
            haptics.medium();
            return;
        }
        if (mode === 'impact') {
            haptics.impact();
            return;
        }
        haptics.selection();
    };

    const handleGlobalInput = (event: Event) => {
        const target = event.target as HTMLInputElement | null;
        if (!target || target.tagName !== 'INPUT' || target.type !== 'range') return;
        const now = Date.now();
        if (now - lastSliderTickAt >= 70) {
            lastSliderTickAt = now;
            haptics.selection();
        }
    };

    const handleGlobalChange = (event: Event) => {
        const target = event.target as HTMLInputElement | HTMLSelectElement | null;
        if (!target) return;
        if (
            target.tagName === 'SELECT' ||
            (target.tagName === 'INPUT' &&
                ((target as HTMLInputElement).type === 'checkbox' ||
                    (target as HTMLInputElement).type === 'radio' ||
                    (target as HTMLInputElement).type === 'time' ||
                    (target as HTMLInputElement).type === 'date'))
        ) {
            haptics.selection();
        }
    };

    const handleGlobalPointerDown = (event: PointerEvent) => {
        const target = event.target as HTMLElement | null;
        if (!target || typeof target.closest !== 'function') return;
        if (target.closest(GESTURE_POINTER_SELECTOR)) {
            haptics.light();
        }
    };

    document.addEventListener('click', handleGlobalClick, { capture: true, passive: true });
    document.addEventListener('input', handleGlobalInput, { capture: true, passive: true });
    document.addEventListener('change', handleGlobalChange, { capture: true, passive: true });
    document.addEventListener('pointerdown', handleGlobalPointerDown, { capture: true, passive: true });

    return () => {
        document.removeEventListener('click', handleGlobalClick, { capture: true });
        document.removeEventListener('input', handleGlobalInput, { capture: true });
        document.removeEventListener('change', handleGlobalChange, { capture: true });
        document.removeEventListener('pointerdown', handleGlobalPointerDown, { capture: true });
    };
};

