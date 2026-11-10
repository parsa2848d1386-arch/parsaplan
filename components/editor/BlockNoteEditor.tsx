import React, { useState } from 'react';
import {
    Type,
    Heading1,
    Heading2,
    Heading3,
    CheckSquare,
    Square,
    AlertCircle,
    Code,
    Quote,
    Minus,
    ChevronRight,
    ChevronDown,
    Plus,
    Trash2,
    Sigma,
    Play,
    BrainCircuit,
} from 'lucide-react';
import { BlockNote, BlockType } from '../../types';
import { MathRenderer } from './MathRenderer';

interface BlockNoteEditorProps {
    blocks: BlockNote[];
    onChange: (blocks: BlockNote[]) => void;
    onFocusChecklistItem?: (text: string) => void;
    onCreateFlashcard?: (front: string, back: string) => void;
    compact?: boolean;
}

const SLASH_OPTIONS: { type: BlockType; label: string; hint: string; icon: React.ElementType }[] = [
    { type: 'text', label: 'متن ساده', hint: 'پاراگراف معمولی', icon: Type },
    { type: 'heading1', label: 'تیتر بزرگ (H1)', hint: 'سرفصل اصلی', icon: Heading1 },
    { type: 'heading2', label: 'تیتر متوسط (H2)', hint: 'زیربخش', icon: Heading2 },
    { type: 'heading3', label: 'تیتر کوچک (H3)', hint: 'نکته فرعی', icon: Heading3 },
    { type: 'checklist', label: 'چک‌لیست (To-Do)', hint: 'قابل تیک زدن و تمرکز', icon: CheckSquare },
    { type: 'toggle', label: 'بخش جمع‌شونده (Toggle)', hint: 'سوال و پاسخ مخفی', icon: ChevronDown },
    { type: 'callout', label: 'کادر نکته (Callout)', hint: 'نکته کلیدی یا یادآوری مهم', icon: AlertCircle },
    { type: 'math', label: 'فرمول ریاضی / فیزیک', hint: 'LaTeX مثل \\frac{a}{b}', icon: Sigma },
    { type: 'code', label: 'بلوک کد / شبه‌کد', hint: 'متن تک‌عرضی', icon: Code },
    { type: 'quote', label: 'نقل‌قول / تعریف کتاب', hint: 'متن نقل شده', icon: Quote },
    { type: 'divider', label: 'خط جداکننده', hint: 'فاصله بصری', icon: Minus },
];

