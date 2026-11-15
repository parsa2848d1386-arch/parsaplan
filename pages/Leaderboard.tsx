import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { useFocus } from '../context/FocusContext';
import {
    Trophy,
    Medal,
    Crown,
    Star,
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
    Award,
    Flame,
    Plus,
    Copy,
    Check,
    LogOut,
    Trash2,
    Play,
    Pause,
    Send,
    DoorOpen,
    Lock,
    Globe,
    Calendar,
    Clock,
    Volume2,
    Radio,
    Sparkles,
    Mic,
    MicOff,
    Video,
    VideoOff,
    StopCircle,
    ArrowUpRight,
    Share2,
    Smile,
    Zap,
    CloudRain,
    Coffee,
    Wind,
    Headphones,
    MessageSquare,
    CheckCircle2,
    UserCheck
} from 'lucide-react';
import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { getShamsiDate, formatClockTime, formatToPersianDigits } from '../utils';
import { getLogicalDateKey } from '../utils/streakEngine';
import { leaderboardApi, ROOM_CATEGORIES } from '../services/backendApi';
import { liveRoomService } from '../services/liveRoomService';
import { LiveRoomInfo, LiveRoomMessage, LiveRoomPeer, PublicProfileDetail, PublicProfileSummary } from '../types';

