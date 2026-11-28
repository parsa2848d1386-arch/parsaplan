import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Crown, Eye, EyeOff, Loader2, RefreshCw, Search, Trophy, Users } from 'lucide-react';
import { BlobatarConfig, PublicProfileSummary } from '../../types';
import { formatToPersianDigits } from '../../utils';
import { STAGGER_CONTAINER_VARIANTS, STAGGER_ITEM_VARIANTS } from '../../utils/motionPresets';
import { LeaderboardListSkeleton } from '../Skeleton';
import { BlobatarBot } from '../ui/BlobatarBot';

export interface LeagueRankingListProps {
    isCloudAuthenticated: boolean;
    hasDb: boolean;
    isLoadingLb: boolean;
    isLoadingMore: boolean;
    hasMoreLb: boolean;
    sortBy: 'xp' | 'exam';
    onChangeSortBy: (next: 'xp' | 'exam') => void;
    searchQuery: string;
    onSearchChange: (val: string) => void;
    filteredLeaderboard: PublicProfileSummary[];
    currentUserUid?: string;
    userName: string;
    xp: number;
    level: number;
    userBlobatar?: BlobatarConfig;
    isMyProfilePublic: boolean;
    isTogglingPublic: boolean;
    onTogglePublic: () => void;
    onRefresh: () => void;
    onLoadMore: () => void;
    onOpenProfile: (uid: string) => void;
    isDemoActive?: boolean;
    onDismissDemo?: () => void;
}

