import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { X, Play, Pause, Square, Clock, Volume2, VolumeX, Flame, Coffee, Brain, Info, Sliders } from 'lucide-react';

// ==========================================
// Web Audio API Ambient Sound Engine
// ==========================================
class FocusAudioEngine {
    private ctx: AudioContext | null = null;
    private sourceNode: AudioBufferSourceNode | null = null;
    private gainNode: GainNode | null = null;
    private lfoNode: OscillatorNode | null = null;

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    stop() {
        if (this.sourceNode) {
            try { this.sourceNode.stop(); } catch (e) {}
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
        if (this.lfoNode) {
            try { this.lfoNode.stop(); } catch (e) {}
            this.lfoNode.disconnect();
            this.lfoNode = null;
        }
        if (this.gainNode) {
            this.gainNode.disconnect();
            this.gainNode = null;
        }
    }

    setVolume(value: number) {
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(value, this.ctx?.currentTime || 0);
        }
    }

    playNoise(type: 'white' | 'brown' | 'pink' | 'ocean', volume: number) {
        this.stop();
        this.init();
        if (!this.ctx) return;

        const sampleRate = this.ctx.sampleRate;
        const bufferSize = 2 * sampleRate;
        const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);

        if (type === 'white') {
            // Pure random values
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
        } else if (type === 'pink') {
            // Paul Kellet's refined method
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                data[i] *= 0.11; // compensate volume
                b6 = white * 0.115926;
            }
        } else if (type === 'brown' || type === 'ocean') {
            // Integrating white noise for deeper brownian sound
            let lastOut = 0.0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                data[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = data[i];
                data[i] *= 3.5; // compensate volume loss
            }
        }

        this.sourceNode = this.ctx.createBufferSource();
        this.sourceNode.buffer = buffer;
        this.sourceNode.loop = true;

        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);

        if (type === 'ocean') {
            // Modulate brown noise using a slow LFO to simulate rolling waves
            const waveGain = this.ctx.createGain();
            waveGain.gain.setValueAtTime(0.4, this.ctx.currentTime); // Base gain

            this.lfoNode = this.ctx.createOscillator();
            this.lfoNode.type = 'sine';
            this.lfoNode.frequency.setValueAtTime(0.08, this.ctx.currentTime); // Slow sweep (~12s)

            const lfoGain = this.ctx.createGain();
            lfoGain.gain.setValueAtTime(0.3, this.ctx.currentTime); // Range of modulation

            this.lfoNode.connect(lfoGain);
            lfoGain.connect(waveGain.gain);

            this.sourceNode.connect(waveGain);
            waveGain.connect(this.gainNode);
            this.gainNode.connect(this.ctx.destination);

            this.lfoNode.start();
        } else {
            this.sourceNode.connect(this.gainNode);
            this.gainNode.connect(this.ctx.destination);
        }

        this.sourceNode.start();
    }

    playBeep() {
        this.init();
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5 note
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.6);
    }
}

