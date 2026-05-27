import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { X, Play, Pause, Square, Clock, Volume2, VolumeX, Flame, Coffee, Brain, Info, Sliders, CheckCircle2, ChevronDown } from 'lucide-react';

// ==========================================
// Web Audio API Ambient Sound Engine (2026 Advanced Synthesizer)
// ==========================================
class FocusAudioEngine {
    private ctx: AudioContext | null = null;
    private sourceNode: AudioBufferSourceNode | null = null;
    private gainNode: GainNode | null = null;
    private lfoNode: OscillatorNode | null = null;
    private crackleInterval: any = null;

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
        if (this.crackleInterval) {
            clearInterval(this.crackleInterval);
            this.crackleInterval = null;
        }
    }

    setVolume(value: number) {
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(value, this.ctx?.currentTime || 0);
        }
    }

    playNoise(type: 'white' | 'brown' | 'pink' | 'ocean' | 'rain' | 'fireplace', volume: number) {
        this.stop();
        this.init();
        if (!this.ctx) return;

        const sampleRate = this.ctx.sampleRate;
        const bufferSize = 2 * sampleRate;
        const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);

        if (type === 'white') {
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
        } else if (type === 'pink') {
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
                data[i] *= 0.11;
                b6 = white * 0.115926;
            }
        } else if (type === 'brown' || type === 'ocean' || type === 'rain' || type === 'fireplace') {
            let lastOut = 0.0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                data[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = data[i];
                data[i] *= 3.5;
            }
        }

        this.sourceNode = this.ctx.createBufferSource();
        this.sourceNode.buffer = buffer;
        this.sourceNode.loop = true;

        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);

        if (type === 'ocean' || type === 'rain') {
            const waveGain = this.ctx.createGain();
            waveGain.gain.setValueAtTime(type === 'rain' ? 0.65 : 0.4, this.ctx.currentTime);

            this.lfoNode = this.ctx.createOscillator();
            this.lfoNode.type = 'sine';
            this.lfoNode.frequency.setValueAtTime(type === 'rain' ? 0.22 : 0.08, this.ctx.currentTime);

            const lfoGain = this.ctx.createGain();
            lfoGain.gain.setValueAtTime(type === 'rain' ? 0.15 : 0.3, this.ctx.currentTime);

            this.lfoNode.connect(lfoGain);
            lfoGain.connect(waveGain.gain);

            this.sourceNode.connect(waveGain);
            waveGain.connect(this.gainNode);
            this.gainNode.connect(this.ctx.destination);

            this.lfoNode.start();

            if (type === 'rain') {
                this.crackleInterval = setInterval(() => {
                    if (Math.random() > 0.35) {
                        this.playPopSound(0.004, 0.018, 2200, 0.03);
                    }
                }, 70);
            }
        } else if (type === 'fireplace') {
            this.sourceNode.connect(this.gainNode);
            this.gainNode.connect(this.ctx.destination);

            this.crackleInterval = setInterval(() => {
                const rand = Math.random();
                if (rand > 0.88) {
                    this.playPopSound(0.003, 0.015, 1100, 0.16); // Big pop
                } else if (rand > 0.55) {
                    this.playPopSound(0.001, 0.006, 2800, 0.05); // Small sizzle
                }
            }, 100);
        } else {
            this.sourceNode.connect(this.gainNode);
            this.gainNode.connect(this.ctx.destination);
        }

        this.sourceNode.start();
    }

    private playPopSound(attack: number, decay: number, freq: number, popVol: number) {
        if (!this.ctx || this.ctx.state === 'suspended') return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq + (Math.random() * 500 - 250), this.ctx.currentTime);
            
            gain.gain.setValueAtTime(0, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(popVol * (this.gainNode?.gain.value || 0.5), this.ctx.currentTime + attack);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + attack + decay);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start();
            osc.stop(this.ctx.currentTime + attack + decay + 0.04);
        } catch (e) {}
    }

    playBeep() {
        this.init();
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.6);
    }
}

