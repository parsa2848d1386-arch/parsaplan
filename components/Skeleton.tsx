import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'rectangular',
    width,
    height,
}) => {
    const baseClasses = 'shimmer bg-surface-container-high/85 dark:bg-slate-800/85 animate-pulse';
    const variantClasses = {
        text: 'rounded h-4 w-full',
        circular: 'rounded-full',
        rectangular: 'rounded-xl',
    };

    return (
        <div
            aria-hidden="true"
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={{ width, height }}
        />
    );
};

/* ============================================================================
   1. DASHBOARD SKELETON (Matches Hero Bento + 7-Day Calendar + 2 Metrics + 8/4 Grid)
   ============================================================================ */
export const DashboardSkeleton: React.FC = () => (
    <div
        role="status"
        aria-live="polite"
        aria-label="در حال بارگذاری داشبورد"
        className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6 w-full max-app-container"
    >
        {/* Hero Bento Banner */}
        <div className="rounded-[24px] p-4 sm:p-6 border border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-44 rounded-lg" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <Skeleton className="h-4 w-64 rounded-md" />
                <Skeleton className="h-4 w-80 max-w-full rounded-md" />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <div className="flex items-center gap-3 p-2.5 px-3.5 rounded-xl border border-[var(--border-subtle)] bg-surface-container-low">
                    <Skeleton variant="circular" className="w-12 h-12" />
                    <div className="space-y-1.5">
                        <Skeleton className="h-3 w-16 rounded" />
                        <Skeleton className="h-4 w-12 rounded" />
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:flex gap-2.5">
                    <Skeleton className="h-11 sm:w-28 rounded-xl" />
                    <Skeleton className="h-11 sm:w-28 rounded-xl" />
                </div>
            </div>
        </div>

        {/* 7-Day Weekly Calendar Strip */}
        <div className="rounded-3xl p-4 sm:p-5 border border-[var(--border-subtle)] bg-[var(--surface-elevated)] space-y-3">
            <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-44 rounded-lg" />
                <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3">
                {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className={`h-24 sm:h-28 rounded-2xl ${i >= 4 ? 'hidden sm:block' : ''}`} />
                ))}
            </div>
        </div>

        {/* 2-Column Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
        </div>

        {/* 8/4 Core Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="rounded-3xl p-4 sm:p-5 border border-[var(--border-subtle)] bg-[var(--surface-elevated)] space-y-3">
                    <Skeleton className="h-5 w-28 rounded-lg" />
                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-[76px] rounded-2xl" />
                        ))}
                    </div>
                </div>
                <div className="rounded-3xl p-4 sm:p-6 border border-[var(--border-subtle)] bg-[var(--surface-elevated)] space-y-3">
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-5 w-36 rounded-lg" />
                        <Skeleton className="h-8 w-24 rounded-xl" />
                    </div>
                    <Skeleton className="h-20 rounded-[22px]" />
                    <Skeleton className="h-20 rounded-[22px]" />
                    <Skeleton className="h-20 rounded-[22px]" />
                </div>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-4">
                <Skeleton className="h-44 rounded-3xl" />
                <Skeleton className="h-40 rounded-3xl" />
            </div>
        </div>
    </div>
);

/* ============================================================================
   2. VISUAL PLANNER SKELETON (Matches Weekday Strip + Filter Chips + 24h Timeline)
   ============================================================================ */
export const PlannerSkeleton: React.FC = () => (
    <div
        role="status"
        aria-live="polite"
        aria-label="در حال بارگذاری تایم‌لاین ۲۴ ساعته"
        className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6 w-full max-app-container"
    >
        {/* Top Interactive Control Bar */}
        <div className="rounded-2xl p-3 sm:p-4 border border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex flex-col lg:flex-row justify-between gap-3">
            <div className="grid grid-cols-7 gap-1.5 flex-1">
                {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
            </div>
            <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-52 rounded-xl" />
                <Skeleton className="h-11 w-32 rounded-xl" />
            </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-hidden">
            <Skeleton className="h-9 w-36 rounded-full shrink-0" />
            <Skeleton className="h-9 w-28 rounded-full shrink-0" />
            <Skeleton className="h-9 w-28 rounded-full shrink-0" />
            <Skeleton className="h-9 w-24 rounded-full shrink-0" />
        </div>

        {/* 8/4 Grid: Timeline + Side Stats */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
            <div className="xl:col-span-8 space-y-3">
                <Skeleton className="h-16 rounded-2xl" />
                <div className="rounded-3xl p-4 border border-[var(--border-subtle)] bg-[var(--surface-elevated)] space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <Skeleton className="h-5 w-12 rounded-md shrink-0" />
                            <Skeleton className="h-14 flex-1 rounded-2xl" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="xl:col-span-4 space-y-4">
                <Skeleton className="h-44 rounded-3xl" />
                <Skeleton className="h-36 rounded-3xl" />
            </div>
        </div>
    </div>
);

/* ============================================================================
   3. ANALYSIS SKELETON (Matches Segmented Tabs + Sprint Banner + 4 KPIs + Chart)
   ============================================================================ */
export const AnalysisSkeleton: React.FC = () => (
    <div
        role="status"
        aria-live="polite"
        aria-label="در حال بارگذاری تحلیل عملکرد"
        className="p-3 xs:p-4 sm:p-6 md:p-8 flex flex-col gap-5 w-full max-app-container"
    >
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
                <Skeleton className="h-7 w-40 rounded-lg" />
                <Skeleton className="h-4 w-56 rounded-md" />
            </div>
            <Skeleton className="h-11 w-64 rounded-2xl" />
        </div>

        <Skeleton className="h-28 rounded-3xl" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            <Skeleton className="lg:col-span-8 h-72 rounded-3xl" />
            <Skeleton className="lg:col-span-4 h-72 rounded-3xl" />
        </div>
    </div>
);

/* ============================================================================
   4. LEADERBOARD & STUDY ROOMS SKELETONS (Page + Inner Async Sections)
   ============================================================================ */
export const LeaderboardRoomsSkeleton: React.FC = () => (
    <div
        role="status"
        aria-live="polite"
        aria-label="در حال بارگذاری اتاق‌های مطالعه"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
    >
        {Array.from({ length: 3 }).map((_, i) => (
            <div
                key={i}
                className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] space-y-3"
            >
                <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-4 w-14 rounded-md" />
                </div>
                <Skeleton className="h-5 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-9 w-20 rounded-xl" />
                </div>
            </div>
        ))}
    </div>
);

export const LeaderboardListSkeleton: React.FC = () => (
    <div
        role="status"
        aria-live="polite"
        aria-label="در حال بارگذاری جدول رتبه‌بندی"
        className="space-y-2.5"
    >
        {Array.from({ length: 5 }).map((_, i) => (
            <div
                key={i}
                className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex items-center justify-between gap-3"
            >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Skeleton variant="circular" className="w-8 h-8 shrink-0" />
                    <Skeleton variant="circular" className="w-10 h-10 shrink-0" />
                    <div className="space-y-1.5 flex-1 max-w-[180px]">
                        <Skeleton className="h-4 w-32 rounded-md" />
                        <Skeleton className="h-3 w-20 rounded-md" />
                    </div>
                </div>
                <Skeleton className="h-7 w-20 rounded-xl shrink-0" />
            </div>
        ))}
    </div>
);

export const LeaderboardSkeleton: React.FC = () => (
    <div
        role="status"
        aria-live="polite"
        aria-label="در حال بارگذاری لیگ و اتاق‌های مطالعه"
        className="p-3 xs:p-4 sm:p-6 md:p-8 flex flex-col gap-5 w-full max-app-container"
    >
        <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-11 w-64 rounded-2xl" />
            <Skeleton className="h-11 w-36 rounded-2xl" />
        </div>
        <div className="rounded-3xl p-4 sm:p-6 border border-[var(--border-subtle)] bg-[var(--surface-elevated)] space-y-4">
            <div className="flex flex-wrap gap-2 justify-between">
                <Skeleton className="h-10 w-60 rounded-xl" />
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-20 rounded-full" />
                    <Skeleton className="h-9 w-20 rounded-full" />
                </div>
            </div>
            <LeaderboardRoomsSkeleton />
        </div>
    </div>
);

/* ============================================================================
   5. SETTINGS SKELETON (Matches Profile Card + 2-Column Preference Sections)
   ============================================================================ */
export const SettingsSkeleton: React.FC = () => (
    <div
        role="status"
        aria-live="polite"
        aria-label="در حال بارگذاری تنظیمات"
        className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 w-full"
    >
        <div className="rounded-3xl p-5 sm:p-6 border border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
                <Skeleton variant="circular" className="w-14 h-14 shrink-0" />
                <div className="space-y-2">
                    <Skeleton className="h-5 w-36 rounded-md" />
                    <Skeleton className="h-3.5 w-48 rounded-md" />
                </div>
            </div>
            <Skeleton className="h-10 w-28 rounded-xl shrink-0" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="rounded-3xl p-5 border border-[var(--border-subtle)] bg-[var(--surface-elevated)] space-y-3"
                >
                    <Skeleton className="h-5 w-36 rounded-md" />
                    <Skeleton className="h-12 rounded-xl" />
                    <Skeleton className="h-12 rounded-xl" />
                    <Skeleton className="h-12 rounded-xl" />
                </div>
            ))}
        </div>
    </div>
);

