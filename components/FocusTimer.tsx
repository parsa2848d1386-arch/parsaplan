import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useStore } from '../context/StoreContext';
import { FocusStatus, useFocus, useFocusTick } from '../context/FocusContext';
import { liveRoomService } from '../services/liveRoomService';
import { AmbientSoundType, LiveRoomInfo, LiveRoomMessage, LiveRoomPeer, TimerMode } from '../types';
import { formatClockTime, formatToPersianDigits } from '../utils';
import { haptics } from '../utils/haptics';
import {
    runOptimisticMutation,
    applyPendingCheersToPeers,
    mergeOptimisticRoomMessages,
} from '../utils/optimisticMutation';
import { FOLLOW_THROUGH_VARIANTS, SPRING_SNAPPY } from '../utils/motionPresets';
import { PeakEndCheckmark } from './ui/MotionPrimitives';
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
    ChevronUp,
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
    const scale = isIdle ? 0.42 : isFailed ? 0.72 : 0.48 + (progress / 100) * 0.42;

    const stemColor = isFailed ? '#6b7280' : '#10b981';
    const petalColors = isFailed
        ? ['#4b5563', '#374151', '#1f2937']
        : progress >= 100
          ? ['#f43f5e', '#ec4899', '#d946ef']
          : ['#818cf8', '#6366f1', '#4f46e5'];

    const headY = isIdle ? 105 : 125 - (progress / 100) * 30;

    return (
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center">
            <div
                aria-hidden="true"
                className={`absolute inset-0 rounded-full pointer-events-none transition-opacity duration-300 ${
                    isIdle
                        ? 'opacity-0'
                        : isFailed
                          ? 'opacity-40 bg-[radial-gradient(circle,rgba(75,85,99,0.45)_0%,transparent_70%)]'
                          : progress >= 100
                            ? 'opacity-70 bg-[radial-gradient(circle,rgba(236,72,153,0.38)_0%,transparent_70%)]'
                            : 'opacity-70 bg-[radial-gradient(circle,rgba(99,102,241,0.38)_0%,transparent_70%)]'
                }`}
            />

            <svg width="100%" height="100%" viewBox="0 0 200 200" className="relative z-10">
                {!isIdle && (
                    <g>
                        <path
                            d={`M 100 190 Q ${95 - scale * 8} ${160} 100 ${headY}`}
                            stroke={stemColor}
                            strokeWidth="4"
                            strokeLinecap="round"
                            fill="none"
                        />
                        {progress > 30 && (
                            <path
                                d={`M 100 ${headY + 34} Q 120 ${headY + 24} 125 ${headY + 14} Q 110 ${headY + 28} 100 ${headY + 34}`}
                                fill={stemColor}
                            />
                        )}
                        {progress > 60 && (
                            <path
                                d={`M 100 ${headY + 22} Q 80 ${headY + 12} 75 ${headY + 2} Q 90 ${headY + 16} 100 ${headY + 22}`}
                                fill={stemColor}
                            />
                        )}
                    </g>
                )}

                <g transform={`translate(100, ${headY}) scale(${scale})`}>
                    {isIdle ? (
                        <circle cx="0" cy="0" r="14" fill="#10b981" />
                    ) : (
                        <>
                            {[0, 60, 120, 180, 240, 300].map((deg) => (
                                <path
                                    key={deg}
                                    d="M 0,0 Q -24,-42 0,-64 Q 24,-42 0,0"
                                    fill={petalColors[0]}
                                    opacity="0.9"
                                    transform={`rotate(${deg})`}
                                />
                            ))}
                            {progress > 50 &&
                                [30, 90, 150, 210, 270, 330].map((deg) => (
                                    <path
                                        key={deg}
                                        d="M 0,0 Q -17,-32 0,-50 Q 17,-32 0,0"
                                        fill={petalColors[1]}
                                        opacity="0.95"
                                        transform={`rotate(${deg})`}
                                    />
                                ))}
                            <circle cx="0" cy="0" r="15" fill={isFailed ? '#4b5563' : '#fbbf24'} />
                            <circle cx="0" cy="0" r="11" fill={isFailed ? '#374151' : '#f59e0b'} />
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
const PRIMARY_SOUND_IDS: AmbientSoundType[] = ['none', 'brown', 'rain', 'binaural'];

// ==========================================
// Isolated 1-Second Tick Subcomponents (Zero Parent Tree Re-renders)
// ==========================================
const FocusClockFace = React.memo<{
    mode: TimerMode;
    pomoPhase: 'study' | 'break';
    status: FocusStatus;
    interruptionCount: number;
}>(({ mode, pomoPhase, status, interruptionCount }) => {
    const {
        displaySeconds,
        elapsedSeconds,
        targetSeconds,
        isGracePeriodActive,
        graceRemainingSeconds,
    } = useFocusTick();

    const progressPercent = useMemo(() => {
        if (mode === 'stopwatch') {
            return Math.min((elapsedSeconds / 3600) * 100, 100);
        }
        return targetSeconds > 0 ? Math.min((elapsedSeconds / targetSeconds) * 100, 100) : 0;
    }, [mode, elapsedSeconds, targetSeconds]);

    return (
        <>
            {isGracePeriodActive && (
                <div className="px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500 text-rose-200 text-xs font-bold">
                    هشدار خروج! تا {graceRemainingSeconds} ثانیه دیگر برگردید
                </div>
            )}
            {interruptionCount > 0 && !isGracePeriodActive && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-bold">
                    <AlertTriangle size={13} />
                    <span>{interruptionCount} بار خروج از صفحه ثبت شده</span>
                </div>
            )}

            <div className="flex flex-col items-center gap-2">
                <FocusFlower progress={progressPercent} status={status} />
                <div className="flex flex-col items-center">
                    <span className="text-4xl sm:text-5xl font-black text-white tracking-wider font-mono tabular-nums" dir="ltr">
                        {formatClockTime(displaySeconds)}
                    </span>
                    <span className="text-[11px] text-indigo-300 font-extrabold mt-1">
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
        </>
    );
});
FocusClockFace.displayName = 'FocusClockFace';

const FocusLapsList = React.memo(() => {
    const { laps } = useFocusTick();
    if (laps.length === 0) return null;
    return (
        <div className="w-full max-w-xs bg-white/5 rounded-2xl p-3 border border-white/10 max-h-28 overflow-y-auto custom-scrollbar space-y-1">
            {laps.map((lapSec, i) => (
                <div key={i} className="flex justify-between text-[11px] font-mono text-gray-300">
                    <span>دور {i + 1}</span>
                    <span className="text-indigo-300 font-bold">{formatClockTime(lapSec)}</span>
                </div>
            ))}
        </div>
    );
});
FocusLapsList.displayName = 'FocusLapsList';

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
        pinnedTaskId,
        setPinnedTaskId,
        selectedSubject,
        setSelectedSubject,
        isTimerOpen,
        setIsTimerOpen,
        minimizeToPiP,
        strictLockActive,
        toggleStrictLock,
        interruptionCount,
        activeSound,
        setActiveSound,
        volume,
        setVolume,
        activeRoomCode,
        setActiveRoomCode,
        getElapsedSeconds,
        startTimer,
        pauseTimer,
        resumeTimer,
        recordLap,
        finishSession,
        discardSession,
        lastCompletionSummary,
        clearCompletionSummary,
    } = useFocus();
    const prefersReducedMotion = useReducedMotion();

    const [isTaskSelectorOpen, setIsTaskSelectorOpen] = useState(false);
    const [rightPanelTab, setRightPanelTab] = useState<'audio' | 'room'>('audio');
    const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
    const [showAllSounds, setShowAllSounds] = useState(false);

    // Live Group Study Room State (connected to real Firestore)
    const [roomInfo, setRoomInfo] = useState<LiveRoomInfo | null>(null);
    const [roomPeers, setRoomPeers] = useState<LiveRoomPeer[]>([]);
    const [roomMessages, setRoomMessages] = useState<LiveRoomMessage[]>([]);
    const [tempCodeInput, setTempCodeInput] = useState('');
    const [chatText, setChatText] = useState('');
    const [roomLoading, setRoomLoading] = useState(false);
    const pendingCheerDeltasRef = useRef(new Map<string, number>());
    const pendingRoomMessagesRef = useRef<LiveRoomMessage[]>([]);

    const activeDateIso = getDayDate(currentDay);
    const todayTasks = getTasksByDate(activeDateIso) || [];
    const pinnedTask = todayTasks.find((t) => t.id === pinnedTaskId);
    const isRunning = status === 'running';
    const isPaused = status === 'paused';

    // Subscribe to real Firestore Group Room when activeRoomCode is set
    useEffect(() => {
        if (!activeRoomCode || !db || !user || userId === 'parsaplan_local_user') {
            setRoomPeers([]);
            setRoomMessages([]);
            return;
        }

        let active = true;
        liveRoomService
            .getGroupRoom(db, activeRoomCode)
            .then((info) => {
                if (active) setRoomInfo(info);
            })
            .catch(() => {});

        const unsubPeers = liveRoomService.subscribeRoomMembers(
            db,
            activeRoomCode,
            (peers) => {
                setRoomPeers(applyPendingCheersToPeers(peers, pendingCheerDeltasRef.current));
            },
            () => {}
        );
        const unsubMsgs = liveRoomService.subscribeRoomMessages(
            db,
            activeRoomCode,
            (msgs) => {
                setRoomMessages(mergeOptimisticRoomMessages(msgs, pendingRoomMessagesRef.current));
            },
            (err) => console.warn('[FocusTimer] Room messages listener:', err)
        );

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
                elapsedSeconds: getElapsedSeconds ? getElapsedSeconds() : 0,
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
                elapsedSeconds: getElapsedSeconds ? getElapsedSeconds() : 0,
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

    const handleCheerPeer = async (peer: LiveRoomPeer) => {
        if (!db || !activeRoomCode || !peer.uid || peer.uid === userId) return;
        const roomCode = activeRoomCode;
        const targetUid = peer.uid;

        await runOptimisticMutation({
            mutationKey: `focus_cheer_${roomCode}_${targetUid}`,
            onMutate: () => {
                const prevPeers = roomPeers;
                pendingCheerDeltasRef.current.set(
                    targetUid,
                    (pendingCheerDeltasRef.current.get(targetUid) || 0) + 1
                );
                setRoomPeers((prev) =>
                    prev.map((p) => (p.uid === targetUid ? { ...p, cheersReceived: (p.cheersReceived || 0) + 1 } : p))
                );
                haptics.selection();
                return { prevPeers };
            },
            mutationFn: async () => {
                const res = await liveRoomService.sendCheer(db, roomCode, targetUid);
                if (res.throttled) {
                    throw new Error('لطفاً کمی صبر کنید و دوباره تشویق بفرستید');
                }
                return res;
            },
            onError: (err, snapshot) => {
                const currentDelta = pendingCheerDeltasRef.current.get(targetUid) || 0;
                if (currentDelta <= 1) pendingCheerDeltasRef.current.delete(targetUid);
                else pendingCheerDeltasRef.current.set(targetUid, currentDelta - 1);
                setRoomPeers(snapshot.prevPeers);
                showToast(err instanceof Error ? err.message : 'خطا در ارسال تشویق', 'error');
            },
            onSettled: async () => {
                const currentDelta = pendingCheerDeltasRef.current.get(targetUid) || 0;
                if (currentDelta <= 1) pendingCheerDeltasRef.current.delete(targetUid);
                else pendingCheerDeltasRef.current.set(targetUid, currentDelta - 1);
                const serverPeers = await liveRoomService.fetchRoomMembersOnce(db, roomCode).catch(() => null);
                if (serverPeers) {
                    setRoomPeers(applyPendingCheersToPeers(serverPeers, pendingCheerDeltasRef.current));
                }
            },
        });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatText.trim() || !db || !activeRoomCode || !userId) return;
        const text = chatText.trim().slice(0, 300);
        const roomCode = activeRoomCode;
        const optimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const optimisticMsg: LiveRoomMessage = {
            id: optimisticId,
            senderId: userId,
            senderName: userName || 'کاربر',
            text,
            createdAt: Date.now(),
        };

        await runOptimisticMutation({
            mutationKey: `focus_msg_${roomCode}_${optimisticId}`,
            onMutate: () => {
                const prevMessages = roomMessages;
                const prevText = chatText;
                setChatText('');
                pendingRoomMessagesRef.current = [...pendingRoomMessagesRef.current, optimisticMsg];
                setRoomMessages((prev) => [...prev, optimisticMsg]);
                return { prevMessages, prevText };
            },
            mutationFn: async () => {
                const res = await liveRoomService.sendRoomMessage(db, roomCode, userId, userName || 'کاربر', text);
                if (res.throttled) {
                    throw new Error('لطفاً لحظه‌ای صبر کنید');
                }
                return res;
            },
            onError: (err, snapshot) => {
                pendingRoomMessagesRef.current = pendingRoomMessagesRef.current.filter((m) => m.id !== optimisticId);
                setRoomMessages(snapshot.prevMessages);
                setChatText(snapshot.prevText);
                showToast(err instanceof Error ? err.message : 'خطا در ارسال پیام', 'error');
            },
            onSettled: async () => {
                pendingRoomMessagesRef.current = pendingRoomMessagesRef.current.filter((m) => m.id !== optimisticId);
                const serverMsgs = await liveRoomService.fetchRoomMessagesOnce(db, roomCode).catch(() => null);
                if (serverMsgs) {
                    setRoomMessages(mergeOptimisticRoomMessages(serverMsgs, pendingRoomMessagesRef.current));
                }
            },
        });
    };

    if (!isTimerOpen) return null;

    // Principle 19 (Peak-End Rule): Celebratory completion view with animated emerald Checkmark
    if (lastCompletionSummary) {
        return (
            <div
                className="fixed inset-0 z-[60] flex items-center justify-center bg-[#090d1a] p-6 select-none text-start font-sans"
                dir="rtl"
            >
                <motion.div
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.94, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={SPRING_SNAPPY}
                    className="w-full max-w-md squircle-xl bg-slate-900/95 border border-white/10 p-6 sm:p-8 flex flex-col items-center text-center gap-5 shadow-2xl"
                >
                    <PeakEndCheckmark size={76} />

                    <div className="space-y-1.5">
                        <h2 className="text-xl sm:text-2xl font-black text-white">
                            پارت تمرکز با موفقیت ثبت شد!
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-300 font-medium">
                            {lastCompletionSummary.taskTitle
                                ? `${lastCompletionSummary.subjectName} — ${lastCompletionSummary.taskTitle}`
                                : lastCompletionSummary.subjectName}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full">
                        <div className="squircle-md bg-white/5 border border-white/10 p-3.5 flex flex-col items-center">
                            <span className="text-[11px] text-gray-400 font-bold">مدت تمرکز</span>
                            <span className="text-xl font-black text-white tabular-nums mt-1">
                                {formatToPersianDigits(lastCompletionSummary.addedMinutes)} دقیقه
                            </span>
                        </div>
                        <div className="squircle-md bg-emerald-500/15 border border-emerald-500/30 p-3.5 flex flex-col items-center">
                            <span className="text-[11px] text-emerald-300 font-bold">پاداش کسب‌شده</span>
                            <span className="text-xl font-black text-emerald-400 tabular-nums mt-1" dir="ltr">
                                +{formatToPersianDigits(lastCompletionSummary.xpEarned)} XP
                            </span>
                        </div>
                    </div>

                    {/* Principle 8 (Fitts's Law): Large bottom thumb CTAs */}
                    <div className="flex flex-col sm:flex-row gap-2.5 w-full pt-2">
                        <button
                            type="button"
                            data-haptic="custom"
                            onClick={() => {
                                haptics.medium();
                                clearCompletionSummary();
                                startTimer();
                            }}
                            className="flex-1 min-h-[52px] squircle-md bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
                        >
                            <Play size={18} fill="currentColor" />
                            <span>شروع پارت جدید</span>
                        </button>
                        <button
                            type="button"
                            data-haptic="custom"
                            onClick={() => {
                                haptics.selection();
                                clearCompletionSummary();
                                setIsTimerOpen(false);
                            }}
                            className="sm:w-32 min-h-[52px] squircle-md bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition active:scale-[0.98] cursor-pointer"
                        >
                            بستن
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div
            className={`fixed inset-0 z-[60] flex items-center justify-center select-none text-start font-sans transition-colors duration-300 ${
                strictLockActive && isRunning ? 'bg-black' : 'bg-[#090d1a]'
            }`}
            dir="rtl"
        >
            {/* Top Toolbar */}
            <div className="absolute top-5 right-5 left-5 flex items-center justify-between z-50 pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                    <button
                        type="button"
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
                        type="button"
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
                        type="button"
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

            {/* Lightweight static radial gradient lighting (zero GPU blur cost) */}
            {!strictLockActive && (
                <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_15%,rgba(79,70,229,0.16)_0%,transparent_50%),radial-gradient(circle_at_82%_85%,rgba(147,51,234,0.12)_0%,transparent_50%)]"
                />
            )}

            <div className="flex flex-col md:flex-row items-center gap-10 w-full max-w-5xl px-6 md:px-10 pt-20 pb-8 overflow-y-auto max-h-full relative z-10">
                {/* LEFT COLUMN: TIMER */}
                <div className="flex flex-col items-center gap-5 flex-1 w-full">
                    {/* Continuity Principle: 3-phase focus progression track */}
                    <div aria-label="مراحل جلسه تمرکز" className="flex items-center w-full max-w-sm gap-2 px-1">
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span
                                className={`w-5 h-5 rounded-full text-[11px] font-black flex items-center justify-center ${
                                    !isRunning && !isPaused
                                        ? 'bg-indigo-500 text-white shadow-sm'
                                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                }`}
                            >
                                ۱
                            </span>
                            <span className={`text-[11px] font-bold ${!isRunning && !isPaused ? 'text-white' : 'text-emerald-300'}`}>
                                آماده‌سازی
                            </span>
                        </div>
                        <span
                            aria-hidden="true"
                            className={`h-px flex-1 transition-colors ${isRunning || isPaused ? 'bg-indigo-400/70' : 'bg-white/15'}`}
                        />
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span
                                className={`w-5 h-5 rounded-full text-[11px] font-black flex items-center justify-center ${
                                    isRunning || isPaused
                                        ? 'bg-indigo-500 text-white shadow-sm'
                                        : 'bg-white/10 text-gray-400'
                                }`}
                            >
                                ۲
                            </span>
                            <span className={`text-[11px] font-bold ${isRunning || isPaused ? 'text-white' : 'text-gray-400'}`}>
                                تمرکز عمیق
                            </span>
                        </div>
                        <span aria-hidden="true" className="h-px flex-1 bg-white/15" />
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className="w-5 h-5 rounded-full text-[11px] font-black flex items-center justify-center bg-white/10 text-gray-400">
                                ۳
                            </span>
                            <span className="text-[11px] font-bold text-gray-400">ثبت و پاداش</span>
                        </div>
                    </div>

                    {/* Mode Selector */}
                    <div className="flex flex-wrap justify-center bg-white/5 p-1.5 squircle-md border border-white/10 gap-1">
                        {(
                            [
                                { id: 'stopwatch', label: 'کرنومتر' },
                                { id: 'pomodoro', label: 'پومودورو' },
                                { id: 'exam', label: 'شبیه‌ساز آزمون' },
                                { id: 'countdown', label: 'شمارش معکوس' },
                            ] as const
                        ).map((m) => (
                            <button
                                type="button"
                                key={m.id}
                                disabled={isRunning || isPaused}
                                onClick={() => setMode(m.id)}
                                className={`px-3.5 py-2 squircle-sm text-xs font-black transition disabled:opacity-60 ${
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
                                type="button"
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
                                type="button"
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
                                    type="button"
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
                                <div className="flex flex-col text-start truncate">
                                    <span className="text-[11px] text-gray-400 font-bold">مقصد ثبت خودکار زمان:</span>
                                    <span className="text-xs font-extrabold text-white truncate">
                                        {pinnedTask ? `${pinnedTask.subject}: ${pinnedTask.topic}` : selectedSubject}
                                    </span>
                                </div>
                            </div>
                            {!isRunning && <ChevronDown size={14} className="text-gray-400 shrink-0" />}
                        </div>

                        {isTaskSelectorOpen && !isRunning && (
                            <div className="absolute top-[110%] left-0 right-0 max-h-60 overflow-y-auto bg-slate-900/95 border border-white/10 rounded-2xl p-2 z-30 shadow-2xl custom-scrollbar">
                                <div className="text-[11px] text-gray-500 px-2 py-1 font-bold">تسک‌های امروز:</div>
                                {todayTasks.length === 0 ? (
                                    <div className="text-[11px] text-gray-500 text-center py-2">تسکی برای امروز ثبت نشده</div>
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
                                <div className="text-[11px] text-gray-500 px-2 py-1 font-bold">یا انتخاب حوزه / دسته آزاد:</div>
                                <div className="flex flex-wrap gap-1 p-1">
                                    {subjects.slice(0, 10).map((s) => (
                                        <button
                                            type="button"
                                            key={s.id}
                                            onClick={() => {
                                                setPinnedTaskId(null);
                                                setSelectedSubject(s.name);
                                                setIsTaskSelectorOpen(false);
                                            }}
                                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-[11px] text-gray-300 font-bold"
                                        >
                                            {s.icon} {s.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Isolated Clock Face & Grace Alerts (1s ticker confined here) */}
                    <FocusClockFace
                        mode={mode}
                        pomoPhase={pomoPhase}
                        status={status}
                        interruptionCount={interruptionCount}
                    />

                    {/* Controls (Principle 8: Fitts's Law wide thumb-zone targets) */}
                    <div className="flex items-center justify-center gap-3 w-full max-w-sm">
                        {!isRunning && !isPaused && (
                            <button
                                type="button"
                                data-haptic="custom"
                                onClick={() => {
                                    haptics.medium();
                                    startTimer();
                                }}
                                className="w-full min-h-[54px] px-7 py-3.5 squircle-md bg-gradient-to-tr from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition active:scale-[0.98] cursor-pointer"
                            >
                                <Play size={18} fill="currentColor" />
                                <span>شروع تمرکز</span>
                            </button>
                        )}

                        {isRunning && (
                            <>
                                <button
                                    type="button"
                                    data-haptic="custom"
                                    onClick={() => {
                                        haptics.impact();
                                        recordLap();
                                    }}
                                    className="min-h-[48px] px-4 py-3 squircle-md bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                >
                                    <Flag size={14} /> دور
                                </button>
                                <button
                                    type="button"
                                    data-haptic="custom"
                                    onClick={() => {
                                        haptics.light();
                                        pauseTimer();
                                    }}
                                    className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer"
                                    title="توقف موقت"
                                    aria-label="توقف موقت"
                                >
                                    <Pause size={22} fill="currentColor" />
                                </button>
                                <button
                                    type="button"
                                    data-haptic="custom"
                                    onClick={() => {
                                        haptics.success();
                                        finishSession(false, true);
                                    }}
                                    className="min-h-[48px] px-5 py-3 squircle-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
                                    title="ذخیره و پایان"
                                >
                                    <Square size={14} fill="currentColor" /> ثبت و پایان
                                </button>
                            </>
                        )}

                        {isPaused && (
                            <>
                                <button
                                    type="button"
                                    data-haptic="custom"
                                    onClick={() => {
                                        haptics.medium();
                                        resumeTimer();
                                    }}
                                    className="flex-1 min-h-[52px] px-6 py-3 squircle-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                                >
                                    <Play size={16} fill="currentColor" /> ادامه
                                </button>
                                <button
                                    type="button"
                                    data-haptic="custom"
                                    onClick={() => {
                                        haptics.success();
                                        finishSession(Boolean(pinnedTask), true);
                                    }}
                                    className="flex-1 min-h-[52px] px-5 py-3 squircle-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                                >
                                    <CheckCircle2 size={16} /> ذخیره
                                </button>
                                <button
                                    type="button"
                                    data-haptic="custom"
                                    onClick={() => {
                                        haptics.warning();
                                        discardSession();
                                    }}
                                    className="min-h-[52px] px-4 py-3 squircle-md bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold transition cursor-pointer"
                                >
                                    لغو
                                </button>
                            </>
                        )}
                    </div>

                    {/* Mark task complete quick action when pinned */}
                    {pinnedTask && isRunning && (
                        <button
                            type="button"
                            onClick={() => finishSession(true, true)}
                            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20 transition cursor-pointer"
                        >
                            <CheckCircle2 size={14} />
                            <span>اتمام و تیک زدن تسک «{pinnedTask.topic}»</span>
                        </button>
                    )}

                    {/* Laps */}
                    <FocusLapsList />
                </div>

                <div className="hidden md:block w-px h-96 bg-white/10" />

                {/* RIGHT COLUMN: AUDIO CABIN & REAL LIVE ROOM (Principle 11: Follow-through settle) */}
                <motion.div
                    variants={FOLLOW_THROUGH_VARIANTS}
                    initial={prefersReducedMotion ? false : 'hidden'}
                    animate="visible"
                    className="flex flex-col gap-5 flex-1 w-full max-w-sm"
                >
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                        <button
                            type="button"
                            onClick={() => setRightPanelTab('audio')}
                            className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition ${
                                rightPanelTab === 'audio' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            کابین صوتی 🎵
                        </button>
                        <button
                            type="button"
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
                                <p className="text-[11px] text-gray-400 font-semibold">
                                    تولید لحظه‌ای صدا با Web Audio API (شامل ضربان بتای ۱۴ هرتز)
                                </p>
                            </div>

                            {(() => {
                                const curatedSounds = SOUND_OPTIONS.filter((s) => PRIMARY_SOUND_IDS.includes(s.id));
                                if (!curatedSounds.some((s) => s.id === activeSound)) {
                                    const activeObj = SOUND_OPTIONS.find((s) => s.id === activeSound);
                                    if (activeObj) curatedSounds.splice(curatedSounds.length - 1, 1, activeObj);
                                }
                                const visibleSounds = showAllSounds ? SOUND_OPTIONS : curatedSounds;
                                return (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            {visibleSounds.map((sound) => {
                                                const Icon = sound.icon;
                                                const isSelected = activeSound === sound.id;
                                                return (
                                                    <button
                                                        key={sound.id}
                                                        type="button"
                                                        onClick={() => setActiveSound(sound.id)}
                                                        className={`flex flex-col items-start p-2.5 squircle-md border text-start transition cursor-pointer ${
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
                                                        <span className="text-[11px] text-gray-400 truncate w-full">{sound.desc}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            type="button"
                                            aria-expanded={showAllSounds}
                                            onClick={() => setShowAllSounds((prev) => !prev)}
                                            className="w-full min-h-[38px] px-3 py-1.5 squircle-sm border border-white/10 bg-white/5 hover:bg-white/10 text-[11px] font-bold text-indigo-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
                                        >
                                            <span>
                                                {showAllSounds
                                                    ? 'نمایش صداهای منتخب'
                                                    : `سایر صداهای محیطی (${formatToPersianDigits(SOUND_OPTIONS.length - visibleSounds.length)} مورد دیگر)`}
                                            </span>
                                            {showAllSounds ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                        </button>
                                    </div>
                                );
                            })()}

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
                                        <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
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
                                        type="button"
                                        onClick={() => handleJoinRoom(tempCodeInput)}
                                        disabled={roomLoading}
                                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition disabled:opacity-50"
                                    >
                                        ورود به اتاق
                                    </button>
                                    <button
                                        type="button"
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
                                            <span className="text-[11px] text-indigo-400 font-extrabold block">
                                                {roomInfo?.name || 'اتاق مطالعه'}
                                            </span>
                                            <span className="text-base font-black text-white font-mono tracking-wider">
                                                {activeRoomCode}
                                            </span>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard?.writeText(activeRoomCode);
                                                    showToast('کد کپی شد', 'success');
                                                }}
                                                className="px-2.5 py-1 bg-indigo-500/15 text-indigo-300 text-[11px] font-bold rounded-lg"
                                            >
                                                کپی
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleLeaveRoom}
                                                className="px-2.5 py-1 bg-rose-500/15 text-rose-300 text-[11px] font-bold rounded-lg"
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
                                                                ? 'bg-emerald-400'
                                                                : peer.status === 'RESTING'
                                                                  ? 'bg-amber-400'
                                                                  : 'bg-gray-500'
                                                        }`}
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold text-white truncate">
                                                            {peer.displayName} {peer.uid === userId ? '(شما)' : ''}
                                                        </div>
                                                        <div className="text-[11px] text-gray-400 truncate">
                                                            {peer.activeSubject || 'مطالعه'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCheerPeer(peer)}
                                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[11px] font-bold shrink-0 cursor-pointer"
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
                                        <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] custom-scrollbar">
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
                </motion.div>
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
