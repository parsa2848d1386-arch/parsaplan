
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Trophy, Medal, Crown, Star, TrendingUp, Users, Lock, Unlock, RefreshCw, User, Share2 } from 'lucide-react';

// Public profile interface
interface PublicProfile {
    id: string;
    userName: string;
    xp: number;
    level: number;
    progress: number;
    streak: number;
    tasksCompleted: number;
    lastActive: number;
}

const Leaderboard = () => {
    const { user, userName, xp, level, getProgress, tasks, showToast } = useStore();
    const [leaderboardData, setLeaderboardData] = useState<PublicProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPublic, setIsPublic] = useState(false);
    const [userRank, setUserRank] = useState<number | null>(null);

    // Calculate user stats
    const userStats: PublicProfile = {
        id: user?.uid || 'local',
        userName: userName,
        xp: xp,
        level: level,
        progress: getProgress(),
        streak: 7, // TODO: Calculate actual streak
        tasksCompleted: tasks.filter(t => t.isCompleted).length,
        lastActive: Date.now()
    };

    // Mock leaderboard data for demo (in production, this would come from Firebase)
    useEffect(() => {
        const fetchLeaderboard = async () => {
            setIsLoading(true);

            // Simulated data - in production, fetch from Firestore collection 'publicProfiles'
            const mockData: PublicProfile[] = [
                { id: '1', userName: 'محمد', xp: 2500, level: 8, progress: 85, streak: 12, tasksCompleted: 156, lastActive: Date.now() - 3600000 },
                { id: '2', userName: 'علی', xp: 2200, level: 7, progress: 78, streak: 10, tasksCompleted: 142, lastActive: Date.now() - 7200000 },
                { id: '3', userName: 'زهرا', xp: 1900, level: 6, progress: 72, streak: 8, tasksCompleted: 128, lastActive: Date.now() - 10800000 },
                { id: '4', userName: 'فاطمه', xp: 1600, level: 5, progress: 65, streak: 6, tasksCompleted: 98, lastActive: Date.now() - 14400000 },
                { id: '5', userName: 'حسین', xp: 1400, level: 5, progress: 58, streak: 5, tasksCompleted: 87, lastActive: Date.now() - 18000000 },
                { id: '6', userName: 'مریم', xp: 1200, level: 4, progress: 52, streak: 4, tasksCompleted: 76, lastActive: Date.now() - 21600000 },
                { id: '7', userName: 'رضا', xp: 1000, level: 4, progress: 45, streak: 3, tasksCompleted: 65, lastActive: Date.now() - 25200000 },
                { id: '8', userName: 'سارا', xp: 800, level: 3, progress: 38, streak: 2, tasksCompleted: 54, lastActive: Date.now() - 28800000 },
            ];

            // Add current user to the list if public
            if (isPublic && user) {
                mockData.push(userStats);
            }

            // Sort by XP
            mockData.sort((a, b) => b.xp - a.xp);

            // Find user rank
            const userIndex = mockData.findIndex(p => p.id === user?.uid);
            if (userIndex !== -1) {
                setUserRank(userIndex + 1);
            }

            setLeaderboardData(mockData);
            setIsLoading(false);
        };

        fetchLeaderboard();
    }, [isPublic, user, xp]);

    const togglePublicProfile = () => {
        setIsPublic(!isPublic);
        showToast(isPublic ? 'پروفایل شما خصوصی شد' : 'پروفایل شما عمومی شد', 'success');
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

    return (
        <div className="p-5 pb-20 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                        <Trophy className="text-yellow-500" size={24} />
                        لیگ رقابت
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">با دیگران رقابت کنید!</p>
                </div>

                <button
                    onClick={() => setIsLoading(true)}
                    className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                    <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                </button>
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
                        {userRank && (
                            <div className="bg-white/20 px-4 py-2 rounded-xl">
                                <p className="text-xs opacity-80">رتبه شما</p>
                                <p className="font-black text-2xl">#{userRank}</p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/10 rounded-xl p-3 text-center">
                            <Star size={18} className="mx-auto mb-1" />
                            <p className="font-bold">{xp}</p>
                            <p className="text-[10px] opacity-70">XP</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3 text-center">
                            <TrendingUp size={18} className="mx-auto mb-1" />
                            <p className="font-bold">{userStats.progress}%</p>
                            <p className="text-[10px] opacity-70">پیشرفت</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3 text-center">
                            <Trophy size={18} className="mx-auto mb-1" />
                            <p className="font-bold">{userStats.tasksCompleted}</p>
                            <p className="text-[10px] opacity-70">تسک انجام شده</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Public Profile Toggle */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {isPublic ? <Unlock className="text-green-500" size={20} /> : <Lock className="text-gray-400" size={20} />}
                    <div>
                        <p className="font-bold text-gray-800 dark:text-white text-sm">پروفایل عمومی</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {isPublic ? 'دیگران می‌توانند شما را ببینند' : 'فقط شما می‌بینید'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={togglePublicProfile}
                    className={`relative w-14 h-7 rounded-full transition-colors ${isPublic ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                    <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${isPublic ? 'translate-x-7' : 'translate-x-0.5'}`}></div>
                </button>
            </div>

            {/* Leaderboard */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                    <Users className="text-gray-400" size={18} />
                    <h2 className="font-bold text-gray-700 dark:text-gray-200">رتبه‌بندی</h2>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
                        ))}
                    </div>
                ) : (
                    leaderboardData.map((profile, index) => {
                        const rank = index + 1;
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
                                        {profile.userName[0]}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-gray-800 dark:text-white">{profile.userName}</p>
                                            {isCurrentUser && <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">شما</span>}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">سطح {profile.level} • {getTimeAgo(profile.lastActive)}</p>
                                    </div>

                                    <div className="text-left">
                                        <p className="font-black text-indigo-600 dark:text-indigo-400 text-lg">{profile.xp}</p>
                                        <p className="text-[10px] text-gray-500">XP</p>
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
                )}
            </div>

            {/* Share Button */}
            {isPublic && (
                <div className="fixed bottom-24 left-4 right-4 z-40">
                    <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 active:scale-95 transition">
                        <Share2 size={20} />
                        اشتراک‌گذاری پیشرفت
                    </button>
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
