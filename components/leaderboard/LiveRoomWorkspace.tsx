import React from 'react';
import {
    BookOpen,
    Check,
    Compass,
    Copy,
    Heart,
    Info,
    LogOut,
    MessageSquare,
    Pause,
    Play,
    Plus,
    RefreshCw,
    Search,
    Send,
    Smile,
    StopCircle,
    Trophy,
    Users,
    Maximize2,
    ArrowUpRight,
} from 'lucide-react';
import { useFocusTick, FocusStatus } from '../../context/FocusContext';
import { LiveRoomInfo, LiveRoomMessage, LiveRoomPeer, BlobatarConfig } from '../../types';
import { formatToPersianDigits } from '../../utils';
import { normalizePersianDigits } from '../../utils/formHelpers';
import { ROOM_CATEGORIES } from '../../services/backendApi';
import { LeaderboardRoomsSkeleton } from '../Skeleton';
import { BlobatarBot } from '../ui/BlobatarBot';

export const formatHMS = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const RoomAvatar: React.FC<{
    name: string;
    size?: 'sm' | 'md' | 'lg';
    blobatar?: BlobatarConfig;
}> = ({ name, size = 'sm', blobatar }) => (
    <div
        className="rounded-2xl bg-surface-container-low border border-[var(--border-subtle)] flex items-center justify-center shrink-0 p-0.5"
        title={name}
    >
        <BlobatarBot seed={name || 'Parsashz'} config={blobatar} size={size} />
    </div>
);

/**
 * Isolated 1Hz mini-timer strip shown ONLY inside an active study room.
 */
const ActiveRoomMiniTimer: React.FC<{
    focusStatus: FocusStatus;
    selectedSubject: string;
    baseTodayStudySeconds: number;
    myRoomRank: number | null;
    onStart: () => void;
    onPause: () => void;
    onFinish: () => void;
    onOpenFullTimer: () => void;
}> = React.memo(
    ({
        focusStatus,
        selectedSubject,
        baseTodayStudySeconds,
        myRoomRank,
        onStart,
        onPause,
        onFinish,
        onOpenFullTimer,
    }) => {
        const { elapsedSeconds } = useFocusTick();
        const totalToday = baseTodayStudySeconds + (focusStatus === 'running' ? elapsedSeconds : 0);

        return (
            <div className="bg-[var(--surface-elevated)] squircle-card p-3.5 sm:p-4 border border-[var(--border-subtle)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-primary/12 text-primary flex items-center justify-center shrink-0">
                        <span
                            className={`w-2.5 h-2.5 rounded-full ${
                                focusStatus === 'running'
                                    ? 'bg-emerald-500 animate-pulse'
                                    : focusStatus === 'paused'
                                      ? 'bg-amber-500'
                                      : 'bg-primary'
                            }`}
                        />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base sm:text-lg font-mono font-black tabular-nums text-on-surface" dir="ltr">
                                {formatHMS(elapsedSeconds)}
                            </span>
                            <span className="text-xs font-bold text-primary truncate">
                                {selectedSubject || 'مطالعه آزاد'}
                            </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                            مجموع امروز:{' '}
                            <span className="font-bold text-on-surface" dir="ltr">
                                {formatHMS(totalToday)}
                            </span>
                            {myRoomRank ? ` · رتبه اتاق #${formatToPersianDigits(myRoomRank)}` : ''}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {focusStatus === 'running' ? (
                        <button
                            type="button"
                            onClick={onPause}
                            className="min-h-[40px] px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                            <Pause size={15} fill="currentColor" aria-hidden="true" />
                            توقف
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onStart}
                            className="min-h-[40px] px-4 rounded-xl bg-primary hover:brightness-110 text-on-primary text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                            <Play size={15} fill="currentColor" aria-hidden="true" />
                            شروع فوکوس
                        </button>
                    )}

                    {(focusStatus === 'running' || focusStatus === 'paused') && (
                        <button
                            type="button"
                            onClick={onFinish}
                            className="min-h-[40px] px-3 rounded-xl bg-rose-500/12 text-rose-600 dark:text-rose-300 hover:bg-rose-500/20 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                            <StopCircle size={15} aria-hidden="true" />
                            پایان
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onOpenFullTimer}
                        aria-label="باز کردن تایمر کامل"
                        title="نمای کامل تایمر"
                        className="w-10 h-10 rounded-xl bg-surface-container-low hover:bg-surface-container border border-[var(--border-subtle)] text-on-surface flex items-center justify-center transition cursor-pointer"
                    >
                        <Maximize2 size={15} />
                    </button>
                </div>
            </div>
        );
    }
);
ActiveRoomMiniTimer.displayName = 'ActiveRoomMiniTimer';