const AMBIENT_SOUNDS = [
    { id: 'rain', label: 'باران ملایم', icon: 'water_drop' },
    { id: 'cafe', label: 'کافه شلوغ', icon: 'local_cafe' },
    { id: 'white', label: 'نویز سفید', icon: 'air' },
    { id: 'lofi', label: 'لوفای تمرکز', icon: 'headphones' }
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

const renderSoundIcon = (id: string) => {
    switch (id) {
        case 'rain': return <CloudRain size={14} />;
        case 'cafe': return <Coffee size={14} />;
        case 'white': return <Wind size={14} />;
        case 'lofi': return <Headphones size={14} />;
        default: return <Volume2 size={14} />;
    }
};

export const Leaderboard = () => {
    const {
        user,
        userId,
        db,
        userName,
        xp,
        level,
        getProgress,
        tasks,
        showToast,
        askConfirm,
        firebaseConfig,
        settings,
        updateSettings,
        studyMinutesByDate,
    } = useStore();

    const {
        activeRoomCode,
        setActiveRoomCode,
        status: focusStatus,
        selectedSubject,
        elapsedSeconds: focusElapsedSeconds,
        setIsTimerOpen,
        startTimer,
        pauseTimer,
        resumeTimer,
        finishSession
    } = useFocus();

    // Primary Page Tab ('rooms' YPT vs 'ranking' Leaderboard)
    const [activeSection, setActiveSection] = useState<'rooms' | 'ranking'>('rooms');

    // Ambient audio selector
    const [selectedAmbient, setSelectedAmbient] = useState<string>('rain');
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
    const [localTick, setLocalTick] = useState(0);

    // Create Room Modal (<dialog>)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const createRoomDialogRef = useRef<HTMLDialogElement>(null);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomCategory, setNewRoomCategory] = useState<string>(ROOM_CATEGORIES[0]);
    const [newRoomDesc, setNewRoomDesc] = useState('');
    const [newRoomTargetHours, setNewRoomTargetHours] = useState(4);
    const [newRoomMaxMembers, setNewRoomMaxMembers] = useState(25);
    const [newRoomIsPublic, setNewRoomIsPublic] = useState(true);

    const isCloudAuthenticated = Boolean(db && user && userId && userId !== 'parsaplan_local_user');

    const myTodayStudySeconds = useMemo(() => {
        const key = getLogicalDateKey(new Date(), settings?.dayCutoffHour ?? 5);
        return Math.max(0, Math.round((studyMinutesByDate?.[key] || 0) * 60)) + (focusStatus === 'running' ? focusElapsedSeconds : 0);
    }, [studyMinutesByDate, settings?.dayCutoffHour, focusStatus, focusElapsedSeconds]);

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

    // Sync Native Dialog Open/Close Safely (Modern Web Guidance)
    useEffect(() => {
        const el = createRoomDialogRef.current;
        if (!el) return;
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
    }, [isCreateModalOpen]);

    useEffect(() => {
        const el = profileDialogRef.current;
        if (!el) return;
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
    }, [viewingProfile]);

    // Local 1-second timer tick for live YPT desk clocks without server polling
    useEffect(() => {
        const interval = setInterval(() => setLocalTick((t) => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    // Load Paginated Leaderboard
    const loadLeaderboardPage = useCallback(
        async (forceRefresh = false) => {
            if (!db) {
                setLeaderboardData([]);
                setIsLoadingLb(false);
                return;
            }
            setIsLoadingLb(true);
            const res = await leaderboardApi.fetchPage(db, { sortBy, pageSize: 25, forceRefresh });
            if (res.ok) {
                setLeaderboardData(res.data.items);
                setLbCursor(res.data.nextCursor);
                setHasMoreLb(res.data.hasMore);
            } else {
                showToast(res.error.message, 'error');
            }
            setIsLoadingLb(false);
        },
        [db, sortBy, showToast]
    );

    const loadMoreLeaderboard = async () => {
        if (!db || !lbCursor || isLoadingMore) return;
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
            if (!db) {
                setPublicRooms([]);
                return;
            }
            setIsLoadingRooms(true);
            const res = await liveRoomService.listPublicRooms(db, undefined, forceRefresh);
            if (res.ok) {
                setPublicRooms(res.data);
            } else {
                showToast(res.error.message, 'error');
            }
            setIsLoadingRooms(false);
        },
        [db, showToast]
    );

    // Check own public profile status once on login & load initial cached lists
    useEffect(() => {
        if (!db) {
            setIsLoadingLb(false);
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
    }, [db, user?.uid, loadLeaderboardPage, loadPublicRooms]);

    // Listen to Active Room (Peers, Messages & Info)
    useEffect(() => {
        if (!db || !activeRoomCode) {
            setActiveRoomInfo(null);
            setRoomPeers([]);
            setRoomMessages([]);
            return;
        }

        const unsubPeers = liveRoomService.subscribeRoomMembers(db, activeRoomCode, (peers) => {
            setRoomPeers(peers);
        });

        const unsubMessages = liveRoomService.subscribeRoomMessages(db, activeRoomCode, (msgs) => {
            setRoomMessages(msgs);
        });

        liveRoomService.getGroupRoom(db, activeRoomCode).then((res) => {
            if (res) {
                setActiveRoomInfo(res);
            }
        });

        return () => {
            unsubPeers();
            unsubMessages();
        };
    }, [db, activeRoomCode]);

    // Keep active peer presence heartbeat synced with study state
    useEffect(() => {
        if (!db || !activeRoomCode || !userId) return;

        const currentSubject = selectedSubject || 'مطالعه آزاد';
        const currentStatus = focusStatus === 'running' ? 'STUDYING' : 'RESTING';
        const currentElapsed = focusElapsedSeconds;

        liveRoomService.upsertMemberPresence(db, activeRoomCode, {
            uid: userId,
            displayName: userName || 'دانش‌آموز',
            avatar: '🎓',
            status: currentStatus,
            activeSubject: currentSubject,
            elapsedSeconds: currentElapsed,
            dailyStudySeconds: myTodayStudySeconds,
            cheersReceived: 0,
            lastPing: Date.now(),
        });
    }, [db, activeRoomCode, userId, userName, focusStatus, selectedSubject, focusElapsedSeconds, myTodayStudySeconds]);

    // Handle Public Profile Toggle
    const handleTogglePublic = async () => {
        if (!db || !user?.uid) {
            showToast('برای انتشار رتبه ابتدا وارد حساب کاربری شوید.', 'error');
            return;
        }
        setIsTogglingPublic(true);
        if (isMyProfilePublic) {
            const res = await leaderboardApi.unpublishProfile(db, user.uid);
            if (res.ok) {
                setIsMyProfilePublic(false);
                showToast('پروفایل شما از جدول رتبه‌بندی عمومی برداشته شد.', 'info');
                loadLeaderboardPage(true);
            } else {
                showToast(res.error.message, 'error');
            }
        } else {
            const res = await leaderboardApi.publishProfile(db, user.uid, myStats, tasks);
            if (res.ok) {
                setIsMyProfilePublic(true);
                showToast('پروفایل شما با موفقیت در لیگ عمومی فعال شد! 🏆', 'success');
                loadLeaderboardPage(true);
            } else {
                showToast(res.error.message, 'error');
            }
        }
        setIsTogglingPublic(false);
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
            await liveRoomService.upsertMemberPresence(db, cleanCode, {
                uid: userId,
                displayName: userName || 'دانش‌آموز',
                avatar: '🎓',
                status: focusStatus === 'running' ? 'STUDYING' : 'RESTING',
                activeSubject: currentSubj,
                elapsedSeconds: focusElapsedSeconds,
                dailyStudySeconds: myTodayStudySeconds,
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

    // Send Room Chat Message
    const handleSendRoomChat = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!db || !activeRoomCode || !userId || !roomChatText.trim()) return;
        const text = roomChatText.trim();
        setRoomChatText('');
        await liveRoomService.sendRoomMessage(db, activeRoomCode, userId, userName || 'دانش‌آموز', text);
    };

    // Send Quick Emoji Reaction
    const handleSendReaction = async (emoji: string) => {
        if (!db || !activeRoomCode || !userId) return;
        await liveRoomService.sendRoomMessage(db, activeRoomCode, userId, userName || 'دانش‌آموز', emoji);
        showToast(`انگیزه ارسال شد: ${emoji}`, 'info');
    };

    // Copy Room Code
    const handleCopyRoomCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(true);
        showToast('کد اتاق کپی شد!', 'success');
        setTimeout(() => setCopiedCode(false), 2000);
    };

    // Format Seconds to HH:MM:SS
    const formatHMS = (totalSeconds: number) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col w-full p-3 xs:p-4 sm:p-5 md:p-6 lg:p-8 gap-4 sm:gap-6 max-app-container">
            {/* Top Gamification Banner: Neo-Cyber XP & Rank Strip */}
            <div className="bento-card-interactive relative overflow-hidden rounded-2xl bg-surface-container-lowest dark:bg-slate-900 p-4 sm:p-6 shadow-sm border border-outline-variant/30">
                {/* Ambient Energy Glows */}
                <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-primary-container/15 blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-secondary-container/25 blur-2xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-6">
                    {/* Player Profile & Bio Badges */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Vector Avatar Frame with Tier Indicator */}
                        <div className="relative shrink-0">
                            <VectorAvatar name={userName || 'سارا محمدی'} size="xl" />
                            <span className="absolute -bottom-2 -left-2 bg-primary text-on-primary font-label-sm text-label-sm px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5 font-bold">
                                <Zap size={13} className="fill-current" />
                                {formatToPersianDigits(level)}
                            </span>
                        </div>

                        {/* Identity & Status */}
                        <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <h1 className="font-headline-lg text-lg sm:text-2xl md:text-3xl text-on-surface dark:text-white font-bold tracking-tight truncate">
                                    {userName || 'سارا محمدی'}
                                </h1>
                                <span className="bg-primary-container text-on-primary-container font-label-sm text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full shadow-xs font-semibold">
                                    استاد تمرکز عمیق (Focus Master)
                                </span>
                                <span className="bg-secondary text-on-secondary font-label-sm text-[10px] sm:text-xs px-2 py-0.5 rounded-md flex items-center gap-0.5 font-bold">
                                    <Medal size={13} />
                                    سطح {formatToPersianDigits(level)}
                                </span>
                            </div>
                            <p className="font-body-sm text-xs text-on-surface-variant dark:text-gray-400 flex items-center gap-1.5 flex-wrap">
                                <span>لیگ فعلی: <strong className="text-on-surface dark:text-white font-semibold">الماس ۳ (Tier Diamond)</strong></span>
                                <span className="text-outline-variant">•</span>
                                <span>رتبه ۳ کشوری</span>
                            </p>
                        </div>
                    </div>

                    {/* Live Streak & XP Boost Chips */}
                    <div className="flex flex-wrap items-center gap-space-sm">
                        {/* Fire Streak */}
                        <div className="bg-surface-container-low px-space-md py-space-sm rounded-xl flex items-center gap-space-sm shadow-xs border border-outline-variant/20">
                            <div className="w-10 h-10 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shadow-xs">
                                <Flame size={22} className="text-tertiary" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-label-sm text-label-sm text-tertiary font-bold tracking-wide">زنجیره آتشین</span>
                                <span className="font-headline-md text-headline-md text-on-surface font-bold">۱۵ روز مداوم</span>
                            </div>
                        </div>

                        {/* 2X Multiplier Badge */}
                        <div className="bg-secondary-container text-on-secondary-container px-space-md py-space-sm rounded-xl flex items-center gap-space-sm shadow-xs border border-secondary/20">
                            <div className="w-10 h-10 rounded-lg bg-secondary text-on-secondary flex items-center justify-center font-headline-md text-headline-md font-bold">
                                2X
                            </div>
                            <div className="flex flex-col">
                                <span className="font-label-sm text-label-sm font-semibold opacity-90">ضریب شتاب XP</span>
                                <span className="font-label-md text-label-md font-bold">فعال تا ۲۳:۵۹</span>
                            </div>
                        </div>

                        {/* Global XP Gauge */}
                        <div className="bg-surface-container-low p-space-sm lg:p-space-md rounded-xl flex flex-col gap-space-xs min-w-[240px] shadow-xs border border-outline-variant/20">
                            <div className="flex items-center justify-between font-label-sm text-label-sm">
                                <span className="text-on-surface-variant flex items-center gap-1">
                                    <Sparkles size={14} className="text-primary" />ارتقا به لیگ افسانه‌ای
                                </span>
                                <span className="font-bold text-primary">
                                    {formatToPersianDigits(xp)} / ۳,۰۰۰ XP
                                </span>
                            </div>
                            {/* Progress Track */}
                            <div className="w-full h-3 rounded-full bg-surface-container-highest overflow-hidden p-0.5">
                                <div
                                    className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                                    style={{ width: `${Math.min(100, Math.round((xp / 3000) * 100))}%` }}
                                ></div>
                            </div>
                            <span className="font-body-sm text-body-sm text-on-surface-variant text-left self-end">
                                {formatToPersianDigits(Math.max(0, 3000 - xp))} XP تا پاداش صندوق ویژه
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section Switcher Tabs (YPT Study Rooms vs Competitive League) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-container-lowest dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-outline-variant/30">
                <div className="flex items-center gap-2 p-1 bg-surface-container-low dark:bg-slate-800 rounded-xl">
                    <button
                        onClick={() => setActiveSection('rooms')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-label-md font-label-md transition-all cursor-pointer ${
                            activeSection === 'rooms'
                                ? 'bg-primary text-on-primary font-bold shadow-sm'
                                : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <Users size={18} />
                        <span>اتاق مطالعه زنده YPT</span>
                        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                    </button>
                    <button
                        onClick={() => setActiveSection('ranking')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-label-md font-label-md transition-all cursor-pointer ${
                            activeSection === 'ranking'
                                ? 'bg-primary text-on-primary font-bold shadow-sm'
                                : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <Trophy size={18} />
                        <span>رده‌بندی زنده لیگ الماس</span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {activeSection === 'rooms' ? (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
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
                <div className="flex flex-col gap-space-lg">
                    {/* Room Navigation & Ambience Bar */}
                    <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-space-sm border border-outline-variant/30">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
                            <div className="flex items-center gap-space-sm min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                                    <BookOpen size={20} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-space-xs">
                                        <h2 className="text-headline-md font-headline-md text-on-surface font-bold truncate">
                                            {activeRoomInfo?.name || 'ماراتن رتبه برترها (کنکور و تافل)'}
                                        </h2>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-label-sm shrink-0">
                                            <span className="w-2 h-2 rounded-full bg-secondary inline-block animate-pulse me-1"></span>
                                            زنده • {formatToPersianDigits(roomPeers.length || 24)} نفر
                                        </span>
                                    </div>
                                    <p className="text-body-sm font-body-sm text-on-surface-variant truncate">
                                        کد ورود اختصاصی:{' '}
                                        <span className="font-mono tracking-wider font-bold text-primary">
                                            #{activeRoomCode || 'YPT-782K'}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Quick Join and Ambient Audio Trigger */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface text-label-sm font-label-sm">
                                    <Radio size={16} className="text-primary" />
                                    <span>صدای محیطی فعال</span>
                                </div>

                                {activeRoomCode ? (
                                    <button
                                        onClick={handleLeaveActiveRoom}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-error-container text-on-error-container text-label-sm font-label-sm hover:opacity-90 transition-all cursor-pointer"
                                    >
                                        <LogOut size={14} />
                                        <span>خروج</span>
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={joinCodeInput}
                                            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                                            placeholder="کد ۶ رقمی اتاق"
                                            className="w-32 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface text-xs font-mono font-bold uppercase text-center border border-outline-variant/40 outline-none focus:border-primary"
                                        />
                                        <button
                                            onClick={() => handleJoinRoom(joinCodeInput)}
                                            disabled={joinCodeInput.trim().length < 6 || roomActionLoading}
                                            className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-label-sm font-label-sm font-bold disabled:opacity-50 cursor-pointer"
                                        >
                                            ورود
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Audio Selector Drawer */}
                        <div className="flex items-center gap-space-xs overflow-x-auto py-1 text-label-sm font-label-sm border-t border-outline-variant/20 pt-2">
                            <span className="text-on-surface-variant text-[11px] shrink-0 font-medium ms-1">انتخاب امبینت:</span>
                            {AMBIENT_SOUNDS.map((sound) => (
                                <button
                                    key={sound.id}
                                    onClick={() => setSelectedAmbient(sound.id)}
                                    className={`px-3 py-1 rounded-full shrink-0 flex items-center gap-1 transition-all cursor-pointer ${
                                        selectedAmbient === sound.id
                                            ? 'bg-primary text-on-primary font-bold shadow-xs'
                                            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                                    }`}
                                >
                                    {renderSoundIcon(sound.id)}
                                    {sound.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Hero Bento Tile: Personal Focus Timer Pod */}
                    <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col items-center relative overflow-hidden border border-outline-variant/30">
                        {/* Ambient Aura Glow Behind Timer */}
                        <div className="absolute -top-12 inset-x-0 h-40 bg-gradient-to-b from-primary-fixed/40 via-surface-container-low/10 to-transparent pointer-events-none"></div>

                        {/* Active Task Badge */}
                        <div className="flex items-center justify-between w-full mb-space-md z-10">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-label-sm font-label-sm max-w-[80%] truncate">
                                <Target size={15} className="text-primary shrink-0" />
                                <span className="truncate">
                                    {selectedSubject
                                        ? `مرور تست‌های ${selectedSubject}`
                                        : 'مرور تست‌های ریاضی مهندسی - مبحث مشتقات جزئی'}
                                </span>
                            </div>
                            <button
                                onClick={() => setIsTimerOpen(true)}
                                className="text-primary hover:text-primary-container text-label-sm font-label-sm flex items-center gap-1 cursor-pointer font-bold"
                            >
                                <span>تغییر تسک</span>
                                <RefreshCw size={13} />
                            </button>
                        </div>

                        {/* Main Visual Circular Timer */}
                        <div className="relative w-56 h-56 flex items-center justify-center my-space-xs z-10">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                                <circle
                                    className="text-surface-container-high"
                                    cx="80"
                                    cy="80"
                                    fill="transparent"
                                    r="70"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                />
                                <circle
                                    className="text-primary transition-all duration-1000"
                                    cx="80"
                                    cy="80"
                                    fill="transparent"
                                    r="70"
                                    stroke="currentColor"
                                    strokeDasharray="440"
                                    strokeDashoffset="110"
                                    strokeLinecap="round"
                                    strokeWidth="9"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-display-lg font-display-lg text-on-surface font-bold tracking-tight" dir="ltr">
                                    {formatHMS(focusElapsedSeconds > 0 ? focusElapsedSeconds : 6330)}
                                </span>
                                <span className="text-label-sm font-label-sm text-secondary flex items-center gap-1 mt-0.5 font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping"></span>
                                    {focusStatus === 'running' ? 'تمرکز عمیق (دیپ‌ورک)' : 'آماده برای استارت پارت جدید'}
                                </span>
                            </div>
                        </div>

                        {/* Pod Status & Metrics Summary */}
                        <div className="grid grid-cols-3 gap-space-xs w-full max-w-md mt-space-md mb-space-md z-10">
                            <div className="bg-surface-container-low rounded-xl p-space-sm text-center border border-outline-variant/20">
                                <span className="text-body-sm font-body-sm text-on-surface-variant block">مجموع امروز</span>
                                <span className="text-headline-md font-headline-md text-on-surface font-bold" dir="ltr">
                                    {formatHMS(myTodayStudySeconds)}
                                </span>
                            </div>
                            <div className="bg-surface-container-low rounded-xl p-space-sm text-center border border-outline-variant/20">
                                <span className="text-body-sm font-body-sm text-on-surface-variant block">پومودورو</span>
                                <span className="text-headline-md font-headline-md text-primary font-bold">۴ / ۶</span>
                            </div>
                            <div className="bg-surface-container-low rounded-xl p-space-sm text-center border border-outline-variant/20">
                                <span className="text-body-sm font-body-sm text-on-surface-variant block">رتبه در اتاق</span>
                                <span className="text-headline-md font-headline-md text-tertiary font-bold">#۲</span>
                            </div>
                        </div>

                        {/* Primary Control Buttons */}
                        <div className="flex items-center justify-center gap-space-md w-full max-w-md z-10">
                            <button
                                onClick={() => setIsMicMuted(!isMicMuted)}
                                aria-label="میکروفون"
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-sm cursor-pointer ${
                                    isMicMuted
                                        ? 'bg-surface-container text-on-surface-variant'
                                        : 'bg-primary text-on-primary'
                                }`}
                            >
                                {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
                            </button>

                            {focusStatus === 'running' ? (
                                <button
                                    onClick={pauseTimer}
                                    className="flex-1 py-3 px-6 rounded-xl bg-tertiary text-on-tertiary font-label-md text-label-md font-bold flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer"
                                >
                                    <Pause size={20} fill="currentColor" />
                                    <span>توقف موقت</span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => startTimer()}
                                    className="flex-1 py-3 px-6 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-primary-container active:scale-98 transition-all cursor-pointer"
                                >
                                    <Play size={20} fill="currentColor" />
                                    <span>شروع فوکوس دیپ‌ورک</span>
                                </button>
                            )}

                            <button
                                onClick={() => finishSession()}
                                className="py-3 px-4 rounded-xl bg-surface-container-high text-error hover:bg-error-container hover:text-on-error-container font-label-md text-label-md font-bold flex items-center justify-center gap-1 transition-all active:scale-98 cursor-pointer"
                            >
                                <StopCircle size={18} />
                                <span>پایان پارت</span>
                            </button>

                            <button
                                onClick={() => setIsCamMuted(!isCamMuted)}
                                aria-label="دوربین"
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-sm cursor-pointer ${
                                    isCamMuted
                                        ? 'bg-surface-container text-on-surface-variant'
                                        : 'bg-secondary text-on-secondary'
                                }`}
                            >
                                {isCamMuted ? <VideoOff size={20} /> : <Video size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* 2-Column Bento Grid: Podium & Online Desks vs Live Feed */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
                        {/* LEFT COLUMN: Podium & Desks Grid (Span 8) */}
                        <div className="lg:col-span-8 flex flex-col gap-space-lg">
                            {/* Daily Leaderboard Podium Tile */}
                            <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-space-sm border border-outline-variant/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Trophy size={18} className="text-tertiary" />
                                        <h3 className="text-headline-md font-headline-md text-on-surface font-bold">
                                            برترین‌های امروز اتاق
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => setActiveSection('ranking')}
                                        className="text-primary text-label-sm font-label-sm font-bold flex items-center gap-1 cursor-pointer hover:underline"
                                    >
                                        <span>مشاهده لیگ کامل</span>
                                        <ArrowUpRight size={14} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-3 gap-space-xs pt-space-xs">
                                    {/* 2nd Place (You) */}
                                    <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col items-center text-center relative pt-4 border border-outline-variant/20">
                                        <div className="relative mb-1">
                                            <VectorAvatar name={userName || 'شما'} size="sm" />
                                            <span className="absolute -bottom-1 -start-1 w-5 h-5 rounded-full bg-outline-variant text-on-surface text-[10px] flex items-center justify-center font-bold shadow-xs">
                                                ۲
                                            </span>
                                        </div>
                                        <span className="text-label-md font-label-md text-on-surface font-bold truncate w-full">شما</span>
                                        <span className="text-label-sm font-label-sm text-primary font-bold" dir="ltr">05:30h</span>
                                        <span className="text-[10px] text-on-surface-variant truncate w-full mt-0.5">ریاضی مهندسی</span>
                                    </div>

                                    {/* 1st Place */}
                                    <div className="bg-surface-container-high rounded-xl p-space-sm flex flex-col items-center text-center relative pt-4 -mt-2 border border-tertiary/30 shadow-xs">
                                        <div className="relative mb-1">
                                            <VectorAvatar name="پارسا ناصری" size="md" />
                                            <span className="absolute -bottom-1 -start-1 w-5 h-5 rounded-full bg-tertiary text-on-tertiary text-[10px] flex items-center justify-center font-bold shadow-xs">
                                                ۱
                                            </span>
                                        </div>
                                        <span className="text-label-md font-label-md text-on-surface font-bold truncate w-full">پارسا ن.</span>
                                        <span className="text-label-sm font-label-sm text-tertiary font-bold" dir="ltr">07:45h</span>
                                        <span className="text-[10px] text-on-surface-variant truncate w-full mt-0.5">پزشکی آزمون</span>
                                    </div>

                                    {/* 3rd Place */}
                                    <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col items-center text-center relative pt-4 border border-outline-variant/20">
                                        <div className="relative mb-1">
                                            <VectorAvatar name="نیلوفر ر." size="sm" />
                                            <span className="absolute -bottom-1 -start-1 w-5 h-5 rounded-full bg-secondary text-on-secondary text-[10px] flex items-center justify-center font-bold shadow-xs">
                                                ۳
                                            </span>
                                        </div>
                                        <span className="text-label-md font-label-md text-on-surface font-bold truncate w-full">نیلوفر ر.</span>
                                        <span className="text-label-sm font-label-sm text-secondary font-bold" dir="ltr">04:15h</span>
                                        <span className="text-[10px] text-on-surface-variant truncate w-full mt-0.5">برنامه‌نویسی</span>
                                    </div>
                                </div>
                            </div>

                            {/* Live Desks Grid */}
                            <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-space-md border border-outline-variant/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Users size={18} className="text-primary" />
                                        <h3 className="text-headline-md font-headline-md text-on-surface font-bold">
                                            میزهای مطالعه آنلاین
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-label-sm font-label-sm text-on-surface-variant">
                                        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                                        <span>{formatToPersianDigits(roomPeers.length || 21)} نفر در حال خواندن</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                                    {(roomPeers.length > 0 ? roomPeers : [
                                        {
                                            uid: 'peer_1',
                                            displayName: 'علیرضا ک.',
                                            avatar: '',
                                            status: 'studying' as const,
                                            activeSubject: 'واژگان ۵۰۴ تافل',
                                            activeTopic: 'پومودورو ۲',
                                            elapsedSeconds: 13800,
                                            dailyStudySeconds: 13800,
                                            cheersReceived: 3,
                                            lastPing: Date.now(),
                                        },
                                        {
                                            uid: 'peer_2',
                                            displayName: 'مریم حسینی',
                                            avatar: '',
                                            status: 'studying' as const,
                                            activeSubject: 'شیمی آلی کنکور',
                                            activeTopic: 'تمرکز عمیق',
                                            elapsedSeconds: 11520,
                                            dailyStudySeconds: 11520,
                                            cheersReceived: 5,
                                            lastPing: Date.now(),
                                        },
                                        {
                                            uid: 'peer_3',
                                            displayName: 'کسری جهان',
                                            avatar: '',
                                            status: 'break' as const,
                                            activeSubject: 'فیزیک کوانتوم',
                                            activeTopic: 'استراحت ۵ دقیقه',
                                            elapsedSeconds: 9600,
                                            dailyStudySeconds: 9600,
                                            cheersReceived: 1,
                                            lastPing: Date.now(),
                                        },
                                        {
                                            uid: 'peer_4',
                                            displayName: 'فاطمه زارع',
                                            avatar: '',
                                            status: 'studying' as const,
                                            activeSubject: 'طراحی الگوریتم',
                                            activeTopic: 'پومودورو ۳',
                                            elapsedSeconds: 6900,
                                            dailyStudySeconds: 6900,
                                            cheersReceived: 4,
                                            lastPing: Date.now(),
                                        },
                                    ]).map((peer) => (
                                        <div
                                            key={peer.uid}
                                            className="bg-surface-container-low rounded-xl p-space-sm flex flex-col gap-space-xs hover:bg-surface-container transition-colors border border-outline-variant/20"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <VectorAvatar name={peer.displayName} size="sm" />
                                                    <span className="text-label-md font-label-md font-bold text-on-surface truncate">
                                                        {peer.displayName}
                                                    </span>
                                                </div>
                                                <span
                                                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                                        peer.status === 'studying'
                                                            ? 'bg-secondary animate-pulse'
                                                            : peer.status === 'break'
                                                              ? 'bg-tertiary'
                                                              : 'bg-outline-variant'
                                                    }`}
                                                    title={peer.status === 'studying' ? 'در حال مطالعه' : peer.status === 'break' ? 'استراحت' : 'آماده'}
                                                />
                                            </div>
                                            <p className="text-body-sm font-body-sm text-on-surface-variant truncate">
                                                {peer.activeSubject || 'مطالعه متمرکز'}
                                            </p>
                                            <div className="flex items-center justify-between mt-1 text-[11px] text-on-surface">
                                                <span className={peer.status === 'studying' ? 'text-secondary font-medium' : 'text-tertiary font-medium'}>
                                                    {peer.activeTopic || (peer.status === 'break' ? 'استراحت' : 'پومودورو')}
                                                </span>
                                                <span className="font-mono font-semibold" dir="ltr">
                                                    {formatHMS(peer.elapsedSeconds || peer.dailyStudySeconds || 0)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desk Invite Banner */}
                                <div className="bg-surface-container rounded-xl p-space-sm flex items-center justify-between gap-space-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                                            <Plus size={16} />
                                        </div>
                                        <span className="text-body-sm font-body-sm text-on-surface font-medium">
                                            دوستت رو به میز بغلی دعوت کن!
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleCopyRoomCode(activeRoomCode || 'YPT-782K')}
                                        className="px-3 py-1.5 rounded-lg bg-surface-container-lowest text-primary text-label-sm font-label-sm font-bold hover:bg-surface-container-low transition-colors shrink-0 shadow-sm cursor-pointer"
                                    >
                                        اشتراک لینک
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Live Study Feed & Encouragement Stream (Span 4) */}
                        <div className="lg:col-span-4 flex flex-col gap-space-md">
                            <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-space-sm border border-outline-variant/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <MessageSquare size={18} className="text-primary" />
                                        <h3 className="text-headline-md font-headline-md text-on-surface font-bold">
                                            رویدادهای زنده اتاق
                                        </h3>
                                    </div>
                                    <span className="text-[11px] text-on-surface-variant">فقط انگیزشی و دستاورد</span>
                                </div>

                                {/* Activity Stream List */}
                                <div className="flex flex-col gap-space-xs max-h-80 overflow-y-auto custom-scrollbar">
                                    <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between text-body-sm font-body-sm border border-outline-variant/20">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={16} className="text-secondary shrink-0" />
                                            <span className="text-on-surface">
                                                <strong className="font-semibold">امیررضا</strong> پومودورو ۲۵ دقیقه‌ای رو تموم کرد!
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-on-surface-variant">همین حالا</span>
                                    </div>

                                    <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between text-body-sm font-body-sm border border-outline-variant/20">
                                        <div className="flex items-center gap-2">
                                            <DoorOpen size={16} className="text-primary shrink-0" />
                                            <span className="text-on-surface">
                                                <strong className="font-semibold">مهسا ع.</strong> به اتاق پیوست. به امید تمرکز بالا!
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-on-surface-variant">۲ دقیقه پیش</span>
                                    </div>

                                    <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between text-body-sm font-body-sm border border-outline-variant/20">
                                        <div className="flex items-center gap-2">
                                            <Flame size={16} className="text-tertiary shrink-0" />
                                            <span className="text-on-surface">
                                                <strong className="font-semibold">پارسا ن.</strong> رکورد ۷ ساعت مطالعه متوالی رو شکست 🔥
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-on-surface-variant">۵ دقیقه پیش</span>
                                    </div>

                                    {roomMessages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between text-body-sm font-body-sm border border-outline-variant/20"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">💬</span>
                                                <span className="text-on-surface">
                                                    <strong className="font-semibold">{msg.senderName}:</strong> {msg.text}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-on-surface-variant">
                                                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Quick Cheer Reactions & Input Bar */}
                                <div className="flex flex-col gap-space-xs mt-space-xs pt-space-xs border-t border-outline-variant/20">
                                    <div className="flex items-center justify-around bg-surface-container-low p-1.5 rounded-xl border border-outline-variant/20">
                                        <button
                                            onClick={() => handleSendReaction('👏')}
                                            className="w-9 h-9 rounded-lg hover:bg-surface-container flex items-center justify-center text-[18px] transition-transform active:scale-125 cursor-pointer"
                                            title="تشویق"
                                        >
                                            👏
                                        </button>
                                        <button
                                            onClick={() => handleSendReaction('🔥')}
                                            className="w-9 h-9 rounded-lg hover:bg-surface-container flex items-center justify-center text-[18px] transition-transform active:scale-125 cursor-pointer"
                                            title="آتشین"
                                        >
                                            🔥
                                        </button>
                                        <button
                                            onClick={() => handleSendReaction('☕')}
                                            className="w-9 h-9 rounded-lg hover:bg-surface-container flex items-center justify-center text-[18px] transition-transform active:scale-125 cursor-pointer"
                                            title="قهوه"
                                        >
                                            ☕
                                        </button>
                                        <button
                                            onClick={() => handleSendReaction('⚡')}
                                            className="w-9 h-9 rounded-lg hover:bg-surface-container flex items-center justify-center text-[18px] transition-transform active:scale-125 cursor-pointer"
                                            title="انرژی"
                                        >
                                            ⚡
                                        </button>
                                    </div>

                                    {/* Quick Text Message Field */}
                                    <form onSubmit={handleSendRoomChat} className="relative flex items-center mt-1">
                                        <input
                                            value={roomChatText}
                                            onChange={(e) => setRoomChatText(e.target.value)}
                                            className="w-full bg-surface-container-low text-on-surface placeholder:text-on-surface-variant text-body-sm font-body-sm rounded-xl py-2 px-3 pl-10 focus:outline-none focus:bg-surface-container transition-colors border border-outline-variant/20"
                                            placeholder="پیام انگیزه بفرستید..."
                                            type="text"
                                        />
                                        <button
                                            type="submit"
                                            aria-label="ارسال"
                                            className="absolute left-2 text-primary hover:text-primary-container p-1 flex items-center cursor-pointer"
                                        >
                                            <Send size={16} className="transform rotate-180" />
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION 2: COMPETITIVE DIAMOND LEAGUE (RANKING) */}
            {activeSection === 'ranking' && (
                <div className="flex flex-col gap-space-lg">
                    {/* Header & Promotion Zone Tag */}
                    <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md border border-outline-variant/30">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs pb-space-xs">
                            <div className="flex items-center gap-space-xs">
                                <Trophy size={26} className="text-tertiary" />
                                <div>
                                    <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                                        رده‌بندی زنده لیگ الماس
                                    </h2>
                                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                                        پایان دوره: ۱ روز و ۹ ساعت دیگر
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="bg-secondary-container text-on-secondary-container font-label-sm text-label-sm px-space-xs py-1 rounded-full flex items-center gap-1 font-bold">
                                    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>زنده
                                </span>
                                <button
                                    onClick={() => loadLeaderboardPage(true)}
                                    className="p-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition cursor-pointer"
                                    title="بروزرسانی"
                                >
                                    <RefreshCw size={16} className={isLoadingLb ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>

                        {/* Promotion Zone Tag */}
                        <div className="bg-secondary/10 px-space-sm py-2 rounded-xl flex items-center justify-between text-secondary border border-secondary/20">
                            <span className="font-label-sm text-label-sm font-bold flex items-center gap-1">
                                <TrendingUp size={16} className="text-secondary" />
                                منطقه صعود مستقیم (۳ نفر برتر)
                            </span>
                            <span className="font-label-sm text-label-sm font-bold">+۵۰۰ الماس جایزه صعود</span>
                        </div>

                        {/* Controls (Sort and Search) */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-space-xs">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSortBy('xp')}
                                    className={`px-3 py-1.5 rounded-lg text-label-sm font-label-sm font-bold transition-all ${
                                        sortBy === 'xp'
                                            ? 'bg-primary text-on-primary'
                                            : 'bg-surface-container-low text-on-surface-variant'
                                    }`}
                                >
                                    بر اساس امتیاز XP
                                </button>
                                <button
                                    onClick={() => setSortBy('exam')}
                                    className={`px-3 py-1.5 rounded-lg text-label-sm font-label-sm font-bold transition-all ${
                                        sortBy === 'exam'
                                            ? 'bg-primary text-on-primary'
                                            : 'bg-surface-container-low text-on-surface-variant'
                                    }`}
                                >
                                    بر اساس میانگین آزمون
                                </button>
                            </div>

                            <div className="relative">
                                <Search size={16} className="absolute right-3 top-2.5 text-on-surface-variant" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="جستجوی شرکت‌کننده..."
                                    className="w-full sm:w-64 pr-9 pl-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface text-body-sm font-body-sm border border-outline-variant/30 outline-none focus:border-primary"
                                />
                            </div>
                        </div>

                        {/* Leaderboard List */}
                        <div className="flex flex-col gap-space-xs pt-space-xs">
                            {/* Rank #1: آرین ر. */}
                            <div className="bg-surface-container-low hover:bg-surface-container-high transition-colors p-space-sm rounded-xl flex items-center justify-between border border-outline-variant/20">
                                <div className="flex items-center gap-space-sm">
                                    <span className="w-7 h-7 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold flex items-center justify-center">
                                        ۱
                                    </span>
                                    <VectorAvatar name="آرین ر." size="md" />
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1">
                                            <span className="font-label-md text-label-md font-bold text-on-surface">آرین ر.</span>
                                            <Crown size={15} className="text-amber-500" />
                                        </div>
                                        <span className="font-label-sm text-label-sm text-on-surface-variant">قهرمان دوره قبل</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="font-headline-md text-label-md text-on-surface font-bold">۵,۲۰۰ XP</span>
                                    <span className="font-label-sm text-label-sm text-secondary font-medium">۴۱ ساعت تمرکز</span>
                                </div>
                            </div>

                            {/* Rank #2: مهسا ک. */}
                            <div className="bg-surface-container-low hover:bg-surface-container-high transition-colors p-space-sm rounded-xl flex items-center justify-between border border-outline-variant/20">
                                <div className="flex items-center gap-space-sm">
                                    <span className="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-bold flex items-center justify-center">
                                        ۲
                                    </span>
                                    <VectorAvatar name="مهسا ک." size="md" />
                                    <div className="flex flex-col">
                                        <span className="font-label-md text-label-md font-bold text-on-surface">مهسا ک.</span>
                                        <span className="font-label-sm text-label-sm text-on-surface-variant">استریک ۱۲ روزه</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="font-headline-md text-label-md text-on-surface font-bold">۴,۴۰۰ XP</span>
                                    <span className="font-label-sm text-label-sm text-secondary font-medium">۳۶ ساعت تمرکز</span>
                                </div>
                            </div>

                            {/* Rank #3: سارا محمدی (YOU - Dedicated Prominent Highlight) */}
                            <div className="bg-primary-container text-on-primary-container p-space-sm rounded-xl flex items-center justify-between shadow-md relative overflow-hidden">
                                <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-primary/40 rounded-full blur-xl pointer-events-none"></div>
                                <div className="flex items-center gap-space-sm relative z-10">
                                    <span className="w-7 h-7 rounded-full bg-on-primary-container text-primary-container font-label-sm text-label-sm font-bold flex items-center justify-center shadow-xs">
                                        ۳
                                    </span>
                                    <VectorAvatar name={userName || 'سارا محمدی'} size="md" />
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-label-md text-label-md font-bold">{userName || 'سارا محمدی'}</span>
                                            <span className="bg-secondary text-on-secondary font-label-sm text-label-sm px-1.5 py-0.2 rounded font-bold">
                                                شما
                                            </span>
                                        </div>
                                        <span className="font-label-sm text-label-sm opacity-90">در منطقه طلایی ارتقا</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end relative z-10">
                                    <span className="font-headline-md text-label-md font-bold">
                                        {formatToPersianDigits(xp > 3900 ? xp : 3900)} XP
                                    </span>
                                    <span className="font-label-sm text-label-sm text-secondary-fixed font-bold">
                                        +۳۵۰ XP تا رتبه دوم
                                    </span>
                                </div>
                            </div>

                            {/* Demarcation Line */}
                            <div className="flex items-center justify-between px-space-xs py-1">
                                <span className="h-px bg-outline-variant/40 flex-1"></span>
                                <span className="font-label-sm text-label-sm text-on-surface-variant px-space-sm font-bold">
                                    خط تفکیک منطقه ابقا
                                </span>
                                <span className="h-px bg-outline-variant/40 flex-1"></span>
                            </div>

                            {/* Rank #4: علی ن. */}
                            <div className="bg-surface-container-low hover:bg-surface-container-high transition-colors p-space-sm rounded-xl flex items-center justify-between opacity-85 border border-outline-variant/20">
                                <div className="flex items-center gap-space-sm">
                                    <span className="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-semibold flex items-center justify-center">
                                        ۴
                                    </span>
                                    <VectorAvatar name="علی ن." size="md" />
                                    <div className="flex flex-col">
                                        <span className="font-label-md text-label-md font-semibold text-on-surface">علی ن.</span>
                                        <span className="font-label-sm text-label-sm text-on-surface-variant">تعقیب‌کننده مستقیم</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="font-headline-md text-label-md text-on-surface font-semibold">۳,۶۵۰ XP</span>
                                    <span className="font-label-sm text-label-sm text-error font-medium">-۲۵۰ XP از شما</span>
                                </div>
                            </div>

                            {/* Rank #5: نیلوفر ف. */}
                            <div className="bg-surface-container-low hover:bg-surface-container-high transition-colors p-space-sm rounded-xl flex items-center justify-between opacity-75 border border-outline-variant/20">
                                <div className="flex items-center gap-space-sm">
                                    <span className="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-semibold flex items-center justify-center">
                                        ۵
                                    </span>
                                    <VectorAvatar name="نیلوفر ف." size="md" />
                                    <div className="flex flex-col">
                                        <span className="font-label-md text-label-md font-semibold text-on-surface">نیلوفر ف.</span>
                                        <span className="font-label-sm text-label-sm text-on-surface-variant">استریک ۶ روزه</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="font-headline-md text-label-md text-on-surface font-semibold">۳,۲۰۰ XP</span>
                                    <span className="font-label-sm text-label-sm text-on-surface-variant">۲۵ ساعت تمرکز</span>
                                </div>
                            </div>

                            {/* Additional Dynamic DB Participants */}
                            {leaderboardData
                                .filter((p) => p.userName.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map((item, idx) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleOpenProfile(item.id)}
                                        className="bg-surface-container-low hover:bg-surface-container-high transition-colors p-space-sm rounded-xl flex items-center justify-between cursor-pointer border border-outline-variant/20"
                                    >
                                        <div className="flex items-center gap-space-sm">
                                            <span className="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-semibold flex items-center justify-center">
                                                {formatToPersianDigits(idx + 6)}
                                            </span>
                                            <div className="flex flex-col">
                                                <span className="font-label-md text-label-md font-semibold text-on-surface">
                                                    {item.userName}
                                                </span>
                                                <span className="font-label-sm text-label-sm text-on-surface-variant">
                                                    سطح {formatToPersianDigits(item.level)} • {formatToPersianDigits(item.tasksCompleted)} تسک تکمیل‌شده
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="font-headline-md text-label-md text-on-surface font-semibold">
                                                {formatToPersianDigits(item.xp)} XP
                                            </span>
                                            {item.examAverage > 0 && (
                                                <span className="font-label-sm text-label-sm text-secondary font-medium">
                                                    معدل تراز: {formatToPersianDigits(item.examAverage)}٪
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>

                        {hasMoreLb && (
                            <button
                                onClick={loadMoreLeaderboard}
                                disabled={isLoadingMore}
                                className="w-full py-space-sm rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md font-semibold transition-colors flex items-center justify-center gap-space-xs mt-2 cursor-pointer"
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

            {/* Native Dialog: Create Room Modal */}
            <dialog
                ref={createRoomDialogRef}
                className="rounded-3xl p-0 bg-surface-container-lowest text-on-surface border border-outline-variant/40 shadow-2xl backdrop:bg-black/60 max-w-lg w-full m-auto"
            >
                <form onSubmit={handleCreateRoomSubmit} className="p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                        <div className="flex items-center gap-2">
                            <Plus size={20} className="text-primary" />
                            <h3 className="font-headline-md text-headline-md font-bold">ایجاد اتاق مطالعه YPT</h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-label-sm font-label-sm font-bold text-on-surface">عنوان اتاق:</label>
                        <input
                            type="text"
                            required
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            placeholder="مثلاً: ماراتن شبانه کنکور تجربی"
                            className="px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-body-md border border-outline-variant/40 outline-none focus:border-primary"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-label-sm font-label-sm font-bold text-on-surface">دسته‌بندی:</label>
                        <select
                            value={newRoomCategory}
                            onChange={(e) => setNewRoomCategory(e.target.value)}
                            className="px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-body-md border border-outline-variant/40 outline-none focus:border-primary"
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
                            <label className="text-label-sm font-label-sm font-bold text-on-surface">هدف روزانه (ساعت):</label>
                            <input
                                type="number"
                                min={1}
                                max={16}
                                value={newRoomTargetHours}
                                onChange={(e) => setNewRoomTargetHours(Number(e.target.value))}
                                className="px-3.5 py-2 rounded-xl bg-surface-container-low text-on-surface text-body-md border border-outline-variant/40 outline-none focus:border-primary"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-label-sm font-label-sm font-bold text-on-surface">ظرفیت اعضا:</label>
                            <input
                                type="number"
                                min={2}
                                max={50}
                                value={newRoomMaxMembers}
                                onChange={(e) => setNewRoomMaxMembers(Number(e.target.value))}
                                className="px-3.5 py-2 rounded-xl bg-surface-container-low text-on-surface text-body-md border border-outline-variant/40 outline-none focus:border-primary"
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
                        <label htmlFor="roomIsPublic" className="text-label-sm font-label-sm text-on-surface cursor-pointer">
                            اتاق به صورت عمومی در لیست اتاق‌ها نمایش داده شود
                        </label>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-outline-variant/20">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-label-sm font-label-sm font-bold"
                        >
                            انصراف
                        </button>
                        <button
                            type="submit"
                            disabled={roomActionLoading}
                            className="px-5 py-2 rounded-xl bg-primary text-on-primary text-label-sm font-label-sm font-bold flex items-center gap-1.5 shadow-sm"
                        >
                            {roomActionLoading && <Loader2 size={14} className="animate-spin" />}
                            <span>ساخت و ورود به اتاق</span>
                        </button>
                    </div>
                </form>
            </dialog>

            {/* Native Dialog: Profile Viewer Modal */}
            <dialog
                ref={profileDialogRef}
                className="rounded-3xl p-0 bg-surface-container-lowest text-on-surface border border-outline-variant/40 shadow-2xl backdrop:bg-black/60 max-w-md w-full m-auto"
            >
                {viewingProfile && (
                    <div className="p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                            <div className="flex items-center gap-2">
                                <UserCheck size={22} className="text-primary" />
                                <h3 className="font-headline-md text-headline-md font-bold">{viewingProfile.userName}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewingProfile(null)}
                                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="bg-surface-container-low p-3 rounded-2xl border border-outline-variant/20">
                                <span className="text-body-sm text-on-surface-variant block">مجموع امتیاز</span>
                                <span className="text-headline-md font-bold text-primary">
                                    {formatToPersianDigits(viewingProfile.xp)} XP
                                </span>
                            </div>
                            <div className="bg-surface-container-low p-3 rounded-2xl border border-outline-variant/20">
                                <span className="text-body-sm text-on-surface-variant block">سطح فعلی</span>
                                <span className="text-headline-md font-bold text-secondary">
                                    سطح {formatToPersianDigits(viewingProfile.level)}
                                </span>
                            </div>
                        </div>

                        <div className="bg-surface-container-low p-3 rounded-2xl flex items-center justify-between border border-outline-variant/20 text-body-sm">
                            <span className="text-on-surface-variant">تسک‌های انجام‌شده:</span>
                            <span className="font-bold text-on-surface">
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
                            className="w-full mt-2 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold"
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