/* ============================================================================
   6. SUBJECTS SKELETON (Matches 6 View Tabs + Subject Accordion Grid)
   ============================================================================ */
export const SubjectsSkeleton: React.FC = () => (
    <div
        role="status"
        aria-live="polite"
        aria-label="در حال بارگذاری حوزه‌ها و دروس"
        className="p-3 xs:p-4 sm:p-6 md:p-8 space-y-5 max-app-container w-full"
    >
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2 overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-20 rounded-xl shrink-0" />
                ))}
            </div>
            <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="rounded-3xl p-5 border border-[var(--border-subtle)] bg-[var(--surface-elevated)] space-y-3"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-11 h-11 rounded-2xl shrink-0" />
                            <div className="space-y-1.5">
                                <Skeleton className="h-4 w-28 rounded" />
                                <Skeleton className="h-3 w-20 rounded" />
                            </div>
                        </div>
                        <Skeleton className="h-6 w-14 rounded-lg" />
                    </div>
                    <Skeleton className="h-2.5 w-full rounded-full" />
                    <Skeleton className="h-14 rounded-2xl" />
                </div>
            ))}
        </div>
    </div>
);

/* ============================================================================
   7. HISTORY SKELETON (Matches Header + Archived Plan Cards w/ 3 Mini Stat Boxes)
   ============================================================================ */
