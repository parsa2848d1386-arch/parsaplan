import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { X, Play, Pause, Square, Clock } from 'lucide-react';

const FocusTimer = () => {
    const { isTimerOpen, setIsTimerOpen } = useStore();
    const [seconds, setSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        let interval: any;
        if (isRunning) {
            interval = setInterval(() => {
                setSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning]);

    if (!isTimerOpen) return null;

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleStop = () => {
        setIsRunning(false);
        if (seconds > 60) {
            alert(`آفرین! شما ${Math.floor(seconds / 60)} دقیقه مطالعه کردید. فراموش نکنید که آن را در تسک مربوطه ثبت کنید.`);
        }
        setSeconds(0);
        setIsTimerOpen(false);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="flex flex-col items-center gap-8 w-full max-w-sm px-6">
                
                {/* Timer Display */}
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
                    <div className="relative w-64 h-64 rounded-full border-8 border-indigo-500/30 flex items-center justify-center bg-gray-800 shadow-2xl">
                        <div className="text-center">
                            <Clock size={32} className="mx-auto text-indigo-400 mb-2 opacity-80" />
                            <span className="text-6xl font-black text-white tracking-wider font-mono">
                                {formatTime(seconds)}
                            </span>
                            <p className="text-indigo-300 mt-2 text-sm font-medium">زمان تمرکز</p>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-6">
                    {!isRunning ? (
                        <button 
                            onClick={() => setIsRunning(true)}
                            className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 hover:scale-110 transition-all active:scale-95"
                        >
                            <Play size={32} fill="currentColor" className="ml-1" />
                        </button>
                    ) : (
                        <button 
                            onClick={() => setIsRunning(false)}
                            className="w-20 h-20 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/40 hover:scale-110 transition-all active:scale-95"
                        >
                            <Pause size={32} fill="currentColor" />
                        </button>
                    )}
                    
                    <button 
                        onClick={handleStop}
                        className="w-14 h-14 rounded-full bg-gray-700 text-rose-400 border border-gray-600 flex items-center justify-center hover:bg-gray-600 transition-all active:scale-95"
                    >
                        <Square size={20} fill="currentColor" />
                    </button>
                </div>

                <button 
                    onClick={() => setIsTimerOpen(false)}
                    className="absolute top-6 right-6 text-gray-400 hover:text-white transition"
                >
                    <X size={24} />
                </button>

                <p className="text-gray-400 text-xs text-center">
                    گوشی رو بذار کنار و روی هدفت تمرکز کن. <br/>
                    تو داری آینده‌ت رو می‌سازی! 💪
                </p>
            </div>
        </div>
    );
};

export default FocusTimer;