/**
 * Shared route chunk importers & idle/hover prefetching.
 * Ensures switching between tabs and lazy-loaded views happens with zero chunk-fetch lag.
 */
export const routeImporters = {
    '/': () => import('../pages/Dashboard'),
    '/planner': () => import('../pages/VisualPlanner'),
    '/analysis': () => import('../pages/Analysis'),
    '/leaderboard': () => import('../pages/Leaderboard'),
    '/settings': () => import('../pages/Settings'),
    '/subjects': () => import('../pages/Subjects'),
    '/history': () => import('../pages/History'),
    '/ai-chat': () => import('../pages/AIChat'),
    '/welcome': () => import('../pages/Welcome'),
} as const;

type RoutePath = keyof typeof routeImporters;

const prefetchedPaths = new Set<string>();

export function prefetchRoute(path: string): void {
    const normalized = (path === '/' ? '/' : `/${path.replace(/^\/+/, '').split('?')[0]}`) as RoutePath;
    if (prefetchedPaths.has(normalized)) return;
    const importer = routeImporters[normalized];
    if (!importer) return;
    prefetchedPaths.add(normalized);
    void importer().catch(() => {
        prefetchedPaths.delete(normalized);
    });
}

export function prefetchCoreRoutesOnIdle(): () => void {
    if (typeof window === 'undefined') return () => {};

    const coreRoutes: RoutePath[] = ['/', '/planner', '/analysis', '/leaderboard', '/settings', '/ai-chat'];
    let cancelled = false;

    const runPrefetch = () => {
        if (cancelled) return;
        for (const path of coreRoutes) {
            prefetchRoute(path);
        }
    };

    const win = window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
    };

    if (typeof win.requestIdleCallback === 'function') {
        const idleId = win.requestIdleCallback(runPrefetch, { timeout: 1200 });
        return () => {
            cancelled = true;
            win.cancelIdleCallback?.(idleId);
        };
    }

    const timerId = window.setTimeout(runPrefetch, 450);
    return () => {
        cancelled = true;
        window.clearTimeout(timerId);
    };
}
