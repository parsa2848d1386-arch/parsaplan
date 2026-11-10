import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { useFocus } from '../context/FocusContext';
import { useUI } from '../context/UIContext';
import { NotebookPage, BlockNote, StylusStroke } from '../types';
import { BlockNoteEditor } from '../components/editor/BlockNoteEditor';
import { StylusCanvas } from '../components/canvas/StylusCanvas';
import {
    Plus,
    Search,
    ChevronLeft,
    ChevronDown,
    Trash2,
    FileText,
    PenTool,
    FolderPlus,
    BookOpenCheck,
} from 'lucide-react';

const PAGE_ICONS = ['📘', '📐', '🧪', '🧬', '📝', '💡', '⚡', '🎯', '📌', '🌟'];

const WorkspaceNotes: React.FC = () => {
    const {
        notebookPages,
        createNotebookPage,
        updateNotebookPage,
        deleteNotebookPage,
        stylusStrokes,
        setStylusStrokes,
        addFlashcard,
        subjects,
    } = useStore();
    const { startFocusForTask } = useFocus();
    const { showToast } = useUI();

    const activePages = useMemo(() => notebookPages.filter((p) => !p.isArchived), [notebookPages]);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [editorTab, setEditorTab] = useState<'blocks' | 'canvas' | 'global_board'>('blocks');
    const [searchQuery, setSearchQuery] = useState('');
    const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
    const [showIconPicker, setShowIconPicker] = useState(false);
    const seededRef = useRef(false);

    // Keep first active page selected when pages exist (no fake seeded Konkoor sample pages)
    useEffect(() => {
        if (!seededRef.current && !selectedPageId && activePages.length > 0) {
            seededRef.current = true;
            setSelectedPageId(activePages[0].id);
        }
    }, [activePages, selectedPageId]);

    const handleCreateFromStarter = (kind: 'blank' | 'project' | 'study') => {
        const templates: Record<'blank' | 'project' | 'study', Omit<NotebookPage, 'id' | 'createdAt' | 'updatedAt'>> = {
            blank: {
                parentId: null,
                title: 'یادداشت جدید',
                icon: '📝',
                sortOrder: activePages.length,
                blocks: [{ id: `b_${Date.now()}`, type: 'text', content: '' }],
                stylusStrokes: [],
            },
            project: {
                parentId: null,
                title: 'برنامه پروژه و اهداف',
                icon: '💼',
                sortOrder: activePages.length,
                blocks: [
                    { id: `b_${Date.now()}_1`, type: 'heading2', content: 'اهداف کلیدی و مراحل اجرا' },
                    { id: `b_${Date.now()}_2`, type: 'checklist', content: 'تعیین اولین قدم عملی', checked: false },
                ],
                stylusStrokes: [],
            },
            study: {
                parentId: null,
                title: 'جزوه و فرمول‌ها',
                icon: '📘',
                sortOrder: activePages.length,
                blocks: [
                    { id: `b_${Date.now()}_1`, type: 'heading2', content: 'خلاصه و نکات کلیدی' },
                    { id: `b_${Date.now()}_2`, type: 'math', content: 'E = mc^2' },
                ],
                stylusStrokes: [],
            },
        };
        const created = createNotebookPage(templates[kind]);
        setSelectedPageId(created.id);
        setEditorTab('blocks');
    };

    const currentPage: NotebookPage | undefined = useMemo(
        () => activePages.find((p) => p.id === selectedPageId) || activePages[0],
        [activePages, selectedPageId]
    );

    const childrenByParent = useMemo(() => {
        const map = new Map<string | null, NotebookPage[]>();
        const filtered = searchQuery.trim()
            ? activePages.filter(
                  (p) =>
                      p.title.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
                      p.blocks.some((b) => b.content.toLowerCase().includes(searchQuery.trim().toLowerCase()))
              )
            : activePages;

        filtered.forEach((p) => {
            const pid = searchQuery.trim() ? null : p.parentId || null;
            const arr = map.get(pid) || [];
            arr.push(p);
            map.set(pid, arr);
        });
        map.forEach((arr) => arr.sort((a, b) => a.sortOrder - b.sortOrder));
        return map;
    }, [activePages, searchQuery]);

    const handleCreatePage = (parentId: string | null) => {
        const siblingCount = activePages.filter((p) => (p.parentId || null) === parentId).length;
        const created = createNotebookPage({
            parentId,
            title: parentId ? 'زیرصفحه جدید' : 'صفحه جدید',
            icon: parentId ? '📝' : '📘',
            sortOrder: siblingCount,
            blocks: [{ id: `b_${Date.now()}`, type: 'text', content: '' }],
            stylusStrokes: [],
        });
        if (parentId) {
            setCollapsedIds((prev) => ({ ...prev, [parentId]: false }));
        }
        setSelectedPageId(created.id);
        setEditorTab('blocks');
    };

    const handleDeletePage = (page: NotebookPage) => {
        deleteNotebookPage(page.id);
        if (currentPage?.id === page.id) {
            const remaining = activePages.filter((p) => p.id !== page.id);
            setSelectedPageId(remaining[0]?.id || null);
        }
        showToast('صفحه حذف شد.', 'info');
    };

    const handleBlocksChange = (blocks: BlockNote[]) => {
        if (!currentPage) return;
        updateNotebookPage(currentPage.id, { blocks });
    };

    const handlePageStrokesChange = (strokes: StylusStroke[]) => {
        if (!currentPage) return;
        updateNotebookPage(currentPage.id, { stylusStrokes: strokes });
    };

    const renderTreeNodes = (parentId: string | null, depth = 0): React.ReactNode => {
        const nodes = childrenByParent.get(parentId) || [];
        return nodes.map((node) => {
            const children = childrenByParent.get(node.id) || [];
            const hasChildren = children.length > 0;
            const isCollapsed = !!collapsedIds[node.id];
            const isSelected = currentPage?.id === node.id && editorTab !== 'global_board';

            return (
                <div key={node.id}>
                    <div
                        style={{ paddingRight: `${depth * 14 + 8}px` }}
                        onClick={() => {
                            setSelectedPageId(node.id);
                            if (editorTab === 'global_board') setEditorTab('blocks');
                        }}
                        className={`group flex items-center justify-between py-2 pl-2 rounded-xl cursor-pointer transition-all text-xs ${
                            isSelected
                                ? 'bg-indigo-600 text-white font-black shadow-sm'
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold'
                        }`}
                    >
                        <div className="flex items-center gap-1.5 min-w-0">
                            {hasChildren ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCollapsedIds((prev) => ({ ...prev, [node.id]: !prev[node.id] }));
                                    }}
                                    className="p-0.5 rounded hover:bg-black/10"
                                >
                                    {isCollapsed ? <ChevronLeft size={13} /> : <ChevronDown size={13} />}
                                </button>
                            ) : (
                                <span className="w-4 inline-block" />
                            )}
                            <span className="text-sm">{node.icon || '📄'}</span>
                            <span className="truncate">{node.title || 'بدون عنوان'}</span>
                        </div>

                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCreatePage(node.id);
                                }}
                                title="افزودن زیرصفحه"
                                className={`p-1 rounded-lg ${isSelected ? 'hover:bg-white/20' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            >
                                <FolderPlus size={12} />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePage(node);
                                }}
                                title="حذف صفحه"
                                className={`p-1 rounded-lg ${isSelected ? 'hover:bg-white/20' : 'hover:bg-rose-50 text-rose-500'}`}
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                    {hasChildren && !isCollapsed && renderTreeNodes(node.id, depth + 1)}
                </div>
            );
        });
    };

    return (
        <div className="p-4 md:p-6 pb-32 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
                        <BookOpenCheck size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white">
                            دفترچه هوشمند و تخته قلم
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            ساختار درختی نوشن برای کار، زندگی و یادگیری + فرمول‌نویسی + تبدیل به کارت مرور + تخته قلم
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setEditorTab('global_board')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition ${
                            editorTab === 'global_board'
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
                        }`}
                    >
                        <PenTool size={14} /> تخته سفید عمومی
                    </button>
                    <button
                        type="button"
                        onClick={() => handleCreatePage(null)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm transition"
                    >
                        <Plus size={15} /> صفحه جدید
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Tree Sidebar */}
                <aside className="lg:col-span-4 xl:col-span-3 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-3.5 shadow-sm h-fit">
                    <div className="relative mb-3">
                        <Search size={14} className="absolute right-3 top-2.5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="جستجو در صفحات و نکات..."
                            className="w-full pr-9 pl-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:border-indigo-500 text-gray-700 dark:text-gray-200"
                        />
                    </div>

                    <div className="space-y-1 max-h-[460px] overflow-y-auto custom-scrollbar">
                        {renderTreeNodes(null)}
                        {activePages.length === 0 && (
                            <p className="text-center text-xs text-gray-400 py-8">هنوز صفحه‌ای ساخته نشده است.</p>
                        )}
                    </div>
                </aside>

                {/* Main Editor Area */}
                <main className="lg:col-span-8 xl:col-span-9">
                    {editorTab === 'global_board' ? (
                        <div className="space-y-3">
                            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-2xl px-4 py-2.5 text-xs font-bold text-purple-800 dark:text-purple-200">
                                تخته سفید عمومی (ذخیره خودکار برای حل سریع مسائل، رسم نمودار و چرک‌نویس بین صفحات)
                            </div>
                            <StylusCanvas strokes={stylusStrokes} onChange={setStylusStrokes} height={540} />
                        </div>
                    ) : currentPage ? (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 md:p-7 space-y-5">
                            {/* Page header: icon + title + mode tabs */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowIconPicker(!showIconPicker)}
                                            className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-2xl flex items-center justify-center hover:scale-105 transition"
                                        >
                                            {currentPage.icon || '📄'}
                                        </button>
                                        {showIconPicker && (
                                            <div className="absolute right-0 top-14 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-2 shadow-xl grid grid-cols-5 gap-1 w-44">
                                                {PAGE_ICONS.map((ic) => (
                                                    <button
                                                        key={ic}
                                                        type="button"
                                                        onClick={() => {
                                                            updateNotebookPage(currentPage.id, { icon: ic });
                                                            setShowIconPicker(false);
                                                        }}
                                                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-lg"
                                                    >
                                                        {ic}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        value={currentPage.title}
                                        onChange={(e) => updateNotebookPage(currentPage.id, { title: e.target.value })}
                                        placeholder="عنوان صفحه..."
                                        className="flex-1 text-xl md:text-2xl font-black bg-transparent border-none outline-none text-gray-800 dark:text-white"
                                    />
                                </div>

                                <div className="flex items-center bg-gray-100 dark:bg-gray-900 rounded-xl p-1 gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setEditorTab('blocks')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                            editorTab === 'blocks'
                                                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                                                : 'text-gray-500'
                                        }`}
                                    >
                                        <FileText size={14} /> یادداشت بلوکی
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditorTab('canvas')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                            editorTab === 'canvas'
                                                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                                                : 'text-gray-500'
                                        }`}
                                    >
                                        <PenTool size={14} /> قلم و طراحی ({currentPage.stylusStrokes?.length || 0})
                                    </button>
                                </div>
                            </div>

                            {editorTab === 'blocks' ? (
                                <BlockNoteEditor
                                    blocks={currentPage.blocks}
                                    onChange={handleBlocksChange}
                                    onFocusChecklistItem={(text) => {
                                        startFocusForTask({
                                            id: currentPage.id,
                                            dayId: 1,
                                            date: new Date().toISOString().split('T')[0],
                                            subject: subjects[0]?.name || 'عمومی',
                                            topic: text || currentPage.title,
                                            details: 'یادداشت',
                                            isCompleted: false,
                                        });
                                    }}
                                    onCreateFlashcard={(question, answer) => {
                                        addFlashcard({
                                            question,
                                            answer: answer || currentPage.title,
                                            subject: subjects[0]?.name || 'عمومی',
                                            topic: currentPage.title,
                                        });
                                        showToast('فلش‌کارت به جعبه لایتنر اضافه شد!', 'success');
                                    }}
                                />
                            ) : (
                                <StylusCanvas
                                    strokes={currentPage.stylusStrokes || []}
                                    onChange={handlePageStrokesChange}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-10 text-center space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-300 font-black">دفترچه شما آماده ثبت ایده‌ها، پروژه‌ها و یادداشت‌هاست</p>
                            <p className="text-xs text-gray-400 max-w-md mx-auto">یک صفحه خالی بسازید یا از الگوهای آماده زیر برای شروع سریع استفاده کنید:</p>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleCreateFromStarter('blank')}
                                    className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition"
                                >
                                    📝 یادداشت آزاد جدید
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleCreateFromStarter('project')}
                                    className="px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 text-xs font-black transition"
                                >
                                    💼 الگوی پروژه و کارها
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleCreateFromStarter('study')}
                                    className="px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 text-xs font-black transition"
                                >
                                    📘 الگوی جزوه و فرمول
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default WorkspaceNotes;
