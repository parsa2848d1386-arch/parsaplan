import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useFocus } from '../context/FocusContext';
import { liveRoomService } from '../services/liveRoomService';
import { AmbientSoundType, LiveRoomInfo, LiveRoomMessage, LiveRoomPeer } from '../types';
import { formatClockTime } from '../utils';
import { InSessionScratchpadDrawer } from './focus/InSessionScratchpadDrawer';
import {
    X,
    Play,
    Pause,
    Square,
    Clock,
    Volume2,
    VolumeX,
    Flame,
    Brain,
    Info,
    Sliders,
    ChevronDown,
    Minimize2,
    Lock,
    Unlock,
    Flag,
    NotebookPen,
    Heart,
    Send,
    Users,
    AlertTriangle,
    Radio,
    CheckCircle2,
} from 'lucide-react';

// ==========================================
// SVG Focus Flower Visualizer
// ==========================================
const FocusFlower: React.FC<{ progress: number; status: string }> = ({ progress, status }) => {
    const isFailed = status === 'failed';
    const isIdle = status === 'idle';
    const scale = isIdle ? 0.35 : isFailed ? 0.8 : 0.35 + (progress / 100) * 0.65;

    const stemColor = isFailed ? '#6b7280' : '#10b981';
    const petalColors = isFailed
        ? ['#4b5563', '#374151', '#1f2937']
        : progress >= 100
          ? ['#f43f5e', '#ec4899', '#d946ef']
          : ['#818cf8', '#6366f1', '#4f46e5'];

    return (
        <div className="relative w-56 h-56 flex items-center justify-center">
            <div
                className={`absolute w-36 h-36 rounded-full filter blur-[40px] opacity-40 transition-all duration-1000 ${
                    isIdle
                        ? 'bg-transparent'
                        : isFailed
                          ? 'bg-gray-800'
                          : progress >= 100
                            ? 'bg-pink-500 animate-pulse'
                            : 'bg-indigo-500 animate-pulse'
                }`}
            />

            <svg width="100%" height="100%" viewBox="0 0 200 200" className="overflow-visible relative z-10">
                {!isIdle && (
                    <g className="transition-all duration-700">
                        <path
                            d={`M 100 200 Q ${95 - scale * 10} ${180 - scale * 20} 100 ${150 - scale * 20}`}
                            stroke={stemColor}
                            strokeWidth="4"
                            strokeLinecap="round"
                            fill="none"
                        />
                        {progress > 30 && (
                            <path
                                d={`M 100 ${150 - scale * 20} Q 120 ${140 - scale * 20} 125 ${130 - scale * 20} Q 110 ${145 - scale * 20} 100 ${150 - scale * 20}`}
                                fill={stemColor}
                            />
                        )}
                        {progress > 60 && (
                            <path
                                d={`M 100 ${135 - scale * 20} Q 80 ${125 - scale * 20} 75 ${115 - scale * 20} Q 90 ${130 - scale * 20} 100 ${135 - scale * 20}`}
                                fill={stemColor}
                            />
                        )}
                    </g>
                )}

                <g
                    transform={`translate(100, ${isIdle ? 100 : 175 - scale * 80}) scale(${scale})`}
                    className="transition-all duration-700 ease-out origin-center"
                >
                    {isIdle ? (
                        <circle cx="0" cy="0" r="10" fill="#10b981" className="animate-bounce" style={{ animationDuration: '2s' }} />
                    ) : (
                        <>
                            {[0, 60, 120, 180, 240, 300].map((deg) => (
                                <path
                                    key={deg}
                                    d="M 0,0 Q -25,-45 0,-70 Q 25,-45 0,0"
                                    fill={petalColors[0]}
                                    opacity="0.9"
                                    transform={`rotate(${deg})`}
                                />
                            ))}
                            {progress > 50 &&
                                [30, 90, 150, 210, 270, 330].map((deg) => (
                                    <path
                                        key={deg}
                                        d="M 0,0 Q -18,-35 0,-55 Q 18,-35 0,0"
                                        fill={petalColors[1]}
                                        opacity="0.95"
                                        transform={`rotate(${deg})`}
                                    />
                                ))}
                            <circle cx="0" cy="0" r="16" fill={isFailed ? '#4b5563' : '#fbbf24'} />
                            <circle cx="0" cy="0" r="12" fill={isFailed ? '#374151' : '#f59e0b'} />
                        </>
                    )}
                </g>
            </svg>
        </div>
    );
};

