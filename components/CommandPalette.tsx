import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SPRING_SNAPPY } from '../utils/motionPresets';
import { useStore } from '../context/StoreContext';
import { useFocus } from '../context/FocusContext';
import { useUI } from '../context/UIContext';
import { useOverlayHistory } from '../hooks/useOverlayHistory';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { addRecentSearch, removeRecentSearch } from '../utils/designSystemHelpers';
import {
    Search,
    LayoutDashboard,
    CalendarClock,
    BookOpen,
    BarChart2,
    Trophy,
    Bot,
    Settings,
    Timer,
    Sparkles,
    Sunrise,
    MoonStar,
    Moon,
    Play,
    CheckSquare,
    Clock,
    X,
} from 'lucide-react';

type SearchScope = 'all' | 'تسک‌ها' | 'صفحات' | 'ابزار سریع';

interface PaletteAction {
    id: string;
    label: string;
    group: 'صفحات' | 'ابزار سریع' | 'تسک‌ها';
    shortcut?: string;
    icon: React.ElementType;
    run: () => void;
}

const RECENT_SEARCHES_KEY = 'parsaplan_recent_searches_v1';

const loadRecentSearches = (): string[] => {
    try {
        const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string').slice(0, 6) : [];
    } catch {
        return [];
    }
};