export const BlockNoteEditor: React.FC<BlockNoteEditorProps> = ({
    blocks,
    onChange,
    onFocusChecklistItem,
    onCreateFlashcard,
    compact = false,
}) => {
    const [slashBlockId, setSlashBlockId] = useState<string | null>(null);
    const [slashFilter, setSlashFilter] = useState('');

    const createBlock = (type: BlockType = 'text', content = ''): BlockNote => ({
        id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type,
        content,
        checked: false,
        collapsed: false,
    });

    const addBlockAt = (afterIndex: number, type: BlockType = 'text') => {
        const next = [...blocks];
        next.splice(afterIndex + 1, 0, createBlock(type));
        onChange(next);
    };

    const updateBlock = (id: string, patch: Partial<BlockNote>) => {
        onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    };

    const deleteBlock = (id: string) => {
        onChange(blocks.filter((b) => b.id !== id));
    };

    const convertBlock = (id: string, type: BlockType) => {
        onChange(
            blocks.map((b) =>
                b.id === id
                    ? {
                          ...b,
                          type,
                          content: b.content.startsWith('/') ? '' : b.content,
                      }
                    : b
            )
        );
        setSlashBlockId(null);
        setSlashFilter('');
    };

    const handleContentChange = (block: BlockNote, value: string) => {
        if (value.startsWith('/')) {
            setSlashBlockId(block.id);
            setSlashFilter(value.slice(1).toLowerCase());
        } else if (slashBlockId === block.id) {
            setSlashBlockId(null);
            setSlashFilter('');
        }
        updateBlock(block.id, { content: value });
    };

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
        block: BlockNote,
        index: number
    ) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (e.key === 'Enter' && !e.shiftKey && block.type !== 'code') {
            e.preventDefault();
            if (slashBlockId === block.id) {
                const matched = filteredSlashOptions[0];
                if (matched) {
                    convertBlock(block.id, matched.type);
                    return;
                }
            }
            addBlockAt(index, block.type === 'checklist' ? 'checklist' : 'text');
        } else if (e.key === 'Backspace' && block.content === '' && blocks.length > 0) {
            e.preventDefault();
            if (block.type !== 'text') {
                convertBlock(block.id, 'text');
            } else {
                deleteBlock(block.id);
            }
        } else if (e.key === 'Escape' && slashBlockId) {
            setSlashBlockId(null);
        }
    };

    const filteredSlashOptions = SLASH_OPTIONS.filter(
        (opt) =>
            !slashFilter ||
            opt.label.toLowerCase().includes(slashFilter) ||
            opt.type.toLowerCase().includes(slashFilter)
    );

    return (
        <div className="space-y-1.5 text-right" dir="rtl">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                    یادداشت بلوکی (برای منو <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-indigo-500">/</code> بزنید)
                </span>
                <div className="flex items-center gap-1">
                    {!compact && (
                        <button
                            type="button"
                            onClick={() => onChange([...blocks, createBlock('math', '\\Delta x = \\frac{1}{2}at^2 + v_0t')])}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-1 transition"
                        >
                            <Sigma size={12} /> فرمول
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => onChange([...blocks, createBlock('checklist')])}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-1 transition"
                    >
                        <CheckSquare size={12} /> چک‌لیست
                    </button>
                    <button
                        type="button"
                        onClick={() => onChange([...blocks, createBlock('text')])}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-1 transition"
                    >
                        <Plus size={12} /> بلوک جدید
                    </button>
                </div>
            </div>

            {blocks.length === 0 ? (
                <button
                    type="button"
                    onClick={() => onChange([createBlock('text')])}
                    className="w-full py-6 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-xs text-gray-400 hover:text-indigo-500 hover:border-indigo-300 dark:hover:border-indigo-700 transition flex flex-col items-center gap-1.5"
                >
                    <Plus size={18} />
                    <span>کلیک کنید یا / بزنید تا یادداشت‌برداری بلوکی شروع شود</span>
                </button>
            ) : (
                blocks.map((block, idx) => (
                    <div key={block.id} className="group relative flex items-start gap-1.5 py-0.5">
                        {/* Block Actions */}
                        <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex items-center gap-0.5 pt-1.5 transition shrink-0">
                            {onCreateFlashcard && block.content.trim().length > 2 && block.type !== 'divider' && (
                                <button
                                    type="button"
                                    onClick={() => onCreateFlashcard(block.content, block.children?.[0]?.content || 'مرور نکته بلوکی')}
                                    title="تبدیل به فلش‌کارت لایتنر"
                                    className="p-1 rounded hover:bg-orange-50 dark:hover:bg-orange-950/30 text-gray-400 hover:text-orange-500 transition"
                                >
                                    <BrainCircuit size={12} />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => deleteBlock(block.id)}
                                title="حذف بلوک"
                                className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 text-gray-400 hover:text-rose-500 transition"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>

                        {/* Block Body */}
                        <div className="flex-1 min-w-0 relative">
                            {block.type === 'divider' && <hr className="my-3 border-gray-200 dark:border-gray-700" />}

                            {block.type === 'heading1' && (
                                <input
                                    type="text"
                                    value={block.content}
                                    onChange={(e) => handleContentChange(block, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, block, idx)}
                                    placeholder="تیتر اصلی..."
                                    className="w-full bg-transparent text-lg font-black text-gray-800 dark:text-white outline-none py-1 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                                />
                            )}

                            {block.type === 'heading2' && (
                                <input
                                    type="text"
                                    value={block.content}
                                    onChange={(e) => handleContentChange(block, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, block, idx)}
                                    placeholder="تیتر دوم..."
                                    className="w-full bg-transparent text-base font-extrabold text-gray-800 dark:text-gray-100 outline-none py-1 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                                />
                            )}

                            {block.type === 'heading3' && (
                                <input
                                    type="text"
                                    value={block.content}
                                    onChange={(e) => handleContentChange(block, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, block, idx)}
                                    placeholder="تیتر سوم..."
                                    className="w-full bg-transparent text-sm font-bold text-indigo-600 dark:text-indigo-400 outline-none py-0.5 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                                />
                            )}

                            {block.type === 'text' && (
                                <input
                                    type="text"
                                    value={block.content}
                                    onChange={(e) => handleContentChange(block, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, block, idx)}
                                    placeholder="بنویسید یا / بزنید..."
                                    className="w-full bg-transparent text-xs md:text-sm text-gray-700 dark:text-gray-200 outline-none py-1 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                                />
                            )}

                            {block.type === 'checklist' && (
                                <div className="flex items-center gap-2 py-0.5">
                                    <button
                                        type="button"
                                        onClick={() => updateBlock(block.id, { checked: !block.checked })}
                                        className={`shrink-0 transition ${block.checked ? 'text-emerald-500' : 'text-gray-400 hover:text-indigo-500'}`}
                                    >
                                        {block.checked ? <CheckSquare size={16} /> : <Square size={16} />}
                                    </button>
                                    <input
                                        type="text"
                                        value={block.content}
                                        onChange={(e) => handleContentChange(block, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, block, idx)}
                                        placeholder="مورد چک‌لیست..."
                                        className={`flex-1 bg-transparent text-xs md:text-sm outline-none ${
                                            block.checked
                                                ? 'line-through text-gray-400'
                                                : 'text-gray-700 dark:text-gray-200'
                                        }`}
                                    />
                                    {onFocusChecklistItem && block.content.trim() && (
                                        <button
                                            type="button"
                                            onClick={() => onFocusChecklistItem(block.content)}
                                            title="تمرکز روی همین مورد"
                                            className="opacity-0 group-hover:opacity-100 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1 transition"
                                        >
                                            <Play size={10} /> تمرکز
                                        </button>
                                    )}
                                </div>
                            )}

                            {block.type === 'callout' && (
                                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40">
                                    <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                    <textarea
                                        rows={2}
                                        value={block.content}
                                        onChange={(e) => handleContentChange(block, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, block, idx)}
                                        placeholder="نکته مهم، ایده کلیدی یا یادآوری..."
                                        className="flex-1 bg-transparent text-xs md:text-sm text-amber-900 dark:text-amber-200 outline-none resize-none"
                                    />
                                </div>
                            )}

                            {block.type === 'quote' && (
                                <div className="border-r-4 border-indigo-500 pr-3 py-1 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-l-xl">
                                    <input
                                        type="text"
                                        value={block.content}
                                        onChange={(e) => handleContentChange(block, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, block, idx)}
                                        placeholder="متن کتاب درسی یا نقل‌قول..."
                                        className="w-full bg-transparent text-xs md:text-sm italic text-gray-600 dark:text-gray-300 outline-none"
                                    />
                                </div>
                            )}

                            {block.type === 'code' && (
                                <textarea
                                    rows={3}
                                    value={block.content}
                                    onChange={(e) => handleContentChange(block, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, block, idx)}
                                    placeholder="// کد یا ساختار..."
                                    dir="ltr"
                                    className="w-full p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-xs outline-none border border-slate-700"
                                />
                            )}

                            {block.type === 'math' && (
                                <div className="space-y-1.5 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700">
                                    <input
                                        type="text"
                                        dir="ltr"
                                        value={block.content}
                                        onChange={(e) => handleContentChange(block, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, block, idx)}
                                        placeholder="\frac{a}{b} + \sqrt{x^2 + y^2}"
                                        className="w-full bg-transparent text-xs font-mono text-gray-600 dark:text-gray-300 outline-none"
                                    />
                                    <MathRenderer expression={block.content} />
                                </div>
                            )}

                            {block.type === 'toggle' && (
                                <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-2 bg-gray-50/50 dark:bg-gray-800/30">
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => updateBlock(block.id, { collapsed: !block.collapsed })}
                                            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
                                        >
                                            {block.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                        <input
                                            type="text"
                                            value={block.content}
                                            onChange={(e) => handleContentChange(block, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, block, idx)}
                                            placeholder="عنوان سوال یا بخش جمع‌شونده..."
                                            className="flex-1 bg-transparent text-xs md:text-sm font-bold text-gray-700 dark:text-gray-200 outline-none"
                                        />
                                    </div>
                                    {!block.collapsed && (
                                        <textarea
                                            rows={2}
                                            value={block.children?.[0]?.content || ''}
                                            onChange={(e) =>
                                                updateBlock(block.id, {
                                                    children: [{ id: `${block.id}_sub`, type: 'text', content: e.target.value }],
                                                })
                                            }
                                            placeholder="پاسخ یا توضیحات مخفی..."
                                            className="w-full mt-2 mr-5 bg-white dark:bg-gray-900/60 rounded-lg p-2 text-xs text-gray-600 dark:text-gray-300 outline-none border border-gray-100 dark:border-gray-700/60"
                                        />
                                    )}
                                </div>
                            )}

                            {/* Slash Menu Popover */}
                            {slashBlockId === block.id && (
                                <div className="absolute right-0 top-full mt-1 z-50 w-64 max-h-60 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-1.5 space-y-0.5 custom-scrollbar">
                                    {filteredSlashOptions.map((opt) => {
                                        const Icon = opt.icon;
                                        return (
                                            <button
                                                key={opt.type}
                                                type="button"
                                                onClick={() => convertBlock(block.id, opt.type)}
                                                className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-right transition"
                                            >
                                                <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-indigo-500 shrink-0">
                                                    <Icon size={14} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-gray-800 dark:text-white truncate">{opt.label}</div>
                                                    <div className="text-[10px] text-gray-400 truncate">{opt.hint}</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};