const SOUND_OPTIONS: { id: AmbientSoundType; label: string; desc: string; icon: React.ElementType; color: string }[] = [
    { id: 'none', label: 'بی‌صدا', desc: 'سکوت عمیق', icon: VolumeX, color: 'text-gray-400' },
    { id: 'white', label: 'نویز سفید', desc: 'فیلتر محیط', icon: Brain, color: 'text-sky-400' },
    { id: 'pink', label: 'نویز صورتی', desc: 'متعادل و آرام', icon: Radio, color: 'text-pink-400' },
    { id: 'brown', label: 'نویز قهوه‌ای', desc: 'فرکانس عمیق', icon: Sliders, color: 'text-amber-500' },
    { id: 'ocean', label: 'امواج اقیانوس', desc: 'ریلکسیشن دریا', icon: Sliders, color: 'text-teal-400' },
    { id: 'rain', label: 'باران طبیعی', desc: 'سنتز قطرات', icon: Info, color: 'text-blue-400' },
    { id: 'fireplace', label: 'آتش شومینه', desc: 'جرقه و چوب', icon: Flame, color: 'text-orange-500' },
    { id: 'binaural', label: 'باینورال 14Hz', desc: 'امواج بتای تمرکز', icon: Brain, color: 'text-violet-400' },
];

