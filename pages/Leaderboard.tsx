import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../context/StoreContext';
import { Trophy, Medal, Crown, Star, TrendingUp, Users, RefreshCw, User, Eye, EyeOff, Loader2, X, BookOpen, Target, Calendar, ChevronLeft, Search, Award, Flame, Brain } from 'lucide-react';
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { getShamsiDate } from '../utils';

// Public profile interface
interface PublicProfile {
    id: string;
    userName: string;
    xp: number;
    level: number;
    progress: number;
    tasksCompleted: number;
    totalTasks: number;
    lastActive: number;
    examAverage?: number;
}

// Extended profile with tasks for viewing
interface FullProfile extends PublicProfile {
    tasks?: any[];
    routineTemplate?: any[];
    subjects?: any[];
}

// Live Study Room interface
interface LiveSession {
    id: string;
    userName: string;
    subject: string;
    topic: string;
    startedAt: number;
    lastPing: number;
}

const Leaderboard = () => {
    const { user, userName, xp, level, getProgress, tasks, showToast, firebaseConfig } = useStore();
    const [leaderboardData, setLeaderboardData] = useState<PublicProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMyProfilePublic, setIsMyProfilePublic] = useState(false);
    const [isToggling, setIsToggling] = useState(false);
    const [sortBy, setSortBy] = useState<'xp' | 'exam'>('xp');

    // Live Study Room State
    const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
    const [isJoiningRoom, setIsJoiningRoom] = useState(false);
    const [currentStudySubject, setCurrentStudySubject] = useState('');
    const [currentStudyTopic, setCurrentStudyTopic] = useState('');
    const [hasNotificationPermission, setHasNotificationPermission] = useState(false);

    // Profile viewer state
    const [viewingProfile, setViewingProfile] = useState<FullProfile | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');

    // Calculate user stats
    const calculateStats = useCallback(() => {
        const completedTasks = tasks.filter(t => t.isCompleted);
        const examTasks = completedTasks.filter(t => t.studyType === 'exam' && t.testStats && t.testStats.total > 0);

        let examAvg = 0;
        if (examTasks.length > 0) {
            const sumPercentages = examTasks.reduce((acc, t) => {
                const total = t.testStats!.total;
                const correct = t.testStats!.correct;
                const wrong = t.testStats!.wrong;
                const percentage = total > 0 ? Math.round(((correct * 3 - wrong) / (total * 3)) * 100) : 0;
                return acc + (percentage > 0 ? percentage : 0);
            }, 0);
            examAvg = Math.round(sumPercentages / examTasks.length);
        }

        return {
            id: user?.uid || 'local',
            userName: userName,
            xp: xp,
            level: level,
            progress: getProgress(),
            tasksCompleted: completedTasks.length,
            totalTasks: tasks.length,
            lastActive: Date.now(),
            examAverage: examAvg
        };
    }, [user, userName, xp, level, getProgress, tasks]);

    const myStats = calculateStats();

    // Get Firestore instance
    const getDb = useCallback(() => {
        if (!firebaseConfig) return null;
        try {
            return getFirestore();
        } catch {
            return null;
        }
    }, [firebaseConfig]);

    // Fetch leaderboard data from Firebase
    const fetchLeaderboard = useCallback(async () => {
        setIsLoading(true);
        const db = getDb();

        if (!db) {
            setLeaderboardData([]);
            setIsLoading(false);
            return;
        }

        try {
            const publicProfilesRef = collection(db, 'publicProfiles');
            const snapshot = await getDocs(publicProfilesRef);

            const profiles: PublicProfile[] = [];
            snapshot.forEach((doc) => {
                profiles.push(doc.data() as PublicProfile);
            });

            if (user) {
                const isPublic = profiles.some(p => p.id === user.uid);
                setIsMyProfilePublic(isPublic);
            }

            profiles.sort((a, b) => b.xp - a.xp);
            setLeaderboardData(profiles);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            setLeaderboardData([]);
        }

        setIsLoading(false);
    }, [getDb, user]);

    // Listen to real-time updates
    useEffect(() => {
        const db = getDb();
        if (!db) {
            setIsLoading(false);
            return;
        }

        const publicProfilesRef = collection(db, 'publicProfiles');

        const unsubscribe = onSnapshot(publicProfilesRef, (snapshot) => {
            const profiles: PublicProfile[] = [];
            snapshot.forEach((doc) => {
                profiles.push(doc.data() as PublicProfile);
            });

            if (user) {
                const isPublic = profiles.some(p => p.id === user.uid);
                setIsMyProfilePublic(isPublic);
            }

            setLeaderboardData(profiles);
            setIsLoading(false);
        }, (error) => {
            console.error('Leaderboard listener error:', error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [getDb, user]);

    // Request Notification Permission
    useEffect(() => {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                setHasNotificationPermission(true);
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        setHasNotificationPermission(true);
                    }
                });
            }
        }
    }, []);

    // Listen to real-time active study sessions
    useEffect(() => {
        const db = getDb();
        if (!db) return;

        const sessionsRef = collection(db, 'liveSessions');
        let previousSessionIds = new Set<string>();

        const unsubscribe = onSnapshot(sessionsRef, (snapshot) => {
            const sessions: LiveSession[] = [];
            const now = Date.now();

            snapshot.forEach((doc) => {
                const data = doc.data() as LiveSession;
                if (now - data.lastPing < 600000) {
                    sessions.push(data);

                    if (!previousSessionIds.has(data.id) && data.id !== user?.uid && hasNotificationPermission) {
                        if (document.hidden) {
                            new Notification('هم‌کلاسی آنلاین شد! 📚', {
                                body: `${data.userName} شروع به مطالعه ${data.subject} (${data.topic}) کرد. شما هم به اتاق مطالعه بپیوندید!`,
                                icon: '/icon-192.png'
                            });
                        } else {
                            showToast(`${data.userName} در حال مطالعه ${data.subject} است!`, 'info');
                        }
                    }
                } else {
                    deleteDoc(doc.ref).catch(() => { });
                }
            });

            previousSessionIds = new Set(sessions.map(s => s.id));
            setLiveSessions(sessions.sort((a, b) => b.startedAt - a.startedAt));

        }, (error) => {
            console.error('Sessions listener error:', error);
        });

        return () => unsubscribe();
    }, [getDb, user, hasNotificationPermission, showToast]);

    // Live Study Room Actions
    const joinLiveRoom = async () => {
        if (!user) {
            showToast('ابتدا وارد حساب خود شوید', 'warning');
            return;
        }
        if (!currentStudySubject || !currentStudyTopic) {
            showToast('لطفا نام درس و مبحث را وارد کنید', 'warning');
            return;
        }

        setIsJoiningRoom(true);
        const db = getDb();
        if (db) {
            try {
                const session: LiveSession = {
                    id: user.uid,
                    userName: userName || 'کاربر',
                    subject: currentStudySubject,
                    topic: currentStudyTopic,
                    startedAt: Date.now(),
                    lastPing: Date.now()
                };
                await setDoc(doc(db, 'liveSessions', user.uid), session);
                showToast('شما با موفقیت به اتاق مطالعه پیوستید!', 'success');
            } catch (e) {
                showToast('خطا در پیوستن به اتاق', 'error');
            }
        }
        setIsJoiningRoom(false);
    };

    const leaveLiveRoom = async () => {
        if (!user) return;
        const db = getDb();
        if (db) {
            try {
                await deleteDoc(doc(db, 'liveSessions', user.uid));
                showToast('از اتاق مطالعه خارج شدید', 'info');
                setCurrentStudySubject('');
                setCurrentStudyTopic('');
            } catch (e) { }
        }
    };

    // Ping loop to keep session alive
    useEffect(() => {
        if (!user || liveSessions.findIndex(s => s.id === user.uid) === -1) return;

        const db = getDb();
        if (!db) return;

        const pingInterval = setInterval(async () => {
            try {
                await setDoc(doc(db, 'liveSessions', user.uid), { lastPing: Date.now() }, { merge: true });
            } catch (e) { }
        }, 180000);

        return () => clearInterval(pingInterval);
    }, [user, liveSessions, getDb]);

    // Toggle public profile
    const toggleMyPublicProfile = async () => {
        if (!user) {
            showToast('برای شرکت در لیگ باید وارد حساب خود شوید', 'warning');
            return;
        }

        const db = getDb();
        if (!db) {
            showToast('برای شرکت در لیگ باید فایربیس متصل باشد', 'warning');
            return;
        }

        setIsToggling(true);

        try {
            const docRef = doc(db, 'publicProfiles', user.uid);

            if (isMyProfilePublic) {
                await deleteDoc(docRef);
                setIsMyProfilePublic(false);
                showToast('پروفایل شما خصوصی شد', 'success');
            } else {
                await setDoc(docRef, {
                    ...myStats,
                    id: user.uid,
                    lastActive: Date.now(),
                    tasks: tasks.slice(0, 50),
                });
                setIsMyProfilePublic(true);
                showToast('پروفایل شما عمومی شد و در لیگ نمایش داده می‌شود', 'success');
            }
        } catch (error) {
            console.error('Error toggling profile:', error);
            showToast('خطا در تغییر وضعیت پروفایل', 'error');
        }

        setIsToggling(false);
    };

    // Update public profile stats periodically
    useEffect(() => {
        if (!isMyProfilePublic || !user) return;

        const db = getDb();
        if (!db) return;

        const updateStats = async () => {
            try {
                const docRef = doc(db, 'publicProfiles', user.uid);
                await setDoc(docRef, {
                    ...myStats,
                    id: user.uid,
                    lastActive: Date.now(),
                    tasks: tasks.slice(0, 50),
                }, { merge: true });
            } catch (error) {
                console.error('Error updating public profile:', error);
            }
        };

        updateStats();
    }, [xp, tasks.length, userName, isMyProfilePublic, user, getDb, myStats.examAverage]);

    // View another user's profile
    const viewUserProfile = async (profile: PublicProfile) => {
        if (profile.id === user?.uid) {
            showToast('این پروفایل خودتان است!', 'info');
            return;
        }

        setIsLoadingProfile(true);
        const db = getDb();

        if (!db) {
            showToast('خطا در اتصال به سرور', 'error');
            setIsLoadingProfile(false);
            return;
        }

        try {
            const docRef = doc(db, 'publicProfiles', profile.id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const fullData = docSnap.data() as FullProfile;
                setViewingProfile(fullData);
            } else {
                showToast('پروفایل یافت نشد', 'error');
            }
        } catch (error) {
            console.error('Error viewing profile:', error);
            showToast('خطا در بارگذاری پروفایل', 'error');
        }

        setIsLoadingProfile(false);
    };

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1: return <Crown className="text-yellow-500 filter drop-shadow-[0_0_8px_rgba(234,179,8,0.4)] animate-bounce" size={24} style={{ animationDuration: '3s' }} />;
            case 2: return <Medal className="text-gray-400 filter drop-shadow-[0_0_6px_rgba(156,163,175,0.3)]" size={22} />;
            case 3: return <Medal className="text-amber-600 filter drop-shadow-[0_0_6px_rgba(217,119,6,0.3)]" size={22} />;
            default: return <span className="text-gray-400 font-bold text-lg">{rank}</span>;
        }
    };

    const getRankBg = (rank: number) => {
        switch (rank) {
            case 1: return 'bg-gradient-to-r from-yellow-50/80 to-amber-50/80 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200/50 dark:border-yellow-800/30';
            case 2: return 'bg-gradient-to-r from-gray-50/80 to-slate-50/80 dark:from-gray-800/40 dark:to-slate-800/40 border-gray-200/50 dark:border-gray-700/30';
            case 3: return 'bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200/50 dark:border-amber-800/30';
            default: return 'bg-white/70 dark:bg-gray-800/70 border-gray-100/50 dark:border-gray-700/30';
        }
    };

    const getTimeAgo = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const hours = Math.floor(diff / 3600000);
        if (hours < 1) return 'الان';
        if (hours < 24) return `${hours} ساعت پیش`;
        return `${Math.floor(hours / 24)} روز پیش`;
    };

    // Profile Viewer Modal
    const ProfileViewerModal = () => {
        if (!viewingProfile) return null;

        const completedTasks = viewingProfile.tasks?.filter((t: any) => t.isCompleted) || [];
        const pendingTasks = viewingProfile.tasks?.filter((t: any) => !t.isCompleted) || [];

        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" dir="rtl">
                {/* Neon Glassmorphic Container */}
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-white/20 dark:border-gray-800/50 animate-in zoom-in-95 duration-300">
                    
                    {/* Header with vibrant copper/indigo gradient */}
                    <div className="p-6 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white relative overflow-hidden shrink-0">
                        {/* Ambient glowing circles */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
                        <button
                            onClick={() => setViewingProfile(null)}
                            className="absolute left-5 top-5 p-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl transition text-white border border-white/10"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-4 mt-2">
                            <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center text-2xl font-black shadow-lg">
                                {viewingProfile.userName?.[0] || '?'}
                            </div>
                            <div>
                                <h2 className="text-xl font-black tracking-tight">{viewingProfile.userName}</h2>
                                <p className="text-xs font-bold bg-white/20 px-2.5 py-0.5 rounded-full w-max mt-1">سطح {viewingProfile.level}</p>
                            </div>
                        </div>

                        {/* Interactive Stats Grid */}
                        <div className="grid grid-cols-3 gap-3 mt-5">
                            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 text-center transition-transform hover:scale-[1.03]">
                                <Star size={16} className="mx-auto mb-1 text-amber-300 fill-amber-300" />
                                <p className="font-black text-sm">{viewingProfile.xp}</p>
                                <p className="text-[9px] opacity-75 font-bold">امتیاز XP</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 text-center transition-transform hover:scale-[1.03]">
                                <TrendingUp size={16} className="mx-auto mb-1 text-indigo-200" />
                                <p className="font-black text-sm">{viewingProfile.progress}%</p>
                                <p className="text-[9px] opacity-75 font-bold">پیشرفت کل</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 text-center transition-transform hover:scale-[1.03]">
                                <Target size={16} className="mx-auto mb-1 text-pink-300" />
                                <p className="font-black text-sm">{viewingProfile.tasksCompleted}/{viewingProfile.totalTasks}</p>
                                <p className="text-[9px] opacity-75 font-bold">تسک‌ها</p>
                            </div>
                        </div>

                        {/* Interactive Comparison HUD */}
                        <div className="mt-4 bg-black/15 backdrop-blur-md rounded-2xl p-3 border border-white/5">
                            <p className="text-[9px] font-black mb-2 text-indigo-200 flex items-center gap-1">📊 مقایسه تحصیلی با شما</p>
                            <div className="grid grid-cols-4 gap-2 text-[10px] font-bold">
                                <div className="text-center bg-white/5 rounded-xl p-1.5 border border-white/5">
                                    <span className="text-[8px] text-gray-300 block mb-0.5">امتیاز</span>
                                    <div className={`${viewingProfile.xp > myStats.xp ? 'text-rose-300' : 'text-emerald-300'}`}>
                                        {viewingProfile.xp > myStats.xp ? `+${viewingProfile.xp - myStats.xp}` : viewingProfile.xp < myStats.xp ? `-${myStats.xp - viewingProfile.xp}` : '='} XP
                                    </div>
                                </div>
                                <div className="text-center bg-white/5 rounded-xl p-1.5 border border-white/5">
                                    <span className="text-[8px] text-gray-300 block mb-0.5">پیشرفت</span>
                                    <div className={`${viewingProfile.progress > myStats.progress ? 'text-rose-300' : 'text-emerald-300'}`}>
                                        {viewingProfile.progress > myStats.progress ? `+${viewingProfile.progress - myStats.progress}` : viewingProfile.progress < myStats.progress ? `-${myStats.progress - viewingProfile.progress}` : '='}%
                                    </div>
                                </div>
                                <div className="text-center bg-white/5 rounded-xl p-1.5 border border-white/5">
                                    <span className="text-[8px] text-gray-300 block mb-0.5">انجام شده</span>
                                    <div className={`${viewingProfile.tasksCompleted > myStats.tasksCompleted ? 'text-rose-300' : 'text-emerald-300'}`}>
                                        {viewingProfile.tasksCompleted > myStats.tasksCompleted ? `+${viewingProfile.tasksCompleted - myStats.tasksCompleted}` : viewingProfile.tasksCompleted < myStats.tasksCompleted ? `-${myStats.tasksCompleted - viewingProfile.tasksCompleted}` : '='} تسک
                                    </div>
                                </div>
                                <div className="text-center bg-white/5 rounded-xl p-1.5 border border-white/5">
                                    <span className="text-[8px] text-gray-300 block mb-0.5">آزمون</span>
                                    <div className="text-amber-300">
                                        {viewingProfile.examAverage || 0}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-6 overflow-y-auto max-h-[50vh] space-y-5 custom-scrollbar">
                        {viewingProfile.tasks && viewingProfile.tasks.length > 0 ? (
                            <div className="space-y-4">
                                {/* Completed Tasks */}
                                <div className="space-y-2">
                                    <h3 className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5 mb-2.5">
                                        <Award size={14} />
                                        تسک‌های انجام شده ({completedTasks.length})
                                    </h3>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                        {completedTasks.slice(0, 10).map((task: any, i: number) => (
                                            <div key={i} className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/20 dark:border-emerald-900/10 p-2.5 rounded-xl text-xs flex items-center gap-2 transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                                                <span className="text-emerald-500 font-extrabold">✓</span>
                                                <span className="font-black text-emerald-800 dark:text-emerald-300">{task.subject}</span>
                                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{task.topic}</span>
                                            </div>
                                        ))}
                                        {completedTasks.length > 10 && (
                                            <p className="text-[10px] text-gray-400 text-center font-bold">و {completedTasks.length - 10} تسک دیگر...</p>
                                        )}
                                    </div>
                                </div>

                                {/* Pending Tasks */}
                                <div className="space-y-2">
                                    <h3 className="font-extrabold text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1.5 mb-2.5">
                                        <Calendar size={14} />
                                        تسک‌های در انتظار ({pendingTasks.length})
                                    </h3>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                        {pendingTasks.slice(0, 10).map((task: any, i: number) => (
                                            <div key={i} className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/20 dark:border-amber-900/10 p-2.5 rounded-xl text-xs flex items-center gap-2 transition hover:bg-amber-50 dark:hover:bg-amber-950/30">
                                                <span className="w-2.5 h-2.5 rounded-full border-2 border-amber-500 shrink-0"></span>
                                                <span className="font-black text-amber-800 dark:text-amber-300">{task.subject}</span>
                                                <span className="text-amber-600 dark:text-amber-400 font-medium">{task.topic}</span>
                                                {task.date && <span className="text-[9px] text-gray-400 font-bold mr-auto">{getShamsiDate(task.date)}</span>}
                                            </div>
                                        ))}
                                        {pendingTasks.length > 10 && (
                                            <p className="text-[10px] text-gray-400 text-center font-bold">و {pendingTasks.length - 10} تسک دیگر...</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-gray-50/50 dark:bg-gray-800/40 rounded-[2rem] border border-dashed border-gray-200/50 dark:border-gray-700/50">
                                <BookOpen className="mx-auto text-gray-300 dark:text-gray-600 mb-2" size={32} />
                                <p className="text-xs text-gray-400 font-bold">این کاربر برنامه‌ای برای اشتراک‌گذاری عمومی نگذاشته است.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>,
            document.body
        );
    };

    return (
        <>
            <div className="p-5 pb-32 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-amber-200/50 dark:shadow-none shrink-0">
                            <Trophy className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white tracking-tight">لیگ رقابت</h1>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">رقابت و مقایسه عملکرد با دیگران</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={toggleMyPublicProfile}
                            disabled={isToggling || !user}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 disabled:opacity-50 shadow-sm border ${isMyProfilePublic
                                ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-200 dark:shadow-none'
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-100 dark:border-gray-700'
                                }`}
                        >
                            {isToggling ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : isMyProfilePublic ? (
                                <Eye size={16} />
                            ) : (
                                <EyeOff size={16} />
                            )}
                            {isMyProfilePublic ? 'عمومی' : 'خصوصی'}
                        </button>

                        <button
                            onClick={fetchLeaderboard}
                            disabled={isLoading}
                            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Live Study Rooms */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-[2.25rem] mb-6 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                    {/* Ambient decoration */}
                    <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-rose-500/5 to-transparent blur-xl pointer-events-none" />
                    
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-2">
                            <div className="relative flex items-center justify-center p-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl">
                                <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                                <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full"></span>
                                <Flame size={18} className="animate-pulse" />
                            </div>
                            <h2 className="font-extrabold text-gray-800 dark:text-white text-sm">کابین‌های آنلاین لایو</h2>
                        </div>
                        <span className="text-[10px] bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 font-extrabold px-2.5 py-1 rounded-full">
                            {liveSessions.length} نفر فعال
                        </span>
                    </div>

                    {!liveSessions.find(s => s.id === user?.uid) ? (
                        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/20 rounded-2xl p-4 mb-4 flex flex-col md:flex-row gap-3 relative z-10">
                            <input
                                type="text"
                                placeholder="چه درسی می‌خونی؟ (مثلا زیست🧬)"
                                value={currentStudySubject}
                                onChange={e => setCurrentStudySubject(e.target.value)}
                                className="flex-1 bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-xl px-3 py-2 text-xs outline-none shadow-sm dark:text-white font-bold"
                            />
                            <input
                                type="text"
                                placeholder="چه مبحثی؟ (مثلا ژنتیک)"
                                value={currentStudyTopic}
                                onChange={e => setCurrentStudyTopic(e.target.value)}
                                className="flex-1 bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-xl px-3 py-2 text-xs outline-none shadow-sm dark:text-white font-bold"
                            />
                            <button
                                onClick={joinLiveRoom}
                                disabled={isJoiningRoom}
                                className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl px-5 py-2 font-black text-xs transition-all shadow-md shadow-indigo-100 dark:shadow-none shrink-0"
                            >
                                {isJoiningRoom ? <Loader2 size={16} className="animate-spin" /> : 'شروع فوکوس لایو ⚡'}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/20 rounded-2xl p-4 mb-4 flex justify-between items-center text-emerald-800 dark:text-emerald-300 relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                <p className="text-xs font-bold">در حال مطالعه: <strong className="text-emerald-600 dark:text-emerald-400">{currentStudySubject} ({currentStudyTopic})</strong></p>
                            </div>
                            <button onClick={leaveLiveRoom} className="bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-xl px-4 py-1.5 text-xs font-black transition-all">اتمام مطالعه</button>
                        </div>
                    )}

                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 relative z-10">
                        {liveSessions.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4 font-bold">در حال حاضر کسی در اتاق مطالعه نیست. فوکوس رو تو شروع کن! 🚀</p>
                        ) : (
                            liveSessions.map(session => (
                                <div key={session.id} className="flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/30 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 transition hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center font-black text-sm relative shadow-md">
                                            {session.userName[0]}
                                            <span className="absolute bottom-0 left-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-800"></span>
                                        </div>
                                        <div>
                                            <p className="font-black text-xs text-gray-800 dark:text-gray-200">{session.userName}</p>
                                            <p className="text-[9px] text-gray-400 font-bold mt-0.5">{session.subject} • {session.topic}</p>
                                        </div>
                                    </div>
                                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/10 px-2.5 py-1 rounded-lg font-bold">درحال مطالعه ✏️</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* User Stats Card */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.25rem] p-5 text-white mb-6 shadow-xl relative overflow-hidden border border-white/10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-lg"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-lg"></div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center shadow-lg text-xl font-black">
                                    {userName?.[0] || 'P'}
                                </div>
                                <div>
                                    <p className="font-black text-base">{userName}</p>
                                    <p className="text-[10px] font-bold opacity-80 mt-0.5">سطح {level}</p>
                                </div>
                            </div>
                            <div className="bg-white/20 border border-white/10 px-3.5 py-1.5 rounded-2xl backdrop-blur-md">
                                <p className="text-[9px] opacity-75 font-bold">حریم خصوصی شما</p>
                                <p className="font-black text-xs mt-0.5">{isMyProfilePublic ? '🌐 عمومی' : '🔒 خصوصی'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-3 font-bold">
                            <div className="bg-white/10 backdrop-blur-md border border-white/5 rounded-2xl p-2.5 text-center">
                                <Star size={16} className="mx-auto mb-1 text-amber-300 fill-amber-300" />
                                <p className="font-black text-sm">{xp}</p>
                                <p className="text-[9px] opacity-70">امتیاز XP</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md border border-white/5 rounded-2xl p-2.5 text-center">
                                <TrendingUp size={16} className="mx-auto mb-1" />
                                <p className="font-black text-sm">{myStats.progress}%</p>
                                <p className="text-[9px] opacity-70">پیشرفت</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md border border-white/5 rounded-2xl p-2.5 text-center">
                                <Trophy size={16} className="mx-auto mb-1" />
                                <p className="font-black text-sm">{myStats.tasksCompleted}</p>
                                <p className="text-[9px] opacity-70">تسک‌ها</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md border border-white/5 rounded-2xl p-2.5 text-center border-r border-white/20">
                                <BookOpen size={16} className="mx-auto mb-1" />
                                <p className="font-black text-sm">{myStats.examAverage || 0}%</p>
                                <p className="text-[9px] opacity-70">معدل آزمون</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Box */}
                {!user && (
                    <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-4 mb-6 animate-pulse">
                        <p className="text-xs text-amber-800 dark:text-amber-300 font-bold leading-relaxed">
                            ⚠️ برای شرکت در لیگ، همگام‌سازی زمان و مقایسه عملکرد واقعی با دانش‌آموزان دیگر، ابتدا <strong>وارد حساب کاربری خود شوید</strong>.
                        </p>
                    </div>
                )}

                {user && !isMyProfilePublic && (
                    <div className="bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 rounded-2xl p-4 mb-6">
                        <p className="text-xs text-blue-800 dark:text-blue-300 font-bold leading-relaxed">
                            💡 وضعیت پروفایل شما در حال حاضر <strong>خصوصی</strong> است. برای شرکت در جدول لیگ هفتگی و نمایش رتبه خود، دکمه <strong>"عمومی"</strong> بالا را فعال کنید.
                        </p>
                    </div>
                )}

                {/* Leaderboard Controls */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 select-none">
                    <button
                        onClick={() => setSortBy('xp')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 shrink-0 ${sortBy === 'xp' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white/80 dark:bg-gray-800/80 text-gray-500 border border-gray-100 dark:border-gray-700'}`}
                    >
                        🏆 پرامتیازترین قهرمانان (XP)
                    </button>
                    <button
                        onClick={() => setSortBy('exam')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 shrink-0 ${sortBy === 'exam' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white/80 dark:bg-gray-800/80 text-gray-500 border border-gray-100 dark:border-gray-700'}`}
                    >
                        📚 بالاترین بازدهی آزمون‌ها (درصد)
                    </button>
                </div>

                {/* Leaderboard */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="text-gray-400" size={18} />
                        <h2 className="font-extrabold text-xs text-gray-700 dark:text-gray-200">جدول نهایی لیگ رقابت سراسری</h2>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-150/10 px-2.5 py-0.5 rounded-full font-bold">{leaderboardData.length} شرکت‌کننده</span>
                    </div>

                    {/* Search Bar */}
                    <div className="relative mb-4">
                        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="🔍 جستجو در نام دانش‌آموزان..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pr-11 pl-4 py-3 bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition text-gray-800 dark:text-white font-bold"
                        />
                    </div>

                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-20 bg-gray-150/50 dark:bg-gray-800/50 rounded-2xl animate-pulse"></div>
                            ))}
                        </div>
                    ) : leaderboardData.length === 0 ? (
                        <div className="text-center py-12 bg-white/50 dark:bg-gray-800/50 rounded-[2.25rem] border border-gray-150/50 dark:border-gray-700/50">
                            <Trophy className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-extrabold">هنوز کسی در لیگ ثبت‌نام نکرده است!</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">اولین نفری باشید که با زدن دکمه خصوصی بالا، پروفایلش را عمومی می‌کند.</p>
                        </div>
                    ) : (() => {
                        let filteredData = searchQuery.trim()
                            ? leaderboardData.filter(p => p.userName.toLowerCase().includes(searchQuery.toLowerCase()))
                            : [...leaderboardData];

                        if (sortBy === 'exam') {
                            filteredData.sort((a, b) => (b.examAverage || 0) - (a.examAverage || 0));
                        } else {
                            filteredData.sort((a, b) => b.xp - a.xp);
                        }

                        if (filteredData.length === 0) {
                            return (
                                <div className="text-center py-12 bg-white/50 dark:bg-gray-800/50 rounded-[2.25rem] border border-gray-150/50 dark:border-gray-700/50">
                                    <Search className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
                                    <p className="text-xs text-gray-400 font-bold">دانش‌آموزی با این نام پیدا نشد 🧐</p>
                                </div>
                            );
                        }

                        return filteredData.map((profile, index) => {
                            const rank = index + 1;
                            const isCurrentUser = profile.id === user?.uid;

                            return (
                                <div
                                    key={profile.id}
                                    className={`rounded-2xl p-4 border shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md ${getRankBg(rank)} ${isCurrentUser ? 'ring-2 ring-indigo-500' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 flex items-center justify-center shrink-0">
                                            {getRankIcon(rank)}
                                        </div>

                                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-base shadow-sm">
                                            {profile.userName?.[0] || '?'}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-extrabold text-xs text-gray-800 dark:text-white truncate">{profile.userName}</p>
                                                {isCurrentUser && <span className="text-[8px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black">شما</span>}
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">سطح {profile.level} • {getTimeAgo(profile.lastActive)}</p>
                                        </div>

                                        <div className="flex items-center gap-2.5 shrink-0">
                                            <div className="text-left">
                                                {sortBy === 'xp' ? (
                                                    <>
                                                        <p className="font-black text-indigo-600 dark:text-indigo-400 text-sm">{profile.xp}</p>
                                                        <p className="text-[8px] text-gray-400 font-bold">XP</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{profile.examAverage || 0}%</p>
                                                        <p className="text-[8px] text-gray-400 font-bold">معدل آزمون</p>
                                                    </>
                                                )}
                                            </div>

                                            {/* Interactive View Profile Button */}
                                            {!isCurrentUser && (
                                                <button
                                                    onClick={() => viewUserProfile(profile)}
                                                    disabled={isLoadingProfile}
                                                    className="p-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100/10 rounded-xl hover:scale-105 active:scale-95 transition-all"
                                                    title="مشاهده برنامه درسی"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Glassmorphic progress bar */}
                                    <div className="mt-3.5 h-1.5 bg-gray-150 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-200/10">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-700"
                                            style={{ width: `${profile.progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>

            {/* Modals outside container */}
            <ProfileViewerModal />
        </>
    );
};

export default Leaderboard;