export const LeagueRankingList: React.FC<LeagueRankingListProps> = ({
    isCloudAuthenticated,
    hasDb,
    isLoadingLb,
    isLoadingMore,
    hasMoreLb,
    sortBy,
    onChangeSortBy,
    searchQuery,
    onSearchChange,
    filteredLeaderboard,
    currentUserUid,
    userName,
    xp,
    level,
    userBlobatar,
    isMyProfilePublic,
    isTogglingPublic,
    onTogglePublic,
    onRefresh,
    onLoadMore,
    onOpenProfile,
    isDemoActive,
    onDismissDemo,
}) => {
    const prefersReducedMotion = useReducedMotion();

    return (
        <div className="bg-[var(--surface-elevated)] squircle-lg p-4 sm:p-6 shadow-xs flex flex-col gap-4 border border-[var(--border-subtle)]">
            {/* Header & Public Visibility Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <Trophy size={22} className="text-amber-500 shrink-0" aria-hidden="true" />
                    <div>
                        <h2 className="text-base sm:text-lg text-on-surface font-bold">رده‌بندی زنده لیگ</h2>
                        <span className="text-xs text-[var(--text-secondary)]">
                            {isCloudAuthenticated ? 'زنده از سرور · بر اساس امتیاز و تراز واقعی' : 'نمای محلی'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onTogglePublic}
                        disabled={isTogglingPublic}
                        className={`min-h-[40px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            isMyProfilePublic
                                ? 'bg-secondary-container text-on-secondary-container border border-secondary/30'
                                : 'bg-surface-container-low text-on-surface border border-[var(--border-subtle)] hover:bg-surface-container'
                        }`}
                    >
                        {isMyProfilePublic ? <Eye size={15} /> : <EyeOff size={15} />}
                        <span>{isMyProfilePublic ? 'پروفایل عمومی فعال' : 'انتشار در لیگ'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={onRefresh}
                        className="min-w-[40px] min-h-[40px] rounded-xl bg-surface-container-low border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-on-surface flex items-center justify-center transition cursor-pointer"
                        aria-label="بروزرسانی جدول رتبه‌بندی"
                    >
                        <RefreshCw size={15} className={isLoadingLb ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Sort & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-xl border border-[var(--border-subtle)]">
                    <button
                        type="button"
                        onClick={() => onChangeSortBy('xp')}
                        className={`flex-1 sm:flex-initial min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            sortBy === 'xp'
                                ? 'bg-[var(--surface-elevated)] text-primary shadow-xs'
                                : 'text-[var(--text-secondary)] hover:text-on-surface'
                        }`}
                    >
                        امتیاز <bdi>XP</bdi>
                    </button>
                    <button
                        type="button"
                        onClick={() => onChangeSortBy('exam')}
                        className={`flex-1 sm:flex-initial min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            sortBy === 'exam'
                                ? 'bg-[var(--surface-elevated)] text-primary shadow-xs'
                                : 'text-[var(--text-secondary)] hover:text-on-surface'
                        }`}
                    >
                        میانگین آزمون
                    </button>
                </div>

                <div className="relative">
                    <Search size={15} className="absolute start-3 top-3 text-[var(--text-tertiary)] pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="جستجوی شرکت‌کننده..."
                        className="w-full sm:w-64 min-h-[40px] ps-9 pe-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface text-xs border border-[var(--border-subtle)] outline-none focus:border-primary"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex flex-col gap-2">
                {isLoadingLb ? (
                    <LeaderboardListSkeleton />
                ) : !hasDb ? (
                    <div className="flex flex-col gap-3">
                        <div className="p-6 squircle-md bg-surface-container-low border border-dashed border-[var(--border-strong)] text-center space-y-2">
                            <Trophy size={28} className="mx-auto text-primary" aria-hidden="true" />
                            <p className="text-sm font-bold text-on-surface">
                                لیگ آنلاین در حالت اتصال ابری فعال می‌شود
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] tabular-nums">
                                امتیاز محلی شما: {formatToPersianDigits(xp)} <bdi>XP</bdi> (سطح {formatToPersianDigits(level)}). با ورود به حساب ابری در رقابت شرکت کنید.
                            </p>
                        </div>
                        {isDemoActive && (
                            <div className="p-4 squircle-md bg-amber-500/10 border border-amber-500/30 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                                        پیش‌نمایش نمونه لیگ
                                    </span>
                                    {onDismissDemo && (
                                        <button
                                            type="button"
                                            onClick={onDismissDemo}
                                            className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                                        >
                                            بستن پیش‌نمایش
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                                    <div className="flex items-center gap-3">
                                        <span className="w-7 h-7 rounded-full bg-primary text-on-primary text-xs font-bold flex items-center justify-center tabular-nums">
                                            ۱
                                        </span>
                                        <BlobatarBot seed={userName || 'Parsashz'} config={userBlobatar} size="sm" />
                                        <span className="text-xs font-bold text-on-surface">
                                            {userName || 'کاربر پارساپلن'} (شما)
                                        </span>
                                    </div>
                                    <span className="text-xs font-bold text-primary tabular-nums">
                                        {formatToPersianDigits(xp)} <bdi>XP</bdi>
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                ) : filteredLeaderboard.length === 0 ? (
                    <div className="p-8 squircle-md bg-surface-container-low border border-dashed border-[var(--border-strong)] text-center space-y-2">
                        <Users size={28} className="mx-auto text-[var(--text-tertiary)]" aria-hidden="true" />
                        <p className="text-sm font-bold text-on-surface">
                            {searchQuery
                                ? 'شرکت‌کننده‌ای با این نام پیدا نشد'
                                : 'هنوز شرکت‌کننده‌ای پروفایل عمومی خود را منتشر نکرده است'}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                            می‌توانید با دکمه «انتشار در لیگ» جزو اولین نفرات جدول باشید.
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
                            const isMe = item.id === currentUserUid;
                            const rank = idx + 1;
                            return (
                                <motion.div
                                    key={item.id}
                                    variants={STAGGER_ITEM_VARIANTS}
                                    onClick={() => onOpenProfile(item.id)}
                                    className={`transition-colors p-3 rounded-2xl flex items-center justify-between cursor-pointer border ${
                                        isMe
                                            ? 'bg-primary-fixed/45 border-primary/50 ring-1 ring-primary/30'
                                            : rank === 1
                                              ? 'bg-amber-500/10 border-amber-400/40'
                                              : 'bg-surface-container-low hover:bg-surface-container border-[var(--border-subtle)]'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span
                                            className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 tabular-nums ${
                                                rank === 1
                                                    ? 'bg-amber-400 text-amber-950'
                                                    : rank === 2
                                                      ? 'bg-slate-300 text-slate-900'
                                                      : rank === 3
                                                        ? 'bg-amber-700 text-white'
                                                        : 'bg-surface-container-highest text-on-surface'
                                            }`}
                                        >
                                            {formatToPersianDigits(rank)}
                                        </span>
                                        <div className="rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] p-0.5 shrink-0">
                                            <BlobatarBot
                                                seed={item.userName || 'Parsashz'}
                                                config={isMe ? userBlobatar : undefined}
                                                level={item.level}
                                                size="sm"
                                            />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-bold text-on-surface truncate">
                                                    {item.userName}
                                                </span>
                                                {rank === 1 && <Crown size={14} className="text-amber-500 shrink-0" />}
                                                {isMe && (
                                                    <span className="bg-primary text-on-primary text-[11px] px-1.5 py-0.5 rounded font-bold shrink-0">
                                                        شما
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-[var(--text-secondary)] tabular-nums">
                                                سطح {formatToPersianDigits(item.level)} · {formatToPersianDigits(item.tasksCompleted)} تسک تکمیل‌شده
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                        <span className="text-sm text-on-surface font-bold tabular-nums">
                                            {formatToPersianDigits(item.xp)} <bdi>XP</bdi>
                                        </span>
                                        {item.examAverage > 0 && (
                                            <span className="text-xs text-secondary font-medium tabular-nums">
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
                    onClick={onLoadMore}
                    disabled={isLoadingMore}
                    className="w-full min-h-[42px] py-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-[var(--border-subtle)] text-on-surface text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
    );
};