export const HistorySkeleton: React.FC = () => (
    <div
        role="status"
        aria-live="polite"
        aria-label="در حال بارگذاری تاریخچه"
        className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 max-app-container space-y-6 w-full"
    >
        <div className="space-y-2">
            <Skeleton className="h-7 w-52 rounded-lg" />
            <Skeleton className="h-4 w-44 rounded-md" />
        </div>
        <div className="grid gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
                <div
                    key={i}
                    className="rounded-3xl p-5 border border-[var(--border-subtle)] bg-[var(--surface-elevated)] space-y-4"
                >
                    <div className="flex justify-between items-start">
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-44 rounded-md" />
                            <Skeleton className="h-3.5 w-36 rounded-md" />
                        </div>
                        <Skeleton className="w-10 h-10 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <Skeleton className="h-16 rounded-2xl" />
                        <Skeleton className="h-16 rounded-2xl" />
                        <Skeleton className="h-16 rounded-2xl" />
                    </div>
                    <Skeleton className="h-12 rounded-xl" />
                </div>
            ))}
        </div>
    </div>
);

/* ============================================================================
   8. AI CHAT SKELETON (Matches Chat Top Bar + Welcome Prompts + Bottom Composer)
   ============================================================================ */
export const AIChatSkeleton: React.FC = () => (
    <div
        role="status"
        aria-live="polite"
        aria-label="در حال بارگذاری دستیار هوشمند"
        className="flex flex-col h-full justify-between p-4 sm:p-6 gap-4"
    >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
                <Skeleton className="w-9 h-9 rounded-xl" />
                <Skeleton className="h-4 w-28 rounded-md" />
            </div>
            <Skeleton className="h-8 w-20 rounded-xl" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-5 max-w-md mx-auto w-full py-6">
            <Skeleton variant="circular" className="w-14 h-14" />
            <div className="space-y-2 w-full flex flex-col items-center">
                <Skeleton className="h-5 w-44 rounded-md" />
                <Skeleton className="h-3.5 w-64 rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-2.5 w-full">
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
            </div>
        </div>

        <Skeleton className="h-12 w-full rounded-2xl" />
    </div>
);

/* ============================================================================
   9. MACRO PLANNER SKELETON (Matches SmartMacroPlanner Report Layout)
   ============================================================================ */
