import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AmbientSoundType, StudySessionSegment, SubjectTask, TimerMode } from '../types';
import { useStore } from './StoreContext';
import { focusAudioEngine } from '../services/audioEngine';
import { buildSynergyCompletion } from '../services/synergyBridge';
import { liveRoomService } from '../services/liveRoomService';

export type FocusStatus = 'idle' | 'running' | 'paused' | 'failed' | 'completed';

export interface FocusCompletionSummary {
    addedMinutes: number;
    xpEarned: number;
    subjectName: string;
    taskTitle?: string;
}

interface FocusTickContextType {
    displaySeconds: number;
    elapsedSeconds: number;
    targetSeconds: number;
    laps: number[];
    isGracePeriodActive: boolean;
    graceRemainingSeconds: number;
}

interface FocusContextType {
    mode: TimerMode;
    setMode: (mode: TimerMode) => void;
    pomoPhase: 'study' | 'break';
    setPomoPhase: (phase: 'study' | 'break') => void;
    customCountdownMinutes: number;
    setCustomCountdownMinutes: (mins: number) => void;
    status: FocusStatus;
    displaySeconds: number;
    elapsedSeconds: number;
    targetSeconds: number;
    laps: number[];
    pinnedTaskId: string | null;
    setPinnedTaskId: (id: string | null) => void;
    selectedSubject: string;
    setSelectedSubject: (subj: string) => void;

    // PiP & Modal Visibility
    isTimerOpen: boolean;
    setIsTimerOpen: (open: boolean) => void;
    isPiPVisible: boolean;
    minimizeToPiP: () => void;
    expandFromPiP: () => void;

    // Strict Lock & Interruption Tracking
    strictLockActive: boolean;
    toggleStrictLock: () => void;
    isGracePeriodActive: boolean;
    graceRemainingSeconds: number;
    interruptionCount: number;
    interruptionSeconds: number;

    // Audio
    activeSound: AmbientSoundType;
    setActiveSound: (sound: AmbientSoundType) => void;
    volume: number;
    setVolume: (vol: number) => void;

    // Active Live Group Room
    activeRoomCode: string | null;
    setActiveRoomCode: (code: string | null) => void;

    // Actions
    getElapsedSeconds: () => number;
    startTimer: () => void;
    pauseTimer: () => void;
    resumeTimer: () => void;
    recordLap: () => void;
    finishSession: (markTaskCompleted?: boolean, showPeakSummary?: boolean) => void;
    discardSession: () => void;
    startFocusForTask: (task: SubjectTask, mode?: TimerMode) => void;
    lastCompletionSummary: FocusCompletionSummary | null;
    clearCompletionSummary: () => void;
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);
const FocusTickContext = createContext<FocusTickContextType | undefined>(undefined);

