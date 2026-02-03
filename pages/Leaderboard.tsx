
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Trophy, Medal, Crown, Star, TrendingUp, Users, RefreshCw, User, Share2, Eye, EyeOff } from 'lucide-react';

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
    isPublic: boolean;
}

const Leaderboard = () => {
    const { user, userName, xp, level, getProgress, tasks, showToast } = useStore();
    const [leaderboardData, setLeaderboardData] = useState<PublicProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMyProfilePublic, setIsMyProfilePublic] = useState(false);

    // Calculate user stats
    const myStats: PublicProfile = {
        id: user?.uid || 'local',
        userName: userName,
        xp: xp,
        level: level,
        progress: getProgress(),
        tasksCompleted: tasks.filter(t => t.isCompleted).length,
        totalTasks: tasks.length,
        lastActive: Date.now(),
        isPublic: isMyProfilePublic
    };

    // Fetch real leaderboard data from Firebase (or show only current user if no Firebase)
    useEffect(() => {
        const fetchLeaderboard = async () => {
            setIsLoading(true);

            // For now, show only the current user's data
            // In production with Firebase, this would fetch from 'publicProfiles' collection
            const profiles: PublicProfile[] = [];

            // Add current user if logged in
            if (user) {
                profiles.push(myStats);
            }

            // Sort by XP
            profiles.sort((a, b) => b.xp - a.xp);

            setLeaderboardData(profiles);
            setIsLoading(false);
        };

        // Small delay to simulate loading
        setTimeout(fetchLeaderboard, 500);
    }, [user, xp, userName]);

    const toggleMyPublicProfile = () => {
        setIsMyProfilePublic(!isMyProfilePublic);
        showToast(isMyProfilePublic ? 'پروفایل شما خصوصی شد' : 'پروفایل شما عمومی شد و در لیگ نمایش داده می‌شود', 'success');
        // TODO: Save to Firebase publicProfiles collection
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

                <div className="flex gap-2">
                    {/* Share My Program Button */}
                    <button
                        onClick={toggleMyPublicProfile}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95 ${isMyProfilePublic
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                            }`}
                    >
                        {isMyProfilePublic ? <Eye size={16} /> : <EyeOff size={16} />}
                        {isMyProfilePublic ? 'عمومی' : 'خصوصی'}
                    </button>

                    <button
                        onClick={() => setIsLoading(true)}
                        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
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

                    <div className="grid grid-cols-3 gap-3">
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
                            <p className="font-bold">{myStats.tasksCompleted}/{myStats.totalTasks}</p>
                            <p className="text-[10px] opacity-70">تسک</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 mb-6">
                <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                    💡 برای شرکت در لیگ و نمایش در رتبه‌بندی، دکمه <strong>"عمومی"</strong> را فعال کنید.
                    دیگران می‌توانند برنامه و پیشرفت شما را مشاهده کنند.
                </p>
            </div>

            {/* Leaderboard */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                    <Users className="text-gray-400" size={18} />
                    <h2 className="font-bold text-gray-700 dark:text-gray-200">رتبه‌بندی کاربران عمومی</h2>
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
                ) : (
                    leaderboardData.filter(p => p.isPublic).map((profile, index) => {
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
        </div>
    );
};

export default Leaderboard;
