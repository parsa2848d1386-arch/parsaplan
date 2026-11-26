import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
    const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    return nodes.filter((el) => {
        if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
    });
}

interface UseFocusTrapOptions {
    isActive: boolean;
    onEscape?: () => void;
    autoFocus?: boolean;
}

/**
 * WCAG 2.2 AA compliant keyboard focus trap for modals and mobile bottom sheets.
 * - Saves the triggering element before opening and restores focus on close.
 * - Loops Tab / Shift+Tab within the dialog container.
 * - Supports Escape key dismissal.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
    containerRef: React.RefObject<T | null>,
    options: UseFocusTrapOptions
): void {
    const { isActive, onEscape, autoFocus = true } = options;
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const onEscapeRef = useRef(onEscape);
    onEscapeRef.current = onEscape;

    useEffect(() => {
        if (!isActive) return;

        previousFocusRef.current = document.activeElement as HTMLElement | null;

        const container = containerRef.current;
        if (container && autoFocus) {
            const explicitTarget = container.querySelector<HTMLElement>('[data-autofocus="true"]');
            const focusables = getFocusableElements(container);
            const target = explicitTarget || focusables[0] || container;
            // Defer slightly so portal mount completes cleanly
            const rafId = window.requestAnimationFrame(() => {
                if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
                    target.focus({ preventScroll: true });
                }
            });
            return () => {
                window.cancelAnimationFrame(rafId);
                const prev = previousFocusRef.current;
                if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
                    prev.focus({ preventScroll: true });
                }
            };
        }

        return () => {
            const prev = previousFocusRef.current;
            if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
                prev.focus({ preventScroll: true });
            }
        };
    }, [isActive, autoFocus, containerRef]);

    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (onEscapeRef.current) {
                    e.stopPropagation();
                    onEscapeRef.current();
                }
                return;
            }

            if (e.key !== 'Tab') return;
            const container = containerRef.current;
            if (!container) return;

            const focusables = getFocusableElements(container);
            if (focusables.length === 0) {
                e.preventDefault();
                container.focus({ preventScroll: true });
                return;
            }

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement as HTMLElement | null;

            if (e.shiftKey) {
                if (!active || active === first || !container.contains(active)) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (!active || active === last || !container.contains(active)) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isActive, containerRef]);
}
