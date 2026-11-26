import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
    Subject,
    SubjectTask,
    SUBJECT_ICONS,
    StudyType,
    SubTask,
    SUBJECT_LISTS,
    TaskPriority,
    BlockNote,
    getSubjectStyle,
} from '../types';
import { toIsoString, formatToPersianDigits, minutesToTime, timeToMinutes } from '../utils';
import {
    clearSessionDraft,
    loadSessionDraft,
    normalizePersianDigits,
    parseLocalizedInt,
    saveSessionDraft,
    validateTaskDraft,
    TaskValidationResult,
} from '../utils/formHelpers';
import { haptics } from '../utils/haptics';
import {
    EXAGGERATED_SHAKE_KEYFRAMES,
    SQUASH_STRETCH_KEYFRAMES,
    TRANSITION_SHAKE,
    TRANSITION_SQUASH,
} from '../utils/motionPresets';
import { useStore } from '../context/StoreContext';
import { useUI } from '../context/UIContext';
import { BlockNoteEditor } from './editor/BlockNoteEditor';
import { ModalSheet } from './ui/ModalSheet';
import {
    X,
    Clock,
    Star,
    Target,
    Calendar,
    CheckCircle2,
    Tag,
    CalendarClock,
    LayoutGrid,
    List,
    Beaker,
    BookOpen,
    Search,
    GraduationCap,
    FileText,
    Flag,
    Briefcase,
    HeartPulse,
    Users,
    Sparkles,
    CheckSquare,
    Repeat,
    AlertCircle,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Partial<SubjectTask>) => void;
    initialData?: SubjectTask | null;
    currentDayId: number;
    defaultDateStr?: string;
}

const DRAFT_STORAGE_KEY = 'parsaplan_draft_new_task_v1';

const UNIVERSAL_TYPES: { id: StudyType; label: string; icon: React.ElementType }[] = [
    { id: 'task', label: 'کار / تسک', icon: CheckSquare },
    { id: 'project', label: 'پروژه', icon: Briefcase },
    { id: 'habit', label: 'عادت / روتین', icon: Repeat },
    { id: 'health', label: 'ورزش / سلامت', icon: HeartPulse },
    { id: 'meeting', label: 'جلسه / قرار', icon: Users },
    { id: 'creative', label: 'ایده / محتوا', icon: Sparkles },
    { id: 'study', label: 'مطالعه / یادگیری', icon: BookOpen },
    { id: 'review', label: 'مرور و جمع‌بندی', icon: CalendarClock },
];

const ACADEMIC_TYPES: { id: StudyType; label: string; icon: React.ElementType }[] = [
    { id: 'test_educational', label: 'تست آموزشی', icon: Beaker },
    { id: 'test_speed', label: 'تست سرعتی', icon: Clock },
    { id: 'exam', label: 'آزمون', icon: GraduationCap },
    { id: 'analysis', label: 'تحلیل آزمون', icon: Search },
];

const ALL_ACTIVITY_TYPES = [...UNIVERSAL_TYPES, ...ACADEMIC_TYPES];

const PRIMARY_GENERAL_TYPES: StudyType[] = ['task', 'project', 'habit', 'study'];
const PRIMARY_ACADEMIC_TYPES: StudyType[] = ['study', 'test_educational', 'exam', 'review'];

const computeSmartTaskDefaults = ({
    tasks,
    targetDate,
    isAcademicStream,
    allowedSubjects,
    fallbackCategory,
}: {
    tasks: SubjectTask[];
    targetDate: string;
    isAcademicStream: boolean;
    allowedSubjects: string[];
    fallbackCategory: string;
}) => {
    const safeTasks = Array.isArray(tasks) ? tasks : [];

    // 1. Most frequent/recent subject in active stream
    const subjectCounts = new Map<string, number>();
    safeTasks.slice(0, 40).forEach((t) => {
        if (t?.subject && (allowedSubjects.includes(t.subject) || t.subject === fallbackCategory)) {
            subjectCounts.set(t.subject, (subjectCounts.get(t.subject) || 0) + 1);
        }
    });
    let smartSubject = fallbackCategory;
    let bestCount = 0;
    subjectCounts.forEach((count, subj) => {
        if (count > bestCount) {
            bestCount = count;
            smartSubject = subj;
        }
    });

    // 2. Typical duration for that subject or stream
    const matchingSubjectDurations = safeTasks
        .filter((t) => t?.subject === smartSubject && (t.durationMinutes || 0) >= 15)
        .slice(0, 8)
        .map((t) => Number(t.durationMinutes));
    let smartDuration = isAcademicStream ? 45 : 60;
    if (matchingSubjectDurations.length > 0) {
        const avg = matchingSubjectDurations.reduce((a, b) => a + b, 0) / matchingSubjectDurations.length;
        smartDuration = Math.max(25, Math.min(120, Math.round(avg / 5) * 5));
    }

    // 3. Next available startTime block on targetDate
    const sameDayWithTime = safeTasks.filter((t) => t?.date === targetDate && Boolean(t.startTime));
    let smartStartTime: string | undefined;
    if (sameDayWithTime.length > 0) {
        let maxEndMin = 0;
        sameDayWithTime.forEach((t) => {
            const startMin = timeToMinutes(t.startTime || '09:00');
            const endMin = startMin + Math.max(15, Number(t.durationMinutes) || 45);
            if (endMin > maxEndMin) maxEndMin = endMin;
        });
        const buffered = Math.ceil((maxEndMin + 15) / 5) * 5;
        if (buffered < 23 * 60) {
            smartStartTime = minutesToTime(buffered);
        }
    } else {
        const todayIso = toIsoString(new Date());
        if (targetDate === todayIso) {
            const now = new Date();
            const nowMin = now.getHours() * 60 + now.getMinutes();
            const nextHalfHour = Math.ceil((nowMin + 10) / 30) * 30;
            if (nextHalfHour >= 7 * 60 && nextHalfHour <= 22 * 60) {
                smartStartTime = minutesToTime(nextHalfHour);
            } else if (nextHalfHour < 7 * 60) {
                smartStartTime = '09:00';
            }
        } else {
            smartStartTime = '09:00';
        }
    }

    return {
        smartSubject,
        smartDuration,
        smartStartTime,
    };
};

const TaskModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialData, currentDayId, defaultDateStr }) => {
    const { totalDays, subjects: customSubjects, settings, addFlashcard, tasks = [] } = useStore();
    const { showToast } = useUI();

    const [formData, setFormData] = useState<Partial<SubjectTask>>({});
    const [tab, setTab] = useState<'info' | 'notes' | 'report'>('info');
    const [tagInput, setTagInput] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [errors, setErrors] = useState<TaskValidationResult['errors']>({});
    const [shakeActive, setShakeActive] = useState(false);
    const [showAllTypes, setShowAllTypes] = useState(false);
    const [showAllSubjects, setShowAllSubjects] = useState(false);
    const [hasSmartPrefill, setHasSmartPrefill] = useState(false);
    const prefersReducedMotion = useReducedMotion();

    // Exam Mode State
    const [selectedExamSubjects, setSelectedExamSubjects] = useState<string[]>([]);
    const [subTaskInputs, setSubTaskInputs] = useState<Record<string, { topic: string; details?: string }>>({});

    const topicInputRef = useRef<HTMLInputElement>(null);
    const shakeTimerRef = useRef<number | null>(null);

    const triggerFormShake = () => {
        setShakeActive(false);
        if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current);
        window.requestAnimationFrame(() => {
            setShakeActive(true);
            shakeTimerRef.current = window.setTimeout(() => setShakeActive(false), 400);
        });
    };

    useEffect(() => {
        if (!isOpen) return;

        setTab('info');
        setErrors({});
        setShowAllTypes(false);
        setShowAllSubjects(false);

        if (initialData) {
            setHasSmartPrefill(false);
            setFormData(initialData);
            if (initialData.isCompleted) setTab('report');

            if ((initialData.studyType === 'exam' || initialData.studyType === 'analysis') && initialData.subTasks) {
                setSelectedExamSubjects(initialData.subTasks.map((s) => s.subject));
                const inputs: Record<string, { topic: string }> = {};
                initialData.subTasks.forEach((s) => {
                    inputs[s.subject] = { topic: s.topic };
                });
                setSubTaskInputs(inputs);
            } else {
                setSelectedExamSubjects([]);
                setSubTaskInputs({});
            }
            return;
        }

        const currentStream = settings?.stream || 'life';
        const isAcademicStream =
            currentStream === 'riazi' || currentStream === 'tajrobi' || currentStream === 'ensani';
        const allowedSubjects = SUBJECT_LISTS[currentStream] || SUBJECT_LISTS['life'];
        const fallbackCategory = customSubjects?.[0]?.name || allowedSubjects[0] || 'شخصی';
        const targetDate = defaultDateStr || toIsoString(new Date());

        const { smartSubject, smartDuration, smartStartTime } = computeSmartTaskDefaults({
            tasks,
            targetDate,
            isAcademicStream,
            allowedSubjects,
            fallbackCategory,
        });

        const defaultDraft: Partial<SubjectTask> = {
            dayId: currentDayId,
            date: targetDate,
            subject: smartSubject,
            topic: '',
            details: '',
            testRange: '',
            isCompleted: false,
            isCustom: true,
            qualityRating: 3,
            actualDuration: 0,
            durationMinutes: smartDuration,
            startTime: smartStartTime,
            priority: 'medium',
            isMIT: false,
            blocks: [],
            testStats: { correct: 0, wrong: 0, total: 0 },
            tags: [],
            studyType: isAcademicStream ? 'study' : 'task',
        };

        const savedDraft = loadSessionDraft<Partial<SubjectTask>>(DRAFT_STORAGE_KEY);
        setHasSmartPrefill(!savedDraft && Boolean(smartStartTime));
        setFormData(
            savedDraft
                ? {
                      ...defaultDraft,
                      ...savedDraft,
                      dayId: currentDayId,
                      date: defaultDateStr || savedDraft.date || targetDate,
                  }
                : defaultDraft
        );
        setSelectedExamSubjects([]);
        setSubTaskInputs({});
    }, [isOpen, initialData, currentDayId, defaultDateStr, settings?.stream, customSubjects]);

    // Auto-save new task draft into sessionStorage so work survives accidental dismiss
    useEffect(() => {
        if (!isOpen || initialData) return;
        const hasContent = Boolean(
            formData.topic?.trim() || formData.details?.trim() || (formData.tags && formData.tags.length > 0)
        );
        if (hasContent) {
            saveSessionDraft(DRAFT_STORAGE_KEY, {
                subject: formData.subject,
                topic: formData.topic,
                details: formData.details,
                testRange: formData.testRange,
                durationMinutes: formData.durationMinutes,
                startTime: formData.startTime,
                priority: formData.priority,
                isMIT: formData.isMIT,
                tags: formData.tags,
                studyType: formData.studyType,
            });
        }
    }, [isOpen, initialData, formData]);

    const isExamMode = formData.studyType === 'exam' || formData.studyType === 'analysis';
    const isAcademicTestMode =
        formData.studyType === 'test_educational' || formData.studyType === 'test_speed' || isExamMode;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const validation = validateTaskDraft({
            formData,
            isExamMode,
            selectedExamSubjects,
        });

        if (!validation.valid) {
            setErrors(validation.errors);
            haptics.warning();
            triggerFormShake();
            if (tab !== validation.targetTab) {
                setTab(validation.targetTab);
            }
            const firstErr =
                validation.errors.topic ||
                validation.errors.examSubjects ||
                validation.errors.subject ||
                validation.errors.durationMinutes;
            if (firstErr) {
                showToast(firstErr, 'error');
            }
            window.requestAnimationFrame(() => {
                topicInputRef.current?.focus();
            });
            return;
        }

        setErrors({});
        const safeDurationMinutes = Math.max(10, Math.min(480, Number(formData.durationMinutes) || 60));
        const safeActualDuration = Math.max(0, Number(formData.actualDuration) || 0);
        const safeDate = formData.date || defaultDateStr || toIsoString(new Date());

        if (isExamMode) {
            const existingSubTasks = formData.subTasks || [];
            const subTasks: SubTask[] = selectedExamSubjects.map((subj) => {
                const existing = existingSubTasks.find((s) => s.subject === subj);
                return {
                    id: existing?.id || crypto.randomUUID(),
                    subject: subj,
                    topic: subTaskInputs[subj]?.topic || existing?.topic || 'جامع',
                    testStats: existing?.testStats || { correct: 0, wrong: 0, total: 0 },
                };
            });

            const mainSubject =
                selectedExamSubjects.length === 1
                    ? selectedExamSubjects[0]
                    : formData.studyType === 'exam'
                      ? 'آزمون جامع'
                      : 'تحلیل آزمون';
            const mainTopic =
                selectedExamSubjects.length > 1
                    ? `${selectedExamSubjects.length} درس`
                    : subTaskInputs[selectedExamSubjects[0]]?.topic || '';

            onSave({
                ...formData,
                date: safeDate,
                durationMinutes: safeDurationMinutes,
                actualDuration: safeActualDuration,
                subject: mainSubject,
                topic: mainTopic,
                subTasks,
            });
        } else {
            const matchedType = ALL_ACTIVITY_TYPES.find((t) => t.id === formData.studyType);
            onSave({
                ...formData,
                date: safeDate,
                durationMinutes: safeDurationMinutes,
                actualDuration: safeActualDuration,
                details: formData.details?.trim() || matchedType?.label || 'برنامه‌ریزی شده',
            });
        }

        if (!initialData) {
            clearSessionDraft(DRAFT_STORAGE_KEY);
        }
        haptics.success();
        onClose();
    };

    const toggleStar = (rating: number) => {
        haptics.selection();
        setFormData({ ...formData, qualityRating: rating });
    };

    const addTag = (e: React.KeyboardEvent) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            const currentTags = formData.tags || [];
            if (!currentTags.includes(tagInput.trim())) {
                setFormData({ ...formData, tags: [...currentTags, tagInput.trim()] });
                haptics.selection();
            }
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        haptics.selection();
        setFormData({ ...formData, tags: (formData.tags || []).filter((t) => t !== tag) });
    };

    const handleExamSubjectToggle = (subjectName: string) => {
        haptics.selection();
        setErrors((prev) => ({ ...prev, examSubjects: undefined }));
        setSelectedExamSubjects((prev) =>
            prev.includes(subjectName) ? prev.filter((s) => s !== subjectName) : [...prev, subjectName]
        );
    };

    const handleSubTaskInput = (subject: string, field: 'topic', value: string) => {
        setSubTaskInputs((prev) => ({
            ...prev,
            [subject]: { ...prev[subject], [field]: value },
        }));
    };

    const handleSubTaskScore = (subjectIdx: number, field: keyof import('../types').TestStats, value: number) => {
        const newSubTasks = [...(formData.subTasks || [])];
        const targetTask = newSubTasks[subjectIdx];
        if (!targetTask) return;

        if (!targetTask.testStats) {
            targetTask.testStats = { correct: 0, wrong: 0, total: 0 };
        }
        targetTask.testStats[field] = value;

        const totalCorrect = newSubTasks.reduce((acc, t) => acc + (t.testStats?.correct || 0), 0);
        const totalWrong = newSubTasks.reduce((acc, t) => acc + (t.testStats?.wrong || 0), 0);
        const totalTotal = newSubTasks.reduce((acc, t) => acc + (t.testStats?.total || 0), 0);

        setFormData({
            ...formData,
            subTasks: newSubTasks,
            testStats: { correct: totalCorrect, wrong: totalWrong, total: totalTotal },
        });
    };

    const headerTabs = (
        <div className="space-y-1.5">
            {/* Continuity Principle: connected 3-step progression track */}
            <div
                role="tablist"
                aria-label="بخش‌های مدیریت تسک"
                className="flex items-center bg-surface-container p-1 squircle-sm gap-1 overflow-x-auto no-scrollbar"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'info'}
                    onClick={() => {
                        haptics.selection();
                        setTab('info');
                    }}
                    className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                        tab === 'info'
                            ? 'bg-[var(--surface-elevated)] text-primary shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-on-surface'
                    }`}
                >
                    <span
                        aria-hidden="true"
                        className={`w-4 h-4 rounded-full text-[10px] font-black inline-flex items-center justify-center ${
                            tab === 'info' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-[var(--text-secondary)]'
                        }`}
                    >
                        ۱
                    </span>
                    <span>اطلاعات و زمان</span>
                </button>
                <span aria-hidden="true" className="hidden sm:block w-4 h-px bg-[var(--border-subtle)] shrink-0" />
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'notes'}
                    onClick={() => {
                        haptics.selection();
                        setTab('notes');
                    }}
                    className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                        tab === 'notes'
                            ? 'bg-[var(--surface-elevated)] text-primary shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-on-surface'
                    }`}
                >
                    <span
                        aria-hidden="true"
                        className={`w-4 h-4 rounded-full text-[10px] font-black inline-flex items-center justify-center ${
                            tab === 'notes' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-[var(--text-secondary)]'
                        }`}
                    >
                        ۲
                    </span>
                    <FileText size={13} aria-hidden="true" />
                    <span>یادداشت بلوکی {(formData.blocks?.length || 0) > 0 ? `(${formData.blocks?.length})` : ''}</span>
                </button>
                <span aria-hidden="true" className="hidden sm:block w-4 h-px bg-[var(--border-subtle)] shrink-0" />
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'report'}
                    onClick={() => {
                        haptics.selection();
                        setTab('report');
                    }}
                    className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                        tab === 'report'
                            ? 'bg-[var(--surface-elevated)] text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-on-surface'
                    }`}
                >
                    <span
                        aria-hidden="true"
                        className={`w-4 h-4 rounded-full text-[10px] font-black inline-flex items-center justify-center ${
                            tab === 'report'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-surface-container-high text-[var(--text-secondary)]'
                        }`}
                    >
                        ۳
                    </span>
                    <span>ثبت عملکرد</span>
                </button>
            </div>
        </div>
    );

    const footerSubmit = (
        <button
            type="submit"
            form="task-modal-form"
            data-haptic="custom"
            className="w-full min-h-[50px] bg-primary hover:brightness-110 text-on-primary font-bold py-3 squircle-md transition active:scale-[0.98] flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer"
        >
            <span>{tab === 'info' ? 'ذخیره فعالیت' : 'ثبت عملکرد'}</span>
            {tab === 'report' ? <CheckCircle2 size={18} aria-hidden="true" /> : null}
        </button>
    );

    return (
        <ModalSheet
            isOpen={isOpen}
            onClose={onClose}
            title="مدیریت تسک"
            headerSlot={headerTabs}
            footerSlot={footerSubmit}
            historyKey="task-modal"
            maxWidthClass="max-w-xl"
            zIndexClass="z-[99999]"
        >
            <motion.form
                id="task-modal-form"
                onSubmit={handleSubmit}
                noValidate
                animate={
                    prefersReducedMotion || !shakeActive
                        ? { x: 0 }
                        : { x: EXAGGERATED_SHAKE_KEYFRAMES }
                }
                transition={TRANSITION_SHAKE}
            >
                {tab === 'info' && (
                    <div role="tabpanel" className="p-4 sm:p-5 space-y-5">
                        {/* Type Selection — Choice Overload: curated 4 primary options + progressive expand */}
                        {(() => {
                            const isAcademicStream =
                                settings?.stream === 'riazi' || settings?.stream === 'tajrobi' || settings?.stream === 'ensani';
                            const primaryIds = isAcademicStream ? PRIMARY_ACADEMIC_TYPES : PRIMARY_GENERAL_TYPES;
                            const curatedPrimary = ALL_ACTIVITY_TYPES.filter((t) => primaryIds.includes(t.id));
                            if (formData.studyType && !curatedPrimary.some((t) => t.id === formData.studyType)) {
                                const selectedTypeObj = ALL_ACTIVITY_TYPES.find((t) => t.id === formData.studyType);
                                if (selectedTypeObj) {
                                    curatedPrimary.splice(curatedPrimary.length - 1, 1, selectedTypeObj);
                                }
                            }

                            return (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-bold text-[var(--text-secondary)] block">نوع فعالیت</span>
                                        <button
                                            type="button"
                                            onClick={() => setShowAllTypes((prev) => !prev)}
                                            aria-expanded={showAllTypes}
                                            className="min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-bold text-primary hover:bg-primary/10 inline-flex items-center gap-1 transition cursor-pointer"
                                        >
                                            <span>
                                                {showAllTypes
                                                    ? 'نمایش گزینه‌های اصلی'
                                                    : `انواع بیشتر (${formatToPersianDigits(ALL_ACTIVITY_TYPES.length - curatedPrimary.length)})`}
                                            </span>
                                            {showAllTypes ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                        </button>
                                    </div>

                                    {!showAllTypes ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {curatedPrimary.map((type) => {
                                                const isSelected = formData.studyType === type.id;
                                                return (
                                                    <button
                                                        key={type.id}
                                                        type="button"
                                                        aria-pressed={isSelected}
                                                        onClick={() => {
                                                            haptics.selection();
                                                            setFormData({ ...formData, studyType: type.id });
                                                        }}
                                                        className={`min-h-[44px] flex items-center sm:flex-col justify-center gap-1.5 sm:gap-1 px-2.5 py-2 squircle-sm border transition cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-primary/10 border-primary/40 text-primary font-bold shadow-xs'
                                                                : 'bg-surface-container-low/60 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-surface-container'
                                                        }`}
                                                    >
                                                        <type.icon size={16} aria-hidden="true" />
                                                        <span className="text-xs sm:text-[11px] font-bold truncate max-w-full">
                                                            {type.label}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {UNIVERSAL_TYPES.map((type) => {
                                                    const isSelected = formData.studyType === type.id;
                                                    return (
                                                        <button
                                                            key={type.id}
                                                            type="button"
                                                            aria-pressed={isSelected}
                                                            onClick={() => {
                                                                haptics.selection();
                                                                setFormData({ ...formData, studyType: type.id });
                                                            }}
                                                            className={`min-h-[44px] flex items-center sm:flex-col justify-center gap-1.5 sm:gap-1 px-2.5 py-2 squircle-sm border transition cursor-pointer ${
                                                                isSelected
                                                                    ? 'bg-primary/10 border-primary/40 text-primary font-bold shadow-xs'
                                                                    : 'bg-surface-container-low/60 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-surface-container'
                                                            }`}
                                                        >
                                                            <type.icon size={16} aria-hidden="true" />
                                                            <span className="text-xs sm:text-[11px] font-bold truncate max-w-full">
                                                                {type.label}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                                {ACADEMIC_TYPES.map((type) => {
                                                    const isSelected = formData.studyType === type.id;
                                                    return (
                                                        <button
                                                            key={type.id}
                                                            type="button"
                                                            aria-pressed={isSelected}
                                                            onClick={() => {
                                                                haptics.selection();
                                                                setFormData({ ...formData, studyType: type.id });
                                                            }}
                                                            className={`min-h-[40px] flex items-center justify-center gap-1.5 py-1.5 px-2.5 squircle-sm border transition text-xs sm:text-[11px] font-bold cursor-pointer ${
                                                                isSelected
                                                                    ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 shadow-xs'
                                                                    : 'bg-transparent border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-surface-container-low'
                                                            }`}
                                                        >
                                                            <type.icon size={13} aria-hidden="true" />
                                                            <span className="truncate">{type.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Date & Timeblocking Selection (Parkinson's Law smart auto-prefill) */}
                        <div className="bg-surface-container-low p-3.5 squircle-md border border-[var(--border-subtle)] space-y-3">
                            {hasSmartPrefill && !initialData && (
                                <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 squircle-sm bg-primary/8 border border-primary/15 text-[11px] text-primary font-semibold">
                                    <span>زمان‌بندی و حوزه هوشمند بر اساس برنامه امروز پیش‌فرض پر شد</span>
                                    {formData.startTime && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFormData((prev) => ({ ...prev, startTime: '' }));
                                                setHasSmartPrefill(false);
                                            }}
                                            className="px-2 py-0.5 rounded-md bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-on-surface text-[10px] font-bold cursor-pointer shrink-0"
                                        >
                                            حذف ساعت
                                        </button>
                                    )}
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label
                                        htmlFor="task-day-select"
                                        className="text-xs font-bold text-[var(--text-secondary)] mb-1.5 flex items-center gap-1"
                                    >
                                        <Calendar size={13} aria-hidden="true" /> روز دوره
                                    </label>
                                    <select
                                        id="task-day-select"
                                        value={formData.dayId || 1}
                                        onChange={(e) =>
                                            setFormData({ ...formData, dayId: parseLocalizedInt(e.target.value, 1) })
                                        }
                                        className="w-full min-h-[44px] bg-[var(--surface-elevated)] rounded-xl px-3 py-2 text-base sm:text-xs font-bold text-on-surface outline-none border border-[var(--border-subtle)] focus:border-primary cursor-pointer"
                                    >
                                        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
                                            <option key={day} value={day}>
                                                روز {day}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label
                                        htmlFor="task-start-time"
                                        className="text-xs font-bold text-[var(--text-secondary)] mb-1.5 flex items-center gap-1"
                                    >
                                        <Clock size={13} aria-hidden="true" /> ساعت شروع (اختیاری)
                                    </label>
                                    <input
                                        id="task-start-time"
                                        type="time"
                                        value={formData.startTime || ''}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        className="w-full min-h-[44px] bg-[var(--surface-elevated)] rounded-xl px-3 py-2 text-base sm:text-xs font-mono font-bold text-on-surface outline-none border border-[var(--border-subtle)] focus:border-primary"
                                        dir="ltr"
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="task-duration-input"
                                        className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5"
                                    >
                                        مدت هدف (دقیقه)
                                    </label>
                                    <input
                                        id="task-duration-input"
                                        type="text"
                                        inputMode="numeric"
                                        aria-invalid={Boolean(errors.durationMinutes)}
                                        aria-describedby={errors.durationMinutes ? 'task-duration-error' : undefined}
                                        value={formData.durationMinutes ?? 60}
                                        onChange={(e) => {
                                            const norm = normalizePersianDigits(e.target.value).replace(/[^\d]/g, '');
                                            setErrors((prev) => ({ ...prev, durationMinutes: undefined }));
                                            setFormData({
                                                ...formData,
                                                durationMinutes: norm === '' ? 0 : parseInt(norm, 10),
                                            });
                                        }}
                                        className={`w-full min-h-[44px] bg-[var(--surface-elevated)] rounded-xl px-3 py-2 text-base sm:text-xs font-mono font-bold text-on-surface outline-none border focus:border-primary ${
                                            errors.durationMinutes ? 'border-rose-500' : 'border-[var(--border-subtle)]'
                                        }`}
                                        dir="ltr"
                                    />
                                    <div className="flex items-center gap-1 mt-1.5" role="group" aria-label="مدت زمان‌های پیشنهادی">
                                        {[25, 45, 60, 90].map((mins) => {
                                            const active = formData.durationMinutes === mins;
                                            return (
                                                <button
                                                    key={mins}
                                                    type="button"
                                                    onClick={() => {
                                                        haptics.selection();
                                                        setErrors((prev) => ({ ...prev, durationMinutes: undefined }));
                                                        setFormData({ ...formData, durationMinutes: mins });
                                                    }}
                                                    className={`flex-1 py-1 rounded-lg text-[11px] font-bold tabular-nums transition cursor-pointer ${
                                                        active
                                                            ? 'bg-primary text-on-primary'
                                                            : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-primary'
                                                    }`}
                                                >
                                                    {mins}′
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {errors.durationMinutes && (
                                        <p
                                            id="task-duration-error"
                                            role="alert"
                                            className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1"
                                        >
                                            <AlertCircle size={13} aria-hidden="true" />
                                            <span>{errors.durationMinutes}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[var(--border-subtle)]">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <Flag size={13} className="text-primary" aria-hidden="true" />
                                    <span className="text-xs font-bold text-[var(--text-secondary)]">اولویت:</span>
                                    {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => {
                                        const isSelected = (formData.priority || 'medium') === p;
                                        return (
                                            <button
                                                key={p}
                                                type="button"
                                                aria-pressed={isSelected}
                                                onClick={() => {
                                                    haptics.selection();
                                                    setFormData({ ...formData, priority: p });
                                                }}
                                                className={`min-h-[38px] px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                                                    isSelected
                                                        ? p === 'urgent'
                                                            ? 'bg-rose-600 text-white'
                                                            : p === 'high'
                                                              ? 'bg-amber-600 text-white'
                                                              : p === 'medium'
                                                                ? 'bg-primary text-on-primary'
                                                                : 'bg-slate-600 text-white'
                                                        : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                                                }`}
                                            >
                                                {p === 'urgent'
                                                    ? 'فوری'
                                                    : p === 'high'
                                                      ? 'بالا'
                                                      : p === 'medium'
                                                        ? 'متوسط'
                                                        : 'پایین'}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    type="button"
                                    aria-pressed={Boolean(formData.isMIT)}
                                    onClick={() => {
                                        haptics.selection();
                                        setFormData({ ...formData, isMIT: !formData.isMIT });
                                    }}
                                    className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition cursor-pointer ${
                                        formData.isMIT
                                            ? 'bg-amber-500 text-white border-amber-500'
                                            : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                                    }`}
                                >
                                    <motion.span
                                        animate={
                                            prefersReducedMotion
                                                ? undefined
                                                : formData.isMIT
                                                  ? SQUASH_STRETCH_KEYFRAMES
                                                  : { scaleX: 1, scaleY: 1 }
                                        }
                                        transition={TRANSITION_SQUASH}
                                        className="inline-flex"
                                    >
                                        <Star size={13} fill={formData.isMIT ? 'currentColor' : 'none'} aria-hidden="true" />
                                    </motion.span>
                                    <span>
                                        اولویت کلیدی (<bdi>MIT</bdi>)
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Category / Subject Selection */}
                        {(() => {
                            const currentStream = settings?.stream || 'life';
                            const allowedSubjects = SUBJECT_LISTS[currentStream] || SUBJECT_LISTS['life'];
                            const subjectMap = new Map<string, { icon: string; color: string; bgColor: string }>();

                            Object.entries(SUBJECT_ICONS).forEach(([name, style]) => {
                                if (allowedSubjects.includes(name) || name === 'شخصی') {
                                    subjectMap.set(name, style);
                                }
                            });

                            (customSubjects || []).forEach((cs) => {
                                if (!subjectMap.has(cs.name)) {
                                    const fallback = getSubjectStyle(cs.name);
                                    subjectMap.set(cs.name, {
                                        icon: cs.icon || fallback.icon,
                                        color: cs.color || fallback.color,
                                        bgColor: fallback.bgColor,
                                    });
                                }
                            });

                            const sortedIcons = Array.from(subjectMap.entries()).sort(([nameA], [nameB]) => {
                                const indexA = allowedSubjects.indexOf(nameA);
                                const indexB = allowedSubjects.indexOf(nameB);
                                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                if (indexA !== -1) return -1;
                                if (indexB !== -1) return 1;
                                return 0;
                            });

                            // Keep active selection pinned in top 6 when collapsed (Choice Overload limit <= 6)
                            const activeSubjectName = isExamMode ? selectedExamSubjects[0] : formData.subject;
                            const prioritizedIcons = [...sortedIcons];
                            if (!showAllSubjects && activeSubjectName) {
                                const activeIdx = prioritizedIcons.findIndex(([name]) => name === activeSubjectName);
                                if (activeIdx >= 6) {
                                    const [activeEntry] = prioritizedIcons.splice(activeIdx, 1);
                                    prioritizedIcons.splice(5, 0, activeEntry);
                                }
                            }
                            const visibleIcons = showAllSubjects ? sortedIcons : prioritizedIcons.slice(0, 6);

                            return (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-[var(--text-secondary)]">
                                            {isExamMode ? 'انتخاب بخش‌ها / دروس آزمون' : 'انتخاب دسته‌بندی / حوزه'}
                                        </span>
                                        {!isExamMode && (
                                            <div className="flex bg-surface-container rounded-xl p-0.5 gap-0.5">
                                                <button
                                                    type="button"
                                                    aria-label="نمایش شبکه‌ای"
                                                    aria-pressed={viewMode === 'grid'}
                                                    onClick={() => setViewMode('grid')}
                                                    className={`w-9 h-9 flex items-center justify-center rounded-lg transition cursor-pointer ${
                                                        viewMode === 'grid'
                                                            ? 'bg-[var(--surface-elevated)] shadow-xs text-primary'
                                                            : 'text-[var(--text-secondary)]'
                                                    }`}
                                                >
                                                    <LayoutGrid size={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label="نمایش فهرستی"
                                                    aria-pressed={viewMode === 'list'}
                                                    onClick={() => setViewMode('list')}
                                                    className={`w-9 h-9 flex items-center justify-center rounded-lg transition cursor-pointer ${
                                                        viewMode === 'list'
                                                            ? 'bg-[var(--surface-elevated)] shadow-xs text-primary'
                                                            : 'text-[var(--text-secondary)]'
                                                    }`}
                                                >
                                                    <List size={15} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {errors.examSubjects && (
                                        <p
                                            role="alert"
                                            className="mb-2 text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5"
                                        >
                                            <AlertCircle size={14} aria-hidden="true" />
                                            <span>{errors.examSubjects}</span>
                                        </p>
                                    )}

                                    <div
                                        className={
                                            viewMode === 'list' && !isExamMode
                                                ? 'grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 custom-scrollbar'
                                                : 'grid grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 custom-scrollbar'
                                        }
                                    >
                                        {visibleIcons.map(([name, style]) => {
                                            const isSelected = isExamMode
                                                ? selectedExamSubjects.includes(name)
                                                : formData.subject === name;
                                            return (
                                                <button
                                                    key={name}
                                                    type="button"
                                                    aria-pressed={isSelected}
                                                    onClick={() => {
                                                        if (isExamMode) {
                                                            handleExamSubjectToggle(name);
                                                        } else {
                                                            haptics.selection();
                                                            setErrors((prev) => ({ ...prev, subject: undefined }));
                                                            setFormData({ ...formData, subject: name as Subject });
                                                        }
                                                    }}
                                                    className={`relative min-h-[48px] flex ${
                                                        viewMode === 'list' && !isExamMode
                                                            ? 'flex-row items-center gap-2 px-3 py-2 text-right'
                                                            : 'flex-col items-center justify-center p-2'
                                                    } squircle-sm border transition active:scale-95 cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-primary/10 border-primary/40 text-primary font-bold shadow-xs'
                                                            : 'bg-surface-container-low/60 border-[var(--border-subtle)] text-on-surface hover:bg-surface-container'
                                                    }`}
                                                >
                                                    <span className="text-lg shrink-0" aria-hidden="true">
                                                        {style.icon}
                                                    </span>
                                                    <span className="text-[11px] font-semibold truncate w-full">
                                                        {name}
                                                    </span>
                                                    {isExamMode && isSelected && (
                                                        <CheckCircle2
                                                            size={13}
                                                            aria-hidden="true"
                                                            className="absolute top-1.5 right-1.5 text-primary"
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {sortedIcons.length > 6 && (
                                        <button
                                            type="button"
                                            aria-expanded={showAllSubjects}
                                            onClick={() => setShowAllSubjects((prev) => !prev)}
                                            className="mt-2 w-full min-h-[38px] px-3 py-1.5 squircle-sm border border-[var(--border-subtle)] bg-surface-container-low hover:bg-surface-container text-xs font-bold text-primary flex items-center justify-center gap-1.5 transition cursor-pointer"
                                        >
                                            <span>
                                                {showAllSubjects
                                                    ? 'نمایش کمتر (۶ مورد برتر)'
                                                    : `مشاهده همه حوزه‌ها (${formatToPersianDigits(sortedIcons.length)})`}
                                            </span>
                                            {showAllSubjects ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Input Fields */}
                        {isExamMode ? (
                            <div className="space-y-3">
                                <span className="text-xs font-bold text-[var(--text-secondary)] block">مباحث آزمون</span>
                                {selectedExamSubjects.length === 0 && (
                                    <p className="text-xs text-[var(--text-secondary)] text-center py-3 bg-surface-container-low rounded-xl">
                                        هیچ درسی انتخاب نشده است.
                                    </p>
                                )}
                                {selectedExamSubjects.map((subj) => (
                                    <div
                                        key={subj}
                                        className="flex items-center gap-2 bg-surface-container-low p-2 rounded-xl border border-[var(--border-subtle)]"
                                    >
                                        <div
                                            className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--surface-elevated)] text-lg shrink-0"
                                            aria-hidden="true"
                                        >
                                            {SUBJECT_ICONS[subj]?.icon || '📚'}
                                        </div>
                                        <input
                                            type="text"
                                            aria-label={`مبحث ${subj}`}
                                            placeholder={`مبحث ${subj}...`}
                                            className="flex-1 bg-transparent text-base sm:text-sm outline-none px-2 text-on-surface placeholder:text-[var(--text-muted)]"
                                            value={subTaskInputs[subj]?.topic || ''}
                                            onChange={(e) => handleSubTaskInput(subj, 'topic', e.target.value)}
                                        />
                                    </div>
                                ))}
                                <div className="pt-1">
                                    <label
                                        htmlFor="task-exam-details"
                                        className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5"
                                    >
                                        توضیحات کلی
                                    </label>
                                    <input
                                        id="task-exam-details"
                                        type="text"
                                        value={formData.details || ''}
                                        onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                                        className="w-full min-h-[44px] bg-surface-container-low border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-base sm:text-sm outline-none focus:border-primary focus:bg-[var(--surface-elevated)] transition text-on-surface"
                                        placeholder="مثلا: آزمون قلم‌چی جامع ۱"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="task-topic-input"
                                        className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5"
                                    >
                                        عنوان کار یا فعالیت <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        ref={topicInputRef}
                                        id="task-topic-input"
                                        data-autofocus="true"
                                        type="text"
                                        aria-required="true"
                                        aria-invalid={Boolean(errors.topic)}
                                        aria-describedby={errors.topic ? 'task-topic-error' : undefined}
                                        value={formData.topic || ''}
                                        onChange={(e) => {
                                            if (errors.topic) setErrors((prev) => ({ ...prev, topic: undefined }));
                                            setFormData({ ...formData, topic: e.target.value });
                                        }}
                                        className={`w-full min-h-[46px] bg-surface-container-low border rounded-xl px-4 py-3 text-base sm:text-sm outline-none focus:bg-[var(--surface-elevated)] transition text-on-surface ${
                                            errors.topic
                                                ? 'border-rose-500 focus:border-rose-500'
                                                : 'border-[var(--border-subtle)] focus:border-primary'
                                        }`}
                                        placeholder="مثلاً: تمرین ورزشی، جلسه هفتگی، نوشتن گزارش یا فصل ۳ کتاب..."
                                    />
                                    {errors.topic && (
                                        <p
                                            id="task-topic-error"
                                            role="alert"
                                            className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5"
                                        >
                                            <AlertCircle size={14} aria-hidden="true" />
                                            <span>{errors.topic}</span>
                                        </p>
                                    )}
                                </div>

                                <div className={`grid ${isAcademicTestMode ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-4`}>
                                    <div>
                                        <label
                                            htmlFor="task-details-input"
                                            className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5"
                                        >
                                            توضیح کوتاه / هدف (اختیاری)
                                        </label>
                                        <input
                                            id="task-details-input"
                                            type="text"
                                            value={formData.details || ''}
                                            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                                            className="w-full min-h-[44px] bg-surface-container-low border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-base sm:text-sm outline-none focus:border-primary focus:bg-[var(--surface-elevated)] transition text-on-surface"
                                            placeholder={
                                                isAcademicTestMode
                                                    ? 'مثلاً: ۴۵ تست'
                                                    : 'مثلاً: تمرکز کامل روی خروجی نهایی'
                                            }
                                        />
                                    </div>
                                    {isAcademicTestMode && (
                                        <div>
                                            <label
                                                htmlFor="task-test-range"
                                                className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5"
                                            >
                                                بازه تست
                                            </label>
                                            <input
                                                id="task-test-range"
                                                type="text"
                                                value={formData.testRange || ''}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, testRange: e.target.value })
                                                }
                                                className="w-full min-h-[44px] bg-surface-container-low border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-base sm:text-sm outline-none focus:border-primary focus:bg-[var(--surface-elevated)] transition text-on-surface"
                                                placeholder="اختیاری"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tags */}
                        <div className="bg-surface-container-low/70 p-3.5 rounded-2xl border border-dashed border-[var(--border-strong)]">
                            <label
                                htmlFor="task-tag-input"
                                className="block text-xs font-bold text-[var(--text-secondary)] mb-2"
                            >
                                تگ‌ها
                            </label>
                            {(formData.tags || []).length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2.5">
                                    {(formData.tags || []).map((tag) => (
                                        <span
                                            key={tag}
                                            className="bg-[var(--surface-elevated)] text-on-surface border border-[var(--border-subtle)] text-xs pr-3 pl-1 py-1 rounded-xl flex items-center gap-1"
                                        >
                                            <span>{tag}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                                aria-label={`حذف تگ ${tag}`}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                            >
                                                <X size={13} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="relative">
                                <Tag
                                    size={16}
                                    aria-hidden="true"
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                                />
                                <input
                                    id="task-tag-input"
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={addTag}
                                    className="w-full min-h-[44px] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl pl-3 pr-10 py-2.5 text-base sm:text-sm outline-none focus:border-primary transition text-on-surface"
                                    placeholder="تگ جدید و اینتر..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'notes' && (
                    <div role="tabpanel" className="p-4 sm:p-5 space-y-4">
                        <BlockNoteEditor
                            blocks={(formData.blocks as BlockNote[]) || []}
                            onChange={(blocks) => setFormData({ ...formData, blocks })}
                            onCreateFlashcard={(front, back) =>
                                addFlashcard({
                                    question: front,
                                    answer: back,
                                    subject: formData.subject || 'عمومی',
                                    topic: formData.topic || '',
                                })
                            }
                        />
                    </div>
                )}

                {tab === 'report' && (
                    <div role="tabpanel" className="p-4 sm:p-5 space-y-6">
                        {/* Actual Duration */}
                        <div className="bg-primary/5 p-5 rounded-3xl border border-primary/15">
                            <div className="flex items-center gap-2 mb-3 text-primary">
                                <Clock size={18} aria-hidden="true" />
                                <label htmlFor="task-actual-duration" className="text-sm font-bold">
                                    مدت زمان فعالیت
                                </label>
                            </div>
                            <div className="relative">
                                <input
                                    id="task-actual-duration"
                                    type="text"
                                    inputMode="numeric"
                                    value={formData.actualDuration || ''}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            actualDuration: parseLocalizedInt(e.target.value, 0),
                                        })
                                    }
                                    className="w-full bg-[var(--surface-elevated)] ring-1 ring-primary/25 rounded-2xl py-4 text-center font-black text-3xl text-primary outline-none focus:ring-2 focus:ring-primary transition tabular-nums"
                                    placeholder="0"
                                    dir="ltr"
                                />
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                                    دقیقه
                                </span>
                            </div>
                        </div>

                        {/* Scoring Logic */}
                        {isExamMode && formData.subTasks && formData.subTasks.length > 0 ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                                    <Target size={18} aria-hidden="true" />
                                    <span>نتایج آزمون به تفکیک درس</span>
                                </div>
                                {formData.subTasks.map((sub, idx) => (
                                    <div
                                        key={sub.id}
                                        className="bg-surface-container-low p-3.5 rounded-2xl border border-[var(--border-subtle)]"
                                    >
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-lg" aria-hidden="true">
                                                {SUBJECT_ICONS[sub.subject]?.icon}
                                            </span>
                                            <span className="font-bold text-sm text-on-surface">{sub.subject}</span>
                                            <span className="text-xs text-[var(--text-secondary)]">({sub.topic})</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label
                                                    htmlFor={`sub-correct-${sub.id}`}
                                                    className="block text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mb-1 text-center"
                                                >
                                                    درست
                                                </label>
                                                <input
                                                    id={`sub-correct-${sub.id}`}
                                                    type="text"
                                                    inputMode="numeric"
                                                    dir="ltr"
                                                    className="w-full min-h-[42px] text-center bg-[var(--surface-elevated)] rounded-xl py-1.5 text-base sm:text-sm border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-bold tabular-nums"
                                                    value={sub.testStats?.correct || ''}
                                                    onChange={(e) =>
                                                        handleSubTaskScore(idx, 'correct', parseLocalizedInt(e.target.value, 0))
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <label
                                                    htmlFor={`sub-wrong-${sub.id}`}
                                                    className="block text-[11px] text-rose-600 dark:text-rose-400 font-bold mb-1 text-center"
                                                >
                                                    غلط
                                                </label>
                                                <input
                                                    id={`sub-wrong-${sub.id}`}
                                                    type="text"
                                                    inputMode="numeric"
                                                    dir="ltr"
                                                    className="w-full min-h-[42px] text-center bg-[var(--surface-elevated)] rounded-xl py-1.5 text-base sm:text-sm border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-bold tabular-nums"
                                                    value={sub.testStats?.wrong || ''}
                                                    onChange={(e) =>
                                                        handleSubTaskScore(idx, 'wrong', parseLocalizedInt(e.target.value, 0))
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <label
                                                    htmlFor={`sub-total-${sub.id}`}
                                                    className="block text-[11px] text-[var(--text-secondary)] font-bold mb-1 text-center"
                                                >
                                                    کل
                                                </label>
                                                <input
                                                    id={`sub-total-${sub.id}`}
                                                    type="text"
                                                    inputMode="numeric"
                                                    dir="ltr"
                                                    className="w-full min-h-[42px] text-center bg-[var(--surface-elevated)] rounded-xl py-1.5 text-base sm:text-sm border border-[var(--border-subtle)] text-on-surface font-bold tabular-nums"
                                                    value={sub.testStats?.total || ''}
                                                    onChange={(e) =>
                                                        handleSubTaskScore(idx, 'total', parseLocalizedInt(e.target.value, 0))
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : isAcademicTestMode ? (
                            <div className="p-1">
                                <div className="flex items-center gap-2 mb-3 text-emerald-600 dark:text-emerald-400">
                                    <Target size={18} aria-hidden="true" />
                                    <span className="text-sm font-bold">نتیجه تست / ارزیابی</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-2xl text-center border border-emerald-200/70 dark:border-emerald-800/50">
                                        <label
                                            htmlFor="task-test-correct"
                                            className="block text-xs text-emerald-700 dark:text-emerald-300 font-bold mb-2"
                                        >
                                            درست
                                        </label>
                                        <input
                                            id="task-test-correct"
                                            type="text"
                                            inputMode="numeric"
                                            dir="ltr"
                                            className="w-full min-h-[44px] bg-[var(--surface-elevated)] border border-emerald-200 dark:border-emerald-800 rounded-xl p-2 text-center font-bold text-base sm:text-sm text-on-surface outline-none focus:ring-2 focus:ring-emerald-500/40 tabular-nums"
                                            value={formData.testStats?.correct || ''}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    testStats: {
                                                        ...(formData.testStats || { correct: 0, wrong: 0, total: 0 }),
                                                        correct: parseLocalizedInt(e.target.value, 0),
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-2xl text-center border border-rose-200/70 dark:border-rose-800/50">
                                        <label
                                            htmlFor="task-test-wrong"
                                            className="block text-xs text-rose-700 dark:text-rose-300 font-bold mb-2"
                                        >
                                            غلط
                                        </label>
                                        <input
                                            id="task-test-wrong"
                                            type="text"
                                            inputMode="numeric"
                                            dir="ltr"
                                            className="w-full min-h-[44px] bg-[var(--surface-elevated)] border border-rose-200 dark:border-rose-800 rounded-xl p-2 text-center font-bold text-base sm:text-sm text-on-surface outline-none focus:ring-2 focus:ring-rose-500/40 tabular-nums"
                                            value={formData.testStats?.wrong || ''}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    testStats: {
                                                        ...(formData.testStats || { correct: 0, wrong: 0, total: 0 }),
                                                        wrong: parseLocalizedInt(e.target.value, 0),
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="bg-surface-container-low p-3 rounded-2xl text-center border border-[var(--border-subtle)]">
                                        <label
                                            htmlFor="task-test-total"
                                            className="block text-xs text-[var(--text-secondary)] font-bold mb-2"
                                        >
                                            کل
                                        </label>
                                        <input
                                            id="task-test-total"
                                            type="text"
                                            inputMode="numeric"
                                            dir="ltr"
                                            className="w-full min-h-[44px] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl p-2 text-center font-bold text-base sm:text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/40 tabular-nums"
                                            value={formData.testStats?.total || ''}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    testStats: {
                                                        ...(formData.testStats || { correct: 0, wrong: 0, total: 0 }),
                                                        total: parseLocalizedInt(e.target.value, 0),
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {/* Quality Rating */}
                        <div>
                            <div className="flex items-center gap-2 mb-3 text-amber-500">
                                <Star size={18} fill="currentColor" aria-hidden="true" />
                                <span className="text-sm font-bold">رضایت و تمرکز انجام کار</span>
                            </div>
                            <div
                                role="radiogroup"
                                aria-label="امتیاز رضایت و تمرکز"
                                className="flex justify-between bg-surface-container-low p-3 rounded-2xl border border-[var(--border-subtle)]"
                            >
                                {[1, 2, 3, 4, 5].map((star) => {
                                    const active = star <= (formData.qualityRating || 0);
                                    const isSelected = (formData.qualityRating || 0) === star;
                                    return (
                                        <button
                                            key={star}
                                            type="button"
                                            role="radio"
                                            aria-checked={isSelected}
                                            aria-label={`امتیاز ${star} از ۵`}
                                            onClick={() => toggleStar(star)}
                                            className={`w-11 h-11 flex items-center justify-center rounded-xl transition cursor-pointer ${
                                                active
                                                    ? 'text-amber-400'
                                                    : 'text-slate-300 dark:text-slate-700'
                                            }`}
                                        >
                                            <motion.span
                                                animate={
                                                    prefersReducedMotion
                                                        ? undefined
                                                        : isSelected
                                                          ? SQUASH_STRETCH_KEYFRAMES
                                                          : { scaleX: 1, scaleY: 1 }
                                                }
                                                transition={TRANSITION_SQUASH}
                                                className="inline-flex"
                                            >
                                                <Star size={30} fill="currentColor" strokeWidth={0} />
                                            </motion.span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </motion.form>
        </ModalSheet>
    );
};

export default TaskModal;
