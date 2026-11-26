import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Maximize2, Square, GripVertical, Lock } from 'lucide-react';
import { useFocus, useFocusTick } from '../../context/FocusContext';
import { useStore } from '../../context/StoreContext';
import { formatClockTime } from '../../utils';
import { useMediaQuery } from '../../hooks/useMediaQuery';

export const FloatingPiPWidget: React.FC = () => {
    const {
        isPiPVisible,
        status,
        pinnedTaskId,
        selectedSubject,
        strictLockActive,
        pauseTimer,
        resumeTimer,
        finishSession,
        expandFromPiP,
    } = useFocus();
    const { displaySeconds } = useFocusTick();
    const { tasks = [] } = useStore();
    const isMobile = useMediaQuery('(max-width: 767px)');
    const viewportBoundsRef = useRef<HTMLDivElement>(null);

    if (!isPiPVisible || (status !== 'running' && status !== 'paused')) return null;

    const pinnedTask = pinnedTaskId ? tasks.find((t) => t.id === pinnedTaskId) : undefined;
    const displayLabel = pinnedTask ? pinnedTask.topic : selectedSubject || 'جلسه تمرکز';

    return (
        <>
            {/* Viewport drag bounds for desktop */}
            <div ref={viewportBoundsRef} aria-hidden="true" className="fixed inset-4 pointer-events-none z-[69]" />

            <AnimatePresence>
                <motion.div
                    role="region"
                    aria-label="نوار شناور تایمر فوکوس"
                    drag={!isMobile}
                    dragConstraints={viewportBoundsRef}
                    dragMomentum={false}
                    dragElastic={0.08}
                    initial={{ opacity: 0, y: 20, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className={
                        isMobile
                            ? 'fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] inset-x-3 max-w-md mx-auto z-[65] rounded-2xl bg-slate-900/95 text-white border border-white/15 shadow-xl backdrop-blur-xl px-3.5 py-2 flex items-center justify-between gap-2.5 select-none'
                            : 'fixed bottom-6 left-6 z-[65] rounded-2xl bg-slate-900/95 text-white border border-white/15 shadow-2xl backdrop-blur-xl px-3.5 py-2 flex items-center gap-3 select-none touch-none'
                    }
                    dir="rtl"
                >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {!isMobile && (
                            <div
                                className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-white p-0.5 shrink-0"
                                title="جابجایی"
                                aria-hidden="true"
                            >
                                <GripVertical size={15} />
                            </div>
                        )}

                        <span
                            aria-hidden="true"
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                status === 'running' ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                        />

                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1">
                                <span className="text-[11px] font-semibold text-indigo-200 truncate max-w-[140px]" title={displayLabel}>
                                    {displayLabel}
                                </span>
                                {strictLockActive && <Lock size={10} className="text-rose-400 shrink-0" aria-label="قفل تمرکز فعال" />}
                            </div>
                            <span className="text-sm font-mono font-extrabold tabular-nums text-white" dir="ltr">
                                {formatClockTime(displaySeconds)}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 border-r border-white/15 pr-2 shrink-0">
                        {status === 'paused' ? (
                            <button
                                type="button"
                                onClick={resumeTimer}
                                aria-label="ادامه تایمر"
                                title="ادامه"
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition active:scale-95"
                            >
                                <Play size={15} fill="currentColor" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={pauseTimer}
                                aria-label="توقف موقت تایمر"
                                title="توقف موقت"
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition active:scale-95"
                            >
                                <Pause size={15} fill="currentColor" />
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => finishSession(false)}
                            aria-label="ثبت و پایان جلسه"
                            title="ثبت و پایان"
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition active:scale-95"
                        >
                            <Square size={14} fill="currentColor" />
                        </button>

                        <button
                            type="button"
                            onClick={expandFromPiP}
                            aria-label="باز کردن نمای کامل تایمر"
                            title="بزرگ‌نمایی"
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition active:scale-95"
                        >
                            <Maximize2 size={15} />
                        </button>
                    </div>
                </motion.div>
            </AnimatePresence>
        </>
    );
};
