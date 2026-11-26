import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Play, Pause, Square, Maximize2, Sparkles, Cloud, CloudOff, Users, Lock } from 'lucide-react';
import { useOptionalFocus, useOptionalFocusTick } from '../context/FocusContext';
import { useStore, useStoreSyncStatus } from '../context/StoreContext';
import { formatClockTime, formatToPersianDigits } from '../utils';
import { haptics } from '../utils/haptics';

interface DynamicIslandProps {
    isOnline: boolean;
    cloudStatus: 'disconnected' | 'connected' | 'error';
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({ isOnline, cloudStatus }) => {
    const focus = useOptionalFocus();
    const tick = useOptionalFocusTick();
    const { xp = 0, tasks = [] } = useStore();
    const { isSyncing, syncQueueCount = 0 } = useStoreSyncStatus();
    const prefersReducedMotion = useReducedMotion();

    const [isExpanded, setIsExpanded] = useState(false);
    const [xpDelta, setXpDelta] = useState<number>(0);
    const prevXpRef = useRef<number>(xp);
    const xpTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (xp > prevXpRef.current && prevXpRef.current > 0) {
            const delta = xp - prevXpRef.current;
            setXpDelta(delta);
            if (xpTimerRef.current) window.clearTimeout(xpTimerRef.current);
            xpTimerRef.current = window.setTimeout(() => setXpDelta(0), 2600);
        }
        prevXpRef.current = xp;
    }, [xp]);

    useEffect(() => {
        return () => {
            if (xpTimerRef.current) window.clearTimeout(xpTimerRef.current);
        };
    }, []);

    const status = focus?.status ?? 'idle';
    const isTimerLive = status === 'running' || status === 'paused';
    const hasSyncAlert = !isOnline || isSyncing || syncQueueCount > 0 || cloudStatus === 'error';
    const activeRoomCode = focus?.activeRoomCode ?? null;
    const isVisible = xpDelta > 0 || isTimerLive || hasSyncAlert || Boolean(activeRoomCode);

    if (!isVisible) return null;

    const displaySeconds = tick?.displaySeconds ?? focus?.displaySeconds ?? focus?.elapsedSeconds ?? 0;
    const pinnedTask = focus?.pinnedTaskId ? tasks.find((t) => t.id === focus.pinnedTaskId) : undefined;
    const displayLabel = pinnedTask ? pinnedTask.topic : focus?.selectedSubject || 'جلسه تمرکز';

    return (
        <>
            <motion.button
                type="button"
                onClick={() => {
                    haptics.selection();
                    if (isTimerLive || activeRoomCode || hasSyncAlert) {
                        setIsExpanded((prev) => !prev);
                    }
                }}
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.72, y: -4 }}
                animate={{ opacity: 1, scale: isExpanded ? 0.92 : 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.75, y: -4 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 380, damping: 17, mass: 0.8 }}
                aria-label="جزیره هوشمند وضعیت"
                aria-expanded={isExpanded}
                className="pointer-events-auto h-[42px] px-2.5 rounded-full liquid-glass-nav glass-pill-shadow border border-[var(--glass-nav-border)] flex items-center justify-center gap-1.5 cursor-pointer max-w-[116px] shadow-md"
            >
                {xpDelta > 0 ? (
                    <>
                        <Sparkles size={13} className="text-amber-400 shrink-0" aria-hidden="true" />
                        <span className="text-[11px] font-black text-emerald-500 dark:text-emerald-300 tabular-nums whitespace-nowrap">
                            +{formatToPersianDigits(xpDelta)} XP
                        </span>
                    </>
                ) : isTimerLive ? (
                    <>
                        <span
                            aria-hidden="true"
                            className={`w-2 h-2 rounded-full shrink-0 ${
                                status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                            }`}
                        />
                        <span className="text-xs font-mono font-extrabold tabular-nums text-on-surface dark:text-white" dir="ltr">
                            {formatClockTime(displaySeconds)}
                        </span>
                        {focus?.strictLockActive && (
                            <Lock size={11} className="text-rose-400 shrink-0" aria-hidden="true" />
                        )}
                    </>
                ) : activeRoomCode ? (
                    <>
                        <Users size={13} className="text-primary shrink-0" aria-hidden="true" />
                        <span className="text-[11px] font-bold text-on-surface dark:text-white truncate">
                            اتاق {activeRoomCode}
                        </span>
                    </>
                ) : !isOnline ? (
                    <>
                        <CloudOff size={13} className="text-amber-500 shrink-0" aria-hidden="true" />
                        <span className="text-[11px] font-bold text-amber-500 whitespace-nowrap">آفلاین</span>
                    </>
                ) : (
                    <>
                        <Cloud size={13} className="text-secondary shrink-0" aria-hidden="true" />
                        <span className="text-[11px] font-bold text-on-surface dark:text-white tabular-nums whitespace-nowrap">
                            {isSyncing ? 'همگام‌سازی...' : `${formatToPersianDigits(syncQueueCount)} در صف`}
                        </span>
                    </>
                )}
            </motion.button>

            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={prefersReducedMotion ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                onClick={() => setIsExpanded(false)}
                                className="fixed inset-0 z-[60] bg-slate-950/30 dark:bg-black/45"
                                dir="rtl"
                            >
                                <motion.div
                                    initial={
                                        prefersReducedMotion
                                            ? false
                                            : { opacity: 0, scale: 0.28, y: -8, borderRadius: 48 }
                                    }
                                    animate={{ opacity: 1, scale: 1, y: 0, borderRadius: 26 }}
                                    exit={
                                        prefersReducedMotion
                                            ? { opacity: 0 }
                                            : {
                                                  opacity: 0,
                                                  scale: 0.25,
                                                  y: -8,
                                                  borderRadius: 48,
                                                  transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] },
                                              }
                                    }
                                    transition={{
                                        type: 'spring',
                                        stiffness: 340,
                                        damping: 18,
                                        mass: 0.85,
                                        restDelta: 0.015,
                                        restSpeed: 0.5,
                                    }}
                                    style={{ transformOrigin: 'top right', willChange: 'transform, opacity' }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="fixed top-[max(3.65rem,calc(env(safe-area-inset-top,0px)+3.15rem))] inset-x-4 max-w-[340px] mx-auto rounded-[26px] liquid-glass-nav glass-pill-shadow border border-[var(--glass-nav-border)] shadow-2xl overflow-hidden p-4 space-y-3"
                                >
                                    {isTimerLive ? (
                                        <>
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span
                                                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                                            status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                                                        }`}
                                                    />
                                                    <span className="text-xs font-extrabold text-on-surface dark:text-white truncate">
                                                        {displayLabel}
                                                    </span>
                                                </div>
                                                <span className="text-lg font-mono font-black tabular-nums text-primary dark:text-indigo-300" dir="ltr">
                                                    {formatClockTime(displaySeconds)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {status === 'paused' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            haptics.selection();
                                                            focus?.resumeTimer?.();
                                                        }}
                                                        className="flex-1 min-h-[42px] rounded-2xl bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition"
                                                    >
                                                        <Play size={14} fill="currentColor" />
                                                        ادامه
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            haptics.selection();
                                                            focus?.pauseTimer?.();
                                                        }}
                                                        className="flex-1 min-h-[42px] rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition"
                                                    >
                                                        <Pause size={14} fill="currentColor" />
                                                        توقف
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        haptics.medium();
                                                        setIsExpanded(false);
                                                        focus?.finishSession?.(true, true);
                                                    }}
                                                    className="flex-1 min-h-[42px] rounded-2xl bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition"
                                                >
                                                    <Square size={13} fill="currentColor" />
                                                    ثبت و پایان
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        haptics.selection();
                                                        setIsExpanded(false);
                                                        focus?.expandFromPiP?.();
                                                        focus?.setIsTimerOpen?.(true);
                                                    }}
                                                    aria-label="نمای کامل تایمر"
                                                    className="w-11 h-[42px] rounded-2xl bg-white/15 text-on-surface dark:text-white flex items-center justify-center cursor-pointer active:scale-95 transition"
                                                >
                                                    <Maximize2 size={15} />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-between gap-2 text-xs">
                                            <span className="font-bold text-on-surface dark:text-white">
                                                {activeRoomCode
                                                    ? `متصل به اتاق هم‌مطالعه ${activeRoomCode}`
                                                    : !isOnline
                                                      ? 'حالت آفلاین — تغییرات پس از اتصال همگام می‌شوند'
                                                      : 'همگام‌سازی ابری فعال است'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setIsExpanded(false)}
                                                className="px-2.5 py-1 rounded-xl bg-white/15 font-bold cursor-pointer"
                                            >
                                                بستن
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </>
    );
};
