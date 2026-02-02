
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Search, Home, CalendarClock, BookOpen, BarChart2, Settings, Moon, Sun, Timer, Plus, ArrowRight } from 'lucide-react';

const CommandPalette = () => {
    const { 
        isCommandPaletteOpen, setIsCommandPaletteOpen, 
        toggleDarkMode, darkMode, 
        setIsTimerOpen, syncData 
    } = useStore();
    
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isCommandPaletteOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setQuery('');
        }
    }, [isCommandPaletteOpen]);

    if (!isCommandPaletteOpen) return null;

    const close = () => setIsCommandPaletteOpen(false);

    const actions = [
        { id: 'home', label: 'داشبورد', icon: Home, action: () => { navigate('/'); close(); } },
        { id: 'routine', label: 'برنامه روتین', icon: CalendarClock, action: () => { navigate('/routine'); close(); } },
        { id: 'subjects', label: 'دروس و بودجه‌بندی', icon: BookOpen, action: () => { navigate('/subjects'); close(); } },
        { id: 'analysis', label: 'تحلیل عملکرد', icon: BarChart2, action: () => { navigate('/analysis'); close(); } },
        { id: 'settings', label: 'تنظیمات', icon: Settings, action: () => { navigate('/settings'); close(); } },
        { id: 'timer', label: 'شروع تایمر تمرکز', icon: Timer, action: () => { close(); setIsTimerOpen(true); } },
        { id: 'theme', label: darkMode ? 'حالت روز' : 'حالت شب', icon: darkMode ? Sun : Moon, action: () => { toggleDarkMode(); close(); } },
        { id: 'sync', label: 'همگام‌سازی ابری', icon: ArrowRight, action: () => { close(); syncData(); } },
    ];

    const filteredActions = actions.filter(a => a.label.includes(query));

    return (
        <div 
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-20 p-4 animate-in fade-in duration-200"
            onClick={close}
        >
            <div 
                className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
                    <Search size={20} className="text-gray-400" />
                    <input 
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="جستجو فرمان..."
                        className="flex-1 bg-transparent outline-none text-gray-800 dark:text-gray-200 text-lg placeholder:text-gray-400"
                    />
                    <div className="flex gap-1">
                        <kbd className="hidden md:inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-500 font-mono">ESC</kbd>
                    </div>
                </div>

                <div className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
                    {filteredActions.length > 0 ? (
                        filteredActions.map((action, idx) => (
                            <button
                                key={action.id}
                                onClick={action.action}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition text-right group ${idx === 0 ? 'bg-gray-50 dark:bg-gray-700/50' : ''}`}
                            >
                                <div className="p-2 bg-white dark:bg-gray-600 rounded-lg border border-gray-100 dark:border-gray-500 text-gray-500 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:border-indigo-100 transition">
                                    <action.icon size={18} />
                                </div>
                                <span className="font-medium text-gray-700 dark:text-gray-200">{action.label}</span>
                            </button>
                        ))
                    ) : (
                        <p className="text-center text-gray-400 py-8 text-sm">نتیجه‌ای یافت نشد.</p>
                    )}
                </div>
                
                <div className="p-2 bg-gray-50 dark:bg-gray-800/50 text-[10px] text-gray-400 text-center border-t border-gray-100 dark:border-gray-700">
                    برای انتخاب کلیک کنید یا اینتر بزنید
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