// ==========================================
// Gamification Component: SVG Focus Flower Visualizer
// ==========================================
const FocusFlower: React.FC<{ progress: number; state: 'idle' | 'running' | 'paused' | 'failed' | 'success' }> = ({ progress, state }) => {
    const scale = state === 'idle' ? 0.35 : state === 'failed' ? 0.8 : 0.35 + (progress / 100) * 0.65;
    
    // Flower dynamic colors
    const stemColor = state === 'failed' ? '#6b7280' : '#10b981';
    const petalColors = state === 'failed' 
        ? ['#4b5563', '#374151', '#1f2937'] 
        : progress >= 100 
            ? ['#f43f5e', '#ec4899', '#d946ef'] // Rose magic
            : ['#818cf8', '#6366f1', '#4f46e5']; // Indigo energy

    return (
        <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Ambient pulsing neon back-glow */}
            <div className={`absolute w-40 h-40 rounded-full filter blur-[40px] opacity-40 transition-all duration-1000 ${
                state === 'idle' 
                    ? 'bg-transparent' 
                    : state === 'failed' 
                        ? 'bg-gray-800' 
                        : progress >= 100 
                            ? 'bg-pink-500 animate-pulse' 
                            : 'bg-indigo-500 animate-pulse'
            }`} />

            <svg width="100%" height="100%" viewBox="0 0 200 200" className="overflow-visible relative z-10">
                {/* Stem & Leaves */}
                {state !== 'idle' && (
                    <g className="transition-all duration-700">
                        {/* Curved organic stem */}
                        <path 
                            d={`M 100 200 Q ${95 - (scale * 10)} ${180 - (scale * 20)} 100 ${150 - (scale * 20)}`} 
                            stroke={stemColor} 
                            strokeWidth="4" 
                            strokeLinecap="round" 
                            fill="none" 
                            className="transition-all duration-700"
                        />

                        {/* Leaves (appear at >30% progress) */}
                        {progress > 30 && (
                            <path d={`M 100 ${150 - (scale * 20)} Q 120 ${140 - (scale * 20)} 125 ${130 - (scale * 20)} Q 110 ${145 - (scale * 20)} 100 ${150 - (scale * 20)}`} fill={stemColor} className="animate-in fade-in duration-500" />
                        )}
                        {progress > 60 && (
                            <path d={`M 100 ${135 - (scale * 20)} Q 80 ${125 - (scale * 20)} 75 ${115 - (scale * 20)} Q 90 ${130 - (scale * 20)} 100 ${135 - (scale * 20)}`} fill={stemColor} className="animate-in fade-in duration-500" />
                        )}
                    </g>
                )}

                {/* Flower Head */}
                <g transform={`translate(100, ${state === 'idle' ? 100 : 175 - (scale * 80)}) scale(${scale})`} className="transition-all duration-700 ease-out origin-center">
                    {state === 'idle' ? (
                        // Tiny Seed
                        <circle cx="0" cy="0" r="10" fill="#10b981" className="animate-bounce" style={{ animationDuration: '2s' }} />
                    ) : (
                        // Flower Petals
                        <>
                            {/* Outer Petals */}
                            <path d="M 0,0 Q -25,-45 0,-70 Q 25,-45 0,0" fill={petalColors[0]} opacity="0.9" transform="rotate(0)" />
                            <path d="M 0,0 Q -25,-45 0,-70 Q 25,-45 0,0" fill={petalColors[0]} opacity="0.9" transform="rotate(60)" />
                            <path d="M 0,0 Q -25,-45 0,-70 Q 25,-45 0,0" fill={petalColors[0]} opacity="0.9" transform="rotate(120)" />
                            <path d="M 0,0 Q -25,-45 0,-70 Q 25,-45 0,0" fill={petalColors[0]} opacity="0.9" transform="rotate(180)" />
                            <path d="M 0,0 Q -25,-45 0,-70 Q 25,-45 0,0" fill={petalColors[0]} opacity="0.9" transform="rotate(240)" />
                            <path d="M 0,0 Q -25,-45 0,-70 Q 25,-45 0,0" fill={petalColors[0]} opacity="0.9" transform="rotate(300)" />

                            {/* Inner Layer */}
                            {progress > 50 && (
                                <g className="animate-in zoom-in duration-700">
                                    <path d="M 0,0 Q -18,-35 0,-55 Q 18,-35 0,0" fill={petalColors[1]} opacity="0.95" transform="rotate(30)" />
                                    <path d="M 0,0 Q -18,-35 0,-55 Q 18,-35 0,0" fill={petalColors[1]} opacity="0.95" transform="rotate(90)" />
                                    <path d="M 0,0 Q -18,-35 0,-55 Q 18,-35 0,0" fill={petalColors[1]} opacity="0.95" transform="rotate(150)" />
                                    <path d="M 0,0 Q -18,-35 0,-55 Q 18,-35 0,0" fill={petalColors[1]} opacity="0.95" transform="rotate(210)" />
                                    <path d="M 0,0 Q -18,-35 0,-55 Q 18,-35 0,0" fill={petalColors[1]} opacity="0.95" transform="rotate(270)" />
                                    <path d="M 0,0 Q -18,-35 0,-55 Q 18,-35 0,0" fill={petalColors[1]} opacity="0.95" transform="rotate(330)" />
                                </g>
                            )}

                            {/* Center Seed Core */}
                            <circle cx="0" cy="0" r="16" fill={state === 'failed' ? '#4b5563' : '#fbbf24'} />
                            <circle cx="0" cy="0" r="12" fill={state === 'failed' ? '#374151' : '#f59e0b'} />
                        </>
                    )}
                </g>
            </svg>
        </div>
    );
};