const FocusTimer = () => {
    const { isTimerOpen, setIsTimerOpen, showToast } = useStore();
    
    // Core Timer States
    const [timerMode, setTimerMode] = useState<'normal' | 'pomodoro'>('normal');
    const [pomoSession, setPomoSession] = useState<'study' | 'break'>('study');
    const [seconds, setSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [accumulatedTime, setAccumulatedTime] = useState(0);

    // Audio states
    const [activeSound, setActiveSound] = useState<'none' | 'white' | 'brown' | 'pink' | 'ocean'>('none');
    const [volume, setVolume] = useState(50); // 0-100%

    // Audio Engine Ref
    const audioEngineRef = useRef<FocusAudioEngine | null>(null);

    // Initialize Audio Engine
    useEffect(() => {
        audioEngineRef.current = new FocusAudioEngine();
        return () => {
            audioEngineRef.current?.stop();
        };
    }, []);

    // Sync sound engine to states
    useEffect(() => {
        if (activeSound === 'none') {
            audioEngineRef.current?.stop();
        } else {
            audioEngineRef.current?.playNoise(activeSound, volume / 100);
        }
    }, [activeSound]);

    // Handle Volume changes dynamically
    useEffect(() => {
        audioEngineRef.current?.setVolume(volume / 100);
    }, [volume]);

    // Timer Mode Initializations
    useEffect(() => {
        if (timerMode === 'pomodoro') {
            setSeconds(pomoSession === 'study' ? 1500 : 300); // 25 min or 5 min
        } else {
            setSeconds(0);
        }
        setIsRunning(false);
        setStartTime(null);
        setAccumulatedTime(0);
    }, [timerMode, pomoSession]);

    // Timer tick interval
    useEffect(() => {
        let interval: any;
        if (isRunning && startTime) {
            interval = setInterval(() => {
                const now = Date.now();
                const diff = Math.floor((now - startTime) / 1000);
                
                if (timerMode === 'normal') {
                    setSeconds(accumulatedTime + diff);
                } else {
                    const nextSecs = (pomoSession === 'study' ? 1500 : 300) - (accumulatedTime + diff);
                    if (nextSecs <= 0) {
                        // Finished pomo period!
                        handlePomoFinished();
                    } else {
                        setSeconds(nextSecs);
                    }
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning, startTime, accumulatedTime, timerMode, pomoSession]);

    if (!isTimerOpen) return null;

    const handlePomoFinished = () => {
        setIsRunning(false);
        setStartTime(null);
        setAccumulatedTime(0);
        
        audioEngineRef.current?.playBeep();
        setTimeout(() => audioEngineRef.current?.playBeep(), 300);

        if (pomoSession === 'study') {
            showToast?.('زمان مطالعه پومودورو تمام شد! وقت ۵ دقیقه استراحت است. ☕', 'success');
            setPomoSession('break');
        } else {
            showToast?.('استراحت تمام شد! آماده پارت بعدی مطالعه پومودورو شو. 🔥', 'success');
            setPomoSession('study');
        }
    };

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleStart = () => {
        audioEngineRef.current?.init(); // Unlock web audio context
        setStartTime(Date.now());
        setIsRunning(true);
    };

    const handlePause = () => {
        setIsRunning(false);
        const elapsed = seconds;
        if (timerMode === 'normal') {
            setAccumulatedTime(elapsed);
        } else {
            const initial = pomoSession === 'study' ? 1500 : 300;
            setAccumulatedTime(initial - elapsed);
        }
        setStartTime(null);
    };

    const handleStop = () => {
        setIsRunning(false);
        audioEngineRef.current?.stop();
        setActiveSound('none');

        if (timerMode === 'normal') {
            if (seconds > 60) {
                showToast?.(`خسته نباشید! شما ${Math.floor(seconds / 60)} دقیقه مطالعه کردید.`, 'success');
            }
        } else {
            const initial = pomoSession === 'study' ? 1500 : 300;
            const elapsed = initial - seconds;
            if (elapsed > 60) {
                showToast?.(`خسته نباشید! پارت تمرکز شما با موفقیت ثبت شد.`, 'success');
            }
        }

        setSeconds(timerMode === 'pomodoro' ? (pomoSession === 'study' ? 1500 : 300) : 0);
        setAccumulatedTime(0);
        setStartTime(null);
        setIsTimerOpen(false);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/95 dark:bg-gray-950/98 backdrop-blur-xl animate-in fade-in duration-300 select-none text-right" dir="rtl">
            
            {/* Close Button */}
            <button
                onClick={() => {
                    audioEngineRef.current?.stop();
                    setIsTimerOpen(false);
                }}
                className="absolute top-6 right-6 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition duration-200 cursor-pointer"
            >
                <X size={24} />
            </button>

            <div className="flex flex-col md:flex-row items-center gap-12 w-full max-w-4xl px-6 md:px-12 py-8 overflow-y-auto max-h-full">
                
                {/* =======================================
                    LEFT COLUMN: TIMER DISPLAY
                   ======================================= */}
                <div className="flex flex-col items-center gap-6 flex-1">
                    {/* Mode Selector */}
                    <div className="flex bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60 shadow-lg">
                        <button
                            onClick={() => setTimerMode('normal')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition duration-200 ${timerMode === 'normal' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            تایمر آزاد (صعودی)
                        </button>
                        <button
                            onClick={() => setTimerMode('pomodoro')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition duration-200 ${timerMode === 'pomodoro' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            تکنیک پومودورو
                        </button>
                    </div>

                    {/* Pomo Status details */}
                    {timerMode === 'pomodoro' && (
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/40 border border-slate-700/30 text-xs font-extrabold text-indigo-400 animate-pulse">
                            {pomoSession === 'study' ? (
                                <>
                                    <Brain size={14} className="text-rose-500 fill-rose-500/20" />
                                    <span>زمان تمرکز و مطالعه (۲۵ دقیقه)</span>
                                </>
                            ) : (
                                <>
                                    <Coffee size={14} className="text-emerald-400" />
                                    <span>زمان استراحت (۵ دقیقه)</span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Circular Timer Visualizer */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-indigo-500 blur-[80px] opacity-15 rounded-full animate-pulse"></div>
                        <div className="relative w-64 h-64 md:w-72 md:h-72 rounded-full border-[10px] border-slate-800/80 flex items-center justify-center bg-slate-900/90 shadow-2xl transition duration-300 border-indigo-500/20 group-hover:border-indigo-500/30">
                            <div className="text-center">
                                <Clock size={32} className="mx-auto text-indigo-400/70 mb-2 animate-float" />
                                <span className="text-6xl font-black text-white tracking-wider font-mono">
                                    {formatTime(seconds)}
                                </span>
                                <p className="text-indigo-300 mt-2.5 text-xs font-semibold tracking-wide uppercase">
                                    {timerMode === 'pomodoro' ? (pomoSession === 'study' ? 'مطالعه فعال' : 'استراحت کوتاه') : 'تمرکز فعال'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center gap-6">
                        {!isRunning ? (
                            <button
                                onClick={handleStart}
                                className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                            >
                                <Play size={26} fill="currentColor" className="ml-1" />
                            </button>
                        ) : (
                            <button
                                onClick={handlePause}
                                className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                            >
                                <Pause size={26} fill="currentColor" />
                            </button>
                        )}

                        <button
                            onClick={handleStop}
                            className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                            title="پایان جلسه و ثبت زمان"
                        >
                            <Square size={16} fill="currentColor" />
                        </button>
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden md:block w-px h-80 bg-slate-800" />

                {/* =======================================
                    RIGHT COLUMN: AMBIENT SOUNDS & SYSTEM
                   ======================================= */}
                <div className="flex flex-col gap-6 flex-1 w-full max-w-sm">
                    <div>
                        <h3 className="text-base font-extrabold text-white flex items-center gap-2 mb-1">
                            <Volume2 className="text-indigo-400" size={18} />
                            صداهای محیطی (Ambient Noise)
                        </h3>
                        <p className="text-[11px] text-gray-400 font-medium">سنتزکننده صوتی ذهن برای افزایش تمرکز، ضد حواس‌پرتی</p>
                    </div>

                    {/* Sound Selector Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { id: 'none', label: 'بی‌صدا', desc: 'سکوت کامل', icon: VolumeX, color: 'text-gray-400' },
                            { id: 'white', label: 'نویز سفید', desc: 'تمرکز سنتی', icon: Brain, color: 'text-sky-400' },
                            { id: 'brown', label: 'نویز قهوه‌ای', desc: 'صدای عمیق آبشار', icon: Flame, color: 'text-amber-500' },
                            { id: 'pink', label: 'نویز صورتی', desc: 'خش‌خش ملایم باد', icon: Info, color: 'text-pink-400' },
                            { id: 'ocean', label: 'امواج اقیانوس', desc: 'ریلکس و آرامش‌بخش', icon: Sliders, color: 'text-teal-400' }
                        ].map((sound) => {
                            const Icon = sound.icon;
                            const isSelected = activeSound === sound.id;
                            return (
                                <button
                                    key={sound.id}
                                    onClick={() => {
                                        audioEngineRef.current?.init();
                                        setActiveSound(sound.id as any);
                                    }}
                                    className={`flex flex-col items-start p-3 rounded-2xl border text-right transition duration-200 cursor-pointer ${isSelected
                                        ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/10'
                                        : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70'}`}
                                >
                                    <div className="flex items-center gap-2 mb-1 w-full justify-between">
                                        <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-200'}`}>{sound.label}</span>
                                        <Icon size={14} className={`${isSelected ? 'text-indigo-400' : sound.color}`} />
                                    </div>
                                    <span className="text-[9px] text-gray-400 truncate w-full">{sound.desc}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Volume Slider */}
                    {activeSound !== 'none' && (
                        <div className="bg-slate-800/30 border border-slate-700/35 p-3.5 rounded-2xl space-y-2 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between text-xs text-gray-300 font-bold">
                                <span>حجم صدا</span>
                                <span className="font-mono text-indigo-400">{volume}%</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <VolumeX size={15} className="text-gray-400" />
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={volume}
                                    onChange={(e) => setVolume(Number(e.target.value))}
                                    className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                                <Volume2 size={15} className="text-indigo-400" />
                            </div>
                        </div>
                    )}

                    {/* Motivational Tip Card */}
                    <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900/60 border border-slate-800 p-4 rounded-3xl">
                        <p className="text-[10px] text-indigo-400 font-extrabold mb-1 tracking-wider">یک پیشنهاد علمی</p>
                        <p className="text-xs text-gray-300 leading-loose">
                            بر اساس تحقیقات دانشگاهی، استفاده از **نویز قهوه‌ای و صدای طبیعت** به همگام‌سازی امواج آلفای مغز کمک کرده و باعث کاهش چشمگیر حواس‌پرتی در طول ساعات طولانی مطالعه می‌شود.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FocusTimer;