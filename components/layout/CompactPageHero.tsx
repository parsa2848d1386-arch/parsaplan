import React from 'react';
import { motion, LayoutGroup, useReducedMotion } from 'framer-motion';
import { SPRING_SNAPPY } from '../../utils/motionPresets';
import { haptics } from '../../utils/haptics';

interface CompactPageHeroProps {
    title: string;
    subtitleBadge?: React.ReactNode;
    actionSlot?: React.ReactNode;
    bottomSlot?: React.ReactNode;
    ariaLabel?: string;
}

/**
 * Full-bleed adaptive theme gradient header shared across core pages.
 * Extends cleanly beneath the floating mobile capsules while placing titles below Dynamic Island clearance.
 */
export const CompactPageHero: React.FC<CompactPageHeroProps> = ({
    title,
    subtitleBadge,
    actionSlot,
    bottomSlot,
    ariaLabel,
}) => (
    <section
        aria-label={ariaLabel || title}
        className="relative overflow-hidden -mt-[calc(4.25rem+env(safe-area-inset-top,0px))] md:-mt-16 pt-[calc(4.35rem+env(safe-area-inset-top,0px))] md:pt-20 pb-4 sm:pb-5 px-3.5 xs:px-4 sm:px-6 lg:px-8 rounded-b-[28px] sm:rounded-b-[32px] bg-gradient-to-br from-[var(--color-indigo-600)] via-[var(--md-primary)] to-[var(--color-violet-700)] dark:from-[var(--color-indigo-900)] dark:via-[var(--color-indigo-800)] dark:to-[var(--color-violet-950)] text-white shadow-md"
    >
        <div
            className="absolute -top-16 -left-12 w-44 h-44 rounded-full bg-white/12 blur-2xl pointer-events-none"
            aria-hidden="true"
        />
        <div
            className="absolute -bottom-20 -right-10 w-52 h-52 rounded-full bg-white/10 blur-3xl pointer-events-none"
            aria-hidden="true"
        />

        <div className="relative z-10 max-app-container mx-auto flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2.5 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <h1 className="text-lg sm:text-2xl font-black text-white leading-tight truncate">
                        {title}
                    </h1>
                    {subtitleBadge}
                </div>
                {actionSlot && <div className="shrink-0">{actionSlot}</div>}
            </div>
            {bottomSlot}
        </div>
    </section>
);

export interface HeroTabItem<T extends string> {
    id: T;
    label: string;
    icon?: React.ElementType;
    badge?: React.ReactNode;
}

interface HeroSegmentedTabsProps<T extends string> {
    layoutId: string;
    ariaLabel: string;
    items: ReadonlyArray<HeroTabItem<NoInfer<T>>>;
    value: T;
    onChange: (next: NoInfer<T>) => void;
    variant?: 'hero' | 'surface';
}

/**
 * Shared spring-animated segmented control used inside CompactPageHero and Settings.
 */
export function HeroSegmentedTabs<T extends string>({
    layoutId,
    ariaLabel,
    items,
    value,
    onChange,
    variant = 'hero',
}: HeroSegmentedTabsProps<T>) {
    const prefersReducedMotion = useReducedMotion();
    const isHero = variant === 'hero';

    return (
        <LayoutGroup id={layoutId}>
            <div
                role="tablist"
                aria-label={ariaLabel}
                className={`flex items-center gap-1 p-1 squircle-sm overflow-x-auto no-scrollbar ${
                    isHero
                        ? 'bg-white/16 border border-white/20 backdrop-blur-sm'
                        : 'bg-surface-container-low border border-[var(--border-subtle)]'
                }`}
            >
                {items.map((item) => {
                    const Icon = item.icon;
                    const isSelected = value === item.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            onClick={() => {
                                haptics.selection();
                                onChange(item.id);
                            }}
                            className={`relative flex-1 min-w-0 min-h-[40px] px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                                isHero
                                    ? isSelected
                                        ? 'text-[var(--color-indigo-700)] dark:text-slate-900 font-black'
                                        : 'text-white/90 hover:text-white font-semibold'
                                    : isSelected
                                      ? 'text-primary font-black'
                                      : 'text-[var(--text-secondary)] hover:text-on-surface font-semibold'
                            }`}
                        >
                            {isSelected && (
                                <motion.span
                                    layoutId={`${layoutId}-pill`}
                                    transition={prefersReducedMotion ? { duration: 0 } : SPRING_SNAPPY}
                                    aria-hidden="true"
                                    className={`absolute inset-0 rounded-xl shadow-xs ${
                                        isHero ? 'bg-white' : 'bg-[var(--surface-elevated)] border border-[var(--border-subtle)]'
                                    }`}
                                />
                            )}
                            {Icon && <Icon size={15} className="relative z-10 shrink-0" aria-hidden="true" />}
                            <span className="relative z-10 truncate">{item.label}</span>
                            {item.badge && <span className="relative z-10 shrink-0">{item.badge}</span>}
                        </button>
                    );
                })}
            </div>
        </LayoutGroup>
    );
}
