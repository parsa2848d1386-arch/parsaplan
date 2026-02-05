
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DailyRoutineSlot } from '../types';
import { X, Check, Clock, Trash2, BookOpen, Calculator, FlaskConical, Coffee, Tv, Zap, Dumbbell, Brain, Bed, Music, MonitorPlay } from 'lucide-react';

interface RoutineSlotEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (slot: DailyRoutineSlot) => void;
    onDelete?: (slotId: number) => void;
    editingSlot?: DailyRoutineSlot | null;
    isNewSlot?: boolean;
}

const availableIcons = [
    { name: 'bio', icon: BookOpen, label: 'مطالعه' },
    { name: 'math', icon: Calculator, label: 'محاسباتی' },
    { name: 'science', icon: FlaskConical, label: 'آزمایشگاه' },
    { name: 'rest', icon: Coffee, label: 'استراحت' },
    { name: 'class', icon: Tv, label: 'کلاس' },
    { name: 'test', icon: Zap, label: 'آزمون' },
    { name: 'gym', icon: Dumbbell, label: 'ورزش' },
    { name: 'think', icon: Brain, label: 'تمرکز' },
    { name: 'sleep', icon: Bed, label: 'خواب' },
    { name: 'music', icon: Music, label: 'موسیقی' },
    { name: 'video', icon: MonitorPlay, label: 'ویدیو' },
];

const slotTypes: { value: DailyRoutineSlot['type']; label: string; color: string }[] = [
    { value: 'test', label: 'آزمون', color: 'rose' },
    { value: 'review', label: 'مرور', color: 'amber' },
    { value: 'rest', label: 'استراحت', color: 'emerald' },
    { value: 'class', label: 'کلاس', color: 'sky' },
];

export const RoutineSlotEditor: React.FC<RoutineSlotEditorProps> = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    editingSlot,
    isNewSlot = false
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [time, setTime] = useState('08:00 - 09:30');
    const [icon, setIcon] = useState('bio');
    const [type, setType] = useState<DailyRoutineSlot['type']>('review');

    useEffect(() => {
        if (editingSlot) {
            setTitle(editingSlot.title);
            setDescription(editingSlot.description);
            setTime(editingSlot.time);
            setIcon(editingSlot.icon);
            setType(editingSlot.type);
        } else {
            setTitle('');
            setDescription('');
            setTime('08:00 - 09:30');
            setIcon('bio');
            setType('review');
        }
    }, [editingSlot, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!title.trim()) return;

        onSave({
            id: editingSlot?.id || Date.now(),
            title: title.trim(),
            description: description.trim(),
            time,
            icon,
            type
        });
        onClose();
    };

    const handleDelete = () => {
        if (editingSlot && onDelete) {
            onDelete(editingSlot.id);
            onClose();
        }
    };

    const getIconComponent = (iconName: string) => {
        const found = availableIcons.find(i => i.name === iconName);
        return found ? found.icon : BookOpen;
    };

    const IconComp = getIconComponent(icon);

    return createPortal(
        <div className="fixed inset-0 flex items-end sm:items-center justify-center pointer-events-none" style={{ zIndex: 2147483647 }}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
                onClick={onClose}
            ></div>

            {/* Modal Container */}
            <div className="relative pointer-events-auto w-full max-w-md mx-4 sm:mx-auto mb-24 sm:mb-0 bg-white dark:bg-gray-800 rounded-3xl sm:rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-white/20 dark:border-gray-700/50 flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-xl">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                        {isNewSlot ? 'افزودن اسلات جدید' : 'ویرایش اسلات'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto max-h-[85vh] custom-scrollbar">
                    {/* Title */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">عنوان</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="مثال: مرور زیست"
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition text-gray-800 dark:text-white"
                            dir="rtl"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">توضیحات</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="توضیحات این بخش..."
                            rows={2}
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition text-gray-800 dark:text-white resize-none"
                            dir="rtl"
                        />
                    </div>

                    {/* Time */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                            <Clock size={14} />
                            زمان
                        </label>
                        <input
                            type="text"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            placeholder="08:00 - 09:30"
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition text-gray-800 dark:text-white font-mono"
                            dir="ltr"
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">نوع</label>
                        <div className="flex flex-wrap gap-2">
                            {slotTypes.map((t) => (
                                <button
                                    key={t.value}
                                    onClick={() => setType(t.value)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${type === t.value
                                        ? `bg-${t.color}-100 dark:bg-${t.color}-900/30 text-${t.color}-700 dark:text-${t.color}-300 border-${t.color}-300 dark:border-${t.color}-700`
                                        : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Icon */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">آیکون</label>
                        <div className="flex flex-wrap gap-2">
                            {availableIcons.map((ic) => (
                                <button
                                    key={ic.name}
                                    onClick={() => setIcon(ic.name)}
                                    className={`p-3 rounded-xl border transition-all ${icon === ic.name
                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700'
                                        : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                        }`}
                                    title={ic.label}
                                >
                                    <ic.icon size={20} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">پیش‌نمایش:</p>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type === 'test' ? 'bg-rose-100 text-rose-600' :
                                type === 'review' ? 'bg-amber-100 text-amber-600' :
                                    type === 'rest' ? 'bg-emerald-100 text-emerald-600' :
                                        'bg-sky-100 text-sky-600'
                                }`}>
                                <IconComp size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-gray-800 dark:text-white">{title || 'عنوان'}</p>
                                <p className="text-xs text-gray-500 font-mono">{time}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                    {!isNewSlot && onDelete && (
                        <button
                            onClick={handleDelete}
                            className="p-3 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                        انصراف
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!title.trim()}
                        className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Check size={18} />
                        ذخیره
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default RoutineSlotEditor;