export const FocusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const {
        isTimerOpen,
        setIsTimerOpen,
        tasks,
        settings,
        streakStats,
        completeFocusSynergy,
        showToast,
        db,
        user,
        userId,
    } = useStore();

    const [mode, setMode] = useState<TimerMode>('stopwatch');
    const [pomoPhase, setPomoPhase] = useState<'study' | 'break'>('study');
    const [customCountdownMinutes, setCustomCountdownMinutes] = useState<number>(45);
    const [status, setStatus] = useState<FocusStatus>('idle');

    // Monotonic clock tracking
    const [startEpochMs, setStartEpochMs] = useState<number | null>(null);
    const [accumulatedMs, setAccumulatedMs] = useState<number>(0);
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
    const elapsedSecondsRef = useRef<number>(0);
    const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);

    // Active (pause-excluded) study segments
    const activeSegmentsRef = useRef<StudySessionSegment[]>([]);
    const currentSegmentStartRef = useRef<number | null>(null);

    const [laps, setLaps] = useState<number[]>([]);
    const [pinnedTaskId, setPinnedTaskId] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string>('کار عمیق / تمرکز');
    const [isPiPVisible, setIsPiPVisible] = useState<boolean>(false);
    const [lastCompletionSummary, setLastCompletionSummary] = useState<FocusCompletionSummary | null>(null);

    const clearCompletionSummary = useCallback(() => setLastCompletionSummary(null), []);

    // Strict Lock & Grace Period
    const [strictLockActive, setStrictLockActive] = useState<boolean>(Boolean(settings?.strictLockEnabled));
    const [isGracePeriodActive, setIsGracePeriodActive] = useState<boolean>(false);
    const [graceRemainingSeconds, setGraceRemainingSeconds] = useState<number>(0);
    const [interruptionCount, setInterruptionCount] = useState<number>(0);
    const [interruptionSeconds, setInterruptionSeconds] = useState<number>(0);
    const hiddenAtRef = useRef<number | null>(null);
    const graceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const interruptionLoggedRef = useRef<boolean>(false);

    // Keep strictLockActive synced reactively whenever settings toggle updates
    useEffect(() => {
        setStrictLockActive(Boolean(settings?.strictLockEnabled));
    }, [settings?.strictLockEnabled]);

    // Soundscape
    const [activeSound, setActiveSound] = useState<AmbientSoundType>('none');
    const [volume, setVolume] = useState<number>(50);

    // Live Group Room Code (shared with FocusTimer & Leaderboard)
    const [activeRoomCode, setActiveRoomCode] = useState<string | null>(() => {
        try {
            return localStorage.getItem('parsaplan_active_room_code');
        } catch {
            return null;
        }
    });

    useEffect(() => {
        try {
            if (activeRoomCode) localStorage.setItem('parsaplan_active_room_code', activeRoomCode);
            else localStorage.removeItem('parsaplan_active_room_code');
        } catch {}
    }, [activeRoomCode]);

    const pinnedTask = tasks.find((t) => t.id === pinnedTaskId);

    // Target seconds calculation
    const workMins = settings?.pomodoroWorkMinutes || 25;
    const breakMins = settings?.pomodoroBreakMinutes || 5;
    const targetSeconds =
        mode === 'pomodoro'
            ? (pomoPhase === 'study' ? workMins : breakMins) * 60
            : mode === 'exam'
              ? (pinnedTask?.durationMinutes || 60) * 60
              : mode === 'countdown'
                ? customCountdownMinutes * 60
                : 3600;

    const displaySeconds =
        mode === 'stopwatch'
            ? elapsedSeconds
            : Math.max(0, targetSeconds - elapsedSeconds);

    // Sync Audio Engine
    useEffect(() => {
        if (activeSound === 'none') {
            focusAudioEngine.stop();
        } else {
            focusAudioEngine.playNoise(activeSound, volume / 100);
        }
    }, [activeSound]);

    useEffect(() => {
        focusAudioEngine.setVolume(volume / 100);
    }, [volume]);

    // Sync live room presence when status/task changes (NOT every second)
    useEffect(() => {
        if (!activeRoomCode || !db || !user || userId === 'parsaplan_local_user') return;
        const roomStatus = status === 'running' ? 'STUDYING' : status === 'paused' ? 'RESTING' : 'OFFLINE';
        const subj = pinnedTask ? pinnedTask.subject : selectedSubject;
        const topic = pinnedTask ? pinnedTask.topic : '';
        liveRoomService
            .updateMemberStatus(db, activeRoomCode, userId, roomStatus, subj, topic, elapsedSecondsRef.current)
            .catch(() => {});
    }, [status, activeRoomCode, db, user, userId, pinnedTask?.subject, pinnedTask?.topic, selectedSubject]);

    // Complete handler ref to avoid stale ticker callback
    const finishSessionInternal = useCallback(
        (markTaskCompleted = false, isAutoComplete = false) => {
            if (graceIntervalRef.current) {
                clearInterval(graceIntervalRef.current);
                graceIntervalRef.current = null;
            }
            setIsGracePeriodActive(false);
            setGraceRemainingSeconds(0);
            hiddenAtRef.current = null;
            interruptionLoggedRef.current = false;

            const now = Date.now();
            const currentElapsed =
                status === 'running' && startEpochMs
                    ? Math.floor((accumulatedMs + (now - startEpochMs)) / 1000)
                    : elapsedSecondsRef.current;

            const finalSeconds = isAutoComplete ? targetSeconds : currentElapsed;

            const finalSegments: StudySessionSegment[] = [...activeSegmentsRef.current];
            if (currentSegmentStartRef.current !== null && now > currentSegmentStartRef.current) {
                finalSegments.push({
                    startedAt: new Date(currentSegmentStartRef.current).toISOString(),
                    endedAt: new Date(now).toISOString(),
                });
            }
            activeSegmentsRef.current = [];
            currentSegmentStartRef.current = null;

            setStatus('idle');
            setStartEpochMs(null);
            setAccumulatedMs(0);
            setElapsedSeconds(0);
            elapsedSecondsRef.current = 0;
            setIsPiPVisible(false);
            focusAudioEngine.stop();
            setActiveSound('none');

            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }

            if (isAutoComplete) {
                focusAudioEngine.playBeep();
            }

            const isPomodoroStudy = mode === 'pomodoro' && pomoPhase === 'study';
            const isEarlyCancel = !isAutoComplete && isPomodoroStudy && finalSeconds < 60 && targetSeconds > 60;

            if (isEarlyCancel) {
                setStatus('failed');
                showToast('پارت تمرکز زودتر از ۱ دقیقه لغو شد!', 'warning');
                setTimeout(() => setStatus('idle'), 2000);
                setLaps([]);
                setInterruptionCount(0);
                setInterruptionSeconds(0);
                setSessionStartedAt(null);
                return;
            }

            if (finalSeconds >= 30 && !(mode === 'pomodoro' && pomoPhase === 'break')) {
                const currentTask = tasks.find((t) => t.id === pinnedTaskId);
                const subjectName = currentTask?.subject || selectedSubject || 'مطالعه آزاد';
                const result = buildSynergyCompletion(
                    {
                        subjectId: subjectName,
                        subjectName,
                        taskId: currentTask?.id,
                        taskTitle: currentTask?.topic,
                        durationSeconds: finalSeconds,
                        startedAt: sessionStartedAt || now - finalSeconds * 1000,
                        endedAt: now,
                        activeSegments: finalSegments,
                        mode,
                        laps,
                        interruptionCount,
                        interruptionSeconds,
                        cutoffHour: settings?.dayCutoffHour ?? 5,
                        currentStreak: streakStats?.currentStreak ?? 0,
                        markTaskCompleted,
                    },
                    currentTask
                );
                completeFocusSynergy(result);
                setLastCompletionSummary({
                    addedMinutes: result.addedMinutes,
                    xpEarned: result.xpEarned,
                    subjectName,
                    taskTitle: currentTask?.topic,
                });
                showToast(
                    `عالی بود! ${result.addedMinutes} دقیقه مطالعه ثبت شد (+${result.xpEarned} XP) 🎯`,
                    'success'
                );
                return result;
            } else if (mode === 'pomodoro' && pomoPhase === 'break') {
                showToast('زمان استراحت تمام شد. آماده شروع پارت بعدی! 💪', 'info');
            }

            setLaps([]);
            setInterruptionCount(0);
            setInterruptionSeconds(0);
            setSessionStartedAt(null);
            return null;
        },
        [
            status,
            startEpochMs,
            accumulatedMs,
            targetSeconds,
            mode,
            pomoPhase,
            tasks,
            pinnedTaskId,
            selectedSubject,
            sessionStartedAt,
            laps,
            interruptionCount,
            interruptionSeconds,
            settings?.dayCutoffHour,
            streakStats?.currentStreak,
            completeFocusSynergy,
            showToast,
        ]
    );

    const finishRef = useRef(finishSessionInternal);
    useEffect(() => {
        finishRef.current = finishSessionInternal;
    }, [finishSessionInternal]);

    // Global monotonic 1s ticker (only updates FocusTickContext subscribers)
    useEffect(() => {
        if (status !== 'running' || !startEpochMs) return;

        const tick = () => {
            const totalSecs = Math.floor((accumulatedMs + (Date.now() - startEpochMs)) / 1000);
            if (mode !== 'stopwatch' && totalSecs >= targetSeconds) {
                elapsedSecondsRef.current = targetSeconds;
                setElapsedSeconds(targetSeconds);
                finishRef.current(false, true);
                return;
            }
            elapsedSecondsRef.current = totalSecs;
            setElapsedSeconds(totalSecs);
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [status, startEpochMs, accumulatedMs, mode, targetSeconds]);

    // Web Strict Lock: Page Visibility API + Window Blur with 10s grace period
    useEffect(() => {
        if (!strictLockActive || status !== 'running') {
            if (graceIntervalRef.current) {
                clearInterval(graceIntervalRef.current);
                graceIntervalRef.current = null;
            }
            setIsGracePeriodActive(false);
            setGraceRemainingSeconds(0);
            hiddenAtRef.current = null;
            return;
        }

        const startAwayCountdown = () => {
            if (hiddenAtRef.current !== null) return;
            hiddenAtRef.current = Date.now();
            interruptionLoggedRef.current = false;
            setIsGracePeriodActive(true);
            setGraceRemainingSeconds(10);

            let rem = 10;
            graceIntervalRef.current = setInterval(() => {
                rem -= 1;
                if (rem <= 0) {
                    if (graceIntervalRef.current) clearInterval(graceIntervalRef.current);
                    graceIntervalRef.current = null;
                    if (!interruptionLoggedRef.current) {
                        interruptionLoggedRef.current = true;
                        setInterruptionCount((c) => c + 1);
                    }
                    setIsGracePeriodActive(false);
                    setGraceRemainingSeconds(0);
                } else {
                    setGraceRemainingSeconds(rem);
                }
            }, 1000);
        };

        const endAwayCountdown = () => {
            if (graceIntervalRef.current) {
                clearInterval(graceIntervalRef.current);
                graceIntervalRef.current = null;
            }
            if (hiddenAtRef.current !== null && interruptionLoggedRef.current) {
                const awaySecs = Math.floor((Date.now() - hiddenAtRef.current) / 1000);
                setInterruptionSeconds((s) => s + Math.max(10, awaySecs));
                showToast('خروج از صفحه تمرکز ثبت شد! تمرکزت را حفظ کن ⚡', 'warning');
            }
            hiddenAtRef.current = null;
            interruptionLoggedRef.current = false;
            setIsGracePeriodActive(false);
            setGraceRemainingSeconds(0);
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') {
                startAwayCountdown();
            } else {
                endAwayCountdown();
            }
        };

        const handleWindowBlur = () => {
            startAwayCountdown();
        };

        const handleWindowFocus = () => {
            if (document.visibilityState === 'visible') {
                endAwayCountdown();
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('blur', handleWindowBlur);
        window.addEventListener('focus', handleWindowFocus);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('blur', handleWindowBlur);
            window.removeEventListener('focus', handleWindowFocus);
        };
    }, [strictLockActive, status, showToast]);

    const startTimer = useCallback(() => {
        focusAudioEngine.init();
        const now = Date.now();
        activeSegmentsRef.current = [];
        currentSegmentStartRef.current = now;
        elapsedSecondsRef.current = 0;
        setLastCompletionSummary(null);
        setSessionStartedAt(now);
        setStartEpochMs(now);
        setAccumulatedMs(0);
        setElapsedSeconds(0);
        setLaps([]);
        setInterruptionCount(0);
        setInterruptionSeconds(0);
        setStatus('running');
        if (strictLockActive && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
        }
    }, [strictLockActive]);

    const pauseTimer = useCallback(() => {
        if (status !== 'running' || !startEpochMs) return;
        const now = Date.now();
        if (currentSegmentStartRef.current !== null && now > currentSegmentStartRef.current) {
            activeSegmentsRef.current.push({
                startedAt: new Date(currentSegmentStartRef.current).toISOString(),
                endedAt: new Date(now).toISOString(),
            });
            currentSegmentStartRef.current = null;
        }
        const nextAcc = accumulatedMs + (now - startEpochMs);
        const secs = Math.floor(nextAcc / 1000);
        elapsedSecondsRef.current = secs;
        setAccumulatedMs(nextAcc);
        setStartEpochMs(null);
        setElapsedSeconds(secs);
        setStatus('paused');
    }, [status, startEpochMs, accumulatedMs]);

    const resumeTimer = useCallback(() => {
        if (status !== 'paused') return;
        focusAudioEngine.init();
        const now = Date.now();
        currentSegmentStartRef.current = now;
        setStartEpochMs(now);
        setStatus('running');
    }, [status]);

    const recordLap = useCallback(() => {
        if (status !== 'running') return;
        setLaps((prev) => [...prev, elapsedSecondsRef.current]);
    }, [status]);

    const finishSession = useCallback(
        (markTaskCompleted = false, showPeakSummary = false) => {
            const result = finishSessionInternal(markTaskCompleted, false);
            if (!showPeakSummary || !result) {
                setIsTimerOpen(false);
            }
        },
        [finishSessionInternal, setIsTimerOpen]
    );

    const discardSession = useCallback(() => {
        if (graceIntervalRef.current) {
            clearInterval(graceIntervalRef.current);
            graceIntervalRef.current = null;
        }
        hiddenAtRef.current = null;
        interruptionLoggedRef.current = false;
        activeSegmentsRef.current = [];
        currentSegmentStartRef.current = null;
        elapsedSecondsRef.current = 0;

        setIsGracePeriodActive(false);
        setGraceRemainingSeconds(0);
        setInterruptionCount(0);
        setInterruptionSeconds(0);
        setSessionStartedAt(null);
        setStatus('idle');
        setStartEpochMs(null);
        setAccumulatedMs(0);
        setElapsedSeconds(0);
        setLaps([]);
        setIsPiPVisible(false);
        setIsTimerOpen(false);
        focusAudioEngine.stop();
        setActiveSound('none');
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
        showToast('جلسه تمرکز لغو شد', 'info');
    }, [setIsTimerOpen, showToast]);

    const minimizeToPiP = useCallback(() => {
        setIsTimerOpen(false);
        if (status === 'running' || status === 'paused') {
            setIsPiPVisible(true);
        }
    }, [setIsTimerOpen, status]);

    const expandFromPiP = useCallback(() => {
        setIsPiPVisible(false);
        setIsTimerOpen(true);
    }, [setIsTimerOpen]);

    const toggleStrictLock = useCallback(() => {
        setStrictLockActive((prev) => {
            const next = !prev;
            if (next && status === 'running' && document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else if (!next && document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }
            return next;
        });
    }, [status]);

    const startFocusForTask = useCallback(
        (task: SubjectTask, requestedMode?: TimerMode) => {
            const targetMode: TimerMode =
                requestedMode || (task.studyType === 'exam' ? 'exam' : 'pomodoro');

            setPinnedTaskId(task.id);
            setSelectedSubject(task.subject);
            setMode(targetMode);
            setPomoPhase('study');
            setIsPiPVisible(false);
            setIsTimerOpen(true);

            // Auto-start monotonic session immediately
            focusAudioEngine.init();
            const now = Date.now();
            activeSegmentsRef.current = [];
            currentSegmentStartRef.current = now;
            elapsedSecondsRef.current = 0;
            setSessionStartedAt(now);
            setStartEpochMs(now);
            setAccumulatedMs(0);
            setElapsedSeconds(0);
            setLaps([]);
            setInterruptionCount(0);
            setInterruptionSeconds(0);
            setStatus('running');
        },
        [setIsTimerOpen]
    );

    const getElapsedSeconds = useCallback(() => elapsedSecondsRef.current, []);

    const tickValue = useMemo<FocusTickContextType>(
        () => ({
            displaySeconds,
            elapsedSeconds,
            targetSeconds,
            laps,
            isGracePeriodActive,
            graceRemainingSeconds,
        }),
        [displaySeconds, elapsedSeconds, targetSeconds, laps, isGracePeriodActive, graceRemainingSeconds]
    );

    // Memoized main focus context: stays stable when only second ticker ticks!
    const focusValue = useMemo<FocusContextType>(
        () => ({
            mode,
            setMode,
            pomoPhase,
            setPomoPhase,
            customCountdownMinutes,
            setCustomCountdownMinutes,
            status,
            displaySeconds: elapsedSecondsRef.current > 0 && mode === 'stopwatch' ? elapsedSecondsRef.current : targetSeconds,
            elapsedSeconds: elapsedSecondsRef.current,
            targetSeconds,
            laps,
            pinnedTaskId,
            setPinnedTaskId,
            selectedSubject,
            setSelectedSubject,
            isTimerOpen,
            setIsTimerOpen,
            isPiPVisible,
            minimizeToPiP,
            expandFromPiP,
            strictLockActive,
            toggleStrictLock,
            isGracePeriodActive,
            graceRemainingSeconds,
            interruptionCount,
            interruptionSeconds,
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
            startFocusForTask,
            lastCompletionSummary,
            clearCompletionSummary,
        }),
        [
            mode,
            pomoPhase,
            customCountdownMinutes,
            status,
            targetSeconds,
            laps,
            pinnedTaskId,
            selectedSubject,
            isTimerOpen,
            setIsTimerOpen,
            isPiPVisible,
            minimizeToPiP,
            expandFromPiP,
            strictLockActive,
            toggleStrictLock,
            isGracePeriodActive,
            graceRemainingSeconds,
            interruptionCount,
            interruptionSeconds,
            activeSound,
            volume,
            activeRoomCode,
            getElapsedSeconds,
            startTimer,
            pauseTimer,
            resumeTimer,
            recordLap,
            finishSession,
            discardSession,
            startFocusForTask,
            lastCompletionSummary,
            clearCompletionSummary,
        ]
    );

    return (
        <FocusContext.Provider value={focusValue}>
            <FocusTickContext.Provider value={tickValue}>{children}</FocusTickContext.Provider>
        </FocusContext.Provider>
    );
};

export const useFocus = () => {
    const ctx = useContext(FocusContext);
    if (!ctx) throw new Error('useFocus must be used within FocusProvider');
    return ctx;
};

export const useOptionalFocus = (): FocusContextType | undefined => {
    return useContext(FocusContext);
};

export const useFocusTick = (): FocusTickContextType => {
    const tick = useContext(FocusTickContext);
    const fallback = useContext(FocusContext);
    if (tick) return tick;
    if (fallback) {
        return {
            displaySeconds: fallback.displaySeconds ?? fallback.elapsedSeconds ?? 0,
            elapsedSeconds: fallback.elapsedSeconds ?? 0,
            targetSeconds: fallback.targetSeconds ?? 3600,
            laps: fallback.laps ?? [],
            isGracePeriodActive: fallback.isGracePeriodActive ?? false,
            graceRemainingSeconds: fallback.graceRemainingSeconds ?? 0,
        };
    }
    throw new Error('useFocusTick must be used within FocusProvider');
};

export const useOptionalFocusTick = (): FocusTickContextType | undefined => {
    const tick = useContext(FocusTickContext);
    const fallback = useContext(FocusContext);
    if (tick) return tick;
    if (fallback) {
        return {
            displaySeconds: fallback.displaySeconds ?? fallback.elapsedSeconds ?? 0,
            elapsedSeconds: fallback.elapsedSeconds ?? 0,
            targetSeconds: fallback.targetSeconds ?? 3600,
            laps: fallback.laps ?? [],
            isGracePeriodActive: fallback.isGracePeriodActive ?? false,
            graceRemainingSeconds: fallback.graceRemainingSeconds ?? 0,
        };
    }
    return undefined;
};
