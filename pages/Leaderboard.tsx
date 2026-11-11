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
    Send,
    DoorOpen,
    Lock,
    Globe,
    Calendar,
    Clock,
} from 'lucide-react';
import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { getShamsiDate, formatClockTime, formatToPersianDigits } from '../utils';
import { getLogicalDateKey } from '../utils/streakEngine';
import { leaderboardApi, ROOM_CATEGORIES } from '../services/backendApi';
import { liveRoomService } from '../services/liveRoomService';
import { LiveRoomInfo, LiveRoomMessage, LiveRoomPeer, PublicProfileDetail, PublicProfileSummary } from '../types';

const Leaderboard = () => {
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
    } = useFocus();

    // Primary Page Tab ('rooms' YPT vs 'ranking' Leaderboard)
    const [activeSection, setActiveSection] = useState<'rooms' | 'ranking'>('rooms');

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
        if (!activeRoomCode) return;
        const interval = setInterval(() => setLocalTick((t) => t + 1), 1000);
        return () => clearInterval(interval);
    }, [activeRoomCode]);

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
        loadPublicRooms(false);
        loadLeaderboardPage(false);
        if (user?.uid) {
            leaderboardApi.checkIsPublic(db, user.uid).then(setIsMyProfilePublic);
        }
    }, [db, user?.uid, loadPublicRooms, loadLeaderboardPage]);

    // Dirty-checked throttled leaderboard stats sync
    useEffect(() => {
        if (!isMyProfilePublic || !isCloudAuthenticated || !db || !user) return;
        leaderboardApi.syncStatsIfDirty(db, user.uid, myStats, tasks).catch(() => {});
    }, [isMyProfilePublic, isCloudAuthenticated, db, user, myStats, tasks]);

    // Subscribe to Active Joined YPT Room (Members & Chat)
    useEffect(() => {
        if (!activeRoomCode || !isCloudAuthenticated || !db) {
            setActiveRoomInfo(null);
            setRoomPeers([]);
            setRoomMessages([]);
            return;
        }

        let mounted = true;
        liveRoomService.getGroupRoom(db, activeRoomCode).then((info) => {
            if (mounted) setActiveRoomInfo(info);
        });

        const unsubPeers = liveRoomService.subscribeRoomMembers(db, activeRoomCode, (peers) => {
            setRoomPeers(peers);
        });
        const unsubMsgs = liveRoomService.subscribeRoomMessages(db, activeRoomCode, (msgs) => {
            setRoomMessages(msgs);
        });

        return () => {
            mounted = false;
            unsubPeers();
            unsubMsgs();
        };
    }, [activeRoomCode, isCloudAuthenticated, db]);

    // --- YPT Study Room Handlers ---
    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isCloudAuthenticated || !db) {
            showToast('برای ساخت اتاق مطالعه آنلاین ابتدا وارد حساب کاربری شوید', 'warning');
            return;
        }
        if (newRoomName.trim().length < 2) {
            showToast('لطفاً نام اتاق را حداقل با ۲ کاراکتر وارد کنید', 'warning');
            return;
        }

        setRoomActionLoading(true);
        const res = await liveRoomService.createRoomSafe(db, {
            creatorId: userId,
            creatorName: userName || 'کاربر',
            name: newRoomName.trim(),
            category: newRoomCategory,
            description: newRoomDesc.trim(),
            targetHours: newRoomTargetHours,
            maxMembers: newRoomMaxMembers,
            isPublic: newRoomIsPublic,
        });

        if (res.ok) {
            const info = res.data;
            await liveRoomService.upsertMemberPresence(db, info.code, {
                uid: userId,
                displayName: userName || 'کاربر',
                avatar: '👑',
                status: focusStatus === 'running' ? 'STUDYING' : 'RESTING',
                activeSubject: selectedSubject || info.category,
                activeTopic: '',
                elapsedSeconds: focusStatus === 'running' ? focusElapsedSeconds : 0,
                dailyStudySeconds: myTodayStudySeconds,
                cheersReceived: 0,
                lastPing: Date.now(),
            });
            setActiveRoomInfo(info);
            setActiveRoomCode(info.code);
            setIsCreateModalOpen(false);
            setNewRoomName('');
            setNewRoomDesc('');
            await loadPublicRooms(true);
            showToast(`اتاق «${info.name}» با کد ${info.code} ساخته شد! 🎉`, 'success');
        } else {
            showToast(res.error.message, 'error');
        }
        setRoomActionLoading(false);
    };

    const handleJoinRoom = async (rawCode: string) => {
        const clean = rawCode.trim().toUpperCase();
        if (clean.length !== 6) {
            showToast('کد دعوت اتاق باید ۶ کاراکتر باشد', 'warning');
            return;
        }
        if (!isCloudAuthenticated || !db) {
            showToast('برای ورود به اتاق مطالعه آنلاین ابتدا وارد حساب کاربری شوید', 'warning');
            return;
        }

        setRoomActionLoading(true);
        try {
            const info = await liveRoomService.getGroupRoom(db, clean);
            if (!info) {
                showToast('اتاقی با این کد یافت نشد', 'error');
                setRoomActionLoading(false);
                return;
            }
            await liveRoomService.upsertMemberPresence(db, clean, {
                uid: userId,
                displayName: userName || 'کاربر',
                avatar: '🎓',
                status: focusStatus === 'running' ? 'STUDYING' : 'RESTING',
                activeSubject: selectedSubject || info.category,
                activeTopic: '',
                elapsedSeconds: focusStatus === 'running' ? focusElapsedSeconds : 0,
                dailyStudySeconds: myTodayStudySeconds,
                cheersReceived: 0,
                lastPing: Date.now(),
            });
            setActiveRoomInfo(info);
            setActiveRoomCode(clean);
            setJoinCodeInput('');
            showToast(`وارد اتاق «${info.name}» شدید! 👥`, 'success');
        } catch {
            showToast('خطا در اتصال به اتاق مطالعه', 'error');
        } finally {
            setRoomActionLoading(false);
        }
    };

    const handleLeaveActiveRoom = async () => {
        if (!activeRoomCode) return;
        if (db && isCloudAuthenticated) {
            await liveRoomService.leaveGroupRoom(db, activeRoomCode, userId).catch(() => {});
        }
        setActiveRoomCode(null);
        setActiveRoomInfo(null);
        showToast('از اتاق مطالعه خارج شدید', 'info');
    };

    const handleDeleteActiveRoom = () => {
        if (!db || !activeRoomCode || !activeRoomInfo || activeRoomInfo.creatorId !== userId) return;
        askConfirm(
            'بستن و حذف اتاق',
            `آیا از حذف دائمی اتاق «${activeRoomInfo.name}» مطمئن هستید؟`,
            async () => {
                const res = await liveRoomService.deleteGroupRoom(db, activeRoomCode);
                if (res.ok) {
                    setActiveRoomCode(null);
                    setActiveRoomInfo(null);
                    await loadPublicRooms(true);
                    showToast('اتاق مطالعه بسته شد', 'info');
                } else {
                    showToast(res.error.message, 'error');
                }
            },
            'danger'
        );
    };

    const handleQuickRoomStatus = async (nextStatus: 'STUDYING' | 'RESTING') => {
        if (!db || !activeRoomCode || !isCloudAuthenticated) return;
        await liveRoomService.updateMemberStatus(
            db,
            activeRoomCode,
            userId,
            nextStatus,
            selectedSubject || activeRoomInfo?.category || 'تمرکز',
            '',
            focusElapsedSeconds
        );
    };

    const handleSendRoomChat = async () => {
        if (!db || !activeRoomCode || !isCloudAuthenticated || !roomChatText.trim()) return;
        const msg = roomChatText;
        setRoomChatText('');
        await liveRoomService.sendRoomMessage(db, activeRoomCode, userId, userName || 'کاربر', msg);
    };

    const handleStartFocusInsideRoom = () => {
        setIsTimerOpen(true);
        if (focusStatus !== 'running') {
            startTimer();
        }
    };

    const handleCopyRoomCode = (code: string) => {
        navigator.clipboard?.writeText(code);
        setCopiedCode(true);
        showToast(`کد دعوت ${code} کپی شد`, 'success');
        setTimeout(() => setCopiedCode(false), 2000);
    };

    // --- Leaderboard Handlers ---
    const toggleMyPublicProfile = async () => {
        if (!isCloudAuthenticated || !db || !user) {
            showToast('برای شرکت در لیگ باید وارد حساب آنلاین خود شوید', 'warning');
            return;
        }
        setIsTogglingPublic(true);
        const res = isMyProfilePublic
            ? await leaderboardApi.unpublishProfile(db, user.uid)
            : await leaderboardApi.publishProfile(db, user.uid, myStats, tasks);

        if (res.ok) {
            const nextState = !isMyProfilePublic;
            setIsMyProfilePublic(nextState);
            showToast(
                nextState ? 'پروفایل شما عمومی شد و در لیگ نمایش داده می‌شود' : 'پروفایل شما خصوصی شد',
                'success'
            );
            await loadLeaderboardPage(true);
        } else {
            showToast(res.error.message, 'error');
        }
        setIsTogglingPublic(false);
    };

    const viewUserProfile = async (profile: PublicProfileSummary) => {
        if (profile.id === user?.uid) {
            showToast('این پروفایل خودتان است!', 'info');
            return;
        }
        if (!db) return;
        setIsLoadingProfile(true);
        const res = await leaderboardApi.fetchProfileDetail(db, profile.id);
        if (res.ok && res.data) {
            setViewingProfile(res.data);
        } else if (!res.ok) {
            showToast(res.error.message, 'error');
        } else {
            showToast('پروفایل یافت نشد', 'error');
        }
        setIsLoadingProfile(false);
    };

    const filteredPublicRooms = useMemo(() => {
        const q = roomSearch.trim().toLowerCase();
        return publicRooms.filter((r) => {
            if (selectedCategory !== 'همه' && r.category !== selectedCategory) return false;
            if (q && !r.name.toLowerCase().includes(q) && !r.code.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [publicRooms, selectedCategory, roomSearch]);

    const filteredLeaderboard = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const base = q ? leaderboardData.filter((p) => p.userName.toLowerCase().includes(q)) : [...leaderboardData];
        if (sortBy === 'exam') base.sort((a, b) => (b.examAverage || 0) - (a.examAverage || 0));
        else base.sort((a, b) => b.xp - a.xp);
        return base;
    }, [leaderboardData, searchQuery, sortBy]);

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="text-yellow-500" size={22} />;
        if (rank === 2) return <Medal className="text-gray-400" size={20} />;
        if (rank === 3) return <Medal className="text-amber-600" size={20} />;
        return <span className="text-gray-400 font-bold text-sm">{rank}</span>;
    };

    const getTimeAgo = (timestamp: number) => {
        const hours = Math.floor((Date.now() - timestamp) / 3_600_000);
        if (hours < 1) return 'آنلاین';
        if (hours < 24) return `${hours} ساعت پیش`;
        return `${Math.floor(hours / 24)} روز پیش`;
    };

    return (
        <>
            <div className="p-4 md:p-6 pb-32 space-y-6 animate-in fade-in duration-300 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-amber-200/50 dark:shadow-none shrink-0">
                            <Trophy className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white tracking-tight">
                                لیگ رقابت و اتاق‌های مطالعه YPT
                            </h1>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium pretty-text">
                                ساخت اتاق تمرکز گروهی، رقابت روزانه با دوستان و جدول رتبه‌بندی
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-500/20 transition"
                        >
                            <Plus size={16} /> ساخت اتاق مطالعه
                        </button>

                        <button
                            type="button"
                            onClick={() => (activeSection === 'rooms' ? loadPublicRooms(true) : loadLeaderboardPage(true))}
                            disabled={isLoadingLb || isLoadingRooms}
                            aria-label="بروزرسانی داده‌ها"
                            className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50"
                        >
                            <RefreshCw size={17} className={isLoadingLb || isLoadingRooms ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Primary Mode Switcher */}
                <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl grid grid-cols-2 max-w-md">
                    <button
                        type="button"
                        onClick={() => setActiveSection('rooms')}
                        className={`py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${
                            activeSection === 'rooms'
                                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                    >
                        <Users size={15} />
                        اتاق‌های مطالعه (YPT)
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSection('ranking')}
                        className={`py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${
                            activeSection === 'ranking'
                                ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-300 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                    >
                        <Trophy size={15} />
                        جدول رقابت سراسری
                    </button>
                </div>

                {!isCloudAuthenticated && (
                    <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 text-xs font-bold text-amber-800 dark:text-amber-200 leading-relaxed">
                        ⚠️ برای ساخت اتاق مطالعه گروهی، ورود با کد دعوت و شرکت در لیگ آنلاین ابتدا وارد حساب ابری خود شوید.
                    </div>
                )}

                {/* ======================================================
                    TAB 1: YPT-STYLE STUDY ROOMS
                   ====================================================== */}
                {activeSection === 'rooms' ? (
                    <div className="space-y-6">
                        {/* Quick Join by Code */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="flex items-center gap-2 text-xs font-black text-gray-700 dark:text-gray-200 shrink-0">
                                <DoorOpen size={17} className="text-indigo-500" />
                                <span>ورود سریع با کد اتاق:</span>
                            </div>
                            <input
                                type="text"
                                maxLength={6}
                                value={joinCodeInput}
                                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                                onKeyDown={(e) => {
                                    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                                    if (e.key === 'Enter' && joinCodeInput.trim().length === 6) {
                                        handleJoinRoom(joinCodeInput);
                                    }
                                }}
                                placeholder="کد ۶ رقمی (مثلاً AB12CD)"
                                dir="ltr"
                                aria-label="کد دعوت اتاق"
                                className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-center font-mono text-sm font-black tracking-widest outline-none focus:border-indigo-500 text-gray-800 dark:text-white uppercase"
                            />
                            <button
                                type="button"
                                onClick={() => handleJoinRoom(joinCodeInput)}
                                disabled={roomActionLoading || joinCodeInput.trim().length < 6}
                                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black transition"
                            >
                                پیوستن به اتاق
                            </button>
                        </div>

                        {/* Active YPT Room Workspace */}
                        {activeRoomCode && (
                            <div className="bg-white dark:bg-gray-800 rounded-[2rem] border-2 border-indigo-200 dark:border-indigo-800/60 shadow-lg overflow-hidden">
                                {/* Room Top Banner */}
                                <div className="p-5 bg-gradient-to-l from-indigo-600 to-violet-700 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black">
                                                {activeRoomInfo?.category || 'اتاق مطالعه'}
                                            </span>
                                            <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-bold flex items-center gap-1">
                                                {activeRoomInfo?.isPublic === false ? <Lock size={10} /> : <Globe size={10} />}
                                                {activeRoomInfo?.isPublic === false ? 'خصوصی' : 'عمومی'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyRoomCode(activeRoomCode)}
                                                className="px-2.5 py-0.5 rounded-full bg-amber-400/90 text-slate-950 font-mono text-[11px] font-black flex items-center gap-1 hover:bg-amber-300 transition"
                                            >
                                                <span>{activeRoomCode}</span>
                                                {copiedCode ? <Check size={11} /> : <Copy size={11} />}
                                            </button>
                                        </div>
                                        <h2 className="text-lg font-black">{activeRoomInfo?.name || `اتاق ${activeRoomCode}`}</h2>
                                        <p className="text-xs text-indigo-100/85 mt-0.5">
                                            هدف روزانه: {formatToPersianDigits(activeRoomInfo?.targetHours || 4)} ساعت •{' '}
                                            {formatToPersianDigits(roomPeers.length)} / {formatToPersianDigits(activeRoomInfo?.maxMembers || 25)} عضو
                                            {activeRoomInfo?.description ? ` — ${activeRoomInfo.description}` : ''}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleStartFocusInsideRoom}
                                            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition"
                                        >
                                            <Play size={14} fill="currentColor" />
                                            شروع تایمر در این اتاق
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleQuickRoomStatus('RESTING')}
                                            className="px-3 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition"
                                        >
                                            حالت استراحت
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleLeaveActiveRoom}
                                            className="px-3 py-2.5 rounded-xl bg-rose-500/90 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1 transition"
                                        >
                                            <LogOut size={13} /> خروج
                                        </button>
                                        {activeRoomInfo?.creatorId === userId && (
                                            <button
                                                type="button"
                                                onClick={handleDeleteActiveRoom}
                                                className="p-2.5 rounded-xl bg-black/25 hover:bg-rose-700 text-white transition"
                                                title="حذف اتاق"
                                                aria-label="حذف اتاق"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
                                    {/* YPT Member Desks (2 cols) */}
                                    <div className="lg:col-span-2 space-y-3">
                                        <h3 className="text-xs font-black text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                                            <Clock size={14} className="text-indigo-500" />
                                            میزهای تمرکز اعضای اتاق ({formatToPersianDigits(roomPeers.length)})
                                        </h3>

                                        {roomPeers.length === 0 ? (
                                            <div className="text-center py-10 bg-gray-50 dark:bg-gray-900/40 rounded-2xl text-xs text-gray-400 font-bold">
                                                در حال همگام‌سازی اعضای اتاق...
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {roomPeers.map((peer) => {
                                                    const isStudying = peer.status === 'STUDYING';
                                                    const isResting = peer.status === 'RESTING';
                                                    const liveElapsed = isStudying ? peer.elapsedSeconds + (localTick % 60) : peer.elapsedSeconds;
                                                    const dailyTotal = peer.dailyStudySeconds + (isStudying ? liveElapsed : 0);
                                                    const targetSecs = (activeRoomInfo?.targetHours || 4) * 3600;
                                                    const goalPct = Math.min(100, Math.round((dailyTotal / targetSecs) * 100));

                                                    return (
                                                        <div
                                                            key={peer.uid}
                                                            className={`p-3.5 rounded-2xl border transition ${
                                                                isStudying
                                                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 shadow-sm'
                                                                    : 'bg-gray-50/70 dark:bg-gray-900/40 border-gray-200/70 dark:border-gray-700/60'
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <div className="relative w-10 h-10 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-lg shrink-0">
                                                                        <span>{peer.avatar || '🎓'}</span>
                                                                        <span
                                                                            className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                                                                                isStudying ? 'bg-emerald-500 animate-pulse' : isResting ? 'bg-amber-400' : 'bg-gray-400'
                                                                            }`}
                                                                        />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-black text-gray-800 dark:text-white truncate">
                                                                            {peer.displayName} {peer.uid === userId ? '(شما)' : ''}
                                                                        </p>
                                                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                                            {isStudying ? `🔥 ${peer.activeSubject || 'در حال تمرکز'}` : isResting ? '☕ استراحت' : 'آفلاین'}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="text-left shrink-0">
                                                                    <span className={`font-mono text-xs font-black ${isStudying ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                                                                        {formatClockTime(liveElapsed)}
                                                                    </span>
                                                                    <span className="block text-[9px] text-gray-400">
                                                                        مجموع: {formatClockTime(dailyTotal)}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="mt-3 flex items-center gap-2">
                                                                <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all ${isStudying ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                                        style={{ width: `${goalPct}%` }}
                                                                    />
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    disabled={peer.uid === userId}
                                                                    onClick={() => db && liveRoomService.sendCheer(db, activeRoomCode, peer.uid)}
                                                                    className="px-2 py-0.5 rounded-lg bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-black hover:bg-amber-200 disabled:opacity-60 transition flex items-center gap-1 shrink-0"
                                                                    title="تشویق"
                                                                >
                                                                    🔥 {formatToPersianDigits(peer.cheersReceived || 0)}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* YPT Room Group Chat */}
                                    <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-200/70 dark:border-gray-700/60 p-3 flex flex-col h-72">
                                        <h3 className="text-xs font-black text-gray-600 dark:text-gray-300 mb-2">گفتگوی گروهی اتاق</h3>
                                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pl-1">
                                            {roomMessages.length === 0 ? (
                                                <p className="text-[11px] text-gray-400 text-center mt-10">هنوز پیامی ثبت نشده است.</p>
                                            ) : (
                                                roomMessages.map((m) => (
                                                    <div key={m.id} className="bg-white dark:bg-gray-800 rounded-xl p-2 text-[11px] border border-gray-100 dark:border-gray-700">
                                                        <span className="font-black text-indigo-600 dark:text-indigo-400 ml-1">{m.senderName}:</span>
                                                        <span className="text-gray-700 dark:text-gray-200">{m.text}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div className="mt-2 flex gap-1.5">
                                            <input
                                                type="text"
                                                value={roomChatText}
                                                onChange={(e) => setRoomChatText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                                                    if (e.key === 'Enter') handleSendRoomChat();
                                                }}
                                                placeholder="پیام انگیزشی بنویسید..."
                                                aria-label="پیام در اتاق مطالعه"
                                                className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-indigo-500 text-gray-800 dark:text-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleSendRoomChat}
                                                aria-label="ارسال پیام اتاق"
                                                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition"
                                            >
                                                <Send size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Public Rooms Directory */}
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                                    {['همه', ...ROOM_CATEGORIES].map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border transition ${
                                                selectedCategory === cat
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative sm:w-64">
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                                    <input
                                        type="text"
                                        value={roomSearch}
                                        onChange={(e) => setRoomSearch(e.target.value)}
                                        placeholder="جستجوی اتاق یا کد..."
                                        aria-label="جستجوی اتاق‌های مطالعه"
                                        className="w-full pr-9 pl-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold outline-none focus:border-indigo-500 text-gray-800 dark:text-white"
                                    />
                                </div>
                            </div>

                            {isLoadingRooms ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-36 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                                    ))}
                                </div>
                            ) : filteredPublicRooms.length === 0 ? (
                                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <Users className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={40} />
                                    <p className="text-sm font-black text-gray-600 dark:text-gray-300">هنوز اتاق عمومی‌ای ساخته نشده است</p>
                                    <p className="text-xs text-gray-400 mt-1 mb-4">اولین اتاق تمرکز YPT خودتان را بسازید و دوستانتان را دعوت کنید!</p>
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition"
                                    >
                                        + ساخت اولین اتاق
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredPublicRooms.map((room) => {
                                        const isJoined = activeRoomCode === room.code;
                                        return (
                                            <div
                                                key={room.code}
                                                className={`bg-white dark:bg-gray-800 rounded-3xl p-4 border shadow-sm flex flex-col justify-between gap-3 transition hover:shadow-md ${
                                                    isJoined
                                                        ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                                                        : 'border-gray-100 dark:border-gray-700'
                                                }`}
                                            >
                                                <div>
                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                        <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 text-[10px] font-black">
                                                            {room.category}
                                                        </span>
                                                        <span className="font-mono text-[10px] font-bold text-gray-400">#{room.code}</span>
                                                    </div>
                                                    <h3 className="text-sm font-black text-gray-800 dark:text-white truncate">{room.name}</h3>
                                                    {room.description && (
                                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 pretty-text">
                                                            {room.description}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
                                                    <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                                        🎯 هدف: {formatToPersianDigits(room.targetHours)} ساعت • سقف {formatToPersianDigits(room.maxMembers)} نفر
                                                    </div>
                                                    <button
                                                        type="button"
                                                        disabled={isJoined || roomActionLoading}
                                                        onClick={() => handleJoinRoom(room.code)}
                                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition shrink-0 ${
                                                            isJoined
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                                        }`}
                                                    >
                                                        {isJoined ? 'عضو هستید ✓' : 'ورود'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* ======================================================
                       TAB 2: SCALABLE PAGINATED LEADERBOARD
                       ====================================================== */
                    <div className="space-y-5">
                        {/* My Summary Card + Privacy Switch */}
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] p-5 text-white shadow-xl relative overflow-hidden">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center font-black text-lg">
                                        {userName?.[0] || 'P'}
                                    </div>
                                    <div>
                                        <p className="font-black text-base">{userName || 'کاربر پارسا پلن'}</p>
                                        <p className="text-xs opacity-80">سطح {level} • {xp} XP</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={toggleMyPublicProfile}
                                        disabled={isTogglingPublic || !isCloudAuthenticated}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition ${
                                            isMyProfilePublic ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                                        }`}
                                    >
                                        {isTogglingPublic ? <Loader2 size={14} className="animate-spin" /> : isMyProfilePublic ? <Eye size={14} /> : <EyeOff size={14} />}
                                        {isMyProfilePublic ? 'نمایش عمومی فعال است' : 'عمومی‌سازی در لیگ'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateSettings({ anonymizedLeaderboard: !settings?.anonymizedLeaderboard })}
                                        className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold transition"
                                    >
                                        {settings?.anonymizedLeaderboard ? '🕵️ حالت ناشناس' : '👁️ نمایش اسامی'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Sort & Search */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSortBy('xp')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                                        sortBy === 'xp' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700'
                                    }`}
                                >
                                    🏆 برترین امتیاز (XP)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSortBy('exam')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                                        sortBy === 'exam' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700'
                                    }`}
                                >
                                    🎯 میانگین دقت ارزیابی
                                </button>
                            </div>
                            <div className="relative sm:w-64">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="جستجوی شرکت‌کنندگان..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    aria-label="جستجوی شرکت‌کنندگان لیگ"
                                    className="w-full pr-10 pl-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 text-gray-800 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Ranked List */}
                        {isLoadingLb ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        ) : filteredLeaderboard.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
                                <Trophy className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={44} />
                                <p className="text-sm font-black text-gray-600 dark:text-gray-300">هنوز شرکت‌کننده‌ای یافت نشد</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredLeaderboard.map((profile, idx) => {
                                    const rank = idx + 1;
                                    const isCurrentUser = profile.id === user?.uid;
                                    const isMasked = !!settings?.anonymizedLeaderboard && !isCurrentUser;
                                    const displayName = isMasked ? `شرکت‌کننده #${profile.id.slice(-4).toUpperCase()}` : profile.userName;

                                    return (
                                        <div
                                            key={profile.id}
                                            className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border shadow-sm transition ${
                                                isCurrentUser ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-gray-100 dark:border-gray-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 flex items-center justify-center shrink-0">{getRankIcon(rank)}</div>
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black">
                                                    {displayName[0] || '?'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-black text-xs text-gray-800 dark:text-white truncate">{displayName}</p>
                                                        {isCurrentUser && <span className="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black">شما</span>}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                                                        سطح {profile.level} • {getTimeAgo(profile.lastActive)}
                                                    </p>
                                                </div>
                                                <div className="text-left shrink-0">
                                                    <p className="font-black text-sm text-indigo-600 dark:text-indigo-400">
                                                        {sortBy === 'xp' ? `${profile.xp} XP` : `${profile.examAverage || 0}%`}
                                                    </p>
                                                </div>
                                                {!isCurrentUser && (
                                                    <button
                                                        type="button"
                                                        onClick={() => viewUserProfile(profile)}
                                                        disabled={isLoadingProfile}
                                                        aria-label="مشاهده پروفایل"
                                                        className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 transition"
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="mt-3 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                                    style={{ width: `${profile.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}

                                {hasMoreLb && (
                                    <button
                                        type="button"
                                        onClick={loadMoreLeaderboard}
                                        disabled={isLoadingMore}
                                        className="w-full py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700 transition"
                                    >
                                        {isLoadingMore ? 'در حال بارگذاری...' : 'نمایش شرکت‌کنندگان بیشتر ↓'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Native <dialog>: Create YPT Study Room Modal */}
            <dialog
                ref={createRoomDialogRef}
                aria-labelledby={isCreateModalOpen ? 'create-room-title' : undefined}
                onCancel={(e) => {
                    e.preventDefault();
                    setIsCreateModalOpen(false);
                }}
                onClick={(e) => {
                    if (e.target === createRoomDialogRef.current) setIsCreateModalOpen(false);
                }}
                className="m-auto p-0 bg-transparent border-0 max-w-md w-[calc(100%-2rem)] overflow-visible shadow-none"
            >
                {isCreateModalOpen && (
                    <form
                        onSubmit={handleCreateRoom}
                        className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden text-right"
                        dir="rtl"
                    >
                        <div className="p-5 bg-gradient-to-l from-indigo-600 to-violet-600 text-white flex items-center justify-between">
                            <div>
                                <h2 id="create-room-title" className="text-base font-black">ساخت اتاق مطالعه YPT</h2>
                                <p className="text-[11px] text-indigo-100 mt-0.5">کد دعوت اختصاصی ۶ رقمی خودکار ساخته می‌شود</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                aria-label="بستن پنجره"
                                className="p-1.5 rounded-xl hover:bg-white/20 transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1.5">نام اتاق</label>
                                <input
                                    autoFocus
                                    type="text"
                                    required
                                    maxLength={80}
                                    value={newRoomName}
                                    onChange={(e) => setNewRoomName(e.target.value)}
                                    placeholder="مثال: تیم کار عمیق صبحگاهی"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 text-gray-800 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1.5">دسته‌بندی</label>
                                    <select
                                        value={newRoomCategory}
                                        onChange={(e) => setNewRoomCategory(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-indigo-500 text-gray-800 dark:text-white"
                                    >
                                        {ROOM_CATEGORIES.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {cat}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1.5">سقف ظرفیت</label>
                                    <select
                                        value={newRoomMaxMembers}
                                        onChange={(e) => setNewRoomMaxMembers(Number(e.target.value))}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-indigo-500 text-gray-800 dark:text-white"
                                    >
                                        <option value={10}>۱۰ نفر</option>
                                        <option value={25}>۲۵ نفر</option>
                                        <option value={50}>۵۰ نفر</option>
                                        <option value={100}>۱۰۰ نفر</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1.5">
                                    هدف روزانه اتاق: {formatToPersianDigits(newRoomTargetHours)} ساعت
                                </label>
                                <input
                                    type="range"
                                    min={1}
                                    max={12}
                                    value={newRoomTargetHours}
                                    onChange={(e) => setNewRoomTargetHours(Number(e.target.value))}
                                    className="w-full accent-indigo-600"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1.5">توضیحات یا قانون اتاق (اختیاری)</label>
                                <textarea
                                    rows={2}
                                    maxLength={160}
                                    value={newRoomDesc}
                                    onChange={(e) => setNewRoomDesc(e.target.value)}
                                    placeholder="مثلاً: حداقل ۲ پومودورو در روز، سکوت و احترام..."
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs outline-none focus:border-indigo-500 text-gray-800 dark:text-white resize-none"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setNewRoomIsPublic(true)}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black border flex items-center justify-center gap-1.5 transition ${
                                        newRoomIsPublic
                                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                                            : 'border-gray-200 dark:border-gray-700 text-gray-500'
                                    }`}
                                >
                                    <Globe size={14} /> اتاق عمومی
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewRoomIsPublic(false)}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black border flex items-center justify-center gap-1.5 transition ${
                                        !newRoomIsPublic
                                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300'
                                            : 'border-gray-200 dark:border-gray-700 text-gray-500'
                                    }`}
                                >
                                    <Lock size={14} /> خصوصی (با کد)
                                </button>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-2 bg-gray-50/50 dark:bg-gray-800/40">
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="flex-1 py-2.5 rounded-xl font-bold text-xs text-gray-500 hover:bg-gray-200/60 dark:hover:bg-gray-700 transition"
                            >
                                انصراف
                            </button>
                            <button
                                type="submit"
                                disabled={roomActionLoading}
                                className="flex-[2] py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition"
                            >
                                {roomActionLoading ? 'در حال ساخت...' : 'ساخت و ورود به اتاق'}
                            </button>
                        </div>
                    </form>
                )}
            </dialog>

            {/* Native <dialog>: Lazy Profile Detail Viewer */}
            <dialog
                ref={profileDialogRef}
                aria-labelledby={viewingProfile ? 'profile-viewer-title' : undefined}
                onCancel={(e) => {
                    e.preventDefault();
                    setViewingProfile(null);
                }}
                onClick={(e) => {
                    if (e.target === profileDialogRef.current) setViewingProfile(null);
                }}
                className="m-auto p-0 bg-transparent border-0 max-w-lg w-[calc(100%-2rem)] overflow-visible shadow-none"
            >
                {viewingProfile && (
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700" dir="rtl">
                        <div className="p-5 bg-gradient-to-br from-indigo-600 to-purple-700 text-white relative">
                            <button
                                type="button"
                                onClick={() => setViewingProfile(null)}
                                aria-label="بستن پروفایل"
                                className="absolute left-4 top-4 p-2 rounded-xl bg-white/15 hover:bg-white/25 transition"
                            >
                                <X size={16} />
                            </button>
                            <h2 id="profile-viewer-title" className="text-lg font-black">{viewingProfile.userName}</h2>
                            <p className="text-xs opacity-80 mt-0.5">سطح {viewingProfile.level} • {viewingProfile.xp} XP • پیشرفت {viewingProfile.progress}%</p>
                        </div>

                        <div className="p-5 max-h-[55vh] overflow-y-auto space-y-3 custom-scrollbar">
                            {viewingProfile.tasks && viewingProfile.tasks.length > 0 ? (
                                viewingProfile.tasks.map((t, i) => (
                                    <div key={t.id || i} className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={t.isCompleted ? 'text-emerald-500 font-black' : 'text-amber-500 font-black'}>
                                                {t.isCompleted ? '✓' : '•'}
                                            </span>
                                            <span className="font-bold text-gray-800 dark:text-gray-100 truncate">{t.subject} — {t.topic}</span>
                                        </div>
                                        {t.date && <span className="text-[10px] text-gray-400 shrink-0">{getShamsiDate(t.date)}</span>}
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-xs text-gray-400 py-6">برنامه عمومی برای نمایش ثبت نشده است.</p>
                            )}
                        </div>
                    </div>
                )}
            </dialog>
        </>
    );
};

export default Leaderboard;
