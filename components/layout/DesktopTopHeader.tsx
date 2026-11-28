import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Search } from 'lucide-react';
import { haptics } from '../../utils/haptics';

interface DesktopTopHeaderProps {
    onOpenCommandPalette: () => void;
    isCommandPaletteOpen: boolean;
    isNotificationOpen: boolean;
    isProfileOpen: boolean;
    onToggleProfile: () => void;
    isAuthenticated: boolean;
    avatarSlot: React.ReactNode;
    dynamicIslandSlot?: React.ReactNode;
    notificationSlot: React.ReactNode;
}

/**
 * Desktop floating Liquid Glass top capsules — mirrors the mobile floating top bar natively:
 * - Top-Right (viewport corner): standalone BlobatarBot circular capsule opening the unified Profile Bubble
 * - Top-Center: Dynamic Island hub (Focus Timer, XP, Study Room, Sync/Offline)
 * - Top-Left: compact Search + Notifications capsule that morphs directly into Search or Notifications
 */
export const DesktopTopHeader: React.FC<DesktopTopHeaderProps> = React.memo(
    ({
        onOpenCommandPalette,
        isCommandPaletteOpen,
        isNotificationOpen,
        isProfileOpen,
        onToggleProfile,
        isAuthenticated,
        avatarSlot,
        dynamicIslandSlot,
        notificationSlot,
    }) => {
        const prefersReducedMotion = useReducedMotion();

        return (
            <>
                {/* Top-Right Standalone Smart Robot Capsule — Pinned to true top-right corner so expanding/collapsing sidebar never moves it */}
                <motion.div
                    animate={
                        prefersReducedMotion
                            ? undefined
                            : {
                                  scale: isProfileOpen ? 0.86 : 1,
                                  opacity: isProfileOpen ? 0 : 1,
                              }
                    }
                    transition={{ type: 'spring', stiffness: 400, damping: 18, mass: 0.75, restDelta: 0.01 }}
                    style={{ transformOrigin: 'top right', willChange: 'transform, opacity' }}
                    className="hidden md:flex fixed top-3 right-3 z-40 pointer-events-auto items-center p-1 rounded-full liquid-glass-nav glass-pill-shadow border border-[var(--glass-nav-border)] shrink-0"
                >
                    <motion.button
                        type="button"
                        data-arc-target="xp-badge"
                        onClick={() => {
                            haptics.selection();
                            onToggleProfile();
                        }}
                        whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.88 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                        aria-expanded={isProfileOpen}
                        aria-label="منوی حساب کاربری"
                        title={isAuthenticated ? 'حساب کاربری و تنظیمات' : 'ورود یا همگام‌سازی ابری'}
                        className="w-11 h-11 rounded-full bg-white/60 dark:bg-white/10 border border-[var(--glass-nav-border)] flex items-center justify-center shadow-xs cursor-pointer shrink-0"
                    >
                        {avatarSlot}
                    </motion.button>
                </motion.div>

                {/* Top-Center Dynamic Island + Top-Left Search & Notifications Capsule (inside main so AI drawer never overlaps it) */}
                <header className="hidden md:flex md:absolute md:top-3 md:inset-x-3 items-center justify-between gap-3 z-40 pointer-events-none">
                    {/* Right balance spacer matching top-left capsule width for centered Dynamic Island */}
                    <div className="w-[104px] shrink-0" aria-hidden="true" />

                    {/* Center Floating Zone: Desktop Dynamic Island (invisible when idle) */}
                    <div className="flex-1 flex items-center justify-center min-w-0">
                        {dynamicIslandSlot}
                    </div>

                    {/* Top-Left Floating Capsule: Search + Notifications (identical to mobile; morphs directly into active tab) */}
                    <motion.div
                        data-top-left-capsule="desktop"
                        animate={
                            prefersReducedMotion
                                ? undefined
                                : {
                                      scale: isNotificationOpen || isCommandPaletteOpen ? 0.86 : 1,
                                      opacity: isNotificationOpen || isCommandPaletteOpen ? 0 : 1,
                                  }
                        }
                        transition={{ type: 'spring', stiffness: 400, damping: 18, mass: 0.75, restDelta: 0.01 }}
                        style={{ transformOrigin: 'top left', willChange: 'transform, opacity' }}
                        className="pointer-events-auto flex items-center gap-0.5 p-1 rounded-full liquid-glass-nav glass-pill-shadow border border-[var(--glass-nav-border)] shrink-0"
                    >
                        <motion.button
                            type="button"
                            onClick={() => {
                                haptics.selection();
                                onOpenCommandPalette();
                            }}
                            whileHover={prefersReducedMotion ? undefined : { scale: 1.06 }}
                            whileTap={prefersReducedMotion ? undefined : { scale: 0.88 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                            aria-label="جستجو و دستورات (Ctrl+K)"
                            title="جستجو و دستورات (Ctrl+K)"
                            className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0 ${
                                isCommandPaletteOpen
                                    ? 'bg-primary text-on-primary shadow-sm'
                                    : 'text-on-surface-variant dark:text-slate-300 hover:bg-surface-container/70 dark:hover:bg-white/10 hover:text-on-surface dark:hover:text-white'
                            }`}
                        >
                            <Search size={17} className="shrink-0" aria-hidden="true" />
                        </motion.button>

                        {notificationSlot}
                    </motion.div>
                </header>
            </>
        );
    }
);
DesktopTopHeader.displayName = 'DesktopTopHeader';