const FocusTimer: React.FC = () => {
    const {
        showToast,
        getTasksByDate,
        getDayDate,
        currentDay,
        userName,
        user,
        userId,
        db,
        subjects,
    } = useStore();

    const {
        mode,
        setMode,
        pomoPhase,
        setPomoPhase,
        customCountdownMinutes,
        setCustomCountdownMinutes,
        status,
        displaySeconds,
        elapsedSeconds,
        targetSeconds,
        laps,
        pinnedTaskId,
        setPinnedTaskId,
        selectedSubject,
        setSelectedSubject,
        isTimerOpen,
        setIsTimerOpen,
        minimizeToPiP,
        strictLockActive,
        toggleStrictLock,
        isGracePeriodActive,
        graceRemainingSeconds,
        interruptionCount,
        activeSound,
        setActiveSound,
        volume,
        setVolume,
        activeRoomCode,
        setActiveRoomCode,
        startTimer,
        pauseTimer,
        resumeTimer,
        recordLap,
        finishSession,
        discardSession,
    } = useFocus();

    const [isTaskSelectorOpen, setIsTaskSelectorOpen] = useState(false);
    const [rightPanelTab, setRightPanelTab] = useState<'audio' | 'room'>('audio');
    const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);

    // Live Group Study Room State (connected to real Firestore)
    const [roomInfo, setRoomInfo] = useState<LiveRoomInfo | null>(null);
    const [roomPeers, setRoomPeers] = useState<LiveRoomPeer[]>([]);
    const [roomMessages, setRoomMessages] = useState<LiveRoomMessage[]>([]);
    const [tempCodeInput, setTempCodeInput] = useState('');
    const [chatText, setChatText] = useState('');
    const [roomLoading, setRoomLoading] = useState(false);

    const activeDateIso = getDayDate(currentDay);
    const todayTasks = getTasksByDate(activeDateIso) || [];
    const pinnedTask = todayTasks.find((t) => t.id === pinnedTaskId);
    const isRunning = status === 'running';
    const isPaused = status === 'paused';

    const progressPercent = useMemo(() => {
        if (mode === 'stopwatch') {
            return Math.min((elapsedSeconds / 3600) * 100, 100);
        }
        return targetSeconds > 0 ? Math.min((elapsedSeconds / targetSeconds) * 100, 100) : 0;
    }, [mode, elapsedSeconds, targetSeconds]);

    // Subscribe to real Firestore Group Room when activeRoomCode is set
    useEffect(() => {
        if (!activeRoomCode || !db || !user || userId === 'parsaplan_local_user') {
            setRoomPeers([]);
            setRoomMessages([]);
            return;
        }

        let active = true;
        liveRoomService.getGroupRoom(db, activeRoomCode).then((info) => {
            if (active) setRoomInfo(info);
        });

        const unsubPeers = liveRoomService.subscribeRoomMembers(db, activeRoomCode, (peers) => {
            setRoomPeers(peers);
        });
        const unsubMsgs = liveRoomService.subscribeRoomMessages(db, activeRoomCode, (msgs) => {
            setRoomMessages(msgs);
        });

        return () => {
            active = false;
            unsubPeers();
            unsubMsgs();
        };
    }, [activeRoomCode, db, user, userId]);

    const handleCreateRoom = async () => {
        if (!db || !user || userId === 'parsaplan_local_user') {
            showToast('برای ساخت اتاق مطالعه آنلاین باید وارد حساب کاربری ابری شوید', 'warning');
            return;
        }
        setRoomLoading(true);
        try {
            const info = await liveRoomService.createGroupRoom(db, userId, userName || 'کاربر');
            await liveRoomService.upsertMemberPresence(db, info.code, {
                uid: userId,
                displayName: userName || 'کاربر',
                avatar: '👑',
                status: isRunning ? 'STUDYING' : 'RESTING',
                activeSubject: pinnedTask ? pinnedTask.subject : selectedSubject,
                activeTopic: pinnedTask?.topic || '',
                elapsedSeconds,
                dailyStudySeconds: 0,
                cheersReceived: 0,
                lastPing: Date.now(),
            });
            setRoomInfo(info);
            setActiveRoomCode(info.code);
            showToast(`اتاق واقعی با کد ${info.code} ساخته شد! 👥`, 'success');
        } catch {
            showToast('خطا در ساخت اتاق مطالعه', 'error');
        } finally {
            setRoomLoading(false);
        }
    };

    const handleJoinRoom = async (rawCode: string) => {
        const clean = rawCode.trim().toUpperCase();
        if (clean.length !== 6) {
            showToast('کد اتاق باید ۶ کاراکتر باشد', 'warning');
            return;
        }
        if (!db || !user || userId === 'parsaplan_local_user') {
            showToast('برای ورود به اتاق مطالعه باید وارد حساب کاربری ابری شوید', 'warning');
            return;
        }
        setRoomLoading(true);
        try {
            const info = await liveRoomService.getGroupRoom(db, clean);
            if (!info) {
                showToast('اتاقی با این کد پیدا نشد', 'error');
                return;
            }
            await liveRoomService.upsertMemberPresence(db, clean, {
                uid: userId,
                displayName: userName || 'کاربر',
                avatar: '🎓',
                status: isRunning ? 'STUDYING' : 'RESTING',
                activeSubject: pinnedTask ? pinnedTask.subject : selectedSubject,
                activeTopic: pinnedTask?.topic || '',
                elapsedSeconds,
                dailyStudySeconds: 0,
                cheersReceived: 0,
                lastPing: Date.now(),
            });
            setRoomInfo(info);
            setActiveRoomCode(clean);
            showToast(`به اتاق ${clean} متصل شدید! 👥`, 'success');
        } catch {
            showToast('خطا در اتصال به اتاق', 'error');
        } finally {
            setRoomLoading(false);
        }
    };

    const handleLeaveRoom = async () => {
        if (db && activeRoomCode && userId && userId !== 'parsaplan_local_user') {
            await liveRoomService.leaveGroupRoom(db, activeRoomCode, userId).catch(() => {});
        }
        setActiveRoomCode(null);
        setRoomInfo(null);
        showToast('از اتاق مطالعه خارج شدید', 'info');
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatText.trim() || !db || !activeRoomCode || !userId) return;
        try {
            await liveRoomService.sendRoomMessage(db, activeRoomCode, userId, userName || 'کاربر', chatText);
            setChatText('');
        } catch {
            showToast('خطا در ارسال پیام', 'error');
        }
    };

    if (!isTimerOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-3xl select-none text-right font-sans transition-colors duration-500 ${
                strictLockActive && isRunning ? 'bg-black' : 'bg-slate-950/98 dark:bg-gray-950/99'
            }`}
            dir="rtl"
        >
            {/* Top Toolbar */}
            <div className="absolute top-5 right-5 left-5 flex items-center justify-between z-50 pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                    <button
                        onClick={() => {
                            if (isRunning || isPaused) {
                                minimizeToPiP();
                            } else {
                                setIsTimerOpen(false);
                            }
                        }}
                        className="p-2.5 rounded-2xl text-gray-400 hover:text-white hover:bg-white/10 transition border border-white/10 flex items-center gap-1.5 text-xs font-bold"
                        title={isRunning || isPaused ? 'کوچک‌کردن به پنجره شناور (PiP)' : 'بستن'}
                    >
                        {isRunning || isPaused ? (
                            <>
                                <Minimize2 size={16} />
                                <span className="hidden sm:inline">شناور (PiP)</span>
                            </>
                        ) : (
                            <X size={18} />
                        )}
                    </button>

                    <button
                        onClick={() => setIsScratchpadOpen(true)}
                        className="p-2.5 rounded-2xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 transition flex items-center gap-1.5 text-xs font-bold"
                        title="چرک‌نویس حین مطالعه"
                    >
                        <NotebookPen size={16} />
                        <span className="hidden sm:inline">چرک‌نویس</span>
                    </button>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                    <button
                        onClick={toggleStrictLock}
                        className={`px-3 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition ${
                            strictLockActive
                                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                        }`}
                        title="قفل تمرکز (تمام‌صفحه + رصد ترک تب)"
                    >
                        {strictLockActive ? <Lock size={14} /> : <Unlock size={14} />}
                        <span>{strictLockActive ? 'قفل تمرکز فعال' : 'قفل تمرکز'}</span>
                    </button>
                </div>
            </div>

            {/* Ambient glow */}
            {!strictLockActive && (
                <>
                    <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full filter blur-[150px] pointer-events-none" />
                    <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-600/10 rounded-full filter blur-[150px] pointer-events-none" />
                </>
            )}

            <div className="flex flex-col md:flex-row items-center gap-10 w-full max-w-5xl px-6 md:px-10 pt-20 pb-8 overflow-y-auto max-h-full relative z-10">
                {/* LEFT COLUMN: TIMER */}
                <div className="flex flex-col items-center gap-5 flex-1 w-full">
                    {/* Mode Selector */}
                    <div className="flex flex-wrap justify-center bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md gap-1">
                        {(
                            [
                                { id: 'stopwatch', label: 'کرنومتر' },
                                { id: 'pomodoro', label: 'پومودورو' },
                                { id: 'exam', label: 'شبیه‌ساز آزمون' },
                                { id: 'countdown', label: 'شمارش معکوس' },
                            ] as const
                        ).map((m) => (
                            <button
                                key={m.id}
                                disabled={isRunning || isPaused}
                                onClick={() => setMode(m.id)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-black transition disabled:opacity-60 ${
                                    mode === m.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {/* Pomodoro Phase or Custom Countdown Controls */}
                    {mode === 'pomodoro' && !isRunning && !isPaused && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPomoPhase('study')}
                                className={`px-3 py-1 rounded-xl text-[11px] font-bold border ${
                                    pomoPhase === 'study'
                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                        : 'border-white/10 text-gray-400'
                                }`}
                            >
                                پارت مطالعه
                            </button>
                            <button
                                onClick={() => setPomoPhase('break')}
                                className={`px-3 py-1 rounded-xl text-[11px] font-bold border ${
                                    pomoPhase === 'break'
                                        ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                                        : 'border-white/10 text-gray-400'
                                }`}
                            >
                                استراحت کوتاه
                            </button>
                        </div>
                    )}

                    {mode === 'countdown' && !isRunning && !isPaused && (
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                            <span className="text-[11px] text-gray-400 font-bold">مدت (دقیقه):</span>
                            {[20, 30, 45, 60, 90].map((mins) => (
                                <button
                                    key={mins}
                                    onClick={() => setCustomCountdownMinutes(mins)}
                                    className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold ${
                                        customCountdownMinutes === mins
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {mins}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Target Task / Subject Selector */}
                    <div className="w-full max-w-xs relative">
                        <div
                            onClick={() => !isRunning && setIsTaskSelectorOpen(!isTaskSelectorOpen)}
                            className={`w-full p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer ${
                                isRunning
                                    ? 'bg-white/5 border-white/5 cursor-not-allowed opacity-85'
                                    : 'bg-white/5 border-white/10 hover:border-indigo-500/50'
                            }`}
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0 text-indigo-400">
                                    <Clock size={14} />
                                </div>
                                <div className="flex flex-col text-right truncate">
                                    <span className="text-[10px] text-gray-400 font-bold">مقصد ثبت خودکار زمان:</span>
                                    <span className="text-xs font-extrabold text-white truncate">
                                        {pinnedTask ? `${pinnedTask.subject}: ${pinnedTask.topic}` : selectedSubject}
                                    </span>
                                </div>
                            </div>
                            {!isRunning && <ChevronDown size={14} className="text-gray-400 shrink-0" />}
                        </div>

                        {isTaskSelectorOpen && !isRunning && (
                            <div className="absolute top-[110%] left-0 right-0 max-h-60 overflow-y-auto bg-slate-900/95 border border-white/10 rounded-2xl p-2 z-30 shadow-2xl custom-scrollbar">
                                <div className="text-[10px] text-gray-500 px-2 py-1 font-bold">تسک‌های امروز:</div>
                                {todayTasks.length === 0 ? (
                                    <div className="text-[10px] text-gray-500 text-center py-2">تسکی برای امروز ثبت نشده</div>
                                ) : (
                                    todayTasks.map((t) => (
                                        <div
                                            key={t.id}
                                            onClick={() => {
                                                setPinnedTaskId(t.id);
                                                setSelectedSubject(t.subject);
                                                setIsTaskSelectorOpen(false);
                                            }}
                                            className={`p-2 rounded-xl hover:bg-indigo-500/15 text-xs font-bold cursor-pointer flex items-center gap-2 ${
                                                t.id === pinnedTaskId ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-300'
                                            }`}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                            <span className="truncate">{t.subject}: {t.topic}</span>
                                        </div>
                                    ))
                                )}
                                <div className="border-t border-white/10 my-1.5" />
                                <div className="text-[10px] text-gray-500 px-2 py-1 font-bold">یا انتخاب حوزه / دسته آزاد:</div>
                                <div className="flex flex-wrap gap-1 p-1">
                                    {subjects.slice(0, 10).map((s) => (
                                        <button
                                            key={s.id}
                                            onClick={() => {
                                                setPinnedTaskId(null);
                                                setSelectedSubject(s.name);
                                                setIsTaskSelectorOpen(false);
                                            }}
                                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-[10px] text-gray-300 font-bold"
                                        >
                                            {s.icon} {s.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Grace Period / Interruption Alerts */}
                    {isGracePeriodActive && (
                        <div className="px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500 text-rose-200 text-xs font-bold animate-pulse">
                            هشدار خروج! تا {graceRemainingSeconds} ثانیه دیگر برگردید
                        </div>
                    )}
                    {interruptionCount > 0 && !isGracePeriodActive && (
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-bold">
                            <AlertTriangle size={13} />
                            <span>{interruptionCount} بار خروج از صفحه ثبت شده</span>
                        </div>
                    )}

                    {/* Flower & Clock */}
                    <div className="relative">
                        <FocusFlower progress={progressPercent} status={status} />
                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-6">
                            <span className="text-4xl font-black text-white tracking-wider font-mono tabular-nums drop-shadow">
                                {formatClockTime(displaySeconds)}
                            </span>
                            <span className="text-[10px] text-indigo-400 font-extrabold mt-1">
                                {mode === 'stopwatch'
                                    ? 'کرنومتر مونو‌تونیک'
                                    : mode === 'exam'
                                      ? 'شبیه‌ساز آزمون'
                                      : mode === 'pomodoro'
                                        ? pomoPhase === 'study'
                                            ? 'پومودورو تمرکز'
                                            : 'استراحت'
                                        : 'شمارش معکوس'}
                            </span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-4">
                        {!isRunning && !isPaused && (
                            <button
                                onClick={startTimer}
                                className="px-7 py-3.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition active:scale-95"
                            >
                                <Play size={18} fill="currentColor" />
                                <span>شروع تمرکز</span>
                            </button>
                        )}

                        {isRunning && (
                            <>
                                <button
                                    onClick={recordLap}
                                    className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-xs font-bold flex items-center gap-1.5 transition"
                                >
                                    <Flag size={14} /> دور
                                </button>
                                <button
                                    onClick={pauseTimer}
                                    className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg transition active:scale-95"
                                    title="توقف موقت"
                                >
                                    <Pause size={22} fill="currentColor" />
                                </button>
                                <button
                                    onClick={() => finishSession(false)}
                                    className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 transition"
                                    title="ذخیره و پایان"
                                >
                                    <Square size={14} fill="currentColor" /> ثبت و پایان
                                </button>
                            </>
                        )}

                        {isPaused && (
                            <>
                                <button
                                    onClick={resumeTimer}
                                    className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 transition"
                                >
                                    <Play size={16} fill="currentColor" /> ادامه
                                </button>
                                <button
                                    onClick={() => finishSession(Boolean(pinnedTask))}
                                    className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 transition"
                                >
                                    <CheckCircle2 size={16} /> ذخیره
                                </button>
                                <button
                                    onClick={discardSession}
                                    className="px-4 py-3 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold transition"
                                >
                                    لغو
                                </button>
                            </>
                        )}
                    </div>

                    {/* Mark task complete quick action when pinned */}
                    {pinnedTask && isRunning && (
                        <button
                            onClick={() => finishSession(true)}
                            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20 transition"
                        >
                            <CheckCircle2 size={14} />
                            <span>اتمام و تیک زدن تسک «{pinnedTask.topic}»</span>
                        </button>
                    )}

                    {/* Laps */}
                    {laps.length > 0 && (
                        <div className="w-full max-w-xs bg-white/5 rounded-2xl p-3 border border-white/10 max-h-28 overflow-y-auto custom-scrollbar space-y-1">
                            {laps.map((lapSec, i) => (
                                <div key={i} className="flex justify-between text-[11px] font-mono text-gray-300">
                                    <span>دور {i + 1}</span>
                                    <span className="text-indigo-300 font-bold">{formatClockTime(lapSec)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="hidden md:block w-px h-96 bg-white/10" />

                {/* RIGHT COLUMN: AUDIO CABIN & REAL LIVE ROOM */}
                <div className="flex flex-col gap-5 flex-1 w-full max-w-sm">
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                        <button
                            onClick={() => setRightPanelTab('audio')}
                            className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition ${
                                rightPanelTab === 'audio' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            کابین صوتی 🎵
                        </button>
                        <button
                            onClick={() => setRightPanelTab('room')}
                            className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition ${
                                rightPanelTab === 'room' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            اتاق مطالعه زنده 👥
                        </button>
                    </div>

                    {rightPanelTab === 'audio' ? (
                        <>
                            <div>
                                <h3 className="text-sm font-extrabold text-white flex items-center gap-2 mb-1">
                                    <Volume2 className="text-indigo-400" size={16} />
                                    سنتزگر امواج تمرکز
                                </h3>
                                <p className="text-[10px] text-gray-400 font-semibold">
                                    تولید لحظه‌ای صدا با Web Audio API (شامل ضربان بتای ۱۴ هرتز)
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {SOUND_OPTIONS.map((sound) => {
                                    const Icon = sound.icon;
                                    const isSelected = activeSound === sound.id;
                                    return (
                                        <button
                                            key={sound.id}
                                            onClick={() => setActiveSound(sound.id)}
                                            className={`flex flex-col items-start p-2.5 rounded-2xl border text-right transition ${
                                                isSelected
                                                    ? 'bg-indigo-500/15 border-indigo-500 shadow-md'
                                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between w-full mb-0.5">
                                                <span className={`text-[11px] font-extrabold ${isSelected ? 'text-indigo-300' : 'text-gray-200'}`}>
                                                    {sound.label}
                                                </span>
                                                <Icon size={13} className={isSelected ? 'text-indigo-400' : sound.color} />
                                            </div>
                                            <span className="text-[9px] text-gray-400 truncate w-full">{sound.desc}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {activeSound !== 'none' && (
                                <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl space-y-2">
                                    <div className="flex justify-between text-xs text-gray-300 font-bold">
                                        <span>شدت صدا</span>
                                        <span className="font-mono text-indigo-400">{volume}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={volume}
                                        onChange={(e) => setVolume(Number(e.target.value))}
                                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {!activeRoomCode ? (
                                <div className="bg-white/5 border border-white/10 p-4 rounded-3xl space-y-3">
                                    <div>
                                        <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                                            <Users size={16} className="text-emerald-400" />
                                            اتاق مطالعه واقعی (Firestore)
                                        </h4>
                                        <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                                            با دوستانتان همزمان در یک کد اتاق مطالعه کنید، تشویق بفرستید و وضعیت تمرکز هم را زنده ببینید.
                                        </p>
                                    </div>
                                    <input
                                        type="text"
                                        value={tempCodeInput}
                                        onChange={(e) => setTempCodeInput(e.target.value.toUpperCase())}
                                        placeholder="کد ۶ رقمی اتاق..."
                                        maxLength={6}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-center font-mono font-extrabold uppercase text-white outline-none focus:border-indigo-500"
                                    />
                                    <button
                                        onClick={() => handleJoinRoom(tempCodeInput)}
                                        disabled={roomLoading}
                                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition disabled:opacity-50"
                                    >
                                        ورود به اتاق
                                    </button>
                                    <button
                                        onClick={handleCreateRoom}
                                        disabled={roomLoading}
                                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition disabled:opacity-50"
                                    >
                                        ساخت اتاق جدید ✨
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl flex items-center justify-between">
                                        <div>
                                            <span className="text-[9px] text-indigo-400 font-extrabold block">
                                                {roomInfo?.name || 'اتاق مطالعه'}
                                            </span>
                                            <span className="text-base font-black text-white font-mono tracking-wider">
                                                {activeRoomCode}
                                            </span>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard?.writeText(activeRoomCode);
                                                    showToast('کد کپی شد', 'success');
                                                }}
                                                className="px-2.5 py-1 bg-indigo-500/15 text-indigo-300 text-[10px] font-bold rounded-lg"
                                            >
                                                کپی
                                            </button>
                                            <button
                                                onClick={handleLeaveRoom}
                                                className="px-2.5 py-1 bg-rose-500/15 text-rose-300 text-[10px] font-bold rounded-lg"
                                            >
                                                خروج
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2 max-h-44 overflow-y-auto custom-scrollbar">
                                        {roomPeers.map((peer) => (
                                            <div
                                                key={peer.uid}
                                                className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span
                                                        className={`w-2 h-2 rounded-full shrink-0 ${
                                                            peer.status === 'STUDYING'
                                                                ? 'bg-emerald-400 animate-pulse'
                                                                : peer.status === 'RESTING'
                                                                  ? 'bg-amber-400'
                                                                  : 'bg-gray-500'
                                                        }`}
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold text-white truncate">
                                                            {peer.displayName} {peer.uid === userId ? '(شما)' : ''}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 truncate">
                                                            {peer.activeSubject || 'مطالعه'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        db && liveRoomService.sendCheer(db, activeRoomCode, peer.uid)
                                                    }
                                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[10px] font-bold shrink-0"
                                                    title="تشویق"
                                                >
                                                    <Heart size={11} />
                                                    <span>{peer.cheersReceived || 0}</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Quiet Chat */}
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 space-y-2">
                                        <div className="max-h-24 overflow-y-auto space-y-1 text-[10px] custom-scrollbar">
                                            {roomMessages.length === 0 ? (
                                                <p className="text-gray-500 text-center py-2">هنوز پیامی ثبت نشده</p>
                                            ) : (
                                                roomMessages.map((msg) => (
                                                    <div key={msg.id} className="text-gray-200">
                                                        <span className="font-bold text-indigo-300">{msg.senderName}: </span>
                                                        <span>{msg.text}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <form onSubmit={handleSendMessage} className="flex gap-1.5">
                                            <input
                                                type="text"
                                                value={chatText}
                                                onChange={(e) => setChatText(e.target.value)}
                                                placeholder="پیام کوتاه..."
                                                className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white outline-none"
                                            />
                                            <button
                                                type="submit"
                                                className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                                            >
                                                <Send size={13} />
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <InSessionScratchpadDrawer
                isOpen={isScratchpadOpen}
                onClose={() => setIsScratchpadOpen(false)}
                pinnedTaskId={pinnedTaskId}
                subjectName={selectedSubject}
            />
        </div>
    );
};

export default FocusTimer;
