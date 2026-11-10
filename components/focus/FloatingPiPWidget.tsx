import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Maximize2, Square, GripVertical, Lock } from 'lucide-react';
import { useFocus } from '../../context/FocusContext';
import { formatClockTime } from '../../utils';

export const FloatingPiPWidget: React.FC = () => {
    const {
        isPiPVisible,
        status,
        displaySeconds,
        pinnedTaskId,
        selectedSubject,
        strictLockActive,
        pauseTimer,
        resumeTimer,
        finishSession,
        expandFromPiP,
    } = useFocus();

    // Only grab task title cleanly via DOM/store when needed — import useStore safely
    if (!isPiPVisible || (status !== 'running' && status !== 'paused')) return null;

    return (
        <AnimatePresence>
            <motion.div
                drag
                dragMomentum={false}
                dragElastic={0.08}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[70] rounded-2xl bg-slate-900/95 text-white border border-indigo-500/40 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl px-3 py-2 flex items-center gap-2.5 select-none touch-none"
                dir="rtl"
            >
                <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-white p-0.5" title="جابجایی">
                    <GripVertical size={15} />
                </div>

                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />

                <div className="flex flex-col min-w-[76px]">
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-indigo-300 truncate max-w-[100px]">
                            {pinnedTaskId ? selectedSubject : selectedSubject || 'تمرکز'}
                        </span>
                        {strictLockActive && <Lock size={9} className="text-rose-400 shrink-0" />}
                    </div>
                    <span className="text-sm font-mono font-black tabular-nums tracking-tight text-white">
                        {formatClockTime(displaySeconds)}
                    </span>
                </div>

                <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-0.5">
                    {status === 'paused' ? (
                        <button
                            onClick={resumeTimer}
                            className="p-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition active:scale-95"
                            title="ادامه"
                        >
                            <Play size={13} fill="currentColor" />
                        </button>
                    ) : (
                        <button
                            onClick={pauseTimer}
                            className="p-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition active:scale-95"
                            title="توقف موقت"
                        >
                            <Pause size={13} fill="currentColor" />
                        </button>
                    )}

                    <button
                        onClick={() => finishSession(false)}
                        className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition active:scale-95"
                        title="ثبت و پایان"
                    >
                        <Square size={12} fill="currentColor" />
                    </button>

                    <button
                        onClick={expandFromPiP}
                        className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 transition active:scale-95"
                        title="بزرگ‌نمایی"
                    >
                        <Maximize2 size={13} />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