export const CommandPalette: React.FC = () => {
    const navigate = useNavigate();
    const {
        tasks,
        toggleTask,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        toggleDarkMode,
    } = useStore();
    const { setIsTimerOpen, startFocusForTask } = useFocus();
    const { setMorningModalOpen, setEveningModalOpen, setBrainDumpOpen } = useUI();

    const [query, setQuery] = useState('');
    const [scope, setScope] = useState<SearchScope>('all');
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);

    const closePalette = useCallback(() => {
        setIsCommandPaletteOpen(false);
    }, [setIsCommandPaletteOpen]);

    const dialogRef = useRef<HTMLDivElement>(null);

    // Baymard 2026: Back button closes search overlay
    useOverlayHistory(isCommandPaletteOpen, closePalette, 'command-palette');
    useFocusTrap(dialogRef, {
        isActive: isCommandPaletteOpen,
        onEscape: closePalette,
    });

    const persistRecent = useCallback((next: string[]) => {
        setRecentSearches(next);
        try {
            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
        } catch {
            // ignore quota errors
        }
    }, []);

    const recordCurrentQuery = useCallback(
        (rawQuery: string) => {
            const next = addRecentSearch(recentSearches, rawQuery);
            if (next !== recentSearches) persistRecent(next);
        },
        [recentSearches, persistRecent]
    );

    const handleDeleteRecent = (term: string) => {
        persistRecent(removeRecentSearch(recentSearches, term));
    };

    const handleClearRecent = () => {
        persistRecent([]);
    };

    // Keyboard shortcuts: Ctrl/Cmd+K + single-key global navigation when outside inputs
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsCommandPaletteOpen(!isCommandPaletteOpen);
                return;
            }
            if (e.key === 'Escape' && isCommandPaletteOpen) {
                setIsCommandPaletteOpen(false);
                return;
            }

            const target = e.target as HTMLElement | null;
            const isTyping =
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'SELECT' ||
                    target.isContentEditable);
            if (isTyping || e.ctrlKey || e.metaKey || e.altKey || isCommandPaletteOpen) return;

            const key = e.key.toLowerCase();
            if (key === 't') {
                e.preventDefault();
                setIsTimerOpen(true);
            } else if (key === 'b') {
                e.preventDefault();
                setBrainDumpOpen(true);
            } else if (key === 'm') {
                e.preventDefault();
                setMorningModalOpen(true);
            } else if (key === 'e') {
                e.preventDefault();
                setEveningModalOpen(true);
            } else if (key === 'p') {
                e.preventDefault();
                navigate('/planner');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        setIsTimerOpen,
        setBrainDumpOpen,
        setMorningModalOpen,
        setEveningModalOpen,
        navigate,
    ]);

    const actions: PaletteAction[] = useMemo(() => {
        const closeAnd = (fn: () => void) => () => {
            if (query.trim().length >= 2) {
                recordCurrentQuery(query);
            }
            setIsCommandPaletteOpen(false);
            fn();
        };

        const baseActions: PaletteAction[] = [
            { id: 'act-focus', label: 'باز کردن کرنومتر و اتاق مطالعه', group: 'ابزار سریع', shortcut: 'T', icon: Timer, run: closeAnd(() => setIsTimerOpen(true)) },
            { id: 'act-bd', label: 'تخلیه ذهن سریع (Brain Dump)', group: 'ابزار سریع', shortcut: 'B', icon: Sparkles, run: closeAnd(() => setBrainDumpOpen(true)) },
            { id: 'act-morning', label: 'آیین برنامه‌ریزی صبحگاهی (MIT)', group: 'ابزار سریع', shortcut: 'M', icon: Sunrise, run: closeAnd(() => setMorningModalOpen(true)) },
            { id: 'act-evening', label: 'جمع‌بندی شبانه و انتقال معلق‌ها', group: 'ابزار سریع', shortcut: 'E', icon: MoonStar, run: closeAnd(() => setEveningModalOpen(true)) },
            { id: 'act-theme', label: 'تغییر حالت شب / روز', group: 'ابزار سریع', icon: Moon, run: closeAnd(() => toggleDarkMode()) },

            { id: 'nav-home', label: 'داشبورد اصلی', group: 'صفحات', icon: LayoutDashboard, run: closeAnd(() => navigate('/')) },
            { id: 'nav-planner', label: 'تایم‌لاین ۲۴ ساعته و گرید ۱۰ دقیقه‌ای', group: 'صفحات', shortcut: 'P', icon: CalendarClock, run: closeAnd(() => navigate('/planner')) },
            { id: 'nav-subjects', label: 'حوزه‌ها و نماهای چندگانه (جدول / کانبان / آیزنهاور)', group: 'صفحات', icon: BookOpen, run: closeAnd(() => navigate('/subjects')) },
            { id: 'nav-analysis', label: 'تحلیل عملکرد و هیت‌مپ سالانه', group: 'صفحات', icon: BarChart2, run: closeAnd(() => navigate('/analysis')) },
            { id: 'nav-lb', label: 'لیگ رقابت و اتاق‌های مطالعه YPT', group: 'صفحات', icon: Trophy, run: closeAnd(() => navigate('/leaderboard')) },
            { id: 'nav-ai', label: 'مشاور هوشمند Gemini AI', group: 'صفحات', icon: Bot, run: closeAnd(() => navigate('/ai-chat')) },
            { id: 'nav-settings', label: 'تنظیمات و پروفایل', group: 'صفحات', icon: Settings, run: closeAnd(() => navigate('/settings')) },
        ];

        const q = query.trim().toLowerCase();
        const isDefaultCuratedView = !q && scope === 'all';
        const filteredBase = q
            ? baseActions.filter((a) => a.label.toLowerCase().includes(q))
            : isDefaultCuratedView
              ? baseActions.slice(0, 4)
              : baseActions;

        const matchingTasks: PaletteAction[] = (q
            ? tasks
                  .filter(
                      (t) =>
                          t.topic.toLowerCase().includes(q) ||
                          t.subject.toLowerCase().includes(q) ||
                          t.details.toLowerCase().includes(q)
                  )
                  .slice(0, 8)
            : tasks.filter((t) => !t.isCompleted).slice(0, isDefaultCuratedView ? 4 : 6)
        ).map((t) => ({
            id: `task-focus-${t.id}`,
            label: `شروع تمرکز: ${t.subject} — ${t.topic}`,
            group: 'تسک‌ها' as const,
            icon: t.isCompleted ? CheckSquare : Play,
            run: closeAnd(() => {
                if (!t.isCompleted) startFocusForTask(t);
                else toggleTask(t.id);
            }),
        }));

        const combined = [...filteredBase, ...matchingTasks];
        return scope === 'all' ? combined : combined.filter((item) => item.group === scope);
    }, [
        query,
        scope,
        tasks,
        navigate,
        recordCurrentQuery,
        setIsCommandPaletteOpen,
        setIsTimerOpen,
        setBrainDumpOpen,
        setMorningModalOpen,
        setEveningModalOpen,
        toggleDarkMode,
        startFocusForTask,
        toggleTask,
    ]);

    useEffect(() => {
        setSelectedIdx(0);
    }, [query, scope, isCommandPaletteOpen]);

    const prefersReducedMotion = useReducedMotion();

    if (!isCommandPaletteOpen) return null;

    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIdx((i) => Math.min(Math.max(0, actions.length - 1), i + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIdx((i) => Math.max(0, i - 1));
        } else if (e.key === 'Enter' && actions[selectedIdx]) {
            e.preventDefault();
            actions[selectedIdx].run();
        }
    };

    const scopes: { id: SearchScope; label: string }[] = [
        { id: 'all', label: 'همه' },
        { id: 'تسک‌ها', label: 'تسک‌ها' },
        { id: 'صفحات', label: 'صفحات' },
        { id: 'ابزار سریع', label: 'ابزار سریع' },
    ];

    return createPortal(
        <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="جستجوی سریع و دستورات"
            dir="rtl"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-[60] flex items-start justify-center pt-[max(0.625rem,env(safe-area-inset-top,0px))] sm:pt-20 bg-slate-950/55 dark:bg-black/70 backdrop-blur-[6px] px-3 sm:p-4"
            onClick={closePalette}
        >
            <motion.div
                ref={dialogRef}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                initial={
                    prefersReducedMotion
                        ? false
                        : { opacity: 0, scale: 0.9, y: -10 }
                }
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={
                    prefersReducedMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.94, y: -8 }
                }
                transition={{ type: 'spring', stiffness: 440, damping: 32, mass: 0.75 }}
                style={{ transformOrigin: 'top left', willChange: 'transform, opacity' }}
                className="bg-[var(--surface-elevated)] squircle-lg max-w-xl w-full overflow-hidden border border-[var(--glass-nav-border)] shadow-2xl outline-none"
            >
                {/* Search Input Row */}
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--border-subtle)]">
                    <Search size={18} className="text-primary shrink-0" aria-hidden="true" />
                    <input
                        autoFocus
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder="دستور، صفحه یا نام درس و تسک..."
                        aria-label="جستجوی سریع"
                        className="flex-1 bg-transparent outline-none text-base sm:text-sm font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            aria-label="پاک کردن عبارت جستجو"
                            className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-surface-container transition"
                        >
                            <X size={16} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={closePalette}
                        aria-label="بستن جستجو"
                        className="w-10 h-10 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1 flex items-center justify-center rounded-xl bg-surface-container text-[var(--text-secondary)] text-xs font-mono hover:bg-surface-container-high transition"
                    >
                        <span className="hidden sm:inline">ESC</span>
                        <X size={18} className="sm:hidden" />
                    </button>
                </div>

                {/* Visible Scope Filter Bar (WWDC26 Search Excellence) */}
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[var(--border-subtle)] overflow-x-auto no-scrollbar">
                    {scopes.map((item) => {
                        const active = scope === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setScope(item.id)}
                                className={`shrink-0 px-3 min-h-[34px] rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                    active
                                        ? 'bg-primary text-on-primary'
                                        : 'bg-surface-container-low dark:bg-slate-800 text-[var(--text-secondary)] hover:bg-surface-container'
                                }`}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>

                {/* Recent Searches Section (shown when query is empty) */}
                {!query.trim() && recentSearches.length > 0 && (
                    <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] bg-surface-container-low/50 dark:bg-slate-900/40">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                                <Clock size={12} aria-hidden="true" />
                                جستجوهای اخیر
                            </span>
                            <button
                                type="button"
                                onClick={handleClearRecent}
                                className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                            >
                                پاک کردن همه
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {recentSearches.map((term) => (
                                <div
                                    key={term}
                                    className="inline-flex items-center bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl overflow-hidden"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setQuery(term)}
                                        className="px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:text-primary transition"
                                    >
                                        {term}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteRecent(term)}
                                        aria-label={`حذف ${term} از جستجوهای اخیر`}
                                        className="px-1.5 py-1.5 text-[var(--text-muted)] hover:text-rose-500 transition"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Results List */}
                <div className="max-h-[55vh] sm:max-h-96 overflow-y-auto p-2 space-y-1">
                    {actions.length === 0 ? (
                        <div className="text-center py-9 px-4 space-y-3">
                            <p className="text-sm font-bold text-[var(--text-primary)]">
                                نتیجه‌ای برای «{query}» پیدا نشد
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                                فیلتر دسته‌بندی را تغییر دهید یا با کلیدواژه کوتاه‌تری جستجو کنید.
                            </p>
                            <div className="flex items-center justify-center gap-2 pt-1">
                                {scope !== 'all' && (
                                    <button
                                        type="button"
                                        onClick={() => setScope('all')}
                                        className="px-3.5 min-h-[38px] rounded-xl bg-primary text-on-primary text-xs font-bold"
                                    >
                                        جستجو در همه بخش‌ها
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setQuery('');
                                        setScope('all');
                                    }}
                                    className="px-3.5 min-h-[38px] rounded-xl bg-surface-container text-[var(--text-primary)] text-xs font-bold"
                                >
                                    پاک کردن جستجو
                                </button>
                            </div>
                        </div>
                    ) : (
                        actions.map((act, idx) => {
                            const Icon = act.icon;
                            const isSelected = idx === selectedIdx;
                            return (
                                <button
                                    key={act.id}
                                    type="button"
                                    onClick={act.run}
                                    onMouseEnter={() => setSelectedIdx(idx)}
                                    className={`w-full flex items-center justify-between px-3 min-h-[44px] py-2 rounded-2xl text-right text-xs transition ${
                                        isSelected
                                            ? 'bg-primary text-on-primary font-bold'
                                            : 'text-[var(--text-primary)] hover:bg-surface-container-low dark:hover:bg-slate-800 font-semibold'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Icon size={16} className="shrink-0" aria-hidden="true" />
                                        <span className="truncate">{act.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span
                                            className={`text-[11px] ${
                                                isSelected ? 'text-white/80' : 'text-[var(--text-muted)]'
                                            }`}
                                        >
                                            {act.group}
                                        </span>
                                        {act.shortcut && (
                                            <span
                                                className={`hidden sm:inline text-[11px] font-mono px-1.5 py-0.5 rounded ${
                                                    isSelected
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-surface-container text-[var(--text-secondary)]'
                                                }`}
                                            >
                                                {act.shortcut}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
};
