
import React from 'react';
import { useStore } from '../context/StoreContext';
import { MoodType } from '../types';
import { Smile, Meh, Frown, Zap, BatteryLow } from 'lucide-react';
import { toIsoString } from '../utils';

const MoodTracker = () => {
    const { moods, setMood } = useStore();
    const today = toIsoString(new Date());
    const currentMood = moods[today];

    const moodOptions: { type: MoodType, icon: any, label: string, color: string }[] = [
        { type: 'energetic', icon: Zap, label: 'پرانرژی', color: 'text-amber-500 bg-amber-50 border-amber-200' },
        { type: 'happy', icon: Smile, label: 'خوشحال', color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
        { type: 'neutral', icon: Meh, label: 'معمولی', color: 'text-gray-500 bg-gray-50 border-gray-200' },
        { type: 'tired', icon: BatteryLow, label: 'خسته', color: 'text-orange-500 bg-orange-50 border-orange-200' },
        { type: 'sad', icon: Frown, label: 'ناراحت', color: 'text-rose-500 bg-rose-50 border-rose-200' },
    ];

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-xs text-gray-500 dark:text-gray-400 mb-3">مود امروزت چطوره؟</h3>
            <div className="flex justify-between gap-2">
                {moodOptions.map((opt) => (
                    <button
                        key={opt.type}
                        onClick={() => setMood(today, opt.type)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                            currentMood === opt.type 
                                ? `${opt.color} ring-2 ring-offset-1 dark:ring-offset-gray-900` 
                                : 'bg-transparent border-transparent opacity-50 hover:opacity-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        <opt.icon size={24} className={currentMood === opt.type ? '' : 'text-gray-400 dark:text-gray-500'} />
                    </button>
                ))}
            </div>
            {currentMood && (
                <p className="text-center text-xs mt-2 font-bold text-gray-600 dark:text-gray-300 animate-in fade-in">
                    امروز: {moodOptions.find(m => m.type === currentMood)?.label}
                </p>
            )}
        </div>
    );
};

export default MoodTracker;
