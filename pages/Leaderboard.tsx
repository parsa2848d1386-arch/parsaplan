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
    Smile
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
        stopTimer
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

        const unsubPeers = liveRoomService.subscribePeers(db, activeRoomCode, (peers) => {
            setRoomPeers(peers);
        });

        const unsubMessages = liveRoomService.subscribeMessages(db, activeRoomCode, (msgs) => {
            setRoomMessages(msgs);
        });

        liveRoomService.getRoom(db, activeRoomCode).then((res) => {
            if (res.ok && res.data) {
                setActiveRoomInfo(res.data);
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

        const currentSubject = selectedSubject?.name || 'مطالعه آزاد';
        const currentStatus = focusStatus === 'running' ? 'STUDYING' : 'RESTING';
        const currentElapsed = focusElapsedSeconds;

        liveRoomService.upsertPeer(db, activeRoomCode, {
            uid: userId,
            displayName: userName || 'دانش‌آموز',
            avatar: '🎓',
            status: currentStatus,
            subject: currentSubject,
            elapsedSeconds: currentElapsed,
            dailyStudySeconds: myTodayStudySeconds,
            lastHeartbeat: Date.now(),
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
            const res = await leaderboardApi.optOut(db, user.uid);
            if (res.ok) {
                setIsMyProfilePublic(false);
                showToast('پروفایل شما از جدول رتبه‌بندی عمومی برداشته شد.', 'info');
                loadLeaderboardPage(true);
            } else {
                showToast(res.error.message, 'error');
            }
        } else {
            const res = await leaderboardApi.optIn(db, myStats);
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
        const res = await liveRoomService.joinRoom(db, cleanCode, {
            uid: userId,
            displayName: userName || 'دانش‌آموز',
            avatar: '🎓',
            status: focusStatus === 'running' ? 'STUDYING' : 'IDLE',
            subject: selectedSubject?.name || 'مطالعه آزاد',
            elapsedSeconds: focusElapsedSeconds,
            dailyStudySeconds: myTodayStudySeconds,
            lastHeartbeat: Date.now(),
        });
        if (res.ok) {
            setActiveRoomCode(cleanCode);
            showToast(`با موفقیت وارد اتاق ${cleanCode} شدید!`, 'success');
            setJoinCodeInput('');
        } else {
            showToast(res.error.message, 'error');
        }
        setRoomActionLoading(false);
    };

    // Leave Current Room
    const handleLeaveActiveRoom = async () => {
        if (!db || !activeRoomCode || !userId) return;
        askConfirm('خروج از اتاق', 'آیا مطمئنید که می‌خواهید از اتاق مطالعه خارج شوید؟', async () => {
            await liveRoomService.leaveRoom(db, activeRoomCode, userId);
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
        const res = await liveRoomService.createRoom(db, {
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
        await liveRoomService.sendMessage(db, activeRoomCode, {
            senderUid: userId,
            senderName: userName || 'دانش‌آموز',
            senderAvatar: '🎓',
            text,
        });
    };

    // Send Quick Emoji Reaction
    const handleSendReaction = async (emoji: string) => {
        if (!db || !activeRoomCode || !userId) return;
        await liveRoomService.sendMessage(db, activeRoomCode, {
            senderUid: userId,
            senderName: userName || 'دانش‌آموز',
            senderAvatar: '🎓',
            text: emoji,
        });
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
                        {/* Cyber Avatar Frame with Tier Indicator */}
                        <div className="relative shrink-0">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-surface-container-high p-1 shadow-md flex items-center justify-center relative overflow-hidden border border-outline-variant/40">
                                <img
                                    className="w-full h-full object-cover rounded-xl"
                                    alt="Cyber Avatar"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuD03DTRdN-AD95KWkmb83_7dhRSTUAlIoweRT_jt9eltIUMSy9aGrWSQneZgqoo4z5wOOW1ZmrT7RjuYuuEgau955MrIzOoBetl_18BHu1kVPRmsvs48OAMmkId9fpuLcflVlvL59SVca3kaZKxXqXSwoTF8C3WJ-a_9aVdmhp5C3hijxPK7ooTItFKhpklDiwn35dSPafM0lgx-U-AwRTk4YMKpkQHyVRBRR1G3dg"
                                />
                            </div>
                            <span className="absolute -bottom-2 -left-2 bg-primary text-on-primary font-label-sm text-label-sm px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5 font-bold">
                                <span className="material-symbols-outlined text-[14px]">bolt</span>
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
                                    <span className="material-symbols-outlined text-[13px]">military_tech</span>
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
                                <span className="material-symbols-outlined text-[24px]">local_fire_department</span>
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
                                    <span className="material-symbols-outlined text-[16px] text-primary">stars</span>ارتقا به لیگ افسانه‌ای
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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-container-lowest dark:bg-slate-900 p-2.5 rounded-3xl shadow-sm border border-outline-variant/30">
                <div className="flex items-center gap-1.5 p-1 bg-surface-container-low dark:bg-slate-800/90 rounded-2xl border border-outline-variant/15 shadow-inner">
                    <button
                        onClick={() => setActiveSection('rooms')}
                        className={`touch-target flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer min-h-[42px] ${
                            activeSection === 'rooms'
                                ? 'bg-primary text-on-primary shadow-sm scale-[1.02]'
                                : 'text-on-surface-variant dark:text-gray-300 hover:text-on-surface hover:bg-surface-container'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[20px]">groups</span>
                        <span>اتاق مطالعه زنده YPT</span>
                        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                    </button>
                    <button
                        onClick={() => setActiveSection('ranking')}
                        className={`touch-target flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer min-h-[42px] ${
                            activeSection === 'ranking'
                                ? 'bg-primary text-on-primary shadow-sm scale-[1.02]'
                                : 'text-on-surface-variant dark:text-gray-300 hover:text-on-surface hover:bg-surface-container'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[20px]">leaderboard</span>
                        <span>رده‌بندی زنده لیگ الماس</span>
                    </button>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    {activeSection === 'rooms' ? (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="touch-target flex items-center gap-1.5 px-4.5 py-2.5 rounded-2xl bg-gradient-to-r from-secondary to-secondary/90 text-on-secondary font-bold text-xs shadow-sm hover:brightness-110 transition-all active:scale-95 cursor-pointer min-h-[42px]"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            <span>ایجاد اتاق جدید</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleTogglePublic}
                            disabled={isTogglingPublic}
                            className={`touch-target flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer min-h-[42px] ${
                                isMyProfilePublic
                                    ? 'bg-secondary-container text-on-secondary-container border border-secondary/30 shadow-xs'
                                    : 'bg-surface-container-high dark:bg-slate-800 text-on-surface dark:text-gray-200 hover:bg-surface-container-highest border border-outline-variant/30'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">
                                {isMyProfilePublic ? 'visibility' : 'visibility_off'}
                            </span>
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
                                    <span className="material-symbols-outlined text-[22px]">local_library</span>
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
                                    <span className="material-symbols-outlined text-primary text-[20px]">graphic_eq</span>
                                    <span>صدای محیطی فعال</span>
                                </div>

                                {activeRoomCode ? (
                                    <button
                                        onClick={handleLeaveActiveRoom}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-error-container text-on-error-container text-label-sm font-label-sm hover:opacity-90 transition-all"
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
                                            className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-label-sm font-label-sm font-bold disabled:opacity-50"
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
                                    className={`px-3 py-1 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                                        selectedAmbient === sound.id
                                            ? 'bg-primary text-on-primary font-bold shadow-xs'
                                            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[14px]">{sound.icon}</span>
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
                                <span className="material-symbols-outlined text-primary text-[16px]">edit_note</span>
                                <span className="truncate">
                                    {selectedSubject?.name
                                        ? `مرور تست‌های ${selectedSubject.name}`
                                        : 'مرور تست‌های ریاضی مهندسی - مبحث مشتقات جزئی'}
                                </span>
                            </div>
                            <button
                                onClick={() => setIsTimerOpen(true)}
                                className="text-primary hover:text-primary-container text-label-sm font-label-sm flex items-center gap-0.5"
                            >
                                <span>تغییر تسک</span>
                                <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
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
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-sm ${
                                    isMicMuted
                                        ? 'bg-surface-container text-on-surface-variant'
                                        : 'bg-primary text-on-primary'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[22px]">
                                    {isMicMuted ? 'mic_off' : 'mic'}
                                </span>
                            </button>

                            {focusStatus === 'running' ? (
                                <button
                                    onClick={pauseTimer}
                                    className="flex-1 py-3 px-6 rounded-xl bg-tertiary text-on-tertiary font-label-md text-label-md font-bold flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-98 transition-all"
                                >
                                    <span className="material-symbols-outlined text-[22px]">pause</span>
                                    <span>توقف موقت</span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => startTimer(selectedSubject?.id || 'general')}
                                    className="flex-1 py-3 px-6 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-primary-container active:scale-98 transition-all"
                                >
                                    <span className="material-symbols-outlined text-[22px]">play_circle</span>
                                    <span>شروع فوکوس دیپ‌ورک</span>
                                </button>
                            )}

                            <button
                                onClick={stopTimer}
                                className="py-3 px-4 rounded-xl bg-surface-container-high text-error hover:bg-error-container hover:text-on-error-container font-label-md text-label-md font-bold flex items-center justify-center gap-1 transition-all active:scale-98"
                            >
                                <span className="material-symbols-outlined text-[20px]">stop_circle</span>
                                <span>پایان پارت</span>
                            </button>

                            <button
                                onClick={() => setIsCamMuted(!isCamMuted)}
                                aria-label="دوربین"
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-sm ${
                                    isCamMuted
                                        ? 'bg-surface-container text-on-surface-variant'
                                        : 'bg-secondary text-on-secondary'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[22px]">
                                    {isCamMuted ? 'videocam_off' : 'videocam'}
                                </span>
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
                                        <span className="material-symbols-outlined text-tertiary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                            emoji_events
                                        </span>
                                        <h3 className="text-headline-md font-headline-md text-on-surface font-bold">
                                            برترین‌های امروز اتاق
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => setActiveSection('ranking')}
                                        className="text-primary text-label-sm font-label-sm font-bold flex items-center gap-0.5"
                                    >
                                        <span>مشاهده لیگ کامل</span>
                                        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-3 gap-space-xs pt-space-xs">
                                    {/* 2nd Place (You) */}
                                    <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col items-center text-center relative pt-4 border border-outline-variant/20">
                                        <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-label-md mb-1 relative">
                                            <span>س‌م</span>
                                            <span className="absolute -bottom-1 -start-1 w-5 h-5 rounded-full bg-outline-variant text-on-surface text-[10px] flex items-center justify-center font-bold">
                                                ۲
                                            </span>
                                        </div>
                                        <span className="text-label-md font-label-md text-on-surface font-bold truncate w-full">شما</span>
                                        <span className="text-label-sm font-label-sm text-primary font-bold" dir="ltr">05:30h</span>
                                        <span className="text-[10px] text-on-surface-variant truncate w-full mt-0.5">ریاضی مهندسی</span>
                                    </div>

                                    {/* 1st Place */}
                                    <div className="bg-surface-container-high rounded-xl p-space-sm flex flex-col items-center text-center relative pt-4 -mt-2 border border-tertiary/30 shadow-xs">
                                        <div className="w-12 h-12 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center font-bold text-label-md mb-1 relative">
                                            <span>پ‌ن</span>
                                            <span className="absolute -bottom-1 -start-1 w-5 h-5 rounded-full bg-tertiary text-on-tertiary text-[10px] flex items-center justify-center font-bold">
                                                ۱
                                            </span>
                                        </div>
                                        <span className="text-label-md font-label-md text-on-surface font-bold truncate w-full">پارسا ن.</span>
                                        <span className="text-label-sm font-label-sm text-tertiary font-bold" dir="ltr">07:45h</span>
                                        <span className="text-[10px] text-on-surface-variant truncate w-full mt-0.5">پزشکی آزمون</span>
                                    </div>

                                    {/* 3rd Place */}
                                    <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col items-center text-center relative pt-4 border border-outline-variant/20">
                                        <div className="w-10 h-10 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-bold text-label-md mb-1 relative">
                                            <span>ن‌ر</span>
                                            <span className="absolute -bottom-1 -start-1 w-5 h-5 rounded-full bg-secondary text-on-secondary text-[10px] flex items-center justify-center font-bold">
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
                                        <span className="material-symbols-outlined text-primary text-[20px]">group</span>
                                        <h3 className="text-headline-md font-headline-md text-on-surface font-bold">
                                            میزهای مطالعه آنلاین
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-1 text-label-sm font-label-sm text-on-surface-variant">
                                        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                                        <span>۲۱ نفر در حال خواندن</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                                    {/* Desk 1: Studying */}
                                    <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col gap-space-xs hover:bg-surface-container transition-colors border border-outline-variant/20">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-label-sm font-label-sm font-bold">
                                                    ع‌ک
                                                </div>
                                                <span className="text-label-md font-label-md font-bold text-on-surface truncate">علیرضا ک.</span>
                                            </div>
                                            <span className="w-2 h-2 rounded-full bg-secondary" title="در حال مطالعه"></span>
                                        </div>
                                        <p className="text-body-sm font-body-sm text-on-surface-variant truncate">واژگان ۵۰۴ تافل</p>
                                        <div className="flex items-center justify-between mt-1 text-[11px] text-on-surface">
                                            <span className="text-secondary font-medium">پومودورو ۲</span>
                                            <span className="font-mono font-semibold" dir="ltr">03:50h</span>
                                        </div>
                                    </div>

                                    {/* Desk 2: Studying */}
                                    <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col gap-space-xs hover:bg-surface-container transition-colors border border-outline-variant/20">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center text-label-sm font-label-sm font-bold">
                                                    م‌ح
                                                </div>
                                                <span className="text-label-md font-label-md font-bold text-on-surface truncate">مریم حسینی</span>
                                            </div>
                                            <span className="w-2 h-2 rounded-full bg-secondary" title="در حال مطالعه"></span>
                                        </div>
                                        <p className="text-body-sm font-body-sm text-on-surface-variant truncate">شیمی آلی کنکور</p>
                                        <div className="flex items-center justify-between mt-1 text-[11px] text-on-surface">
                                            <span className="text-secondary font-medium">تمرکز عمیق</span>
                                            <span className="font-mono font-semibold" dir="ltr">03:12h</span>
                                        </div>
                                    </div>

                                    {/* Desk 3: Short Break */}
                                    <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col gap-space-xs hover:bg-surface-container transition-colors border border-outline-variant/20">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-7 h-7 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center text-label-sm font-label-sm font-bold">
                                                    ک‌ج
                                                </div>
                                                <span className="text-label-md font-label-md font-bold text-on-surface truncate">کسری جهان</span>
                                            </div>
                                            <span className="w-2 h-2 rounded-full bg-tertiary" title="استراحت کوتاه"></span>
                                        </div>
                                        <p className="text-body-sm font-body-sm text-on-surface-variant truncate">فیزیک کوانتوم</p>
                                        <div className="flex items-center justify-between mt-1 text-[11px] text-on-surface">
                                            <span className="text-tertiary font-medium">استراحت ۵ دقیقه</span>
                                            <span className="font-mono font-semibold" dir="ltr">02:40h</span>
                                        </div>
                                    </div>

                                    {/* Desk 4: Studying */}
                                    <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col gap-space-xs hover:bg-surface-container transition-colors border border-outline-variant/20">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-label-sm font-label-sm font-bold">
                                                    ف‌ز
                                                </div>
                                                <span className="text-label-md font-label-md font-bold text-on-surface truncate">فاطمه زارع</span>
                                            </div>
                                            <span className="w-2 h-2 rounded-full bg-secondary" title="در حال مطالعه"></span>
                                        </div>
                                        <p className="text-body-sm font-body-sm text-on-surface-variant truncate">طراحی الگوریتم</p>
                                        <div className="flex items-center justify-between mt-1 text-[11px] text-on-surface">
                                            <span className="text-secondary font-medium">پومودورو ۳</span>
                                            <span className="font-mono font-semibold" dir="ltr">01:55h</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Desk Invite Banner */}
                                <div className="bg-surface-container rounded-xl p-space-sm flex items-center justify-between gap-space-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-[18px]">person_add</span>
                                        </div>
                                        <span className="text-body-sm font-body-sm text-on-surface font-medium">
                                            دوستت رو به میز بغلی دعوت کن!
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleCopyRoomCode(activeRoomCode || 'YPT-782K')}
                                        className="px-3 py-1.5 rounded-lg bg-surface-container-lowest text-primary text-label-sm font-label-sm font-bold hover:bg-surface-container-low transition-colors shrink-0 shadow-sm"
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
                                        <span className="material-symbols-outlined text-primary text-[20px]">chat_bubble_outline</span>
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
                                            <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
                                            <span className="text-on-surface">
                                                <strong className="font-semibold">امیررضا</strong> پومودورو ۲۵ دقیقه‌ای رو تموم کرد!
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-on-surface-variant">همین حالا</span>
                                    </div>

                                    <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between text-body-sm font-body-sm border border-outline-variant/20">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary text-[18px]">login</span>
                                            <span className="text-on-surface">
                                                <strong className="font-semibold">مهسا ع.</strong> به اتاق پیوست. به امید تمرکز بالا!
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-on-surface-variant">۲ دقیقه پیش</span>
                                    </div>

                                    <div className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between text-body-sm font-body-sm border border-outline-variant/20">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-tertiary text-[18px]">local_fire_department</span>
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
                                                <span className="text-sm">{msg.senderAvatar || '💬'}</span>
                                                <span className="text-on-surface">
                                                    <strong className="font-semibold">{msg.senderName}:</strong> {msg.text}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-on-surface-variant">
                                                {formatClockTime(new Date(msg.timestamp))}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Quick Cheer Reactions & Input Bar */}
                                <div className="flex flex-col gap-space-xs mt-space-xs pt-space-xs border-t border-outline-variant/20">
                                    <div className="flex items-center justify-around bg-surface-container-low p-1.5 rounded-xl border border-outline-variant/20">
                                        <button
                                            onClick={() => handleSendReaction('👏')}
                                            className="w-9 h-9 rounded-lg hover:bg-surface-container flex items-center justify-center text-[18px] transition-transform active:scale-125"
                                            title="تشویق"
                                        >
                                            👏
                                        </button>
                                        <button
                                            onClick={() => handleSendReaction('🔥')}
                                            className="w-9 h-9 rounded-lg hover:bg-surface-container flex items-center justify-center text-[18px] transition-transform active:scale-125"
                                            title="آتشین"
                                        >
                                            🔥
                                        </button>
                                        <button
                                            onClick={() => handleSendReaction('☕')}
                                            className="w-9 h-9 rounded-lg hover:bg-surface-container flex items-center justify-center text-[18px] transition-transform active:scale-125"
                                            title="قهوه"
                                        >
                                            ☕
                                        </button>
                                        <button
                                            onClick={() => handleSendReaction('⚡')}
                                            className="w-9 h-9 rounded-lg hover:bg-surface-container flex items-center justify-center text-[18px] transition-transform active:scale-125"
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
                                            className="absolute left-2 text-primary hover:text-primary-container p-1 flex items-center"
                                        >
                                            <span className="material-symbols-outlined text-[18px] transform rotate-180">send</span>
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
                                <span className="material-symbols-outlined text-tertiary text-[28px]">workspace_premium</span>
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
                                    className="p-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition"
                                    title="بروزرسانی"
                                >
                                    <RefreshCw size={16} className={isLoadingLb ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>

                        {/* Promotion Zone Tag */}
                        <div className="bg-secondary/10 px-space-sm py-2 rounded-xl flex items-center justify-between text-secondary border border-secondary/20">
                            <span className="font-label-sm text-label-sm font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
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
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-container-high shrink-0">
                                        <img
                                            className="w-full h-full object-cover"
                                            alt="آرین ر."
                                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBk1QVw4_S2uBiuhijOVs0iCn2JIumP0f-4aRvVISehbBAHGOgqGSopgs0kpGgC01hgR3H1gTFsJkqC5ImeL8-Xznii17S3IHCo5eWuRy9jpBN_GRbzVDrxELl9xBrsckYUwR2WiAk8idQftMP7CBOIDDjVS8kXzznzdpg7M8L6gPQzWmwsR18Gw1sULbXLTnmJORNmOGEij342ja4M_XtesvXgKEnaunqwy6t6CpU"
                                        />
                                    </div>
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
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-container-high shrink-0">
                                        <img
                                            className="w-full h-full object-cover"
                                            alt="مهسا ک."
                                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCiNFnuZPsShA_cGNCtOK3UVXiKK1XMZYG7tDTyNCLZ59c_QkEGRT2vSFB-zrhyur4DNFyFK1UTPk0T63Ra8fxo3eTtLryRVhBAUrAa6I8PWqEu3vQF3gMfgzZoo1sv9PHIjm3Q7aA4dsu_TBI_k9AJUlk_PbGoUGSIdUI4pBekug9vMS0Rkn5WTZDPIrQZTET-oJCPXZrpZNlnciRXN4jTOiyBCiKQGe-smhimBck"
                                        />
                                    </div>
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
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-container-lowest p-0.5 shadow-xs shrink-0">
                                        <img
                                            className="w-full h-full object-cover rounded-md"
                                            alt="شما"
                                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZNwFRNZk2mW2FC_tq4_nPtORyQIa81-BQ5ecsFi18hF8-h4eFiJtUCHygmmfZ78bD4j-QaIIbgi6deSNvokPgzla8VPxq-UyKd9amJlWEjhO7cYgaxkWJdf-iwVKDTPUU3NVR8e3Z-6l3TIv9Lhy_V4suklutjO4v069GUm12qYMW8qSdJGK7AlzEaDWR9EfYSRZ6vhjtjfvw16pwX3gw_J3gD0SIDopSZ1gpApI"
                                        />
                                    </div>
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
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-container-high shrink-0">
                                        <img
                                            className="w-full h-full object-cover"
                                            alt="علی ن."
                                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8KL2eWerRG0yzYS9degs34asXCmV8BiScafrJ7k5d7cTLaMNQRElECyCLkoWZlunzqV8IYb1QqPC80qYWBfLkYD2byj4hLpnVYEpIrITSmE4-4JVOhxFvvL0jaKhyaYtR0tTIVLo31BEDMD0Xg9k9wodrnAq2XcF0TepXcVIhIY49Ixt8JDufm-HYYnPkhHDIAS16GmrMI2X_Hr7oeiqlrYr71RzgLgqlsXHUmXc"
                                        />
                                    </div>
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
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-container-high shrink-0">
                                        <img
                                            className="w-full h-full object-cover"
                                            alt="نیلوفر ف."
                                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4295_58qhBMKf0ZC6fqLcIOJaN0L7XdQtYlbnavi1y2Irk2pNJlIUk-_VpIiV35eofaq0-MH9KbPkj8VhhjpZ3IORZe6d9ioBFT0AY6pezoxaPdMELnQ7GzfX4Qtggz30-SuB1Az8ElTgtBEDrrxaAocLocjRoaSQFkODdQ2wFDx2tEK8yDGYSHiawKZ07mF20UT4K9LUzzDVDsqAqmN9LasXCbDhnDFABQTlHxs"
                                        />
                                    </div>
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
                                className="w-full py-space-sm rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md font-semibold transition-colors flex items-center justify-center gap-space-xs mt-2"
                            >
                                {isLoadingMore ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <>
                                        <span>مشاهده رتبه‌های بیشتر لیگ</span>
                                        <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
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
                            <span className="material-symbols-outlined text-primary text-[24px]">add_circle</span>
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
                                <span className="material-symbols-outlined text-primary text-[24px]">account_circle</span>
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