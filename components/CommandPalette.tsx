import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { useFocus } from '../context/FocusContext';
import { useUI } from '../context/UIContext';
import {
    Search,
    LayoutDashboard,
    CalendarClock,
    BookOpen,
    PenTool,
    BarChart2,
    Trophy,
    Bot,
    Settings,
    BrainCircuit,
    Timer,
    Sparkles,
    Sunrise,
    MoonStar,
    Moon,
    Play,
    CheckSquare,
} from 'lucide-react';

interface PaletteAction {
    id: string;
    label: string;
    group: 'صفحات' | 'ابزار سریع' | 'تسک‌ها';
    shortcut?: string;
    icon: React.ElementType;
    run: () => void;
}

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
    const [selectedIdx, setSelectedIdx] = useState(0);

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
            } else if (key === 'n') {
                e.preventDefault();
                navigate('/notes');
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
            setIsCommandPaletteOpen(false);
            setQuery('');
            fn();
        };

        const baseActions: PaletteAction[] = [
            { id: 'act-focus', label: 'باز کردن کرنومتر و اتاق مطالعه', group: 'ابزار سریع', shortcut: 'T', icon: Timer, run: closeAnd(() => setIsTimerOpen(true)) },
            { id: 'act-bd', label: 'تخلیه ذهن سریع (Brain Dump)', group: 'ابزار سریع', shortcut: 'B', icon: Sparkles, run: closeAnd(() => setBrainDumpOpen(true)) },
            { id: 'act-morning', label: 'آیین برنامه‌ریزی صبحگاهی (MIT)', group: 'ابزار سریع', shortcut: 'M', icon: Sunrise, run: closeAnd(() => setMorningModalOpen(true)) },
            { id: 'act-evening', label: 'جمع‌بندی شبانه و انتقال معلق‌ها', group: 'ابزار سریع', shortcut: 'E', icon: MoonStar, run: closeAnd(() => setEveningModalOpen(true)) },
            { id: 'act-theme', label: 'تغییر حالت شب / روز', group: 'ابزار سریع', icon: Moon, run: closeAnd(() => toggleDarkMode()) },

            { id: 'nav-home', label: 'داشبورد اصلی', group: 'صفحات', icon: LayoutDashboard, run: closeAnd(() => navigate('/')) },
            { id: 'nav-planner', label: 'برنامه‌ریز ۱۰ دقیقه‌ای و تایم‌لاین', group: 'صفحات', shortcut: 'P', icon: CalendarClock, run: closeAnd(() => navigate('/planner')) },
            { id: 'nav-subjects', label: 'دروس و نماهای چندگانه (جدول / کانبان / آیزنهاور)', group: 'صفحات', icon: BookOpen, run: closeAnd(() => navigate('/subjects')) },
            { id: 'nav-notes', label: 'دفترچه هوشمند و تخته قلم', group: 'صفحات', shortcut: 'N', icon: PenTool, run: closeAnd(() => navigate('/notes')) },
            { id: 'nav-leitner', label: 'جعبه لایتنر و مرور فعال', group: 'صفحات', icon: BrainCircuit, run: closeAnd(() => navigate('/leitner')) },
            { id: 'nav-analysis', label: 'تحلیل عملکرد و هیت‌مپ سالانه', group: 'صفحات', icon: BarChart2, run: closeAnd(() => navigate('/analysis')) },
            { id: 'nav-lb', label: 'تالار رقابت و اتاق مطالعه گروهی', group: 'صفحات', icon: Trophy, run: closeAnd(() => navigate('/leaderboard')) },
            { id: 'nav-ai', label: 'مشاور هوشمند Gemini AI', group: 'صفحات', icon: Bot, run: closeAnd(() => navigate('/ai-chat')) },
            { id: 'nav-settings', label: 'تنظیمات و پروفایل', group: 'صفحات', icon: Settings, run: closeAnd(() => navigate('/settings')) },
        ];

        const q = query.trim().toLowerCase();
        const filteredBase = q ? baseActions.filter((a) => a.label.toLowerCase().includes(q)) : baseActions;

        const matchingTasks: PaletteAction[] = q
            ? tasks
                  .filter(
                      (t) =>
                          t.topic.toLowerCase().includes(q) ||
                          t.subject.toLowerCase().includes(q) ||
                          t.details.toLowerCase().includes(q)
                  )
                  .slice(0, 8)
                  .map((t) => ({
                      id: `task-focus-${t.id}`,
                      label: `شروع تمرکز: ${t.subject} — ${t.topic}`,
                      group: 'تسک‌ها' as const,
                      icon: t.isCompleted ? CheckSquare : Play,
                      run: closeAnd(() => {
                          if (!t.isCompleted) startFocusForTask(t);
                          else toggleTask(t.id);
                      }),
                  }))
            : [];

        return [...filteredBase, ...matchingTasks];
    }, [
        query,
        tasks,
        navigate,
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
    }, [query, isCommandPaletteOpen]);

    if (!isCommandPaletteOpen) return null;

    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIdx((i) => Math.min(actions.length - 1, i + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIdx((i) => Math.max(0, i - 1));
        } else if (e.key === 'Enter' && actions[selectedIdx]) {
            e.preventDefault();
            actions[selectedIdx].run();
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setIsCommandPaletteOpen(false)}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 rounded-3xl max-w-xl w-full overflow-hidden border border-gray-200 dark:border-gray-700 shadow-2xl"
            >
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
                    <Search size={18} className="text-indigo-500 shrink-0" />
                    <input
                        autoFocus
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder="دستور، صفحه یا نام درس و تسک را تایپ کنید..."
                        className="flex-1 bg-transparent outline-none text-sm font-bold text-gray-800 dark:text-white"
                    />
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                        ESC
                    </span>
                </div>

                <div className="max-h-96 overflow-y-auto p-2 space-y-1">
                    {actions.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 py-8">نتیجه‌ای یافت نشد.</p>
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
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-right text-xs transition ${
                                        isSelected
                                            ? 'bg-indigo-600 text-white font-black shadow-sm'
                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Icon size={16} className="shrink-0" />
                                        <span className="truncate">{act.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-gray-400'}`}>
                                            {act.group}
                                        </span>
                                        {act.shortcut && (
                                            <span
                                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                                    isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
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
            </div>
        </div>,
        document.body
    );
};
