/**
 * Utility for triggering haptic feedback gracefully in supported browsers.
 */
export const vibrate = (pattern: number | number[] = 50) => {
    if (typeof window !== 'undefined' && navigator && navigator.vibrate) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            // Ignore if the browser blocks it or other errors occur
        }
    }
};

// Common haptic patterns
export const haptics = {
    light: () => vibrate(30),
    medium: () => vibrate(50),
    heavy: () => vibrate(100),
    success: () => vibrate([30, 50, 60]),
    error: () => vibrate([50, 50, 100]),
    impact: () => vibrate([20, 30, 40])
};
