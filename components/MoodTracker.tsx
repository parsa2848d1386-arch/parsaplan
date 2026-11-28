import React, { useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { MoodType } from '../types';
import { Sparkles, Zap, Smile, BatteryLow, Frown, type LucideIcon } from 'lucide-react';
import { getLogicalDateKey } from '../utils/streakEngine';

const MoodTracker = () => {
    const { moods, setMood, settings } = useStore();
    const cutoffHour = settings?.dayCutoffHour ?? 5;
    const today = useMemo(() => getLogicalDateKey(new Date(), cutoffHour), [cutoffHour]);
    const currentMood = moods?.[today];

    const moodOptions: { type: MoodType; icon: LucideIcon; label: string; color: string }[] = [
        { type: 'excellent', icon: Sparkles, label: 'عالی', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700' },
        { type: 'high-energy', icon: Zap, label: 'پرانرژی', color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-700' },
        { type: 'normal', icon: Smile, label: 'معمولی', color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700' },
        { type: 'tired', icon: BatteryLow, label: 'خسته', color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700' },
        { type: 'exhausted', icon: Frown, label: 'فرسوده', color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700' },
    ];

    const matchedLabel = moodOptions.find((m) => m.type === currentMood)?.label
        || (currentMood === 'happy' ? 'خوشحال'
            : currentMood === 'energetic' ? 'پرانرژی'
            : currentMood === 'neutral' ? 'معمولی'
            : currentMood === 'sad' ? 'ناراحت'
            : currentMood);

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-xs text-[var(--text-secondary)] mb-3">مود امروزت چطوره؟</h3>
            <div className="flex justify-between gap-2">
                {moodOptions.map((opt) => (
                    <button
                        key={opt.type}
                        type="button"
                        onClick={() => setMood(today, opt.type)}
                        aria-label={opt.label}
                        title={opt.label}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                            currentMood === opt.type
                                ? `${opt.color} ring-2 ring-offset-1 dark:ring-offset-gray-900`
                                : 'bg-transparent border-transparent opacity-60 hover:opacity-100 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-400'
                        }`}
                    >
                        <opt.icon size={24} className={currentMood === opt.type ? '' : 'text-[var(--text-tertiary)]'} />
                    </button>
                ))}
            </div>
            {currentMood && (
                <p className="text-center text-xs mt-2 font-bold text-gray-600 dark:text-gray-300">
                    امروز: {matchedLabel}
                </p>
            )}
        </div>
    );
};

export default MoodTracker;
