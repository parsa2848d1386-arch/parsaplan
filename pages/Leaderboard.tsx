import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useStore } from '../context/StoreContext';
import { FocusStatus, useFocus, useFocusTick } from '../context/FocusContext';
import {
    Trophy,
    Medal,
    Crown,
    TrendingUp,
    Users,
    RefreshCw,
    Eye,
    EyeOff,
    Loader2,
    X,
    BookOpen,
    Target,
    Search,
    Flame,
    Plus,
    Copy,
    Check,
    LogOut,
    Play,
    Pause,
    Send,
    Clock,
    Volume2,
    VolumeX,
    Radio,
    Sparkles,
    Mic,
    MicOff,
    Video,
    VideoOff,
    StopCircle,
    ArrowUpRight,
    Smile,
    Zap,
    CloudRain,
    Coffee,
    Wind,
    Headphones,
    MessageSquare,
    UserCheck,
    Heart,
    Info,
    Compass
} from 'lucide-react';
import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { formatToPersianDigits } from '../utils';
import { getLogicalDateKey } from '../utils/streakEngine';
import { LeaderboardRoomsSkeleton, LeaderboardListSkeleton } from '../components/Skeleton';
import { leaderboardApi, backendCache, ROOM_CATEGORIES } from '../services/backendApi';
import { liveRoomService } from '../services/liveRoomService';
import {
    runOptimisticMutation,
    applyPendingCheersToPeers,
    mergeOptimisticRoomMessages,
} from '../utils/optimisticMutation';
import { AmbientSoundType, LiveRoomInfo, LiveRoomMessage, LiveRoomPeer, PublicProfileDetail, PublicProfileSummary } from '../types';
import { STAGGER_CONTAINER_VARIANTS, STAGGER_ITEM_VARIANTS } from '../utils/motionPresets';
import { TactileDepthCard } from '../components/ui/MotionPrimitives';

const AMBIENT_SOUNDS: { id: AmbientSoundType; label: string }[] = [
    { id: 'rain', label: 'باران ملایم' },
    { id: 'fireplace', label: 'کافه و آتش' },
    { id: 'white', label: 'نویز سفید' },
    { id: 'binaural', label: 'لوفای تمرکز' },
];

const AVATAR_GRADIENTS = [
    'from-indigo-500 via-indigo-600 to-purple-600 text-white',
    'from-emerald-500 via-teal-600 to-green-600 text-white',
    'from-amber-500 via-orange-500 to-red-500 text-white',
    'from-rose-500 via-pink-600 to-purple-600 text-white',
    'from-sky-500 via-blue-600 to-indigo-600 text-white',
    'from-violet-500 via-purple-600 to-pink-600 text-white',
];

const getAvatarGradient = (name: string) => {
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % AVATAR_GRADIENTS.length;
    return AVATAR_GRADIENTS[idx];
};

const getInitials = (name: string) => {
    if (!name) return 'ک';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] || '') + ' ' + (parts[1][0] || '');
    }
    return name.slice(0, 2);
};

export const VectorAvatar: React.FC<{
    name: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}> = ({ name, className = '', size = 'md' }) => {
    const gradient = getAvatarGradient(name);
    const initials = getInitials(name);
    const sizeClasses = {
        sm: 'w-7 h-7 text-[10px]',
        md: 'w-10 h-10 text-xs',
        lg: 'w-14 h-14 text-sm',
        xl: 'w-16 h-16 sm:w-20 sm:h-20 text-base sm:text-xl',
    }[size];

    return (
        <div
            className={`rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center font-bold tracking-tight shadow-sm select-none shrink-0 ${sizeClasses} ${className}`}
            title={name}
        >
            <span>{initials}</span>
        </div>
    );
};

const renderSoundIcon = (id: AmbientSoundType) => {
    switch (id) {
        case 'rain': return <CloudRain size={14} />;
        case 'fireplace': return <Coffee size={14} />;
        case 'white': return <Wind size={14} />;
        case 'binaural': return <Headphones size={14} />;
        default: return <Volume2 size={14} />;
    }
};

const formatHMS = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const ActiveSessionTimerDisplay = React.memo<{ focusStatus: FocusStatus }>(({ focusStatus }) => {
    const { elapsedSeconds, targetSeconds } = useFocusTick();
    const ringRadius = 70;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const safeTargetSecs = Math.max(60, targetSeconds || 1500);
    const ringRatio = Math.min(1, elapsedSeconds / safeTargetSecs);
    const ringOffset = ringCircumference * (1 - ringRatio);

    return (
        <div className="relative w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center my-2 z-10">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                <circle
                    className="text-gray-100 dark:text-slate-800"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r={ringRadius}
                    stroke="currentColor"
                    strokeWidth="8"
                />
                <circle
                    className="text-indigo-600 dark:text-indigo-400 transition-all duration-300 ease-[cubic-bezier(0.42,0,0.58,1)]"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r={ringRadius}
                    stroke="currentColor"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                    strokeWidth="9"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl sm:text-4xl text-gray-900 dark:text-white font-bold tracking-tight tabular-nums" dir="ltr">
                    {formatHMS(elapsedSeconds)}
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-1 font-bold">
                    {focusStatus === 'running' && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true"></span>
                    )}
                    {focusStatus === 'running' ? 'در حال تمرکز عمیق' : focusStatus === 'paused' ? 'متوقف‌شده' : 'آماده برای شروع'}
                </span>
            </div>
        </div>
    );
});
ActiveSessionTimerDisplay.displayName = 'ActiveSessionTimerDisplay';

const TodayStudyTotalDisplay = React.memo<{
    baseTodaySeconds: number;
    focusStatus: FocusStatus;
}>(({ baseTodaySeconds, focusStatus }) => {
    const { elapsedSeconds } = useFocusTick();
    const total = baseTodaySeconds + (focusStatus === 'running' ? elapsedSeconds : 0);
    return <>{formatHMS(total)}</>;
});
TodayStudyTotalDisplay.displayName = 'TodayStudyTotalDisplay';

