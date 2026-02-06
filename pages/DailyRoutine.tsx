
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { DAILY_ROUTINE } from '../constants';
import { Clock, Check, LayoutTemplate, Coffee, BookOpen, Calculator, FlaskConical, Tv, Zap, Dumbbell, Brain, Bed, Music, MonitorPlay, Pencil, Plus, Settings, GripVertical } from 'lucide-react';
import { DailyRoutineSlot } from '../types';
import { RoutineSlotEditor } from '../components/RoutineSlotEditor';

const DailyRoutinePage = () => {
    const {
        currentDay, isRoutineSlotCompleted, toggleRoutineSlot, routineTemplate, setRoutineTemplate,
        updateRoutineIcon, resetRoutineToDefault, addRoutineSlot, updateRoutineSlot, deleteRoutineSlot
    } = useStore();
    const [pickingIconFor, setPickingIconFor] = useState<number | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState<DailyRoutineSlot | null>(null);
    const [isNewSlot, setIsNewSlot] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Drag and Drop state
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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

    const getIconComponent = (iconName: string) => {
        const found = availableIcons.find(i => i.name === iconName);
        return found ? found.icon : BookOpen;
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'test': return 'bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800';
            case 'review': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
            case 'rest': return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
            case 'class': return 'bg-sky-50 dark:bg-sky-900/20 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800';
            default: return 'bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600';
        }
    }

    const applyTemplate = (templateName: string) => {
        if (templateName === 'exam') {
            const examTemplate: DailyRoutineSlot[] = DAILY_ROUTINE.map(s => ({ ...s, time: '08:00 - 12:00', title: 'آزمون جامع', type: 'test' as const, icon: 'test' })).slice(0, 3);
            setRoutineTemplate(examTemplate);
        } else if (templateName === 'holiday') {
            const holidayTemplate: DailyRoutineSlot[] = DAILY_ROUTINE.map(s => ({ ...s, time: '10:00 - 12:00', icon: 'rest' }));
            setRoutineTemplate(holidayTemplate);
        } else {
            resetRoutineToDefault();
        }
        setIsDropdownOpen(false);
    }

    const handleIconSelect = (iconName: string) => {
        if (pickingIconFor !== null) {
            updateRoutineIcon(pickingIconFor, iconName);
            setPickingIconFor(null);
        }
    }

    const openAddSlot = () => {
        setEditingSlot(null);
        setIsNewSlot(true);
        setIsEditorOpen(true);
    };

    const openEditSlot = (slot: DailyRoutineSlot) => {
        setEditingSlot(slot);
        setIsNewSlot(false);
        setIsEditorOpen(true);
    };

    const handleSaveSlot = (slot: DailyRoutineSlot) => {
        if (isNewSlot) {
            addRoutineSlot(slot);
        } else {
            updateRoutineSlot(slot);
        }
    };

    // Drag & Drop handlers
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        // Reorder the template
        const newTemplate = [...routineTemplate];
        const [draggedItem] = newTemplate.splice(draggedIndex, 1);
        newTemplate.splice(index, 0, draggedItem);
        setRoutineTemplate(newTemplate);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    return (
        <>
            <div className="p-5 pb-32 animate-in fade-in duration-300">
                {/* RoutineSlotEditor moved to bottom */}

                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-200 dark:shadow-none shrink-0">
                            <Clock className="text-white" size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">برنامه روتین</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">الگوی زمانی تکرارشونده و منظم شما</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {/* Edit Mode Toggle */}
                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`h-9 whitespace-nowrap text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1 shadow-sm active:scale-95 transition ${isEditMode
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            <Settings size={14} />
                            ویرایش
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="h-9 whitespace-nowrap text-xs font-bold px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-1 shadow-sm active:scale-95 transition"
                            >
                                <LayoutTemplate size={14} />
                                الگو
                            </button>

                            {isDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
                                    <div className="absolute left-0 top-full mt-2 w-32 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 overflow-hidden animate-in fade-in zoom-in duration-200">
                                        <button onClick={() => applyTemplate('default')} className="w-full text-right px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200">پیش‌فرض</button>
                                        <button onClick={() => applyTemplate('exam')} className="w-full text-right px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200">روز آزمون</button>
                                        <button onClick={() => applyTemplate('holiday')} className="w-full text-right px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200">روز تعطیل</button>
                                    </div>
                                </>
                            )}
                        </div>
                        <span className="h-9 whitespace-nowrap flex items-center text-xs font-bold px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800">روز {currentDay}</span>
                    </div>
                </div>

                <div className="space-y-6 relative isolate">
                    {/* Vertical Line */}
                    <div className="absolute top-4 bottom-4 right-[23px] w-0.5 bg-gray-200 dark:bg-gray-700 -z-10"></div>

                    {routineTemplate.map((slot, index) => {
                        const isCompleted = isRoutineSlotCompleted(currentDay, slot.id);
                        const colorStyle = getColor(slot.type);
                        const IconComp = getIconComponent(slot.icon);

                        return (
                            <div
                                key={slot.id}
                                className={`group relative flex gap-4 ${isEditMode && draggedIndex === index ? 'opacity-50' : ''}`}
                                draggable={isEditMode}
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                            >
                                {/* Drag Handle (only in edit mode) */}
                                {isEditMode && (
                                    <div className="absolute -right-6 top-4 cursor-grab active:cursor-grabbing text-gray-400 hover:text-indigo-500">
                                        <GripVertical size={18} />
                                    </div>
                                )}
                                {/* Time Indicator & Checkbox */}
                                <div className="flex flex-col items-center flex-shrink-0">
                                    <button
                                        onClick={() => toggleRoutineSlot(currentDay, slot.id)}
                                        className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center cursor-pointer transition-all duration-300 shadow-sm z-10 ${isCompleted ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-200 dark:shadow-none scale-95' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-400 hover:border-indigo-400 hover:text-indigo-500'}`}
                                    >
                                        {isCompleted ? <Check size={24} strokeWidth={3} /> : <span className="text-sm font-black">{index + 1}</span>}
                                    </button>
                                </div>

                                {/* Card */}
                                <div
                                    onClick={() => isEditMode && openEditSlot(slot)}
                                    className={`flex-1 rounded-2xl p-4 border shadow-sm transition-all duration-300 relative ${colorStyle} ${isCompleted ? 'opacity-60 grayscale-[0.5]' : 'hover:shadow-md'} ${isEditMode ? 'cursor-pointer ring-2 ring-indigo-200 dark:ring-indigo-800 ring-offset-2' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-base">{slot.title}</h3>
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold bg-white/60 dark:bg-black/20 px-2 py-1 rounded-lg backdrop-blur-sm shadow-sm">
                                            <Clock size={12} strokeWidth={2.5} />
                                            {slot.time}
                                        </div>
                                    </div>
                                    <p className="text-xs font-medium opacity-90 leading-5">
                                        {slot.description}
                                    </p>

                                    {/* Edit button in edit mode */}
                                    {isEditMode && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openEditSlot(slot); }}
                                            className="absolute left-4 bottom-4 p-2 rounded-full bg-white dark:bg-gray-700 shadow-lg border border-gray-200 dark:border-gray-600 text-indigo-600 dark:text-indigo-400 hover:scale-110 transition"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                    )}

                                    {/* Icon Customization Trigger (only in non-edit mode) */}
                                    {!isEditMode && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setPickingIconFor(pickingIconFor === slot.id ? null : slot.id); }}
                                            className="absolute left-4 bottom-4 p-1.5 rounded-full bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 transition text-current opacity-50 hover:opacity-100"
                                            title="تغییر آیکون"
                                        >
                                            <IconComp size={16} />
                                        </button>
                                    )}

                                    {/* Icon Picker Popup */}
                                    {pickingIconFor === slot.id && (
                                        <div className="absolute left-0 top-full mt-2 z-20 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-wrap gap-1 w-48 animate-in fade-in zoom-in duration-200">
                                            {availableIcons.map((ic) => (
                                                <button
                                                    key={ic.name}
                                                    onClick={() => handleIconSelect(ic.name)}
                                                    className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 ${slot.icon === ic.name ? 'bg-indigo-50 text-indigo-600' : ''}`}
                                                    title={ic.label}
                                                >
                                                    <ic.icon size={18} />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Add New Slot Button (only in edit mode) */}
                    {isEditMode && (
                        <button
                            onClick={openAddSlot}
                            className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition flex items-center justify-center gap-2 font-bold"
                        >
                            <Plus size={20} />
                            افزودن اسلات جدید
                        </button>
                    )}
                </div>

            </div>

            {/* Modals */}
            <RoutineSlotEditor
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                onSave={handleSaveSlot}
                onDelete={deleteRoutineSlot}
                editingSlot={editingSlot}
                isNewSlot={isNewSlot}
            />

            {pickingIconFor !== null && (
                <div className="fixed inset-0 z-10" onClick={() => setPickingIconFor(null)}></div>
            )}
        </>
    );
};

export default DailyRoutinePage;
