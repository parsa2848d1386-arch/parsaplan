import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Trophy, Users, Plus, Loader2 } from 'lucide-react';
import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { useStore } from '../context/StoreContext';
import { useFocus } from '../context/FocusContext';
import { formatToPersianDigits } from '../utils';
import { getLogicalDateKey } from '../utils/streakEngine';
import { leaderboardApi, backendCache, ROOM_CATEGORIES } from '../services/backendApi';
import { liveRoomService } from '../services/liveRoomService';
import {
    runOptimisticMutation,
    applyPendingCheersToPeers,
    mergeOptimisticRoomMessages,
} from '../utils/optimisticMutation';
import {
    BlobatarConfig,
    LiveRoomInfo,
    LiveRoomMessage,
    LiveRoomPeer,
    PublicProfileDetail,
    PublicProfileSummary,
} from '../types';
import { BlobatarBot } from '../components/ui/BlobatarBot';
import { ModalSheet } from '../components/ui/ModalSheet';
import { CompactPageHero, HeroSegmentedTabs } from '../components/layout/CompactPageHero';
import { LiveRoomWorkspace } from '../components/leaderboard/LiveRoomWorkspace';
import { LeagueRankingList } from '../components/leaderboard/LeagueRankingList';

export const VectorAvatar: React.FC<{
    name: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    blobatar?: BlobatarConfig;
    level?: number;
}> = ({ name, className = '', size = 'md', blobatar, level }) => {
    const mappedSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : size === 'xl' ? 'xl' : 'md';
    return (
        <div
            className={`rounded-2xl bg-surface-container-low border border-[var(--border-subtle)] flex items-center justify-center shadow-sm shrink-0 p-0.5 ${className}`}
            title={name}
        >
            <BlobatarBot
                seed={name || 'Parsashz'}
                config={blobatar}
                size={mappedSize}
                level={level}
                showLevelBadge={Boolean(level && size === 'xl')}
            />
        </div>
    );
};