export interface LiveRoomWorkspaceProps {
    activeRoomCode: string | null;
    activeRoomInfo: LiveRoomInfo | null;
    isCloudAuthenticated: boolean;
    isLoadingRooms: boolean;
    roomActionLoading: boolean;
    publicRooms: LiveRoomInfo[];
    roomSearch: string;
    onRoomSearchChange: (val: string) => void;
    selectedCategory: string;
    onSelectCategory: (cat: string) => void;
    joinCodeInput: string;
    onJoinCodeChange: (val: string) => void;
    onJoinRoom: (code: string) => void;
    onRefreshRooms: () => void;
    onOpenCreateRoom: () => void;
    onLeaveActiveRoom: () => void;
    onCopyRoomCode: (code: string) => void;
    copiedCode: boolean;
    sortedPeers: LiveRoomPeer[];
    userId: string;
    userBlobatar?: BlobatarConfig;
    myRoomRank: number | null;
    onCheerPeer: (peer: LiveRoomPeer) => void;
    roomMessages: LiveRoomMessage[];
    roomChatText: string;
    onRoomChatTextChange: (val: string) => void;
    onSendRoomChat: (e?: React.FormEvent) => void;
    onSendReaction: (emoji: string) => void;
    onSwitchToRanking: () => void;
    focusStatus: FocusStatus;
    selectedSubject: string;
    baseTodayStudySeconds: number;
    onStartTimer: () => void;
    onPauseTimer: () => void;
    onFinishSession: () => void;
    onOpenFullTimer: () => void;
}