export const Leaderboard = () => {
    const prefersReducedMotion = useReducedMotion();
    const {
        user,
        userId,
        db,
        userName,
        xp,
        level,
        currentLevelXp,
        xpForNextLevel,
        progressPercent,
        streakStats,
        sessions,
        getProgress,
        tasks,
        showToast,
        askConfirm,
        settings,
        studyMinutesByDate,
        isDemoActive,
        dismissDemoMode,
    } = useStore();

    const {
        activeRoomCode,
        setActiveRoomCode,
        status: focusStatus,
        selectedSubject,
        activeSound,
        setActiveSound,
        setIsTimerOpen,
        getElapsedSeconds,
        startTimer,
        pauseTimer,
        finishSession
    } = useFocus();

    // Primary Page Tab ('rooms' YPT vs 'ranking' Leaderboard)
    const [activeSection, setActiveSection] = useState<'rooms' | 'ranking'>('rooms');

    // Local mic/cam preview indicators (no audio transmission; room-only UI indicator)
    const [isMicMuted, setIsMicMuted] = useState(true);
    const [isCamMuted, setIsCamMuted] = useState(true);

    // --- Scalable Paginated Leaderboard State ---
    const [leaderboardData, setLeaderboardData] = useState<PublicProfileSummary[]>([]);
    const [isLoadingLb, setIsLoadingLb] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreLb, setHasMoreLb] = useState(false);
    const [lbCursor, setLbCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [isMyProfilePublic, setIsMyProfilePublic] = useState(false);
    const [isTogglingPublic, setIsTogglingPublic] = useState(false);
    const [sortBy, setSortBy] = useState<'xp' | 'exam'>('xp');
    const [searchQuery, setSearchQuery] = useState('');

    // Profile Viewer Modal (<dialog>)
    const [viewingProfile, setViewingProfile] = useState<PublicProfileDetail | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const profileDialogRef = useRef<HTMLDialogElement>(null);

    // --- YPT Study Rooms State ---
    const [publicRooms, setPublicRooms] = useState<LiveRoomInfo[]>([]);
    const [isLoadingRooms, setIsLoadingRooms] = useState(false);
    const [roomSearch, setRoomSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('همه');
    const [joinCodeInput, setJoinCodeInput] = useState('');
    const [roomActionLoading, setRoomActionLoading] = useState(false);

    // Active Joined Room State
    const [activeRoomInfo, setActiveRoomInfo] = useState<LiveRoomInfo | null>(null);
    const [roomPeers, setRoomPeers] = useState<LiveRoomPeer[]>([]);
    const [roomMessages, setRoomMessages] = useState<LiveRoomMessage[]>([]);
    const [roomChatText, setRoomChatText] = useState('');
    const [copiedCode, setCopiedCode] = useState(false);

    // Create Room Modal (<dialog>)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const createRoomDialogRef = useRef<HTMLDialogElement>(null);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomCategory, setNewRoomCategory] = useState<string>(ROOM_CATEGORIES[0]);
    const [newRoomDesc, setNewRoomDesc] = useState('');
    const [newRoomTargetHours, setNewRoomTargetHours] = useState(4);
    const [newRoomMaxMembers, setNewRoomMaxMembers] = useState(25);
    const [newRoomIsPublic, setNewRoomIsPublic] = useState(true);

    // Parkinson's Law: Smart pre-fill room fields from user context
    const openCreateRoomModal = useCallback(() => {
        if (!newRoomName.trim()) {
            const prefix = selectedSubject
                ? `اتاق تمرکز ${selectedSubject}`
                : userName
                  ? `اتاق مطالعه ${userName}`
                  : 'اتاق تمرکز روزانه';
            setNewRoomName(prefix);
        }
        const streamCategoryMap: Record<string, string> = {
            riazi: 'کنکور ریاضی',
            tajrobi: 'کنکور تجربی',
            ensani: 'کنکور انسانی',
        };
        if (settings?.stream && streamCategoryMap[settings.stream]) {
            setNewRoomCategory(streamCategoryMap[settings.stream]);
        } else {
            setNewRoomCategory(ROOM_CATEGORIES[0]);
        }
        const suggestedHours = Math.max(1, Math.min(16, Math.round((settings?.dailyCapacityMinutes ?? 360) / 60)));
        setNewRoomTargetHours(suggestedHours);
        setIsCreateModalOpen(true);
    }, [newRoomName, selectedSubject, userName, settings?.stream, settings?.dailyCapacityMinutes]);

    const isCloudAuthenticated = Boolean(db && user && userId && userId !== 'parsaplan_local_user');

    const logicalTodayKey = useMemo(
        () => getLogicalDateKey(new Date(), settings?.dayCutoffHour ?? 5),
        [settings?.dayCutoffHour]
    );

    const baseTodayStudySeconds = useMemo(() => {
        return Math.max(0, Math.round((studyMinutesByDate?.[logicalTodayKey] || 0) * 60));
    }, [studyMinutesByDate, logicalTodayKey]);

    const todayCompletedPomodoros = useMemo(() => {
        const pomoSessions = (sessions || []).filter((s) => s.logicalDate === logicalTodayKey && s.mode === 'pomodoro');
        return pomoSessions.length;
    }, [sessions, logicalTodayKey]);

    const dailyTargetPomodoros = useMemo(() => {
        const capacityMins = settings?.dailyCapacityMinutes ?? 360;
        const workMins = settings?.pomodoroWorkMinutes ?? 25;
        return Math.max(1, Math.round(capacityMins / Math.max(10, workMins)));
    }, [settings?.dailyCapacityMinutes, settings?.pomodoroWorkMinutes]);

    // Calculate Lean User Stats
    const myStats: PublicProfileSummary = useMemo(() => {
        const completedTasks = tasks.filter((t) => t.isCompleted);
        const examTasks = completedTasks.filter((t) => t.studyType === 'exam' && t.testStats && t.testStats.total > 0);
        let examAvg = 0;
        if (examTasks.length > 0) {
            const sum = examTasks.reduce((acc, t) => {
                const total = t.testStats!.total;
                const correct = t.testStats!.correct;
                const wrong = t.testStats!.wrong;
                const pct = total > 0 ? Math.round(((correct * 3 - wrong) / (total * 3)) * 100) : 0;
                return acc + (pct > 0 ? pct : 0);
            }, 0);
            examAvg = Math.round(sum / examTasks.length);
        }

        return {
            id: user?.uid || 'local',
            userName: userName || 'کاربر پارسا پلن',
            xp,
            level,
            progress: getProgress(),
            tasksCompleted: completedTasks.length,
            totalTasks: tasks.length,
            lastActive: Date.now(),
            examAverage: examAvg,
        };
    }, [user?.uid, userName, xp, level, getProgress, tasks]);

    // Sync Native Dialog Open/Close Safely & listen to native close (ESC/backdrop)
    useEffect(() => {
        const el = createRoomDialogRef.current;
        if (!el) return;
        const onNativeClose = () => setIsCreateModalOpen(false);
        el.addEventListener('close', onNativeClose);
        if (isCreateModalOpen) {
            el.returnValue = '';
            el.setAttribute('closedby', 'any');
            if (typeof el.showModal === 'function') {
                if (!el.open) el.showModal();
            } else {
                el.setAttribute('open', '');
            }
        } else {
            if (typeof el.close === 'function') {
                if (el.open) el.close();
            } else {
                el.removeAttribute('open');
            }
            el.returnValue = '';
        }
        return () => el.removeEventListener('close', onNativeClose);
    }, [isCreateModalOpen]);

    useEffect(() => {
        const el = profileDialogRef.current;
        if (!el) return;
        const onNativeClose = () => setViewingProfile(null);
        el.addEventListener('close', onNativeClose);
        if (viewingProfile) {
            el.returnValue = '';
            el.setAttribute('closedby', 'any');
            if (typeof el.showModal === 'function') {
                if (!el.open) el.showModal();
            } else {
                el.setAttribute('open', '');
            }
        } else {
            if (typeof el.close === 'function') {
                if (el.open) el.close();
            } else {
                el.removeAttribute('open');
            }
            el.returnValue = '';
        }
        return () => el.removeEventListener('close', onNativeClose);
    }, [viewingProfile]);

    const leaderboardQuerySeqRef = useRef(0);
    const pendingCheerDeltasRef = useRef(new Map<string, number>());
    const pendingRoomMessagesRef = useRef<LiveRoomMessage[]>([]);

    // Load Paginated Leaderboard (with out-of-order response protection)
    const loadLeaderboardPage = useCallback(
        async (forceRefresh = false) => {
            if (!db || !isCloudAuthenticated) {
                setLeaderboardData([]);
                setIsLoadingLb(false);
                return;
            }
            const querySeq = ++leaderboardQuerySeqRef.current;
            setIsLoadingLb(true);
            const res = await leaderboardApi.fetchPage(db, { sortBy, pageSize: 25, forceRefresh });
            if (querySeq !== leaderboardQuerySeqRef.current) return;
            if (res.ok) {
                setLeaderboardData(res.data.items);
                setLbCursor(res.data.nextCursor);
                setHasMoreLb(res.data.hasMore);
            } else if (res.error.code !== 'permission-denied') {
                showToast(res.error.message, 'error');
            }
            setIsLoadingLb(false);
        },
        [db, isCloudAuthenticated, sortBy, showToast]
    );

    const loadMoreLeaderboard = async () => {
        if (!db || !isCloudAuthenticated || !lbCursor || isLoadingMore) return;
        setIsLoadingMore(true);
        const res = await leaderboardApi.fetchPage(db, { sortBy, pageSize: 25, cursor: lbCursor });
        if (res.ok) {
            setLeaderboardData((prev) => {
                const seen = new Set(prev.map((p) => p.id));
                const next = res.data.items.filter((item) => !seen.has(item.id));
                return [...prev, ...next];
            });
            setLbCursor(res.data.nextCursor);
            setHasMoreLb(res.data.hasMore);
        }
        setIsLoadingMore(false);
    };

    // Load Public YPT Rooms
    const loadPublicRooms = useCallback(
        async (forceRefresh = false) => {
            if (!db || !isCloudAuthenticated) {
                setPublicRooms([]);
                setIsLoadingRooms(false);
                return;
            }
            setIsLoadingRooms(true);
            const res = await liveRoomService.listPublicRooms(db, undefined, forceRefresh);
            if (res.ok) {
                setPublicRooms(res.data);
            } else if (res.error.code !== 'permission-denied') {
                showToast(res.error.message, 'error');
            }
            setIsLoadingRooms(false);
        },
        [db, isCloudAuthenticated, showToast]
    );

    // Check own public profile status once on login & load initial cached lists
    useEffect(() => {
        if (!db || !isCloudAuthenticated) {
            setIsLoadingLb(false);
            setIsLoadingRooms(false);
            return;
        }
        if (user?.uid) {
            const checkFn = leaderboardApi?.checkIsPublic || leaderboardApi?.isProfilePublic;
            if (typeof checkFn === 'function') {
                checkFn.call(leaderboardApi, db, user.uid)
                    .then((isPub) => setIsMyProfilePublic(!!isPub))
                    .catch(() => setIsMyProfilePublic(false));
            }
        }
        loadLeaderboardPage();
        loadPublicRooms();
    }, [db, isCloudAuthenticated, user?.uid, loadLeaderboardPage, loadPublicRooms]);

    // Listen to Active Room (Peers, Messages & Info)
    useEffect(() => {
        if (!db || !activeRoomCode || !isCloudAuthenticated) {
            setActiveRoomInfo(null);
            setRoomPeers([]);
            setRoomMessages([]);
            return;
        }

        const unsubPeers = liveRoomService.subscribeRoomMembers(
            db,
            activeRoomCode,
            (peers) => setRoomPeers(applyPendingCheersToPeers(peers, pendingCheerDeltasRef.current)),
            () => {}
        );

        const unsubMessages = liveRoomService.subscribeRoomMessages(
            db,
            activeRoomCode,
            (msgs) => setRoomMessages(mergeOptimisticRoomMessages(msgs, pendingRoomMessagesRef.current)),
            (err) => console.warn('[Leaderboard] Room messages listener:', err)
        );

        liveRoomService
            .getGroupRoom(db, activeRoomCode)
            .then((res) => {
                if (res) {
                    setActiveRoomInfo(res);
                }
            })
            .catch(() => {});

        return () => {
            unsubPeers();
            unsubMessages();
        };
    }, [db, activeRoomCode, isCloudAuthenticated]);

    // Keep active peer presence heartbeat synced on discrete state changes + 45s interval (prevents 1s Firestore spam)
    const latestTelemetryRef = useRef({
        baseDailyStudySeconds: 0,
        userName: 'کاربر پارساپلن',
        selectedSubject: 'مطالعه آزاد',
        focusStatus: 'idle' as string,
    });

    latestTelemetryRef.current = {
        baseDailyStudySeconds: baseTodayStudySeconds,
        userName: userName || 'کاربر پارساپلن',
        selectedSubject: selectedSubject || 'مطالعه آزاد',
        focusStatus,
    };

    useEffect(() => {
        if (!db || !activeRoomCode || !userId || !isCloudAuthenticated) return;

        const pushPresence = () => {
            const snap = latestTelemetryRef.current;
            const currentElapsed = getElapsedSeconds ? getElapsedSeconds() : 0;
            const currentDaily = snap.baseDailyStudySeconds + (snap.focusStatus === 'running' ? currentElapsed : 0);
            liveRoomService
                .upsertMemberPresence(db, activeRoomCode, {
                    uid: userId,
                    displayName: snap.userName,
                    avatar: '🎓',
                    status: snap.focusStatus === 'running' ? 'STUDYING' : 'RESTING',
                    activeSubject: snap.selectedSubject,
                    elapsedSeconds: currentElapsed,
                    dailyStudySeconds: currentDaily,
                    cheersReceived: 0,
                    lastPing: Date.now(),
                })
                .catch(() => {});
        };

        pushPresence();
        const heartbeat = setInterval(pushPresence, 45_000);
        return () => clearInterval(heartbeat);
    }, [db, activeRoomCode, userId, isCloudAuthenticated, userName, focusStatus, selectedSubject, getElapsedSeconds]);

    // Handle Public Profile Toggle (Optimistic Update + Snapshot/Rollback + Race-Condition Guard)
    const handleTogglePublic = async () => {
        if (!db || !user?.uid) {
            showToast('برای انتشار رتبه ابتدا وارد حساب کاربری شوید.', 'error');
            return;
        }
        const uid = user.uid;
        const targetNextPublic = !isMyProfilePublic;

        await runOptimisticMutation({
            mutationKey: `toggle_public_${uid}`,
            cancelQueries: () => {
                leaderboardQuerySeqRef.current += 1;
                backendCache.cancelInFlight('lb_');
            },
            onMutate: () => {
                const prevIsPublic = isMyProfilePublic;
                const prevLeaderboard = leaderboardData;

                setIsMyProfilePublic(targetNextPublic);
                setLeaderboardData((prev) => {
                    if (targetNextPublic) {
                        const withoutMe = prev.filter((item) => item.id !== uid);
                        return [myStats, ...withoutMe].sort((a, b) =>
                            sortBy === 'exam' ? (b.examAverage || 0) - (a.examAverage || 0) : (b.xp || 0) - (a.xp || 0)
                        );
                    }
                    return prev.filter((item) => item.id !== uid);
                });
                showToast(
                    targetNextPublic
                        ? 'پروفایل شما در لیگ عمومی فعال شد 🏆'
                        : 'پروفایل شما از جدول رتبه‌بندی عمومی برداشته شد.',
                    targetNextPublic ? 'success' : 'info'
                );

                return { prevIsPublic, prevLeaderboard };
            },
            mutationFn: async () => {
                const res = targetNextPublic
                    ? await leaderboardApi.publishProfile(db, uid, myStats, tasks)
                    : await leaderboardApi.unpublishProfile(db, uid);
                if (!res.ok) {
                    throw new Error(res.error.message);
                }
                return res;
            },
            onError: (err, snapshot) => {
                setIsMyProfilePublic(snapshot.prevIsPublic);
                setLeaderboardData(snapshot.prevLeaderboard);
                const msg = err instanceof Error ? err.message : 'خطا در تغییر وضعیت پروفایل عمومی';
                showToast(msg, 'error');
            },
            onSettled: async () => {
                backendCache.invalidate('lb_');
                await loadLeaderboardPage(true);
            },
        });
    };

    // Open Profile Viewer Modal
    const handleOpenProfile = async (targetUserId: string) => {
        if (!db) return;
        setIsLoadingProfile(true);
        const res = await leaderboardApi.fetchProfileDetail(db, targetUserId);
        if (res.ok && res.data) {
            setViewingProfile(res.data);
        } else {
            showToast('اطلاعات تفصیلی این کاربر در دسترس نیست.', 'error');
        }
        setIsLoadingProfile(false);
    };

    // Join a Room by Code
    const handleJoinRoom = async (code: string) => {
        const cleanCode = code.trim().toUpperCase();
        if (!cleanCode) return;
        if (!db || !userId) {
            showToast('برای پیوستن به اتاق ابتدا وارد حساب شوید.', 'error');
            return;
        }
        setRoomActionLoading(true);
        try {
            const currentSubj = selectedSubject || 'مطالعه آزاد';
            const currentElapsed = getElapsedSeconds ? getElapsedSeconds() : 0;
            const currentDaily = baseTodayStudySeconds + (focusStatus === 'running' ? currentElapsed : 0);
            await liveRoomService.upsertMemberPresence(db, cleanCode, {
                uid: userId,
                displayName: userName || 'دانش‌آموز',
                avatar: '🎓',
                status: focusStatus === 'running' ? 'STUDYING' : 'RESTING',
                activeSubject: currentSubj,
                elapsedSeconds: currentElapsed,
                dailyStudySeconds: currentDaily,
                cheersReceived: 0,
                lastPing: Date.now(),
            });
            setActiveRoomCode(cleanCode);
            showToast(`با موفقیت وارد اتاق ${cleanCode} شدید!`, 'success');
            setJoinCodeInput('');
        } catch (err: any) {
            showToast(err?.message || 'خطا در ورود به اتاق', 'error');
        }
        setRoomActionLoading(false);
    };

    // Leave Current Room
    const handleLeaveActiveRoom = async () => {
        if (!db || !activeRoomCode || !userId) return;
        askConfirm('خروج از اتاق', 'آیا مطمئنید که می‌خواهید از اتاق مطالعه خارج شوید؟', async () => {
            await liveRoomService.leaveGroupRoom(db, activeRoomCode, userId);
            setActiveRoomCode(null);
            showToast('از اتاق مطالعه خارج شدید.', 'info');
        });
    };

    // Create New Room
    const handleCreateRoomSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !userId) {
            showToast('برای ایجاد اتاق مطالعه آنلاین وارد حساب کاربری شوید.', 'error');
            return;
        }
        if (!newRoomName.trim()) {
            showToast('لطفاً عنوان اتاق را مشخص کنید.', 'error');
            return;
        }
        setRoomActionLoading(true);
        const res = await liveRoomService.createRoomSafe(db, {
            name: newRoomName.trim(),
            category: newRoomCategory,
            description: newRoomDesc.trim(),
            targetHours: newRoomTargetHours,
            maxMembers: newRoomMaxMembers,
            isPublic: newRoomIsPublic,
            creatorId: userId,
            creatorName: userName || 'دانش‌آموز',
        });
        if (res.ok) {
            showToast(`اتاق "${newRoomName}" با کد ${res.data.code} با موفقیت ساخته شد! 🎉`, 'success');
            setIsCreateModalOpen(false);
            setNewRoomName('');
            setNewRoomDesc('');
            loadPublicRooms(true);
            handleJoinRoom(res.data.code);
        } else {
            showToast(res.error.message, 'error');
        }
        setRoomActionLoading(false);
    };

    const sendOptimisticRoomText = async (rawText: string, clearInput: boolean, toastInfo?: string) => {
        if (!db || !activeRoomCode || !userId || !rawText.trim()) return;
        const text = rawText.trim().slice(0, 300);
        const optimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const optimisticMsg: LiveRoomMessage = {
            id: optimisticId,
            senderId: userId,
            senderName: userName || 'دانش‌آموز',
            text,
            createdAt: Date.now(),
        };

        await runOptimisticMutation({
            mutationKey: `room_msg_${activeRoomCode}_${optimisticId}`,
            onMutate: () => {
                const prevMessages = roomMessages;
                const prevInput = clearInput ? roomChatText : '';
                if (clearInput) setRoomChatText('');
                pendingRoomMessagesRef.current = [...pendingRoomMessagesRef.current, optimisticMsg];
                setRoomMessages((prev) => [...prev, optimisticMsg]);
                if (toastInfo) showToast(toastInfo, 'info');
                return { prevMessages, prevInput };
            },
            mutationFn: async () => {
                const res = await liveRoomService.sendRoomMessage(db, activeRoomCode, userId, userName || 'دانش‌آموز', text);
                if (res.throttled) {
                    throw new Error('لطفاً لحظه‌ای صبر کنید و دوباره ارسال کنید.');
                }
                return res;
            },
            onError: (err, snapshot) => {
                pendingRoomMessagesRef.current = pendingRoomMessagesRef.current.filter((m) => m.id !== optimisticId);
                setRoomMessages(snapshot.prevMessages);
                if (clearInput && snapshot.prevInput) {
                    setRoomChatText(snapshot.prevInput);
                }
                showToast(err instanceof Error ? err.message : 'ارسال پیام ناموفق بود.', 'error');
            },
            onSettled: async () => {
                pendingRoomMessagesRef.current = pendingRoomMessagesRef.current.filter((m) => m.id !== optimisticId);
                const serverMsgs = await liveRoomService.fetchRoomMessagesOnce(db, activeRoomCode).catch(() => null);
                if (serverMsgs) {
                    setRoomMessages(mergeOptimisticRoomMessages(serverMsgs, pendingRoomMessagesRef.current));
                }
            },
        });
    };

    // Send Room Chat Message (Optimistic Update)
    const handleSendRoomChat = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!roomChatText.trim()) return;
        await sendOptimisticRoomText(roomChatText, true);
    };

    // Send Quick Emoji Reaction (Optimistic Update)
    const handleSendReaction = async (emoji: string) => {
        await sendOptimisticRoomText(emoji, false, `انگیزه ارسال شد: ${emoji}`);
    };

    // Copy Room Code
    const handleCopyRoomCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(true);
        showToast('کد اتاق کپی شد!', 'success');
        setTimeout(() => setCopiedCode(false), 2000);
    };

    // Filtered public rooms for YPT Room Directory
    const filteredPublicRooms = useMemo(() => {
        return publicRooms.filter((r) => {
            const matchesCat = selectedCategory === 'همه' || r.category === selectedCategory;
            const q = roomSearch.trim().toLowerCase();
            const matchesSearch =
                !q ||
                r.name.toLowerCase().includes(q) ||
                r.code.toLowerCase().includes(q) ||
                (r.description || '').toLowerCase().includes(q);
            return matchesCat && matchesSearch;
        });
    }, [publicRooms, selectedCategory, roomSearch]);

    // Sorted live room peers & self rank
    const sortedPeers = useMemo(() => {
        return [...roomPeers].sort((a, b) => (b.dailyStudySeconds || 0) - (a.dailyStudySeconds || 0));
    }, [roomPeers]);

    const myRoomRank = useMemo(() => {
        const idx = sortedPeers.findIndex((p) => p.uid === userId);
        return idx >= 0 ? idx + 1 : null;
    }, [sortedPeers, userId]);

    // Real league rank if user is in loaded leaderboardData
    const myLeagueRank = useMemo(() => {
        if (!user?.uid) return null;
        const idx = leaderboardData.findIndex((item) => item.id === user.uid);
        return idx >= 0 ? idx + 1 : null;
    }, [leaderboardData, user?.uid]);

    const filteredLeaderboard = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return leaderboardData.filter((p) => !q || (p.userName || '').toLowerCase().includes(q));
    }, [leaderboardData, searchQuery]);

    const safeXpForNext = xpForNextLevel || Math.max(100, (currentLevelXp || 0) + 100);
    const safeProgressPct = typeof progressPercent === 'number' ? Math.min(100, Math.max(0, progressPercent)) : 0;
    const xpRemaining = Math.max(0, safeXpForNext - (currentLevelXp || 0));

    // Cheer peer in active room (Optimistic Update + Snapshot/Rollback + Server Sync)
    const handleCheerPeer = async (peer: LiveRoomPeer) => {
        if (!db || !activeRoomCode || !peer.uid || peer.uid === userId) return;
        const roomCode = activeRoomCode;
        const targetUid = peer.uid;

        await runOptimisticMutation({
            mutationKey: `cheer_${roomCode}_${targetUid}`,
            onMutate: () => {
                const prevPeers = roomPeers;
                pendingCheerDeltasRef.current.set(
                    targetUid,
                    (pendingCheerDeltasRef.current.get(targetUid) || 0) + 1
                );
                setRoomPeers((prev) =>
                    prev.map((p) => (p.uid === targetUid ? { ...p, cheersReceived: (p.cheersReceived || 0) + 1 } : p))
                );
                showToast(`انرژی مثبت برای ${peer.displayName} ارسال شد! 👏`, 'success');
                return { prevPeers };
            },
            mutationFn: async () => {
                const res = await liveRoomService.sendCheer(db, roomCode, targetUid);
                if (res.throttled) {
                    throw new Error('لطفاً کمی صبر کنید و دوباره تشویق بفرستید.');
                }
                return res;
            },
            onError: (err, snapshot) => {
                const currentDelta = pendingCheerDeltasRef.current.get(targetUid) || 0;
                if (currentDelta <= 1) pendingCheerDeltasRef.current.delete(targetUid);
                else pendingCheerDeltasRef.current.set(targetUid, currentDelta - 1);

                setRoomPeers(snapshot.prevPeers);
                showToast(err instanceof Error ? err.message : 'ارسال تشویق با خطا مواجه شد.', 'error');
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

    const handleToggleAmbient = (soundId: AmbientSoundType) => {
        if (!setActiveSound) return;
        if (activeSound === soundId) {
            setActiveSound('none');
        } else {
            setActiveSound(soundId);
        }
    };

    return (
        <div className="flex flex-col w-full p-3 xs:p-4 sm:p-5 md:p-6 lg:p-8 gap-4 sm:gap-6 max-app-container">
            {/* Top Gamification Banner (Principle 17: Solid Drawing Tactile 3D Depth) */}
            <TactileDepthCard className="rounded-2xl">
            <div className="bento-card-interactive relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-4 sm:p-6 border border-gray-100 dark:border-slate-800">
                <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_12%,rgba(99,102,241,0.10)_0%,transparent_48%),radial-gradient(circle_at_88%_90%,rgba(16,185,129,0.10)_0%,transparent_48%)]"
                />

                <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-6">
                    {/* Player Profile & Status Badges */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="relative shrink-0">
                            <VectorAvatar name={userName || 'کاربر پارساپلن'} size="xl" />
                            <span className="absolute -bottom-2 -left-2 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5 font-bold">
                                <Zap size={13} className="fill-current" />
                                {formatToPersianDigits(level)}
                            </span>
                        </div>

                        <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <h1 className="text-lg sm:text-2xl md:text-3xl text-gray-900 dark:text-white font-bold tracking-tight truncate">
                                    {userName || 'کاربر پارساپلن'}
                                </h1>
                                <span className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-semibold border border-indigo-200/60 dark:border-indigo-700/40">
                                    {level >= 10 ? 'استاد تمرکز عمیق' : level >= 5 ? 'پژوهشگر متمرکز' : 'هم‌پای رو‌به‌رشد'}
                                </span>
                                <span className="bg-emerald-600 text-white text-[10px] sm:text-xs px-2 py-0.5 rounded-md flex items-center gap-0.5 font-bold">
                                    <Medal size={13} />
                                    سطح {formatToPersianDigits(level)}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                                <span>
                                    وضعیت لیگ:{' '}
                                    <strong className="text-gray-800 dark:text-slate-100 font-semibold">
                                        {isMyProfilePublic ? 'پروفایل عمومی فعال' : 'خصوصی (غیرعمومی)'}
                                    </strong>
                                </span>
                                <span className="text-gray-300 dark:text-slate-600">•</span>
                                <span>
                                    {myLeagueRank
                                        ? `رتبه فعلی شما: #${formatToPersianDigits(myLeagueRank)}`
                                        : isCloudAuthenticated
                                          ? 'برای ثبت رتبه پروفایل عمومی را فعال کنید'
                                          : 'حالت آفلاین / محلی'}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Live Streak & Level XP Gauge */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-gray-50 dark:bg-slate-800/80 px-4 py-2.5 rounded-xl flex items-center gap-3 border border-gray-200/70 dark:border-slate-700/60">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                <Flame size={22} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold tracking-wide">زنجیره پیوستگی</span>
                                <span className="text-sm text-gray-900 dark:text-white font-bold">
                                    {formatToPersianDigits(streakStats?.currentStreak ?? 0)} روز مداوم
                                </span>
                            </div>
                        </div>

                        <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 px-4 py-2.5 rounded-xl flex items-center gap-3 border border-emerald-200/70 dark:border-emerald-800/40">
                            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">
                                <Clock size={18} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-semibold opacity-80">مطالعه امروز</span>
                                <span className="text-sm font-bold tabular-nums" dir="ltr">
                                    <TodayStudyTotalDisplay baseTodaySeconds={baseTodayStudySeconds} focusStatus={focusStatus} />
                                </span>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-slate-800/80 p-3 rounded-xl flex flex-col gap-1.5 min-w-[230px] border border-gray-200/70 dark:border-slate-700/60">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 dark:text-slate-300 flex items-center gap-1">
                                    <Sparkles size={14} className="text-indigo-500" />
                                    پیشرفت سطح {formatToPersianDigits(level + 1)}
                                </span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                                    {formatToPersianDigits(xp)} XP
                                </span>
                            </div>
                            <div className="w-full h-2.5 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden p-0.5">
                                <div
                                    className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300 ease-[cubic-bezier(0.42,0,0.58,1)]"
                                    style={{ width: `${safeProgressPct}%` }}
                                ></div>
                            </div>
                            <span className="text-[11px] text-gray-500 dark:text-slate-400 self-end">
                                {formatToPersianDigits(xpRemaining)} XP تا سطح بعدی
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            </TactileDepthCard>

            {/* Section Switcher Tabs (YPT Study Rooms vs Competitive League) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-container-lowest dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-outline-variant/30">
                <div
                    role="tablist"
                    aria-label="بخش‌های لیگ و اتاق مطالعه"
                    className="flex items-center gap-2 p-1 bg-surface-container-low dark:bg-slate-800 rounded-xl"
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeSection === 'rooms'}
                        onClick={() => setActiveSection('rooms')}
                        className={`min-h-[44px] flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg text-label-md font-label-md transition-all cursor-pointer ${
                            activeSection === 'rooms'
                                ? 'bg-primary text-on-primary font-bold shadow-sm'
                                : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <Users size={18} aria-hidden="true" />
                        <span>
                            اتاق مطالعه زنده <bdi>YPT</bdi>
                        </span>
                        <span className="w-2 h-2 rounded-full bg-secondary" aria-hidden="true"></span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeSection === 'ranking'}
                        onClick={() => setActiveSection('ranking')}
                        className={`min-h-[44px] flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg text-label-md font-label-md transition-all cursor-pointer ${
                            activeSection === 'ranking'
                                ? 'bg-primary text-on-primary font-bold shadow-sm'
                                : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <Trophy size={18} aria-hidden="true" />
                        <span>رده‌بندی زنده لیگ الماس</span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {activeSection === 'rooms' ? (
                        <button
                            onClick={openCreateRoomModal}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-on-secondary font-label-sm text-label-sm font-bold shadow-xs hover:bg-secondary/90 transition-all active:scale-95 cursor-pointer"
                        >
                            <Plus size={18} />
                            <span>ایجاد اتاق جدید</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleTogglePublic}
                            disabled={isTogglingPublic}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-label-sm font-label-sm font-bold transition-all cursor-pointer ${
                                isMyProfilePublic
                                    ? 'bg-secondary-container text-on-secondary-container border border-secondary/30'
                                    : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                            }`}
                        >
                            {isMyProfilePublic ? <Eye size={18} /> : <EyeOff size={18} />}
                            <span>{isMyProfilePublic ? 'پروفایل عمومی در لیگ' : 'فعالسازی نمایش عمومی'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* SECTION 1: YPT LIVE STUDY ROOM */}
            {activeSection === 'rooms' && (
                <div className="flex flex-col gap-5">
                    {/* Room Navigation & Ambience Bar */}
                    <div className="bg-white dark:bg-slate-900 squircle-card p-4 sm:p-5 shadow-sm flex flex-col gap-3 border border-gray-100 dark:border-slate-800">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                    <BookOpen size={20} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-base sm:text-lg text-gray-900 dark:text-white font-bold truncate">
                                            {activeRoomCode
                                                ? (activeRoomInfo?.name || `اتاق مطالعه ${activeRoomCode}`)
                                                : 'اتاق مطالعه شخصی و هم‌پایی YPT'}
                                        </h2>
                                        {activeRoomCode ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs shrink-0 font-bold">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block me-1.5" aria-hidden="true"></span>
                                                زنده • {formatToPersianDigits(roomPeers.length)} عضو
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-xs shrink-0 font-semibold">
                                                بدون اتاق فعال
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
                                        {activeRoomCode ? (
                                            <>
                                                کد ورود اختصاصی:{' '}
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyRoomCode(activeRoomCode)}
                                                    className="font-mono tracking-wider font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                                                >
                                                    #{activeRoomCode}
                                                    {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                                                </button>
                                            </>
                                        ) : (
                                            'با کد ۶ رقمی به یک اتاق ملحق شوید یا از فهرست اتاق‌های عمومی انتخاب کنید.'
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Quick Join and Ambient Audio Status */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${
                                        activeSound !== 'none'
                                            ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                                            : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                                    }`}
                                >
                                    {activeSound !== 'none' ? (
                                        <>
                                            <Radio size={15} className="text-indigo-600 dark:text-indigo-400" />
                                            <span>صدای محیطی در حال پخش</span>
                                        </>
                                    ) : (
                                        <>
                                            <VolumeX size={15} />
                                            <span>صدای محیطی خاموش</span>
                                        </>
                                    )}
                                </div>

                                {activeRoomCode ? (
                                    <button
                                        type="button"
                                        onClick={handleLeaveActiveRoom}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
                                    >
                                        <LogOut size={14} />
                                        <span>خروج از اتاق</span>
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={joinCodeInput}
                                            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                                            placeholder="کد ۶ رقمی"
                                            className="w-28 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-mono font-bold uppercase text-center border border-gray-200 dark:border-slate-700 outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleJoinRoom(joinCodeInput)}
                                            disabled={joinCodeInput.trim().length < 6 || roomActionLoading}
                                            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                                        >
                                            ورود
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Audio Selector Drawer (Wired to FocusContext -> focusAudioEngine) */}
                        <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs border-t border-gray-100 dark:border-slate-800 pt-2.5">
                            <span className="text-gray-500 dark:text-slate-400 text-[11px] shrink-0 font-medium ms-1">انتخاب صدای تمرکز:</span>
                            {AMBIENT_SOUNDS.map((sound) => {
                                const isPlaying = activeSound === sound.id;
                                return (
                                    <button
                                        key={sound.id}
                                        type="button"
                                        onClick={() => handleToggleAmbient(sound.id)}
                                        className={`px-3 py-1 rounded-full shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                                            isPlaying
                                                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {renderSoundIcon(sound.id)}
                                        {sound.label}
                                    </button>
                                );
                            })}
                            {activeSound !== 'none' && (
                                <button
                                    type="button"
                                    onClick={() => setActiveSound('none')}
                                    className="px-2.5 py-1 rounded-full shrink-0 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 font-bold hover:opacity-90 transition cursor-pointer"
                                >
                                    توقف صدا
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Hero Bento Tile: Personal Focus Timer Pod */}
                    <div className="bg-white dark:bg-slate-900 squircle-card p-5 sm:p-6 shadow-sm flex flex-col items-center relative overflow-hidden border border-gray-100 dark:border-slate-800">
                        <div className="absolute -top-12 inset-x-0 h-40 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent pointer-events-none"></div>

                        <div className="flex items-center justify-between w-full mb-4 z-10 gap-2">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold max-w-[75%] truncate">
                                <Target size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                                <span className="truncate">
                                    {selectedSubject || 'مطالعه متمرکز آزاد'}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsTimerOpen(true)}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs flex items-center gap-1 cursor-pointer font-bold shrink-0"
                            >
                                <span>تنظیم تایمر</span>
                                <RefreshCw size={13} />
                            </button>
                        </div>

                        {/* Main Visual Circular Timer (Isolated 1s Tick Subcomponent) */}
                        <ActiveSessionTimerDisplay focusStatus={focusStatus} />

                        {/* Pod Status & Real Metrics Summary */}
                        <div className="grid grid-cols-3 gap-2.5 w-full max-w-md mt-4 mb-4 z-10">
                            <div className="bg-gray-50 dark:bg-slate-800/80 rounded-xl p-3 text-center border border-gray-200/70 dark:border-slate-700/60">
                                <span className="text-[11px] text-gray-500 dark:text-slate-400 block">مجموع امروز</span>
                                <span className="text-sm sm:text-base text-gray-900 dark:text-white font-bold tabular-nums" dir="ltr">
                                    <TodayStudyTotalDisplay baseTodaySeconds={baseTodayStudySeconds} focusStatus={focusStatus} />
                                </span>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-800/80 rounded-xl p-3 text-center border border-gray-200/70 dark:border-slate-700/60">
                                <span className="text-[11px] text-gray-500 dark:text-slate-400 block">پومودورو امروز</span>
                                <span className="text-sm sm:text-base text-indigo-600 dark:text-indigo-400 font-bold tabular-nums">
                                    {formatToPersianDigits(todayCompletedPomodoros)} / {formatToPersianDigits(dailyTargetPomodoros)}
                                </span>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-800/80 rounded-xl p-3 text-center border border-gray-200/70 dark:border-slate-700/60">
                                <span className="text-[11px] text-gray-500 dark:text-slate-400 block">رتبه در اتاق</span>
                                <span className="text-sm sm:text-base text-amber-600 dark:text-amber-400 font-bold">
                                    {myRoomRank ? `#${formatToPersianDigits(myRoomRank)}` : '—'}
                                </span>
                            </div>
                        </div>

                        {/* Primary Control Buttons */}
                        <div className="flex items-center justify-center gap-3 w-full max-w-md z-10">
                            <button
                                type="button"
                                onClick={() => setIsMicMuted(!isMicMuted)}
                                aria-label="وضعیت میکروفون محلی"
                                className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-sm cursor-pointer ${
                                    isMicMuted
                                        ? 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                                        : 'bg-indigo-600 text-white'
                                }`}
                            >
                                {isMicMuted ? <MicOff size={18} /> : <Mic size={18} />}
                            </button>

                            {focusStatus === 'running' ? (
                                <button
                                    type="button"
                                    onClick={pauseTimer}
                                    className="flex-1 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all cursor-pointer"
                                >
                                    <Pause size={18} fill="currentColor" />
                                    <span>توقف موقت</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => startTimer()}
                                    className="flex-1 py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all cursor-pointer"
                                >
                                    <Play size={18} fill="currentColor" />
                                    <span>شروع فوکوس</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => finishSession()}
                                className="py-3 px-4 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-sm font-bold flex items-center justify-center gap-1 transition-all active:scale-98 cursor-pointer"
                            >
                                <StopCircle size={18} />
                                <span>پایان</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsCamMuted(!isCamMuted)}
                                aria-label="وضعیت دوربین محلی"
                                className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-sm cursor-pointer ${
                                    isCamMuted
                                        ? 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                                        : 'bg-emerald-600 text-white'
                                }`}
                            >
                                {isCamMuted ? <VideoOff size={18} /> : <Video size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Public Rooms Directory (When not in a room, OR collapsible discovery below) */}
                    {!activeRoomCode ? (
                        <div className="bg-white dark:bg-slate-900 squircle-card p-5 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col gap-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Compass size={20} className="text-indigo-600 dark:text-indigo-400" />
                                    <div>
                                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                                            فهرست اتاق‌های مطالعه عمومی
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">
                                            به اتاق دلخواه ملحق شوید یا یک اتاق جدید با کد دعوت اختصاصی بسازید.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => loadPublicRooms(true)}
                                        className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition cursor-pointer"
                                        aria-label="بروزرسانی اتاق‌ها"
                                    >
                                        <RefreshCw size={16} className={isLoadingRooms ? 'animate-spin' : ''} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={openCreateRoomModal}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                                    >
                                        <Plus size={16} />
                                        <span>ساخت اتاق جدید</span>
                                    </button>
                                </div>
                            </div>

                            {/* Search & Category Filters */}
                            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                                <div className="relative flex-1 max-w-sm">
                                    <Search size={15} className="absolute right-3 top-2.5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={roomSearch}
                                        onChange={(e) => setRoomSearch(e.target.value)}
                                        placeholder="جستجوی نام یا کد اتاق..."
                                        className="w-full pr-9 pl-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs border border-gray-200 dark:border-slate-700 outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                                    {['همه', ...ROOM_CATEGORIES].map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                                                selectedCategory === cat
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {!isCloudAuthenticated ? (
                                <div className="p-6 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-dashed border-gray-200 dark:border-slate-700 text-center space-y-2">
                                    <Info size={28} className="mx-auto text-indigo-500" />
                                    <p className="text-sm font-bold text-gray-800 dark:text-white">
                                        برای حضور زنده در اتاق‌های مطالعه گروهی وارد حساب کاربری شوید
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">
                                        در حالت آفلاین می‌توانید از تایمر تمرکز شخصی و صدای محیطی بدون نیاز به اتصال ابری استفاده کنید.
                                    </p>
                                </div>
                            ) : isLoadingRooms ? (
                                <LeaderboardRoomsSkeleton />
                            ) : filteredPublicRooms.length === 0 ? (
                                <div className="p-8 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-dashed border-gray-200 dark:border-slate-700 text-center space-y-2">
                                    <Users size={32} className="mx-auto text-gray-300 dark:text-slate-600" />
                                    <p className="text-sm font-bold text-gray-700 dark:text-slate-200">
                                        هنوز اتاق عمومی با این فیلتر ساخته نشده است
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">
                                        اولین اتاق خود را بسازید و کد ۶ رقمی آن را برای دوستانتان بفرستید.
                                    </p>
                                </div>
                            ) : (
                                /* Visual Completion: show ~26% peek of next room card on mobile horizontal swipe */
                                <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1">
                                    {filteredPublicRooms.map((room) => (
                                        <div
                                            key={room.code}
                                            className="w-[74%] shrink-0 snap-start md:w-auto squircle-card p-4 bg-gray-50 dark:bg-slate-800/80 border border-gray-200/70 dark:border-slate-700/60 flex flex-col justify-between gap-3"
                                        >
                                            <div>
                                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                                                        {room.category}
                                                    </span>
                                                    <span className="text-[11px] font-mono text-gray-500 dark:text-slate-400">
                                                        #{room.code}
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{room.name}</h4>
                                                {room.description && (
                                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">{room.description}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-slate-700/50 text-[11px] text-gray-500 dark:text-slate-400">
                                                <span>هدف: {formatToPersianDigits(room.targetHours)} ساعت • سقف {formatToPersianDigits(room.maxMembers)} نفر</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleJoinRoom(room.code)}
                                                    disabled={roomActionLoading}
                                                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                                                >
                                                    ورود
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Active Room Live Peers, Podium & Messages */
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                            {/* LEFT COLUMN: Real Room Podium & Live Desks Grid */}
                            <div className="lg:col-span-8 flex flex-col gap-5">
                                {/* Real Daily Leaderboard Podium Tile (Shown when peers exist) */}
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm flex flex-col gap-3 border border-gray-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Trophy size={18} className="text-amber-500" />
                                            <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                                برترین‌های امروز اتاق
                                            </h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setActiveSection('ranking')}
                                            className="text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1 cursor-pointer hover:underline"
                                        >
                                            <span>مشاهده لیگ کامل</span>
                                            <ArrowUpRight size={14} />
                                        </button>
                                    </div>

                                    {sortedPeers.length === 0 ? (
                                        <p className="text-xs text-gray-500 dark:text-slate-400 py-4 text-center">
                                            در حال دریافت اطلاعات هم‌اتاقی‌ها...
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                                            {sortedPeers.slice(0, 3).map((peer, idx) => (
                                                <div
                                                    key={peer.uid}
                                                    className={`rounded-xl p-3 flex flex-col items-center text-center border ${
                                                        idx === 0
                                                            ? 'bg-amber-50/70 dark:bg-amber-900/20 border-amber-300/60 dark:border-amber-700/40'
                                                            : 'bg-gray-50 dark:bg-slate-800/80 border-gray-200/70 dark:border-slate-700/60'
                                                    }`}
                                                >
                                                    <div className="relative mb-1.5">
                                                        <VectorAvatar name={peer.displayName} size={idx === 0 ? 'md' : 'sm'} />
                                                        <span className="absolute -bottom-1 -start-1 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold shadow-xs">
                                                            {formatToPersianDigits(idx + 1)}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate w-full">
                                                        {peer.uid === userId ? `${peer.displayName} (شما)` : peer.displayName}
                                                    </span>
                                                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold tabular-nums mt-0.5" dir="ltr">
                                                        {formatHMS(peer.dailyStudySeconds || 0)}
                                                    </span>
                                                    <span className="text-[11px] text-gray-500 dark:text-slate-400 truncate w-full mt-0.5">
                                                        {peer.activeSubject || 'مطالعه آزاد'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Live Desks Grid */}
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm flex flex-col gap-4 border border-gray-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Users size={18} className="text-indigo-600 dark:text-indigo-400" />
                                            <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                                میزهای مطالعه آنلاین
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true"></span>
                                            <span>{formatToPersianDigits(sortedPeers.filter((p) => p.status === 'STUDYING').length)} نفر در حال مطالعه</span>
                                        </div>
                                    </div>

                                    {sortedPeers.length === 0 ? (
                                        <div className="p-6 text-center rounded-xl bg-gray-50 dark:bg-slate-800/60 text-xs text-gray-500 dark:text-slate-400">
                                            هنوز هم‌اتاقی دیگری در این اتاق حضور ندارد. کد اتاق را با دوستانتان به اشتراک بگذارید!
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {sortedPeers.map((peer) => {
                                                const isStudying = peer.status === 'STUDYING';
                                                const isResting = peer.status === 'RESTING';
                                                const isSelf = peer.uid === userId;
                                                return (
                                                    <div
                                                        key={peer.uid}
                                                        className="bg-gray-50 dark:bg-slate-800/80 rounded-xl p-3 flex flex-col gap-1.5 border border-gray-200/70 dark:border-slate-700/60"
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <VectorAvatar name={peer.displayName} size="sm" />
                                                                <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                                    {isSelf ? `${peer.displayName} (شما)` : peer.displayName}
                                                                </span>
                                                            </div>
                                                            <span
                                                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                                                    isStudying
                                                                        ? 'bg-emerald-500'
                                                                        : isResting
                                                                          ? 'bg-amber-400'
                                                                          : 'bg-gray-400'
                                                                }`}
                                                                title={isStudying ? 'در حال مطالعه' : isResting ? 'استراحت' : 'آفلاین'}
                                                            />
                                                        </div>
                                                        <p className="text-xs text-gray-600 dark:text-slate-300 truncate">
                                                            {peer.activeSubject || 'مطالعه متمرکز'}
                                                        </p>
                                                        <div className="flex items-center justify-between mt-1 text-[11px] text-gray-700 dark:text-slate-200">
                                                            <span className={isStudying ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-amber-600 dark:text-amber-400 font-medium'}>
                                                                {isStudying ? 'در حال مطالعه' : isResting ? 'در حال استراحت' : 'آفلاین'}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                {!isSelf && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCheerPeer(peer)}
                                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 hover:bg-rose-100 transition cursor-pointer"
                                                                        title="ارسال انرژی مثبت"
                                                                    >
                                                                        <Heart size={11} />
                                                                        <span>{formatToPersianDigits(peer.cheersReceived || 0)}</span>
                                                                    </button>
                                                                )}
                                                                {isSelf && (peer.cheersReceived || 0) > 0 && (
                                                                    <span className="inline-flex items-center gap-1 text-rose-500 font-bold">
                                                                        <Heart size={11} className="fill-current" />
                                                                        {formatToPersianDigits(peer.cheersReceived)}
                                                                    </span>
                                                                )}
                                                                <span className="font-mono font-semibold tabular-nums" dir="ltr">
                                                                    {formatHMS(peer.elapsedSeconds || peer.dailyStudySeconds || 0)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Desk Invite Banner */}
                                    <div className="bg-gray-100 dark:bg-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                                                <Plus size={16} />
                                            </div>
                                            <span className="text-xs text-gray-800 dark:text-slate-200 font-medium">
                                                کد اتاق را با دوستانتان به اشتراک بگذارید (#{activeRoomCode})
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleCopyRoomCode(activeRoomCode)}
                                            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-gray-50 transition-colors shrink-0 shadow-xs cursor-pointer"
                                        >
                                            کپی کد اتاق
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Real Live Study Feed & Encouragement Stream */}
                            <div className="lg:col-span-4 flex flex-col gap-4">
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col gap-3 border border-gray-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <MessageSquare size={18} className="text-indigo-600 dark:text-indigo-400" />
                                            <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                                پیام‌های زنده اتاق
                                            </h3>
                                        </div>
                                        <span className="text-[11px] text-gray-500 dark:text-slate-400">انگیزشی و کوتاه</span>
                                    </div>

                                    <div className="flex flex-col gap-2 max-h-80 overflow-y-auto custom-scrollbar">
                                        {roomMessages.length === 0 ? (
                                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 text-center text-xs text-gray-500 dark:text-slate-400">
                                                هنوز پیامی در این اتاق ارسال نشده است. اولین انرژی مثبت را بفرستید!
                                            </div>
                                        ) : (
                                            roomMessages.map((msg) => (
                                                <div
                                                    key={msg.id}
                                                    className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/80 flex items-center justify-between text-xs border border-gray-200/70 dark:border-slate-700/60 gap-2"
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Smile size={14} className="text-indigo-500 shrink-0" />
                                                        <span className="text-gray-800 dark:text-slate-200 break-words">
                                                            <strong className="font-semibold">{msg.senderName}:</strong> {msg.text}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 shrink-0">
                                                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Quick Cheer Reactions & Input Bar */}
                                    <div className="flex flex-col gap-2 mt-1 pt-2 border-t border-gray-100 dark:border-slate-800">
                                        <div className="flex items-center justify-around bg-gray-50 dark:bg-slate-800 p-1.5 rounded-xl border border-gray-200/70 dark:border-slate-700/60">
                                            {[
                                                { emoji: '👏', label: 'تشویق' },
                                                { emoji: '🔥', label: 'آتشین' },
                                                { emoji: '☕', label: 'قهوه' },
                                                { emoji: '⚡', label: 'انرژی' },
                                            ].map((btn) => (
                                                <button
                                                    key={btn.emoji}
                                                    type="button"
                                                    onClick={() => handleSendReaction(btn.emoji)}
                                                    className="w-9 h-9 rounded-lg hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center text-lg transition-transform active:scale-125 cursor-pointer"
                                                    title={btn.label}
                                                >
                                                    {btn.emoji}
                                                </button>
                                            ))}
                                        </div>

                                        <form onSubmit={handleSendRoomChat} className="relative flex items-center mt-1">
                                            <input
                                                value={roomChatText}
                                                onChange={(e) => setRoomChatText(e.target.value)}
                                                className="w-full bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 text-xs rounded-xl py-2.5 px-3 pl-10 focus:outline-none border border-gray-200 dark:border-slate-700 focus:border-indigo-500"
                                                placeholder="پیام انگیزه بفرستید..."
                                                type="text"
                                            />
                                            <button
                                                type="submit"
                                                aria-label="ارسال پیام اتاق"
                                                className="absolute left-2 text-indigo-600 dark:text-indigo-400 hover:opacity-80 p-1 flex items-center cursor-pointer"
                                            >
                                                <Send size={16} className="transform rotate-180" />
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* SECTION 2: COMPETITIVE DIAMOND LEAGUE (RANKING) */}
            {activeSection === 'ranking' && (
                <div className="flex flex-col gap-5">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col gap-4 border border-gray-100 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                            <div className="flex items-center gap-2.5">
                                <Trophy size={26} className="text-amber-500" />
                                <div>
                                    <h2 className="text-lg text-gray-900 dark:text-white font-bold">
                                        رده‌بندی زنده لیگ
                                    </h2>
                                    <span className="text-xs text-gray-500 dark:text-slate-400">
                                        بر اساس امتیاز واقعی و میانگین تراز کاربران عمومی
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs px-3 py-1 rounded-full flex items-center gap-1.5 font-bold">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true"></span>
                                    {isCloudAuthenticated ? 'زنده از سرور' : 'محلی'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => loadLeaderboardPage(true)}
                                    className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition cursor-pointer"
                                    aria-label="بروزرسانی جدول رتبه‌بندی"
                                    title="بروزرسانی"
                                >
                                    <RefreshCw size={16} className={isLoadingLb ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>

                        {/* Controls (Sort and Search) */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSortBy('xp')}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        sortBy === 'xp'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
                                    }`}
                                >
                                    بر اساس امتیاز XP
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSortBy('exam')}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        sortBy === 'exam'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
                                    }`}
                                >
                                    بر اساس میانگین آزمون
                                </button>
                            </div>

                            <div className="relative">
                                <Search size={16} className="absolute right-3 top-2.5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="جستجوی شرکت‌کننده..."
                                    className="w-full sm:w-64 pr-9 pl-3 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs border border-gray-200 dark:border-slate-700 outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Real Leaderboard List (Zero hardcoded fake bots ahead of real users) */}
                        <div className="flex flex-col gap-2 pt-2">
                            {isLoadingLb ? (
                                <LeaderboardListSkeleton />
                            ) : !db ? (
                                <div className="flex flex-col gap-3">
                                    <div className="p-6 rounded-2xl bg-gray-50 dark:bg-slate-800/70 border border-dashed border-gray-200 dark:border-slate-700 text-center space-y-2">
                                        <Trophy size={32} className="mx-auto text-indigo-500" />
                                        <p className="text-sm font-bold text-gray-800 dark:text-white">
                                            لیگ آنلاین در حالت اتصال ابری فعال می‌شود
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">
                                            امتیاز محلی فعلی شما: {formatToPersianDigits(xp)} XP (سطح {formatToPersianDigits(level)}). با ورود به حساب ابری و انتشار پروفایل در رقابت شرکت کنید.
                                        </p>
                                    </div>
                                    {isDemoActive && (
                                        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                                                    حالت نمونه (پیش‌نمایش جدول لیگ)
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={dismissDemoMode}
                                                    className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                                                >
                                                    بستن پیش‌نمایش
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-slate-700">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">۱</span>
                                                    <VectorAvatar name={userName || 'شما'} size="sm" />
                                                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                                                        {userName || 'کاربر پارساپلن'} (شما)
                                                    </span>
                                                </div>
                                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                    {formatToPersianDigits(xp)} XP
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : filteredLeaderboard.length === 0 ? (
                                <div className="p-8 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-dashed border-gray-200 dark:border-slate-700 text-center space-y-2">
                                    <Users size={32} className="mx-auto text-gray-300 dark:text-slate-600" />
                                    <p className="text-sm font-bold text-gray-700 dark:text-slate-200">
                                        {searchQuery ? 'شرکت‌کننده‌ای با این نام پیدا نشد' : 'هنوز شرکت‌کننده‌ای پروفایل عمومی خود را منتشر نکرده است'}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">
                                        می‌توانید با دکمه «فعالسازی نمایش عمومی» جزو اولین نفرات لیگ باشید.
                                    </p>
                                </div>
                            ) : (
                                <motion.div
                                    variants={STAGGER_CONTAINER_VARIANTS}
                                    initial={prefersReducedMotion ? false : 'hidden'}
                                    animate="visible"
                                    className="flex flex-col gap-2"
                                >
                                    {filteredLeaderboard.map((item, idx) => {
                                        const isMe = item.id === user?.uid;
                                        const rank = idx + 1;
                                        return (
                                            <motion.div
                                                key={item.id}
                                                variants={STAGGER_ITEM_VARIANTS}
                                                onClick={() => handleOpenProfile(item.id)}
                                                className={`transition-colors p-3.5 rounded-xl flex items-center justify-between cursor-pointer border ${
                                                    isMe
                                                        ? 'bg-indigo-50 dark:bg-indigo-950/55 border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-500/30 shadow-xs'
                                                        : rank === 1
                                                          ? 'bg-amber-50/60 dark:bg-amber-950/25 border-amber-300 dark:border-amber-700/60 ring-2 ring-amber-400/35'
                                                          : 'bg-gray-50 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-800 border-gray-200/70 dark:border-slate-700/60'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span
                                                        className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                                                            rank === 1
                                                                ? 'bg-amber-400 text-amber-950'
                                                                : rank === 2
                                                                  ? 'bg-slate-300 text-slate-900'
                                                                  : rank === 3
                                                                    ? 'bg-amber-700 text-white'
                                                                    : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200'
                                                        }`}
                                                    >
                                                        {formatToPersianDigits(rank)}
                                                    </span>
                                                    <VectorAvatar name={item.userName} size="md" />
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                                {item.userName}
                                                            </span>
                                                            {rank === 1 && <Crown size={14} className="text-amber-500" />}
                                                            {isMe && (
                                                                <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                                                                    شما
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-gray-500 dark:text-slate-400">
                                                            سطح {formatToPersianDigits(item.level)} • {formatToPersianDigits(item.tasksCompleted)} تسک تکمیل‌شده
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-sm text-gray-900 dark:text-white font-bold tabular-nums">
                                                        {formatToPersianDigits(item.xp)} XP
                                                    </span>
                                                    {item.examAverage > 0 && (
                                                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                                            معدل تراز: {formatToPersianDigits(item.examAverage)}٪
                                                        </span>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </div>

                        {hasMoreLb && (
                            <button
                                type="button"
                                onClick={loadMoreLeaderboard}
                                disabled={isLoadingMore}
                                className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer"
                            >
                                {isLoadingMore ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <>
                                        <span>مشاهده رتبه‌های بیشتر لیگ</span>
                                        <RefreshCw size={14} />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Native Dialog: Create Room Modal (Figure-Ground scrim via global dialog::backdrop) */}
            <dialog
                ref={createRoomDialogRef}
                className="squircle-lg p-0 bg-surface-container-lowest dark:bg-slate-900 text-on-surface dark:text-slate-100 border border-outline-variant/40 dark:border-slate-700 shadow-2xl max-w-lg w-full m-auto"
            >
                <form onSubmit={handleCreateRoomSubmit} className="p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20 dark:border-slate-700/60">
                        <div className="flex items-center gap-2">
                            <Plus size={20} className="text-primary" />
                            <h3 className="font-headline-md text-headline-md font-bold">ایجاد اتاق مطالعه YPT</h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="w-8 h-8 rounded-full bg-surface-container dark:bg-slate-800 flex items-center justify-center text-on-surface-variant dark:text-gray-300 hover:text-on-surface dark:hover:text-white cursor-pointer"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-label-sm font-label-sm font-bold text-on-surface dark:text-slate-200">عنوان اتاق:</label>
                        <input
                            type="text"
                            required
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            placeholder="مثلاً: ماراتن شبانه کنکور تجربی"
                            className="px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-slate-800 text-on-surface dark:text-white text-body-md border border-outline-variant/40 dark:border-slate-700 outline-none focus:border-primary"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-label-sm font-label-sm font-bold text-on-surface dark:text-slate-200">دسته‌بندی:</label>
                        <select
                            value={newRoomCategory}
                            onChange={(e) => setNewRoomCategory(e.target.value)}
                            className="px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-slate-800 text-on-surface dark:text-white text-body-md border border-outline-variant/40 dark:border-slate-700 outline-none focus:border-primary"
                        >
                            {ROOM_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-label-sm font-label-sm font-bold text-on-surface dark:text-slate-200">هدف روزانه (ساعت):</label>
                            <input
                                type="number"
                                min={1}
                                max={16}
                                value={newRoomTargetHours}
                                onChange={(e) => setNewRoomTargetHours(Number(e.target.value))}
                                className="px-3.5 py-2 rounded-xl bg-surface-container-low dark:bg-slate-800 text-on-surface dark:text-white text-body-md border border-outline-variant/40 dark:border-slate-700 outline-none focus:border-primary"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-label-sm font-label-sm font-bold text-on-surface dark:text-slate-200">ظرفیت اعضا:</label>
                            <input
                                type="number"
                                min={2}
                                max={50}
                                value={newRoomMaxMembers}
                                onChange={(e) => setNewRoomMaxMembers(Number(e.target.value))}
                                className="px-3.5 py-2 rounded-xl bg-surface-container-low dark:bg-slate-800 text-on-surface dark:text-white text-body-md border border-outline-variant/40 dark:border-slate-700 outline-none focus:border-primary"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="roomIsPublic"
                            checked={newRoomIsPublic}
                            onChange={(e) => setNewRoomIsPublic(e.target.checked)}
                            className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        <label htmlFor="roomIsPublic" className="text-label-sm font-label-sm text-on-surface dark:text-slate-200 cursor-pointer">
                            اتاق به صورت عمومی در لیست اتاق‌ها نمایش داده شود
                        </label>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-outline-variant/20 dark:border-slate-700/60">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="px-4 py-2 rounded-xl bg-surface-container-high dark:bg-slate-800 text-on-surface dark:text-slate-200 text-label-sm font-label-sm font-bold cursor-pointer"
                        >
                            انصراف
                        </button>
                        <button
                            type="submit"
                            disabled={roomActionLoading}
                            className="px-5 py-2 rounded-xl bg-primary text-on-primary text-label-sm font-label-sm font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                            {roomActionLoading && <Loader2 size={14} className="animate-spin" />}
                            <span>ساخت و ورود به اتاق</span>
                        </button>
                    </div>
                </form>
            </dialog>

            {/* Native Dialog: Profile Viewer Modal (Figure-Ground scrim via global dialog::backdrop) */}
            <dialog
                ref={profileDialogRef}
                className="squircle-lg p-0 bg-surface-container-lowest dark:bg-slate-900 text-on-surface dark:text-slate-100 border border-outline-variant/40 dark:border-slate-700 shadow-2xl max-w-md w-full m-auto"
            >
                {viewingProfile && (
                    <div className="p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20 dark:border-slate-700/60">
                            <div className="flex items-center gap-2">
                                <UserCheck size={22} className="text-primary" />
                                <h3 className="font-headline-md text-headline-md font-bold">{viewingProfile.userName}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewingProfile(null)}
                                className="w-8 h-8 rounded-full bg-surface-container dark:bg-slate-800 flex items-center justify-center text-on-surface-variant dark:text-gray-300 hover:text-on-surface dark:hover:text-white cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="bg-surface-container-low dark:bg-slate-800 p-3 rounded-2xl border border-outline-variant/20 dark:border-slate-700">
                                <span className="text-body-sm text-on-surface-variant dark:text-gray-400 block">مجموع امتیاز</span>
                                <span className="text-headline-md font-bold text-primary">
                                    {formatToPersianDigits(viewingProfile.xp)} XP
                                </span>
                            </div>
                            <div className="bg-surface-container-low dark:bg-slate-800 p-3 rounded-2xl border border-outline-variant/20 dark:border-slate-700">
                                <span className="text-body-sm text-on-surface-variant dark:text-gray-400 block">سطح فعلی</span>
                                <span className="text-headline-md font-bold text-secondary">
                                    سطح {formatToPersianDigits(viewingProfile.level)}
                                </span>
                            </div>
                        </div>

                        <div className="bg-surface-container-low dark:bg-slate-800 p-3 rounded-2xl flex items-center justify-between border border-outline-variant/20 dark:border-slate-700 text-body-sm">
                            <span className="text-on-surface-variant dark:text-gray-400">تسک‌های انجام‌شده:</span>
                            <span className="font-bold text-on-surface dark:text-white">
                                {formatToPersianDigits(viewingProfile.tasksCompleted)} از {formatToPersianDigits(viewingProfile.totalTasks)}
                            </span>
                        </div>

                        {viewingProfile.examAverage > 0 && (
                            <div className="bg-secondary-container/30 p-3 rounded-2xl flex items-center justify-between border border-secondary/30 text-body-sm text-secondary">
                                <span className="font-semibold">میانگین تراز آزمون‌ها:</span>
                                <span className="font-bold">{formatToPersianDigits(viewingProfile.examAverage)}٪</span>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => setViewingProfile(null)}
                            className="w-full mt-2 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold cursor-pointer"
                        >
                            بستن
                        </button>
                    </div>
                )}
            </dialog>
        </div>
    );
};

export default Leaderboard;