export const Leaderboard = () => {
    const {
        user,
        userId,
        db,
        userName,
        xp,
        level,
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
        setIsTimerOpen,
        getElapsedSeconds,
        startTimer,
        pauseTimer,
        finishSession,
    } = useFocus();

    const [activeSection, setActiveSection] = useState<'rooms' | 'ranking'>('rooms');

    const [leaderboardData, setLeaderboardData] = useState<PublicProfileSummary[]>([]);
    const [isLoadingLb, setIsLoadingLb] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreLb, setHasMoreLb] = useState(false);
    const [lbCursor, setLbCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [isMyProfilePublic, setIsMyProfilePublic] = useState(false);
    const [isTogglingPublic, setIsTogglingPublic] = useState(false);
    const [sortBy, setSortBy] = useState<'xp' | 'exam'>('xp');
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = React.useDeferredValue(searchQuery);

    const [viewingProfile, setViewingProfile] = useState<PublicProfileDetail | null>(null);

    const [publicRooms, setPublicRooms] = useState<LiveRoomInfo[]>([]);
    const [isLoadingRooms, setIsLoadingRooms] = useState(false);
    const [roomSearch, setRoomSearch] = useState('');
    const deferredRoomSearch = React.useDeferredValue(roomSearch);
    const [selectedCategory, setSelectedCategory] = useState<string>('همه');
    const [joinCodeInput, setJoinCodeInput] = useState('');
    const [roomActionLoading, setRoomActionLoading] = useState(false);

    const [activeRoomInfo, setActiveRoomInfo] = useState<LiveRoomInfo | null>(null);
    const [roomPeers, setRoomPeers] = useState<LiveRoomPeer[]>([]);
    const [roomMessages, setRoomMessages] = useState<LiveRoomMessage[]>([]);
    const [roomChatText, setRoomChatText] = useState('');
    const [copiedCode, setCopiedCode] = useState(false);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomCategory, setNewRoomCategory] = useState<string>(ROOM_CATEGORIES[0]);
    const [newRoomDesc, setNewRoomDesc] = useState('');
    const [newRoomTargetHours, setNewRoomTargetHours] = useState(4);
    const [newRoomMaxMembers, setNewRoomMaxMembers] = useState(25);
    const [newRoomIsPublic, setNewRoomIsPublic] = useState(true);

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
        setNewRoomCategory(
            settings?.stream && streamCategoryMap[settings.stream]
                ? streamCategoryMap[settings.stream]
                : ROOM_CATEGORIES[0]
        );
        const suggestedHours = Math.max(1, Math.min(16, Math.round((settings?.dailyCapacityMinutes ?? 360) / 60)));
        setNewRoomTargetHours(suggestedHours);
        setIsCreateModalOpen(true);
    }, [newRoomName, selectedSubject, userName, settings?.stream, settings?.dailyCapacityMinutes]);

    const isCloudAuthenticated = Boolean(db && user && userId && userId !== 'parsaplan_local_user');

    const logicalTodayKey = useMemo(
        () => getLogicalDateKey(new Date(), settings?.dayCutoffHour ?? 5),
        [settings?.dayCutoffHour]
    );

    const baseTodayStudySeconds = useMemo(
        () => Math.max(0, Math.round((studyMinutesByDate?.[logicalTodayKey] || 0) * 60)),
        [studyMinutesByDate, logicalTodayKey]
    );

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
            userName: userName || 'کاربر پارساپلن',
            xp,
            level,
            progress: getProgress(),
            tasksCompleted: completedTasks.length,
            totalTasks: tasks.length,
            lastActive: Date.now(),
            examAverage: examAvg,
        };
    }, [user?.uid, userName, xp, level, getProgress, tasks]);

    const leaderboardQuerySeqRef = useRef(0);
    const pendingCheerDeltasRef = useRef(new Map<string, number>());
    const pendingRoomMessagesRef = useRef<LiveRoomMessage[]>([]);

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

    useEffect(() => {
        if (!db || !isCloudAuthenticated) {
            setIsLoadingLb(false);
            setIsLoadingRooms(false);
            return;
        }
        if (user?.uid) {
            const checkFn = leaderboardApi?.checkIsPublic || leaderboardApi?.isProfilePublic;
            if (typeof checkFn === 'function') {
                checkFn
                    .call(leaderboardApi, db, user.uid)
                    .then((isPub) => setIsMyProfilePublic(!!isPub))
                    .catch(() => setIsMyProfilePublic(false));
            }
        }
        loadLeaderboardPage();
        loadPublicRooms();
    }, [db, isCloudAuthenticated, user?.uid, loadLeaderboardPage, loadPublicRooms]);

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
                if (res) setActiveRoomInfo(res);
            })
            .catch(() => {});

        return () => {
            unsubPeers();
            unsubMessages();
        };
    }, [db, activeRoomCode, isCloudAuthenticated]);

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

    const handleTogglePublic = async () => {
        if (!db || !user?.uid) {
            showToast('برای انتشار رتبه ابتدا وارد حساب کاربری شوید.', 'error');
            return;
        }
        const uid = user.uid;
        const targetNextPublic = !isMyProfilePublic;
        setIsTogglingPublic(true);

        try {
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
                            ? 'پروفایل شما در لیگ عمومی فعال شد'
                            : 'پروفایل شما از جدول رتبه‌بندی عمومی برداشته شد.',
                        targetNextPublic ? 'success' : 'info'
                    );

                    return { prevIsPublic, prevLeaderboard };
                },
                mutationFn: async () => {
                    const res = targetNextPublic
                        ? await leaderboardApi.publishProfile(db, uid, myStats, tasks)
                        : await leaderboardApi.unpublishProfile(db, uid);
                    if (!res.ok) throw new Error(res.error.message);
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
        } finally {
            setIsTogglingPublic(false);
        }
    };

    const handleOpenProfile = async (targetUserId: string) => {
        if (!db) return;
        const res = await leaderboardApi.fetchProfileDetail(db, targetUserId);
        if (res.ok && res.data) {
            setViewingProfile(res.data);
        } else {
            showToast('اطلاعات تفصیلی این کاربر در دسترس نیست.', 'error');
        }
    };

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
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'خطا در ورود به اتاق';
            showToast(message, 'error');
        }
        setRoomActionLoading(false);
    };

    const handleLeaveActiveRoom = async () => {
        if (!db || !activeRoomCode || !userId) return;
        askConfirm('خروج از اتاق', 'آیا مطمئنید که می‌خواهید از اتاق مطالعه خارج شوید؟', async () => {
            await liveRoomService.leaveGroupRoom(db, activeRoomCode, userId);
            setActiveRoomCode(null);
            showToast('از اتاق مطالعه خارج شدید.', 'info');
        });
    };

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
            showToast(`اتاق "${newRoomName}" با کد ${res.data.code} ساخته شد!`, 'success');
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
                const res = await liveRoomService.sendRoomMessage(
                    db,
                    activeRoomCode,
                    userId,
                    userName || 'دانش‌آموز',
                    text
                );
                if (res.throttled) throw new Error('لطفاً لحظه‌ای صبر کنید و دوباره ارسال کنید.');
                return res;
            },
            onError: (err, snapshot) => {
                pendingRoomMessagesRef.current = pendingRoomMessagesRef.current.filter((m) => m.id !== optimisticId);
                setRoomMessages(snapshot.prevMessages);
                if (clearInput && snapshot.prevInput) setRoomChatText(snapshot.prevInput);
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

    const handleSendRoomChat = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!roomChatText.trim()) return;
        await sendOptimisticRoomText(roomChatText, true);
    };

    const handleSendReaction = async (emoji: string) => {
        await sendOptimisticRoomText(emoji, false, `انگیزه ارسال شد: ${emoji}`);
    };

    const handleCopyRoomCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(true);
        showToast('کد اتاق کپی شد!', 'success');
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const filteredPublicRooms = useMemo(() => {
        return publicRooms.filter((r) => {
            const matchesCat = selectedCategory === 'همه' || r.category === selectedCategory;
            const q = deferredRoomSearch.trim().toLowerCase();
            const matchesSearch =
                !q ||
                r.name.toLowerCase().includes(q) ||
                r.code.toLowerCase().includes(q) ||
                (r.description || '').toLowerCase().includes(q);
            return matchesCat && matchesSearch;
        });
    }, [publicRooms, selectedCategory, deferredRoomSearch]);

    const sortedPeers = useMemo(
        () => [...roomPeers].sort((a, b) => (b.dailyStudySeconds || 0) - (a.dailyStudySeconds || 0)),
        [roomPeers]
    );

    const myRoomRank = useMemo(() => {
        const idx = sortedPeers.findIndex((p) => p.uid === userId);
        return idx >= 0 ? idx + 1 : null;
    }, [sortedPeers, userId]);

    const myLeagueRank = useMemo(() => {
        if (!user?.uid) return null;
        const idx = leaderboardData.findIndex((item) => item.id === user.uid);
        return idx >= 0 ? idx + 1 : null;
    }, [leaderboardData, user?.uid]);

    const filteredLeaderboard = useMemo(() => {
        const q = deferredSearchQuery.trim().toLowerCase();
        return leaderboardData.filter((p) => !q || (p.userName || '').toLowerCase().includes(q));
    }, [leaderboardData, deferredSearchQuery]);

    const handleCheerPeer = async (peer: LiveRoomPeer) => {
        if (!db || !activeRoomCode || !peer.uid || peer.uid === userId) return;
        const roomCode = activeRoomCode;
        const targetUid = peer.uid;

        await runOptimisticMutation({
            mutationKey: `cheer_${roomCode}_${targetUid}`,
            onMutate: () => {
                const prevPeers = roomPeers;
                pendingCheerDeltasRef.current.set(targetUid, (pendingCheerDeltasRef.current.get(targetUid) || 0) + 1);
                setRoomPeers((prev) =>
                    prev.map((p) => (p.uid === targetUid ? { ...p, cheersReceived: (p.cheersReceived || 0) + 1 } : p))
                );
                showToast(`انرژی مثبت برای ${peer.displayName} ارسال شد!`, 'success');
                return { prevPeers };
            },
            mutationFn: async () => {
                const res = await liveRoomService.sendCheer(db, roomCode, targetUid);
                if (res.throttled) throw new Error('لطفاً کمی صبر کنید و دوباره تشویق بفرستید.');
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

    const statusLine = `سطح ${formatToPersianDigits(level)} · ${formatToPersianDigits(xp)} XP${
        myLeagueRank ? ` · رتبه #${formatToPersianDigits(myLeagueRank)}` : ''
    }`;

    return (
        <div className="flex flex-col w-full">
            <CompactPageHero
                title="لیگ و هم‌مطالعه"
                subtitleBadge={
                    <span className="text-[11px] sm:text-xs bg-white/18 text-white px-2.5 py-0.5 rounded-full font-bold border border-white/20 tabular-nums">
                        {statusLine}
                    </span>
                }
                bottomSlot={
                    <HeroSegmentedTabs
                        layoutId="leaderboard-section-tabs"
                        ariaLabel="بخش‌های لیگ و اتاق مطالعه"
                        value={activeSection}
                        onChange={setActiveSection}
                        items={[
                            {
                                id: 'rooms',
                                label: 'اتاق‌های مطالعه',
                                icon: Users,
                                badge: activeRoomCode ? (
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" aria-hidden="true" />
                                ) : undefined,
                            },
                            { id: 'ranking', label: 'رده‌بندی لیگ', icon: Trophy },
                        ]}
                    />
                }
            />

            <div className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-8 flex flex-col gap-4 sm:gap-5 w-full max-app-container mx-auto">
                {activeSection === 'rooms' ? (
                    <LiveRoomWorkspace
                        activeRoomCode={activeRoomCode}
                        activeRoomInfo={activeRoomInfo}
                        isCloudAuthenticated={isCloudAuthenticated}
                        isLoadingRooms={isLoadingRooms}
                        roomActionLoading={roomActionLoading}
                        publicRooms={filteredPublicRooms}
                        roomSearch={roomSearch}
                        onRoomSearchChange={setRoomSearch}
                        selectedCategory={selectedCategory}
                        onSelectCategory={setSelectedCategory}
                        joinCodeInput={joinCodeInput}
                        onJoinCodeChange={setJoinCodeInput}
                        onJoinRoom={handleJoinRoom}
                        onRefreshRooms={() => loadPublicRooms(true)}
                        onOpenCreateRoom={openCreateRoomModal}
                        onLeaveActiveRoom={handleLeaveActiveRoom}
                        onCopyRoomCode={handleCopyRoomCode}
                        copiedCode={copiedCode}
                        sortedPeers={sortedPeers}
                        userId={userId}
                        userBlobatar={settings?.blobatar}
                        myRoomRank={myRoomRank}
                        onCheerPeer={handleCheerPeer}
                        roomMessages={roomMessages}
                        roomChatText={roomChatText}
                        onRoomChatTextChange={setRoomChatText}
                        onSendRoomChat={handleSendRoomChat}
                        onSendReaction={handleSendReaction}
                        onSwitchToRanking={() => setActiveSection('ranking')}
                        focusStatus={focusStatus}
                        selectedSubject={selectedSubject}
                        baseTodayStudySeconds={baseTodayStudySeconds}
                        onStartTimer={() => startTimer()}
                        onPauseTimer={pauseTimer}
                        onFinishSession={() => finishSession()}
                        onOpenFullTimer={() => setIsTimerOpen(true)}
                    />
                ) : (
                    <LeagueRankingList
                        isCloudAuthenticated={isCloudAuthenticated}
                        hasDb={Boolean(db)}
                        isLoadingLb={isLoadingLb}
                        isLoadingMore={isLoadingMore}
                        hasMoreLb={hasMoreLb}
                        sortBy={sortBy}
                        onChangeSortBy={setSortBy}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        filteredLeaderboard={filteredLeaderboard}
                        currentUserUid={user?.uid}
                        userName={userName}
                        xp={xp}
                        level={level}
                        userBlobatar={settings?.blobatar}
                        isMyProfilePublic={isMyProfilePublic}
                        isTogglingPublic={isTogglingPublic}
                        onTogglePublic={handleTogglePublic}
                        onRefresh={() => loadLeaderboardPage(true)}
                        onLoadMore={loadMoreLeaderboard}
                        onOpenProfile={handleOpenProfile}
                        isDemoActive={isDemoActive}
                        onDismissDemo={dismissDemoMode}
                    />
                )}
            </div>

            {/* Unified ModalSheet: Create Study Room */}
            <ModalSheet
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="ایجاد اتاق مطالعه YPT"
                subtitle="کد دعوت ۶ رقمی به‌صورت خودکار ساخته می‌شود"
                historyKey="create-study-room"
                maxWidthClass="max-w-lg"
            >
                <form
                    onSubmit={handleCreateRoomSubmit}
                    className="p-5 flex flex-col gap-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5"
                >
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="create-room-name" className="text-xs font-bold text-on-surface">
                            عنوان اتاق:
                        </label>
                        <input
                            id="create-room-name"
                            type="text"
                            required
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            placeholder="مثلاً: ماراتن تمرکز روزانه"
                            className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm border border-[var(--border-subtle)] outline-none focus:border-primary"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="create-room-cat" className="text-xs font-bold text-on-surface">
                            دسته‌بندی:
                        </label>
                        <select
                            id="create-room-cat"
                            value={newRoomCategory}
                            onChange={(e) => setNewRoomCategory(e.target.value)}
                            className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm border border-[var(--border-subtle)] outline-none focus:border-primary"
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
                            <label htmlFor="create-room-hours" className="text-xs font-bold text-on-surface">
                                هدف روزانه (ساعت):
                            </label>
                            <input
                                id="create-room-hours"
                                type="number"
                                min={1}
                                max={16}
                                value={newRoomTargetHours}
                                onChange={(e) => setNewRoomTargetHours(Number(e.target.value))}
                                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-surface-container-low text-on-surface text-sm border border-[var(--border-subtle)] outline-none focus:border-primary"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="create-room-max" className="text-xs font-bold text-on-surface">
                                ظرفیت اعضا:
                            </label>
                            <input
                                id="create-room-max"
                                type="number"
                                min={2}
                                max={50}
                                value={newRoomMaxMembers}
                                onChange={(e) => setNewRoomMaxMembers(Number(e.target.value))}
                                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-surface-container-low text-on-surface text-sm border border-[var(--border-subtle)] outline-none focus:border-primary"
                            />
                        </div>
                    </div>

                    <label className="flex items-center gap-2.5 pt-1 text-xs font-medium text-on-surface cursor-pointer">
                        <input
                            type="checkbox"
                            checked={newRoomIsPublic}
                            onChange={(e) => setNewRoomIsPublic(e.target.checked)}
                            className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        <span>اتاق به‌صورت عمومی در لیست اتاق‌ها نمایش داده شود</span>
                    </label>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="min-h-[44px] px-4 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-bold cursor-pointer"
                        >
                            انصراف
                        </button>
                        <button
                            type="submit"
                            disabled={roomActionLoading}
                            className="min-h-[44px] px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                            {roomActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            <span>ساخت و ورود به اتاق</span>
                        </button>
                    </div>
                </form>
            </ModalSheet>

            {/* Unified ModalSheet: Public Profile Viewer */}
            <ModalSheet
                isOpen={Boolean(viewingProfile)}
                onClose={() => setViewingProfile(null)}
                title={viewingProfile?.userName || 'پروفایل کاربر'}
                subtitle={viewingProfile ? `سطح ${formatToPersianDigits(viewingProfile.level)}` : undefined}
                historyKey="league-profile-viewer"
                maxWidthClass="max-w-md"
            >
                {viewingProfile && (
                    <div className="p-5 flex flex-col gap-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5">
                        <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="bg-surface-container-low p-3.5 rounded-2xl border border-[var(--border-subtle)]">
                                <span className="text-xs text-[var(--text-secondary)] block">مجموع امتیاز</span>
                                <span className="text-base font-black text-primary tabular-nums mt-0.5 block">
                                    {formatToPersianDigits(viewingProfile.xp)} <bdi>XP</bdi>
                                </span>
                            </div>
                            <div className="bg-surface-container-low p-3.5 rounded-2xl border border-[var(--border-subtle)]">
                                <span className="text-xs text-[var(--text-secondary)] block">سطح فعلی</span>
                                <span className="text-base font-black text-secondary tabular-nums mt-0.5 block">
                                    سطح {formatToPersianDigits(viewingProfile.level)}
                                </span>
                            </div>
                        </div>

                        <div className="bg-surface-container-low p-3.5 rounded-2xl flex items-center justify-between border border-[var(--border-subtle)] text-xs">
                            <span className="text-[var(--text-secondary)]">تسک‌های انجام‌شده:</span>
                            <span className="font-bold text-on-surface tabular-nums">
                                {formatToPersianDigits(viewingProfile.tasksCompleted)} از {formatToPersianDigits(viewingProfile.totalTasks)}
                            </span>
                        </div>

                        {viewingProfile.examAverage > 0 && (
                            <div className="bg-secondary-container/40 p-3.5 rounded-2xl flex items-center justify-between border border-secondary/30 text-xs text-secondary">
                                <span className="font-semibold">میانگین تراز آزمون‌ها:</span>
                                <span className="font-bold tabular-nums">{formatToPersianDigits(viewingProfile.examAverage)}٪</span>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => setViewingProfile(null)}
                            className="w-full min-h-[44px] py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer"
                        >
                            بستن
                        </button>
                    </div>
                )}
            </ModalSheet>
        </div>
    );
};

export default Leaderboard;