export const LiveRoomWorkspace: React.FC<LiveRoomWorkspaceProps> = ({
    activeRoomCode,
    activeRoomInfo,
    isCloudAuthenticated,
    isLoadingRooms,
    roomActionLoading,
    publicRooms,
    roomSearch,
    onRoomSearchChange,
    selectedCategory,
    onSelectCategory,
    joinCodeInput,
    onJoinCodeChange,
    onJoinRoom,
    onRefreshRooms,
    onOpenCreateRoom,
    onLeaveActiveRoom,
    onCopyRoomCode,
    copiedCode,
    sortedPeers,
    userId,
    userBlobatar,
    myRoomRank,
    onCheerPeer,
    roomMessages,
    roomChatText,
    onRoomChatTextChange,
    onSendRoomChat,
    onSendReaction,
    onSwitchToRanking,
    focusStatus,
    selectedSubject,
    baseTodayStudySeconds,
    onStartTimer,
    onPauseTimer,
    onFinishSession,
    onOpenFullTimer,
}) => {
    if (!activeRoomCode) {
        return (
            <div className="flex flex-col gap-4">
                {/* Instant Join-by-Code + Create Room Bar (Above the Fold) */}
                <div className="bg-[var(--surface-elevated)] squircle-card p-3.5 sm:p-4 border border-[var(--border-subtle)] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                            type="text"
                            maxLength={6}
                            value={joinCodeInput}
                            onChange={(e) =>
                                onJoinCodeChange(normalizePersianDigits(e.target.value).toUpperCase())
                            }
                            placeholder="کد ۶ رقمی اتاق..."
                            aria-label="کد ۶ رقمی ورود به اتاق"
                            dir="ltr"
                            className="flex-1 sm:max-w-[190px] min-h-[42px] px-3 py-2 rounded-xl bg-surface-container-low text-on-surface text-xs font-mono font-bold uppercase text-center border border-[var(--border-subtle)] outline-none focus:border-primary"
                        />
                        <button
                            type="button"
                            onClick={() => onJoinRoom(joinCodeInput)}
                            disabled={joinCodeInput.trim().length < 6 || roomActionLoading}
                            className="min-h-[42px] px-4 rounded-xl bg-primary-fixed text-on-primary-fixed font-bold text-xs disabled:opacity-45 cursor-pointer hover:brightness-95 transition shrink-0"
                        >
                            ورود با کد
                        </button>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={onRefreshRooms}
                            className="min-w-[42px] min-h-[42px] rounded-xl bg-surface-container-low border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-on-surface flex items-center justify-center transition cursor-pointer"
                            aria-label="بروزرسانی اتاق‌ها"
                        >
                            <RefreshCw size={16} className={isLoadingRooms ? 'animate-spin' : ''} />
                        </button>
                        <button
                            type="button"
                            onClick={onOpenCreateRoom}
                            className="flex-1 sm:flex-initial min-h-[42px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:brightness-110 transition cursor-pointer"
                        >
                            <Plus size={16} aria-hidden="true" />
                            <span>ساخت اتاق جدید</span>
                        </button>
                    </div>
                </div>

                {/* Public Rooms Directory */}
                <div className="bg-[var(--surface-elevated)] squircle-lg p-4 sm:p-5 shadow-xs border border-[var(--border-subtle)] flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Compass size={19} className="text-primary shrink-0" aria-hidden="true" />
                            <div>
                                <h2 className="text-sm sm:text-base font-bold text-on-surface">
                                    اتاق‌های مطالعه عمومی
                                </h2>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    هم‌زمان با دیگران تایمر بزنید و ساعت مطالعه خود را همگام کنید.
                                </p>
                            </div>
                        </div>

                        <div className="relative w-full sm:w-60">
                            <Search size={15} className="absolute start-3 top-3 text-[var(--text-tertiary)] pointer-events-none" />
                            <input
                                type="text"
                                value={roomSearch}
                                onChange={(e) => onRoomSearchChange(e.target.value)}
                                placeholder="جستجوی نام یا کد اتاق..."
                                className="w-full min-h-[40px] ps-9 pe-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface text-xs border border-[var(--border-subtle)] outline-none focus:border-primary"
                            />
                        </div>
                    </div>

                    {/* Category Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                        {['همه', ...ROOM_CATEGORIES].map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => onSelectCategory(cat)}
                                className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                                    selectedCategory === cat
                                        ? 'bg-primary text-on-primary shadow-xs'
                                        : 'bg-surface-container-low text-[var(--text-secondary)] hover:text-on-surface border border-[var(--border-subtle)]'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {!isCloudAuthenticated ? (
                        <div className="p-6 squircle-md bg-surface-container-low border border-dashed border-[var(--border-strong)] text-center space-y-2">
                            <Info size={26} className="mx-auto text-primary" aria-hidden="true" />
                            <p className="text-sm font-bold text-on-surface">
                                برای حضور زنده در اتاق‌های مطالعه گروهی وارد حساب کاربری شوید
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                                در حالت آفلاین می‌توانید از تایمر تمرکز سراسری در بالای صفحه بدون نیاز به اتصال ابری استفاده کنید.
                            </p>
                        </div>
                    ) : isLoadingRooms ? (
                        <LeaderboardRoomsSkeleton />
                    ) : publicRooms.length === 0 ? (
                        <div className="p-8 squircle-md bg-surface-container-low border border-dashed border-[var(--border-strong)] text-center space-y-2">
                            <Users size={28} className="mx-auto text-[var(--text-tertiary)]" aria-hidden="true" />
                            <p className="text-sm font-bold text-on-surface">
                                هنوز اتاق عمومی با این فیلتر ساخته نشده است
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                                اولین اتاق خود را بسازید و کد ۶ رقمی آن را با دوستانتان به اشتراک بگذارید.
                            </p>
                        </div>
                    ) : (
                        <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1">
                            {publicRooms.map((room) => (
                                <div
                                    key={room.code}
                                    className="w-[78%] shrink-0 snap-start md:w-auto squircle-card p-4 bg-surface-container-low border border-[var(--border-subtle)] flex flex-col justify-between gap-3"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed">
                                                {room.category}
                                            </span>
                                            <span className="text-[11px] font-mono text-[var(--text-secondary)]" dir="ltr">
                                                #{room.code}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-sm text-on-surface truncate">{room.name}</h3>
                                        {room.description && (
                                            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                                                {room.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]">
                                        <span className="tabular-nums">
                                            هدف {formatToPersianDigits(room.targetHours)} ساعت · سقف {formatToPersianDigits(room.maxMembers)} نفر
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => onJoinRoom(room.code)}
                                            disabled={roomActionLoading}
                                            className="min-h-[34px] px-3.5 py-1 rounded-xl bg-primary hover:brightness-110 text-on-primary font-bold text-xs cursor-pointer disabled:opacity-50"
                                        >
                                            ورود
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Compact Active Room Status Bar */}
            <div className="bg-[var(--surface-elevated)] squircle-card p-3.5 sm:p-4 border border-[var(--border-subtle)] shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/12 text-primary flex items-center justify-center shrink-0">
                        <BookOpen size={19} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm sm:text-base font-extrabold text-on-surface truncate">
                                {activeRoomInfo?.name || `اتاق مطالعه ${activeRoomCode}`}
                            </h2>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold tabular-nums">
                                <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block me-1.5" aria-hidden="true" />
                                زنده · {formatToPersianDigits(sortedPeers.length)} عضو
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => onCopyRoomCode(activeRoomCode)}
                            className="text-xs font-mono font-bold text-primary hover:underline inline-flex items-center gap-1 mt-0.5 cursor-pointer"
                        >
                            <span dir="ltr">#{activeRoomCode}</span>
                            {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                            <span className="font-sans font-medium text-[var(--text-secondary)]">
                                {copiedCode ? 'کپی شد' : 'کپی کد دعوت'}
                            </span>
                        </button>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onLeaveActiveRoom}
                    className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/12 text-rose-600 dark:text-rose-300 text-xs font-bold hover:bg-rose-500/20 transition cursor-pointer"
                >
                    <LogOut size={14} aria-hidden="true" />
                    <span>خروج از اتاق</span>
                </button>
            </div>

            {/* Compact Focus Mini-Bar Synced with Dynamic Island */}
            <ActiveRoomMiniTimer
                focusStatus={focusStatus}
                selectedSubject={selectedSubject}
                baseTodayStudySeconds={baseTodayStudySeconds}
                myRoomRank={myRoomRank}
                onStart={onStartTimer}
                onPause={onPauseTimer}
                onFinish={onFinishSession}
                onOpenFullTimer={onOpenFullTimer}
            />

            {/* Room Podium + Live Desks + Room Chat */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className="lg:col-span-8 flex flex-col gap-4">
                    {/* Top 3 Podium */}
                    {sortedPeers.length > 0 && (
                        <div className="bg-[var(--surface-elevated)] squircle-lg p-4 sm:p-5 shadow-xs border border-[var(--border-subtle)] flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Trophy size={18} className="text-amber-500" aria-hidden="true" />
                                    <h3 className="text-sm sm:text-base font-bold text-on-surface">برترین‌های امروز اتاق</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={onSwitchToRanking}
                                    className="text-primary text-xs font-bold flex items-center gap-1 cursor-pointer hover:underline"
                                >
                                    <span>مشاهده لیگ کامل</span>
                                    <ArrowUpRight size={14} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {sortedPeers.slice(0, 3).map((peer, idx) => (
                                    <div
                                        key={peer.uid}
                                        className={`rounded-2xl p-3 flex flex-col items-center text-center border ${
                                            idx === 0
                                                ? 'bg-amber-500/10 border-amber-400/40'
                                                : 'bg-surface-container-low border-[var(--border-subtle)]'
                                        }`}
                                    >
                                        <div className="relative mb-1.5">
                                            <RoomAvatar
                                                name={peer.displayName}
                                                blobatar={peer.uid === userId ? userBlobatar : undefined}
                                                size={idx === 0 ? 'md' : 'sm'}
                                            />
                                            <span className="absolute -bottom-1 -start-1 w-5 h-5 rounded-full bg-primary text-on-primary text-[11px] flex items-center justify-center font-bold shadow-xs tabular-nums">
                                                {formatToPersianDigits(idx + 1)}
                                            </span>
                                        </div>
                                        <span className="text-xs font-bold text-on-surface truncate w-full">
                                            {peer.uid === userId ? `${peer.displayName} (شما)` : peer.displayName}
                                        </span>
                                        <span className="text-xs text-primary font-bold tabular-nums mt-0.5" dir="ltr">
                                            {formatHMS(peer.dailyStudySeconds || 0)}
                                        </span>
                                        <span className="text-[11px] text-[var(--text-secondary)] truncate w-full mt-0.5">
                                            {peer.activeSubject || 'مطالعه آزاد'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Live Desks Grid */}
                    <div className="bg-[var(--surface-elevated)] squircle-lg p-4 sm:p-5 shadow-xs flex flex-col gap-3.5 border border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Users size={18} className="text-primary" aria-hidden="true" />
                                <h3 className="text-sm sm:text-base font-bold text-on-surface">میزهای مطالعه آنلاین</h3>
                            </div>
                            <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 tabular-nums">
                                <span className="w-2 h-2 rounded-full bg-secondary" aria-hidden="true" />
                                {formatToPersianDigits(sortedPeers.filter((p) => p.status === 'STUDYING').length)} نفر در حال مطالعه
                            </span>
                        </div>

                        {sortedPeers.length === 0 ? (
                            <div className="p-6 text-center rounded-2xl bg-surface-container-low text-xs text-[var(--text-secondary)]">
                                هنوز هم‌اتاقی دیگری در این اتاق حضور ندارد. کد اتاق را با دوستانتان به اشتراک بگذارید.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {sortedPeers.map((peer) => {
                                    const isStudying = peer.status === 'STUDYING';
                                    const isResting = peer.status === 'RESTING';
                                    const isSelf = peer.uid === userId;
                                    return (
                                        <div
                                            key={peer.uid}
                                            className="bg-surface-container-low rounded-2xl p-3 flex flex-col gap-1.5 border border-[var(--border-subtle)]"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <RoomAvatar
                                                        name={peer.displayName}
                                                        blobatar={isSelf ? userBlobatar : undefined}
                                                        size="sm"
                                                    />
                                                    <span className="text-xs font-bold text-on-surface truncate">
                                                        {isSelf ? `${peer.displayName} (شما)` : peer.displayName}
                                                    </span>
                                                </div>
                                                <span
                                                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                                        isStudying
                                                            ? 'bg-emerald-500'
                                                            : isResting
                                                              ? 'bg-amber-400'
                                                              : 'bg-slate-400'
                                                    }`}
                                                    title={isStudying ? 'در حال مطالعه' : isResting ? 'استراحت' : 'آفلاین'}
                                                />
                                            </div>
                                            <p className="text-xs text-[var(--text-secondary)] truncate">
                                                {peer.activeSubject || 'مطالعه متمرکز'}
                                            </p>
                                            <div className="flex items-center justify-between mt-1 text-[11px]">
                                                <span className={isStudying ? 'text-secondary font-bold' : 'text-amber-600 dark:text-amber-400 font-bold'}>
                                                    {isStudying ? 'در حال مطالعه' : isResting ? 'در حال استراحت' : 'آفلاین'}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {!isSelf && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onCheerPeer(peer)}
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/12 text-rose-600 dark:text-rose-300 hover:bg-rose-500/20 transition cursor-pointer tabular-nums"
                                                            title="ارسال انرژی مثبت"
                                                        >
                                                            <Heart size={11} />
                                                            <span>{formatToPersianDigits(peer.cheersReceived || 0)}</span>
                                                        </button>
                                                    )}
                                                    {isSelf && (peer.cheersReceived || 0) > 0 && (
                                                        <span className="inline-flex items-center gap-1 text-rose-500 font-bold tabular-nums">
                                                            <Heart size={11} className="fill-current" />
                                                            {formatToPersianDigits(peer.cheersReceived)}
                                                        </span>
                                                    )}
                                                    <span className="font-mono font-semibold tabular-nums text-on-surface" dir="ltr">
                                                        {formatHMS(peer.elapsedSeconds || peer.dailyStudySeconds || 0)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Live Room Messages */}
                <div className="lg:col-span-4 bg-[var(--surface-elevated)] squircle-lg p-4 sm:p-5 shadow-xs flex flex-col gap-3 border border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <MessageSquare size={18} className="text-primary" aria-hidden="true" />
                            <h3 className="text-sm sm:text-base font-bold text-on-surface">پیام‌های زنده اتاق</h3>
                        </div>
                        <span className="text-[11px] text-[var(--text-secondary)]">انگیزشی</span>
                    </div>

                    <div className="flex flex-col gap-2 max-h-72 overflow-y-auto custom-scrollbar">
                        {roomMessages.length === 0 ? (
                            <div className="p-4 rounded-xl bg-surface-container-low text-center text-xs text-[var(--text-secondary)]">
                                هنوز پیامی ارسال نشده است.
                            </div>
                        ) : (
                            roomMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between text-xs border border-[var(--border-subtle)] gap-2"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Smile size={14} className="text-primary shrink-0" />
                                        <span className="text-on-surface break-words">
                                            <strong className="font-bold">{msg.senderName}:</strong> {msg.text}
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-[var(--text-tertiary)] shrink-0 tabular-nums">
                                        {msg.createdAt
                                            ? new Date(msg.createdAt).toLocaleTimeString('fa-IR', {
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                              })
                                            : ''}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                        <div className="flex items-center justify-around bg-surface-container-low p-1 rounded-xl border border-[var(--border-subtle)]">
                            {['👏', '🔥', '☕', '⚡'].map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => onSendReaction(emoji)}
                                    className="w-9 h-9 rounded-lg hover:bg-[var(--surface-elevated)] flex items-center justify-center text-base transition-transform active:scale-115 cursor-pointer"
                                    title="ارسال واکنش سریع"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={onSendRoomChat} className="relative flex items-center">
                            <input
                                value={roomChatText}
                                onChange={(e) => onRoomChatTextChange(e.target.value)}
                                className="w-full min-h-[42px] bg-surface-container-low text-on-surface placeholder:text-[var(--text-tertiary)] text-xs rounded-xl py-2 px-3 ps-10 outline-none border border-[var(--border-subtle)] focus:border-primary"
                                placeholder="پیام انگیزه بفرستید..."
                                type="text"
                            />
                            <button
                                type="submit"
                                aria-label="ارسال پیام اتاق"
                                className="absolute left-2 text-primary hover:opacity-80 p-1.5 flex items-center cursor-pointer"
                            >
                                <Send size={16} className="transform rotate-180" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
