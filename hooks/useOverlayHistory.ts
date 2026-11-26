import { useEffect, useRef } from 'react';

/**
 * Connects full-height / >70% viewport overlays to the browser History stack so pressing
 * the hardware/OS Back button (Android) or edge-swiping Back (iOS) closes the overlay
 * instead of navigating away from the current screen (Baymard 2026 Back-Button Continuity).
 */
export function useOverlayHistory(isOpen: boolean, onClose: () => void, overlayKey: string): void {
    const pushedRef = useRef(false);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (typeof window === 'undefined' || !window.history || typeof window.history.pushState !== 'function') {
            return;
        }

        if (!isOpen) {
            if (pushedRef.current) {
                pushedRef.current = false;
                if (window.history.state?.__parsaOverlay === overlayKey) {
                    window.history.back();
                }
            }
            return;
        }

        const prevState = window.history.state && typeof window.history.state === 'object' ? window.history.state : {};
        try {
            window.history.pushState({ ...prevState, __parsaOverlay: overlayKey }, '');
            pushedRef.current = true;
        } catch {
            // Safe fallback in restricted history sandboxes
            pushedRef.current = false;
        }

        const handlePopState = () => {
            if (pushedRef.current) {
                pushedRef.current = false;
                onCloseRef.current();
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isOpen, overlayKey]);
}
