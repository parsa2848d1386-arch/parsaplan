
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../context/StoreContext';
import { Trophy, Medal, Crown, Star, TrendingUp, Users, RefreshCw, User, Eye, EyeOff, Loader2, X, BookOpen, Target, Calendar, ChevronLeft, Search } from 'lucide-react';
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc, onSnapshot, getDoc, serverTimestamp } from 'firebase/firestore';
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
    examAverage?: number; // Added exam average
}

// Extended profile with tasks for viewing
interface FullProfile extends PublicProfile {
    tasks?: any[];
    routineTemplate?: any[];
    subjects?: any[];
}

// Live Study Room interface
interface LiveSession {
    id: string; // user uid
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
    const [sortBy, setSortBy] = useState<'xp' | 'exam'>('xp'); // Sort state

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

            // Sort will happen in render or separate effect, but default here is XP
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
            let newSessionsFound = false;

            snapshot.forEach((doc) => {
                const data = doc.data() as LiveSession;
                // Only consider sessions active if pinged in last 10 minutes
                if (now - data.lastPing < 600000) {
                    sessions.push(data);

                    if (!previousSessionIds.has(data.id) && data.id !== user?.uid && hasNotificationPermission) {
                        newSessionsFound = true;
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
                    // Cleanup stale sessions (can be improved with Cloud Functions)
                    deleteDoc(doc.ref).catch(() => { });
                }
            });

            // Update previous IDs
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
            } catch (e) {
                // Ignore error
            }
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
        }, 180000); // Ping every 3 mins

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
                // Save full profile data including tasks for others to view
                await setDoc(docRef, {
                    ...myStats,
                    id: user.uid,
                    lastActive: Date.now(),
                    tasks: tasks.slice(0, 50), // Limit to 50 tasks
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
    }, [xp, tasks.length, userName, isMyProfilePublic, user, getDb, myStats.examAverage]); // Added examAverage dependency

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
            case 1: return <Crown className="text-yellow-500" size={24} />;
            case 2: return <Medal className="text-gray-400" size={22} />;
            case 3: return <Medal className="text-amber-600" size={22} />;
            default: return <span className="text-gray-400 font-bold text-lg">{rank}</span>;
        }
    };

    const getRankBg = (rank: number) => {
        switch (rank) {
            case 1: return 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800';
            case 2: return 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 border-gray-200 dark:border-gray-700';
            case 3: return 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800';
            default: return 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700';
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
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                    {/* Header */}
                    <div className="p-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white relative">
                        <button
                            onClick={() => setViewingProfile(null)}
                            className="absolute left-4 top-4 p-2 hover:bg-white/20 rounded-xl transition"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex items-center gap-4 mt-2">
                            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                                {viewingProfile.userName?.[0] || '?'}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{viewingProfile.userName}</h2>
                                <p className="text-sm opacity-80">سطح {viewingProfile.level}</p>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3 mt-4">
                            <div className="bg-white/10 rounded-xl p-2 text-center">
                                <Star size={16} className="mx-auto mb-1" />
                                <p className="font-bold">{viewingProfile.xp}</p>
                                <p className="text-[10px] opacity-70">XP</p>
                            </div>
                            <div className="bg-white/10 rounded-xl p-2 text-center">
                                <TrendingUp size={16} className="mx-auto mb-1" />
                                <p className="font-bold">{viewingProfile.progress}%</p>
                                <p className="text-[10px] opacity-70">پیشرفت</p>
                            </div>
                            <div className="bg-white/10 rounded-xl p-2 text-center">
                                <Target size={16} className="mx-auto mb-1" />
                                <p className="font-bold">{viewingProfile.tasksCompleted}/{viewingProfile.totalTasks}</p>
                                <p className="text-[10px] opacity-70">تسک</p>
                            </div>
                        </div>

                        {/* Comparison with current user */}
                        <div className="mt-4 bg-white/5 rounded-xl p-3 border border-white/10">
                            <p className="text-[10px] font-bold mb-2 opacity-70">📊 مقایسه با شما</p>
                            <div className="grid grid-cols-4 gap-2 text-[10px]">
                                <div className="text-center">
                                    <div className={`font-bold ${viewingProfile.xp > myStats.xp ? 'text-red-300' : 'text-green-300'}`}>
                                        {viewingProfile.xp > myStats.xp ? `+${viewingProfile.xp - myStats.xp}` : viewingProfile.xp < myStats.xp ? `-${myStats.xp - viewingProfile.xp}` : '='} XP
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className={`font-bold ${viewingProfile.progress > myStats.progress ? 'text-red-300' : 'text-green-300'}`}>
                                        {viewingProfile.progress > myStats.progress ? `+${viewingProfile.progress - myStats.progress}` : viewingProfile.progress < myStats.progress ? `-${myStats.progress - viewingProfile.progress}` : '='}%
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className={`font-bold ${viewingProfile.tasksCompleted > myStats.tasksCompleted ? 'text-red-300' : 'text-green-300'}`}>
                                        {viewingProfile.tasksCompleted > myStats.tasksCompleted ? `+${viewingProfile.tasksCompleted - myStats.tasksCompleted}` : viewingProfile.tasksCompleted < myStats.tasksCompleted ? `-${myStats.tasksCompleted - viewingProfile.tasksCompleted}` : '='} تسک
                                    </div>
                                </div>
                                <div className="text-center border-r border-white/20 pr-1">
                                    <div className={`font-bold ${(viewingProfile.examAverage || 0) > (myStats.examAverage || 0) ? 'text-red-300' : 'text-green-300'}`}>
                                        Avg: {viewingProfile.examAverage || 0}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 overflow-y-auto max-h-[50vh]">
                        {/* Tasks Summary */}
                        {viewingProfile.tasks && viewingProfile.tasks.length > 0 ? (
                            <div className="space-y-4">
                                {/* Completed Tasks */}
                                <div>
                                    <h3 className="font-bold text-green-600 dark:text-green-400 text-sm mb-2 flex items-center gap-2">
                                        <Target size={14} />
                                        تسک‌های انجام شده ({completedTasks.length})
                                    </h3>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {completedTasks.slice(0, 10).map((task: any, i: number) => (
                                            <div key={i} className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg text-xs flex items-center gap-2">
                                                <span className="text-green-500">✓</span>
                                                <span className="font-medium text-green-800 dark:text-green-300">{task.subject}</span>
                                                <span className="text-green-600 dark:text-green-400">{task.topic}</span>
                                            </div>
                                        ))}
                                        {completedTasks.length > 10 && (
                                            <p className="text-[10px] text-gray-400 text-center">و {completedTasks.length - 10} تسک دیگر...</p>
                                        )}
                                    </div>
                                </div>

                                {/* Pending Tasks */}
                                <div>
                                    <h3 className="font-bold text-amber-600 dark:text-amber-400 text-sm mb-2 flex items-center gap-2">
                                        <Calendar size={14} />
                                        تسک‌های در انتظار ({pendingTasks.length})
                                    </h3>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {pendingTasks.slice(0, 10).map((task: any, i: number) => (
                                            <div key={i} className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg text-xs flex items-center gap-2">
                                                <span className="w-3 h-3 rounded-full border-2 border-amber-500"></span>
                                                <span className="font-medium text-amber-800 dark:text-amber-300">{task.subject}</span>
                                                <span className="text-amber-600 dark:text-amber-400">{task.topic}</span>
                                                {task.date && <span className="text-[10px] text-gray-400 mr-auto">{getShamsiDate(task.date)}</span>}
                                            </div>
                                        ))}
                                        {pendingTasks.length > 10 && (
                                            <p className="text-[10px] text-gray-400 text-center">و {pendingTasks.length - 10} تسک دیگر...</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <BookOpen className="mx-auto text-gray-300 dark:text-gray-600 mb-2" size={32} />
                                <p className="text-sm text-gray-400">این کاربر تسکی به اشتراک نگذاشته</p>
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
                {/* Profile Viewer Modal */}
                {/* ProfileViewerModal moved to bottom */}

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
                            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Live Study Rooms */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 mb-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="relative flex items-center justify-center p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-xl">
                                <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                                <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full"></span>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                            </div>
                            <h2 className="font-bold text-gray-800 dark:text-white">اتاق‌های مطالعه زنده</h2>
                        </div>
                        <span className="text-xs bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 font-bold px-2 py-1 rounded-lg">
                            {liveSessions.length} نفر آنلاین
                        </span>
                    </div>

                    {!liveSessions.find(s => s.id === user?.uid) ? (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 mb-4 flex flex-col md:flex-row gap-3">
                            <input
                                type="text"
                                placeholder="درس (مثلا ریاضی)"
                                value={currentStudySubject}
                                onChange={e => setCurrentStudySubject(e.target.value)}
                                className="flex-1 bg-white dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-sm outline-none shadow-sm dark:text-white"
                            />
                            <input
                                type="text"
                                placeholder="مبحث (مثلا مشتق)"
                                value={currentStudyTopic}
                                onChange={e => setCurrentStudyTopic(e.target.value)}
                                className="flex-1 bg-white dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-sm outline-none shadow-sm dark:text-white"
                            />
                            <button
                                onClick={joinLiveRoom}
                                disabled={isJoiningRoom}
                                className="bg-indigo-600 text-white rounded-xl px-4 py-2 font-bold text-sm hover:bg-indigo-700 transition"
                            >
                                {isJoiningRoom ? <Loader2 size={16} className="animate-spin" /> : 'پیوستن به اتاق'}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 mb-4 flex justify-between items-center text-emerald-800 dark:text-emerald-300">
                            <div>
                                <p className="text-xs">در حال مطالعه: <strong>{currentStudySubject} ({currentStudyTopic})</strong></p>
                            </div>
                            <button onClick={leaveLiveRoom} className="bg-rose-500 text-white rounded-xl px-3 py-1.5 text-xs font-bold hover:bg-rose-600 transition">خروج</button>
                        </div>
                    )}

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {liveSessions.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4">در حال حاضر کسی در اتاق مطالعه نیست.</p>
                        ) : (
                            liveSessions.map(session => (
                                <div key={session.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center font-bold text-xs relative">
                                            {session.userName[0]}
                                            <span className="absolute bottom-0 left-0 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-gray-700"></span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{session.userName}</p>
                                            <p className="text-[10px] text-gray-500">{session.subject} • {session.topic}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-lg">آنلاین</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* User Stats Card */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-5 text-white mb-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                                    <User size={28} />
                                </div>
                                <div>
                                    <p className="font-bold text-lg">{userName}</p>
                                    <p className="text-xs opacity-80">سطح {level}</p>
                                </div>
                            </div>
                            <div className="bg-white/20 px-4 py-2 rounded-xl">
                                <p className="text-xs opacity-80">وضعیت</p>
                                <p className="font-bold text-sm">{isMyProfilePublic ? '🌐 عمومی' : '🔒 خصوصی'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-3">
                            <div className="bg-white/10 rounded-xl p-3 text-center">
                                <Star size={18} className="mx-auto mb-1" />
                                <p className="font-bold">{xp}</p>
                                <p className="text-[10px] opacity-70">XP</p>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3 text-center">
                                <TrendingUp size={18} className="mx-auto mb-1" />
                                <p className="font-bold">{myStats.progress}%</p>
                                <p className="text-[10px] opacity-70">پیشرفت</p>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3 text-center">
                                <Trophy size={18} className="mx-auto mb-1" />
                                <p className="font-bold">{myStats.tasksCompleted}</p>
                                <p className="text-[10px] opacity-70">تسک</p>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3 text-center border-r border-white/20">
                                <BookOpen size={18} className="mx-auto mb-1" />
                                <p className="font-bold">{myStats.examAverage || 0}%</p>
                                <p className="text-[10px] opacity-70">میانگین آزمون</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Box */}
                {!user && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-6">
                        <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                            ⚠️ برای شرکت در لیگ و مشاهده رتبه‌بندی، ابتدا <strong>وارد حساب خود شوید</strong>.
                        </p>
                    </div>
                )}

                {user && !isMyProfilePublic && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 mb-6">
                        <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                            💡 برای شرکت در لیگ و نمایش در رتبه‌بندی، دکمه <strong>"عمومی"</strong> را فعال کنید.
                        </p>
                    </div>
                )}

                {/* Leaderboard Controls */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    <button
                        onClick={() => setSortBy('xp')}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${sortBy === 'xp' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
                    >
                        🏆 پرامتیازترین
                    </button>
                    <button
                        onClick={() => setSortBy('exam')}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${sortBy === 'exam' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
                    >
                        📚 برترین آزمون‌ها
                    </button>
                </div>

                {/* Leaderboard */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="text-gray-400" size={18} />
                        <h2 className="font-bold text-gray-700 dark:text-gray-200">رتبه‌بندی کاربران عمومی</h2>
                        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{leaderboardData.length} نفر</span>
                    </div>

                    {/* Search Bar */}
                    <div className="relative mb-4">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="جستجوی نام کاربر..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pr-10 pl-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm placeholder:text-gray-400 outline-none focus:border-indigo-500 transition text-gray-900 dark:text-white"
                        />
                    </div>

                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
                            ))}
                        </div>
                    ) : leaderboardData.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <Trophy className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">هنوز کسی در لیگ نیست!</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">اولین نفر باشید که پروفایل خود را عمومی می‌کند</p>
                        </div>
                    ) : (() => {
                        // Filter based on search query
                        let filteredData = searchQuery.trim()
                            ? leaderboardData.filter(p => p.userName.toLowerCase().includes(searchQuery.toLowerCase()))
                            : [...leaderboardData];

                        // Sort Logic
                        if (sortBy === 'exam') {
                            filteredData.sort((a, b) => (b.examAverage || 0) - (a.examAverage || 0));
                        } else {
                            filteredData.sort((a, b) => b.xp - a.xp);
                        }

                        if (filteredData.length === 0) {
                            return (
                                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <Search className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
                                    <p className="text-gray-500 dark:text-gray-400 font-medium">کاربری با این نام پیدا نشد</p>
                                </div>
                            );
                        }

                        return filteredData.map((profile, index) => {
                            const rank = index + 1; // Rank depends on current sort
                            const isCurrentUser = profile.id === user?.uid;

                            return (
                                <div
                                    key={profile.id}
                                    className={`rounded-2xl p-4 border shadow-sm transition-all hover:shadow-md ${getRankBg(rank)} ${isCurrentUser ? 'ring-2 ring-indigo-400' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 flex items-center justify-center">
                                            {getRankIcon(rank)}
                                        </div>

                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                            {profile.userName?.[0] || '?'}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-gray-800 dark:text-white">{profile.userName}</p>
                                                {isCurrentUser && <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">شما</span>}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">سطح {profile.level} • {getTimeAgo(profile.lastActive)}</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="text-left">
                                                {sortBy === 'xp' ? (
                                                    <>
                                                        <p className="font-black text-indigo-600 dark:text-indigo-400 text-lg">{profile.xp}</p>
                                                        <p className="text-[10px] text-gray-500">XP</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="font-black text-emerald-600 dark:text-emerald-400 text-lg">{profile.examAverage || 0}%</p>
                                                        <p className="text-[10px] text-gray-500">معدل آزمون</p>
                                                    </>
                                                )}
                                            </div>

                                            {/* View Profile Button */}
                                            {!isCurrentUser && (
                                                <button
                                                    onClick={() => viewUserProfile(profile)}
                                                    disabled={isLoadingProfile}
                                                    className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition"
                                                    title="مشاهده برنامه"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-3 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                                            style={{ width: `${profile.progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })
                    })()}
                </div>

            </div>

            {/* Modals outside container */}
            <ProfileViewerModal />
        </>
    );
};

export default Leaderboard;