export const MacroPlannerSkeleton: React.FC = () => (
    <div
        role="status"
        aria-live="polite"
        aria-label="در حال آماده‌سازی گزارش هوشمند"
        className="p-6 md:p-8 space-y-6"
    >
        <div className="flex justify-between items-start pb-5 border-b border-[var(--border-subtle)]">
            <div className="space-y-2">
                <Skeleton className="h-6 w-48 rounded-lg" />
                <Skeleton className="h-3.5 w-56 rounded-md" />
            </div>
            <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
        </div>
    </div>
);

/* ============================================================================
   ROUTE-AWARE DISPATCHER & APP SHELL SKELETON
   ============================================================================ */
export const RouteSkeleton: React.FC<{ pathname?: string }> = ({ pathname = '/' }) => {
    const cleanPath = pathname.split('?')[0] || '/';
    switch (cleanPath) {
        case '/planner':
            return <PlannerSkeleton />;
        case '/analysis':
            return <AnalysisSkeleton />;
        case '/leaderboard':
            return <LeaderboardSkeleton />;
        case '/settings':
            return <SettingsSkeleton />;
        case '/subjects':
            return <SubjectsSkeleton />;
        case '/history':
            return <HistorySkeleton />;
        case '/ai-chat':
            return <AIChatSkeleton />;
        case '/':
        default:
            return <DashboardSkeleton />;
    }
};

export const PageSkeleton: React.FC<{ pathname?: string }> = ({ pathname }) => {
    const resolved =
        pathname ||
        (typeof window !== 'undefined'
            ? window.location.hash.replace(/^#/, '').split('?')[0] || window.location.pathname
            : '/');
    return <RouteSkeleton pathname={resolved} />;
};

export const AppShellSkeleton: React.FC = () => {
    const initialPath =
        typeof window !== 'undefined'
            ? window.location.hash.replace(/^#/, '').split('?')[0] || '/'
            : '/';

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label="در حال آماده‌سازی پارساپلان"
            dir="rtl"
            className="min-h-screen flex bg-[var(--surface-canvas)] text-[var(--text-primary)]"
        >
            {/* Desktop Sidebar Placeholder */}
            <div className="hidden md:flex flex-col w-72 shrink-0 border-l border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 gap-4">
                <div className="flex items-center gap-3">
                    <Skeleton variant="rectangular" className="w-10 h-10 rounded-xl" />
                    <Skeleton className="h-5 w-28 rounded-md" />
                </div>
                <div className="space-y-2.5 pt-4">
                    <Skeleton className="h-11 rounded-xl" />
                    <Skeleton className="h-11 rounded-xl" />
                    <Skeleton className="h-11 rounded-xl" />
                    <Skeleton className="h-11 rounded-xl" />
                    <Skeleton className="h-11 rounded-xl" />
                </div>
            </div>

            {/* Main Content Placeholder */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Top Floating Two Capsules Placeholder */}
                <div className="md:hidden fixed top-[max(0.625rem,env(safe-area-inset-top,0px))] inset-x-3 z-40 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-1 p-1 rounded-full liquid-glass-nav border border-[var(--border-subtle)]">
                        <Skeleton variant="circular" className="w-10 h-10" />
                        <Skeleton variant="circular" className="w-10 h-10" />
                    </div>
                    <div className="flex items-center gap-1 p-1 rounded-full liquid-glass-nav border border-[var(--border-subtle)]">
                        <Skeleton variant="circular" className="w-10 h-10" />
                        <Skeleton variant="circular" className="w-10 h-10" />
                    </div>
                </div>

                <div className="top-nav-spacer md:h-0" />
                <RouteSkeleton pathname={initialPath} />

                {/* Mobile Bottom Floating 4-Tab Capsule + Separate AI Circle Placeholder */}
                <div className="md:hidden fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] inset-x-3 z-40 max-w-[430px] mx-auto flex items-center gap-2.5">
                    <div className="flex-1 h-[62px] px-2 rounded-full liquid-glass-nav border border-[var(--border-subtle)] flex items-center justify-around">
                        <Skeleton className="w-12 h-11 rounded-full" />
                        <Skeleton className="w-12 h-11 rounded-full" />
                        <Skeleton className="w-12 h-11 rounded-full" />
                        <Skeleton className="w-12 h-11 rounded-full" />
                    </div>
                    <Skeleton variant="circular" className="w-[62px] h-[62px] shrink-0" />
                </div>
            </div>
        </div>
    );
};
