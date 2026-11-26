import { useEffect, useState } from 'react';

/**
 * Reactive media-query hook replacing stale `window.innerWidth < 768` checks during render.
 * Safely supports SSR/JSDOM, orientation changes, and foldable display transitions.
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
    const [matches, setMatches] = useState<boolean>(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return defaultValue;
        }
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        const mql = window.matchMedia(query);
        setMatches(mql.matches);

        const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
        if (typeof mql.addEventListener === 'function') {
            mql.addEventListener('change', onChange);
            return () => mql.removeEventListener('change', onChange);
        }
        mql.addListener(onChange);
        return () => mql.removeListener(onChange);
    }, [query]);

    return matches;
}