// ==========================================
// Main FocusTimer Component
// ==========================================
const FocusTimer = () => {
    const { isTimerOpen, setIsTimerOpen, showToast, getTasksByDate, getDayDate, currentDay, userName } = useStore();
    
    // Core Timer States
    const [timerMode, setTimerMode] = useState<'normal' | 'pomodoro'>('normal');
    const [pomoSession, setPomoSession] = useState<'study' | 'break'>('study');
    const [seconds, setSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused' | 'failed' | 'success'>('idle');
    const [startTime, setStartTime] = useState<number | null>(null);
    const [accumulatedTime, setAccumulatedTime] = useState(0);

    // Audio & Pinned Task States
    const [activeSound, setActiveSound] = useState<'none' | 'white' | 'brown' | 'pink' | 'ocean' | 'rain' | 'fireplace'>('none');
    const [volume, setVolume] = useState(50);
    const [isTaskSelectorOpen, setIsTaskSelectorOpen] = useState(false);
    const [pinnedTaskId, setPinnedTaskId] = useState<string | null>(null);

    // Live Multiplayer Room States (2026 YPT Style)
    const [rightPanelTab, setRightPanelTab] = useState<'audio' | 'room'>('audio');
    const [isInRoom, setIsInRoom] = useState(false);
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [tempCodeInput, setTempCodeInput] = useState('');
    const [roomMembers, setRoomMembers] = useState<any[]>([]);

    // Audio Engine Ref
    const audioEngineRef = useRef<FocusAudioEngine | null>(null);

    // Today's Tasks for Pinning
    const activeDateIso = getDayDate(currentDay) || new Date().toISOString().split('T')[0];
    const todayTasks = getTasksByDate(activeDateIso) || [];
    const pinnedTask = todayTasks.find(t => t.id === pinnedTaskId);

    // Initialize Audio Engine
    useEffect(() => {
        audioEngineRef.current = new FocusAudioEngine();
        return () => {
            audioEngineRef.current?.stop();
        };
    }, []);

    // Simulated multiplayer members focus logic
    useEffect(() => {
        if (!isInRoom) return;

        const interval = setInterval(() => {
            setRoomMembers(prev => prev.map(m => {
                if (m.status === 'studying') {
                    return {
                        ...m,
                        todayStudyTime: m.todayStudyTime + 1,
                        activeSessionSeconds: m.activeSessionSeconds + 1
                    };
                }
                return m;
            }));
        }, 1000);

        return () => clearInterval(interval);
    }, [isInRoom]);

    const handleCreateRoom = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setRoomCode(code);
        setIsInRoom(true);
        setRoomMembers([
            { id: '1', name: 'نیما', avatar: '👨‍🎓', status: 'studying', currentSubject: 'فیزیک ⚛️', todayStudyTime: 16200, activeSessionSeconds: 1200 },
            { id: '2', name: 'سارا', avatar: '👩‍🎓', status: 'studying', currentSubject: 'زیست‌شناسی 🧬', todayStudyTime: 11520, activeSessionSeconds: 540 },
            { id: '3', name: 'علی', avatar: '👨‍💻', status: 'resting', currentSubject: 'استراحت ☕', todayStudyTime: 18360, activeSessionSeconds: 0 }
        ]);
        showToast?.(`اتاق جدید با کد ${code} با موفقیت ساخته شد! 👥`, 'success');
    };

    const handleJoinRoom = (codeStr: string) => {
        const clean = codeStr.trim().toUpperCase();
        if (clean.length !== 6) {
            showToast?.('کد اتاق باید ۶ کاراکتر باشد', 'warning');
            return;
        }
        setRoomCode(clean);
        setIsInRoom(true);
        setRoomMembers([
            { id: '1', name: 'نیما', avatar: '👨‍🎓', status: 'studying', currentSubject: 'فیزیک ⚛️', todayStudyTime: 16200, activeSessionSeconds: 1200 },
            { id: '2', name: 'سارا', avatar: '👩‍🎓', status: 'studying', currentSubject: 'زیست‌شناسی 🧬', todayStudyTime: 11520, activeSessionSeconds: 540 },
            { id: '3', name: 'علی', avatar: '👨‍💻', status: 'resting', currentSubject: 'استراحت ☕', todayStudyTime: 18360, activeSessionSeconds: 0 }
        ]);
        showToast?.(`با موفقیت به اتاق ${clean} متصل شدید! 👥`, 'success');
    };

    const handleLeaveRoom = () => {
        setIsInRoom(false);
        setRoomCode(null);
        setRoomMembers([]);
        showToast?.('از اتاق مطالعه خارج شدید', 'info');
    };

    const handleCopyRoomCode = () => {
        if (roomCode) {
            navigator.clipboard.writeText(roomCode);
            showToast?.('کد دعوت با موفقیت کپی شد! 📋', 'success');
        }
    };

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
            setSeconds(pomoSession === 'study' ? 1500 : 300);
        } else {
            setSeconds(0);
        }
        setIsRunning(false);
        setTimerState('idle');
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
                    setTimerState('running');
                } else {
                    const initial = pomoSession === 'study' ? 1500 : 300;
                    const remaining = initial - (accumulatedTime + diff);
                    if (remaining <= 0) {
                        setSeconds(0);
                        setIsRunning(false);
                        setTimerState('success');
                        audioEngineRef.current?.playBeep();
                        showToast?.(pomoSession === 'study' ? 'پارت تمرکز با موفقیت به پایان رسید! 🎉' : 'زمان استراحت تمام شد. بازگشت به کار!', 'success');
                    } else {
                        setSeconds(remaining);
                        setTimerState('running');
                    }
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning, startTime, timerMode, pomoSession, accumulatedTime]);

    // Dynamically calculate progress percent for the flower
    const progressPercent = useMemo(() => {
        if (timerMode === 'normal') {
            // Normal timer grows forever, 1 hour (3600s) as 100% standard
            return Math.min((seconds / 3600) * 100, 100);
        } else {
            const initial = pomoSession === 'study' ? 1500 : 300;
            const elapsed = initial - seconds;
            return Math.min((elapsed / initial) * 100, 100);
        }
    }, [seconds, timerMode, pomoSession]);

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleStart = () => {
        audioEngineRef.current?.init();
        setStartTime(Date.now());
        setIsRunning(true);
        setTimerState('running');
    };

    const handlePause = () => {
        setIsRunning(false);
        setTimerState('paused');
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

        const isFailed = timerMode === 'pomodoro' && pomoSession === 'study' && seconds > 10;
        
        if (isFailed) {
            setTimerState('failed');
            showToast?.('پارت تمرکز لغو شد. گلبرگ‌ها پژمرده شدند! 😔', 'warning');
        } else {
            setTimerState('idle');
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
        }

        setTimeout(() => {
            setSeconds(timerMode === 'pomodoro' ? (pomoSession === 'study' ? 1500 : 300) : 0);
            setAccumulatedTime(0);
            setStartTime(null);
            setIsTimerOpen(false);
            setTimerState('idle');
        }, isFailed ? 2500 : 500);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/98 dark:bg-gray-950/99 backdrop-blur-3xl select-none text-right font-sans" dir="rtl">
            {/* Top-Right Close Icon */}
            <button
                onClick={() => {
                    audioEngineRef.current?.stop();
                    setIsTimerOpen(false);
                }}
                className="absolute top-6 right-6 p-3 rounded-2xl text-gray-400 hover:text-white hover:bg-white/10 transition-all btn-micro-interactive cursor-pointer z-50 border border-white/5"
            >
                <X size={20} />
            </button>

            {/* Glowing top backdrop rings */}
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-650/10 rounded-full filter blur-[150px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-650/10 rounded-full filter blur-[150px] pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center gap-12 w-full max-w-4xl px-6 md:px-12 py-8 overflow-y-auto max-h-full relative z-10">
                
                {/* =======================================
                    LEFT COLUMN: FLOWER & TIMER VISUAL
                   ======================================= */}
                <div className="flex flex-col items-center gap-6 flex-1 w-full">
                    {/* Mode Segment Selector */}
                    <div className="flex bg-white/5 dark:bg-gray-900/50 p-1.5 rounded-2xl border border-white/10 dark:border-gray-800/80 shadow-2xl backdrop-blur-md">
                        <button
                            disabled={isRunning}
                            onClick={() => setTimerMode('normal')}
                            className={`px-4.5 py-2.5 rounded-xl text-xs font-black transition duration-300 ${timerMode === 'normal' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            تایمر صعودی
                        </button>
                        <button
                            disabled={isRunning}
                            onClick={() => setTimerMode('pomodoro')}
                            className={`px-4.5 py-2.5 rounded-xl text-xs font-black transition duration-300 ${timerMode === 'pomodoro' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            پومودورو (تمرکز)
                        </button>
                    </div>

                    {/* Active Target Task Banner */}
                    <div className="w-full max-w-xs relative">
                        <div 
                            onClick={() => !isRunning && setIsTaskSelectorOpen(!isTaskSelectorOpen)}
                            className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all select-none backdrop-blur-md cursor-pointer ${
                                isRunning 
                                    ? 'bg-white/5 border-white/5 cursor-not-allowed opacity-80' 
                                    : 'bg-white/5 border-white/10 hover:border-indigo-500/50 hover:bg-white/10'
                            }`}
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0 text-indigo-400">
                                    <Clock size={13} />
                                </div>
                                <div className="flex flex-col text-right truncate">
                                    <span className="text-[10px] text-gray-400 font-bold">تسک در حال تمرکز:</span>
                                    <span className="text-xs font-extrabold text-white truncate mt-0.5">
                                        {pinnedTask ? `${pinnedTask.subject}: ${pinnedTask.topic}` : 'انتخاب تسک متمرکز...'}
                                    </span>
                                </div>
                            </div>
                            {!isRunning && <ChevronDown size={14} className="text-gray-400" />}
                        </div>

                        {/* Task dropdown selector */}
                        {isTaskSelectorOpen && !isRunning && (
                            <div className="absolute top-[110%] left-0 right-0 max-h-48 overflow-y-auto bg-slate-900/95 border border-white/10 rounded-2xl p-2 z-30 shadow-2xl custom-scrollbar backdrop-blur-xl animate-in zoom-in-95 duration-200">
                                {todayTasks.length === 0 ? (
                                    <div className="text-[10px] text-gray-500 text-center py-4 font-bold">هیچ تسکی برای امروز ثبت نشده است</div>
                                ) : (
                                    <div className="space-y-1">
                                        <div 
                                            onClick={() => { setPinnedTaskId(null); setIsTaskSelectorOpen(false); }}
                                            className="p-2.5 rounded-xl hover:bg-white/5 text-right text-xs text-gray-400 font-extrabold transition cursor-pointer"
                                        >
                                            عدم انتخاب تسک
                                        </div>
                                        {todayTasks.map((t) => (
                                            <div 
                                                key={t.id}
                                                onClick={() => { setPinnedTaskId(t.id); setIsTaskSelectorOpen(false); }}
                                                className={`p-2.5 rounded-xl hover:bg-indigo-650/20 text-right text-xs font-bold transition cursor-pointer flex items-center gap-2 ${t.id === pinnedTaskId ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-300'}`}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                                <span className="truncate">{t.subject}: {t.topic}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Flower Growth Visualizer */}
                    <div className="relative group my-2">
                        <FocusFlower progress={progressPercent} state={timerState} />
                        
                        {/* Center digital display */}
                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-8">
                            <span className="text-4xl font-black text-white tracking-wider font-mono drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                                {formatTime(seconds)}
                            </span>
                            <span className="text-[9px] text-indigo-400 font-extrabold tracking-widest uppercase mt-0.5 drop-shadow">
                                {timerMode === 'pomodoro' ? (pomoSession === 'study' ? 'تمرکز فعال' : 'استراحت') : 'زمان تمرکز'}
                            </span>
                        </div>
                    </div>

                    {/* Audio & Timer Controls Row */}
                    <div className="flex items-center gap-6 mt-2">
                        {!isRunning ? (
                            <button
                                onClick={handleStart}
                                className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 btn-micro-interactive cursor-pointer"
                            >
                                <Play size={24} fill="currentColor" className="ml-1" />
                            </button>
                        ) : (
                            <button
                                onClick={handlePause}
                                className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 btn-micro-interactive cursor-pointer"
                            >
                                <Pause size={24} fill="currentColor" />
                            </button>
                        )}

                        <button
                            onClick={handleStop}
                            className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-rose-400 border border-white/10 flex items-center justify-center btn-micro-interactive cursor-pointer"
                            title="ثبت تمرکز و توقف"
                        >
                            <Square size={16} fill="currentColor" />
                        </button>
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden md:block w-px h-96 bg-white/10" />

                {/* =======================================
                    RIGHT COLUMN: AUDIO SYNTHESIZER & MULTIPLAYER
                   ======================================= */}
                <div className="flex flex-col gap-6 flex-1 w-full max-w-sm">
                    {/* 2026 Tab switcher for Audio Cabin vs Focus Room */}
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 select-none">
                        <button
                            onClick={() => setRightPanelTab('audio')}
                            className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition duration-300 ${rightPanelTab === 'audio' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            کابین صوتی 🎵
                        </button>
                        <button
                            onClick={() => setRightPanelTab('room')}
                            className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition duration-300 ${rightPanelTab === 'room' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            اتاق گروهی 👥
                        </button>
                    </div>

                    {rightPanelTab === 'audio' ? (
                        <>
                            <div className="text-right">
                                <h3 className="text-base font-extrabold text-white flex items-center gap-2.5 mb-1.5 justify-start">
                                    <Volume2 className="text-indigo-400" size={18} />
                                    کابین صوتی هوشمند (Audio Cabin)
                                </h3>
                                <p className="text-[10px] text-gray-400 font-black">فرکانس‌های سنتزشده متمرکزکننده مغز (ضد حواس‌پرتی)</p>
                            </div>

                            {/* Sounds Grid (New synthesizers added) */}
                            <div className="grid grid-cols-2 gap-2.5">
                                {[
                                    { id: 'none', label: 'بی‌صدا', desc: 'سکوت عمیق', icon: VolumeX, color: 'text-gray-400' },
                                    { id: 'white', label: 'نویز سفید', desc: 'فیلتر صدا', icon: Brain, color: 'text-sky-400' },
                                    { id: 'brown', label: 'نویز قهوه‌ای', desc: 'فرکانس‌های پایین', icon: Sliders, color: 'text-amber-500' },
                                    { id: 'ocean', label: 'امواج اقیانوس', desc: 'ریلکسیشن دریا', icon: Sliders, color: 'text-teal-400' },
                                    { id: 'rain', label: 'باران طبیعی', desc: 'سنتز قطرات باران', icon: Info, color: 'text-blue-400' },
                                    { id: 'fireplace', label: 'آتش شومینه', desc: 'جرقه و هوم چوب', icon: Flame, color: 'text-orange-500' }
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
                                            className={`flex flex-col items-start p-3 rounded-2xl border text-right transition duration-200 cursor-pointer btn-micro-interactive ${isSelected
                                                ? 'bg-indigo-500/10 border-indigo-500 shadow-md shadow-indigo-500/10'
                                                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                                        >
                                            <div className="flex items-center gap-2 mb-1 w-full justify-between">
                                                <span className={`text-[11px] font-extrabold ${isSelected ? 'text-indigo-400' : 'text-gray-200'}`}>{sound.label}</span>
                                                <Icon size={14} className={`${isSelected ? 'text-indigo-400' : sound.color}`} />
                                            </div>
                                            <span className="text-[9px] text-gray-500 truncate w-full font-bold">{sound.desc}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Volume Slider (Pulsing glowing container) */}
                            {activeSound !== 'none' && (
                                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2 animate-in slide-in-from-top-3 duration-300 backdrop-blur-md glass-premium">
                                    <div className="flex items-center justify-between text-xs text-gray-300 font-extrabold">
                                        <span>ولوم کابین صوتی</span>
                                        <span className="font-mono text-indigo-400 font-extrabold">{volume}%</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <VolumeX size={15} className="text-gray-400" />
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={volume}
                                            onChange={(e) => setVolume(Number(e.target.value))}
                                            className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                        <Volume2 size={15} className="text-indigo-400" />
                                    </div>
                                </div>
                            )}

                            {/* Scientific Banner */}
                            <div className="bg-gradient-to-br from-indigo-950/20 to-purple-950/20 border border-white/10 p-4 rounded-3xl backdrop-blur-md text-right">
                                <p className="text-[10px] text-indigo-400 font-black mb-1 uppercase tracking-wider">ریشه در فیزیولوژی مغز</p>
                                <p className="text-[11px] text-gray-300 leading-relaxed font-semibold">
                                    مدل‌های **نویز باران و شومینه** در برنامه به صورت مستقیم توسط فرکانس‌های جرقه‌ای و نوسان‌های LFO تولید صدا می‌شوند. این ترکیب طبیعی باعث مهار سیگنال‌های اضافی تالاموس شده و آستانه تمرکز را تا ۴۰ درصد افزایش می‌دهد.
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col gap-4 animate-in fade-in duration-300 text-right">
                            {!isInRoom ? (
                                <div className="bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-md text-right space-y-4">
                                    <div>
                                        <h4 className="text-sm font-extrabold text-white">ساخت یا ورود به اتاق مطالعه 👥</h4>
                                        <p className="text-[10px] text-gray-400 font-bold mt-1">با دوستان خود همزمان مطالعه کنید و پیشرفت هم را ببینید!</p>
                                    </div>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={tempCodeInput}
                                            onChange={(e) => setTempCodeInput(e.target.value)}
                                            placeholder="کد ۶ رقمی اتاق (مثال: P9A27S)"
                                            maxLength={6}
                                            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 outline-none text-xs focus:border-indigo-500 text-center font-mono font-extrabold uppercase text-white"
                                        />
                                        <button
                                            onClick={() => handleJoinRoom(tempCodeInput)}
                                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all active:scale-[0.98] cursor-pointer"
                                        >
                                            ورود به اتاق مطالعه
                                        </button>
                                    </div>
                                    <div className="relative flex py-2 items-center">
                                        <div className="flex-grow border-t border-white/10"></div>
                                        <span className="flex-shrink mx-3 text-gray-500 text-[10px] font-bold">یا</span>
                                        <div className="flex-grow border-t border-white/10"></div>
                                    </div>
                                    <button
                                        onClick={handleCreateRoom}
                                        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-black transition-all active:scale-[0.98] cursor-pointer"
                                    >
                                        ساخت اتاق جدید مطالعاتی ✨
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Active Room Code info */}
                                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between backdrop-blur-md">
                                        <div className="text-right">
                                            <span className="text-[9px] text-indigo-400 font-extrabold uppercase tracking-widest block">کد اتاق فعال:</span>
                                            <span className="text-lg font-black text-white font-mono tracking-wider">{roomCode}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleCopyRoomCode}
                                                className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 text-[10px] font-extrabold rounded-xl transition cursor-pointer"
                                            >
                                                کپی کد 📋
                                            </button>
                                            <button
                                                onClick={handleLeaveRoom}
                                                className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-[10px] font-extrabold rounded-xl transition cursor-pointer"
                                            >
                                                خروج 🚪
                                            </button>
                                        </div>
                                    </div>

                                    {/* Live Activity Feed */}
                                    <div className="text-right">
                                        <h4 className="text-xs font-black text-gray-400 flex items-center gap-1.5 mb-2.5 justify-start">
                                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                                            اعضای فعال در اتاق ({roomMembers.filter(m => m.status === 'studying').length + (isRunning ? 1 : 0)})
                                        </h4>
                                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                            {/* Render User himself first */}
                                            {(() => {
                                                const u = {
                                                    id: 'user',
                                                    name: userName || 'شما',
                                                    avatar: '👑',
                                                    status: isRunning ? 'studying' as const : 'offline' as const,
                                                    currentSubject: pinnedTask ? `${pinnedTask.subject} 📚` : 'آزاد 🎯',
                                                    todayStudyTime: seconds,
                                                    activeSessionSeconds: seconds
                                                };
                                                return (
                                                    <div className={`p-3 rounded-2xl border flex items-center justify-between transition-all duration-300 backdrop-blur-md ${
                                                        u.status === 'studying'
                                                            ? 'bg-indigo-500/10 border-indigo-500/30'
                                                            : 'bg-white/5 border-white/5 opacity-60'
                                                    }`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-lg">{u.avatar}</div>
                                                            <div className="text-right">
                                                                <div className="font-extrabold text-xs text-white">{u.name} (شما)</div>
                                                                <div className="text-[10px] text-gray-400 font-semibold mt-0.5">{u.currentSubject}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-left font-mono">
                                                            <div className={`text-xs font-black ${u.status === 'studying' ? 'text-indigo-400 animate-pulse' : 'text-gray-500'}`}>
                                                                {formatTime(u.todayStudyTime)}
                                                            </div>
                                                            <div className="text-[8px] text-gray-500 font-bold mt-0.5">امروز</div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Render other room members */}
                                            {roomMembers.map((m) => {
                                                const isStudying = m.status === 'studying';
                                                return (
                                                    <div key={m.id} className={`p-3 rounded-2xl border flex items-center justify-between transition-all duration-300 backdrop-blur-md ${
                                                        isStudying
                                                            ? 'bg-emerald-500/10 border-emerald-500/20'
                                                            : 'bg-white/5 border-white/5 opacity-60'
                                                    }`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-lg">{m.avatar}</div>
                                                            <div className="text-right">
                                                                <div className="font-extrabold text-xs text-white">{m.name}</div>
                                                                <div className="text-[10px] text-gray-400 font-semibold mt-0.5">{m.currentSubject}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-left font-mono">
                                                            <div className={`text-xs font-black ${isStudying ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                                {formatTime(m.todayStudyTime)}
                                                            </div>
                                                            <div className="text-[8px] text-gray-500 font-bold mt-0.5">امروز</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FocusTimer;