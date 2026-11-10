import React from 'react';
import { X, NotebookPen, Lock } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { BlockNote } from '../../types';
import { BlockNoteEditor } from '../editor/BlockNoteEditor';
import { toIsoString } from '../../utils';

interface InSessionScratchpadDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    pinnedTaskId: string | null;
    subjectName: string;
}

export const InSessionScratchpadDrawer: React.FC<InSessionScratchpadDrawerProps> = ({
    isOpen,
    onClose,
    pinnedTaskId,
    subjectName,
}) => {
    const {
        tasks,
        updateTaskBlocks,
        dailyNotes,
        saveDailyNote,
        addFlashcard,
        showToast,
    } = useStore();

    if (!isOpen) return null;

    const pinnedTask = pinnedTaskId ? tasks.find((t) => t.id === pinnedTaskId) : undefined;
    const todayKey = toIsoString(new Date());

    const handleTaskBlocksChange = (blocks: BlockNote[]) => {
        if (pinnedTask) {
            updateTaskBlocks(pinnedTask.id, blocks);
        }
    };

    const handleCreateCard = (front: string, back: string) => {
        addFlashcard({
            question: front,
            answer: back,
            subject: pinnedTask?.subject || subjectName || 'عمومی',
            topic: pinnedTask?.topic || '',
        });
    };

    return (
        <div className="fixed inset-y-0 left-0 z-[80] w-full max-w-md bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200" dir="rtl">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/70 dark:bg-gray-900/80">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0">
                        <NotebookPen size={16} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-black text-gray-800 dark:text-white truncate">
                            چرک‌نویس حین تمرکز
                        </h3>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1 truncate">
                            <Lock size={9} className="text-emerald-500" />
                            ذخیره مستقیم بدون شکستن قفل تمرکز
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-gray-200/70 dark:hover:bg-gray-800 text-gray-500 transition"
                >
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                {pinnedTask ? (
                    <div className="space-y-3">
                        <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                            <div className="text-[10px] font-bold text-indigo-500">متصل به تسک:</div>
                            <div className="text-xs font-black text-gray-800 dark:text-white mt-0.5">
                                {pinnedTask.subject} — {pinnedTask.topic}
                            </div>
                        </div>
                        <BlockNoteEditor
                            blocks={pinnedTask.blocks || []}
                            onChange={handleTaskBlocksChange}
                            onCreateFlashcard={handleCreateCard}
                            compact
                        />
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300">
                            تسکی انتخاب نشده؛ یادداشت‌های شما در دفترچه روزانه امروز ({todayKey}) ذخیره می‌شود.
                        </div>
                        <textarea
                            rows={12}
                            value={dailyNotes[todayKey] || ''}
                            onChange={(e) => saveDailyNote(todayKey, e.target.value)}
                            placeholder="نکات سریع، فرمول‌ها یا سوالاتی که حین مطالعه به ذهنتان می‌رسد..."
                            className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 outline-none focus:border-indigo-500 resize-none leading-relaxed"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const text = (dailyNotes[todayKey] || '').trim();
                                if (!text) {
                                    showToast('ابتدا متنی بنویسید', 'warning');
                                    return;
                                }
                                handleCreateCard(text.slice(0, 120), 'نکته جلسه مطالعه');
                            }}
                            className="w-full py-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/40 text-xs font-bold hover:bg-orange-100 transition"
                        >
                            تبدیل متن فعلی به فلش‌کارت لایتنر
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
