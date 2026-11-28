import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
    Subject,
    SubjectTask,
    SUBJECT_ICONS,
    StudyType,
    SubTask,
    SUBJECT_LISTS,
    TaskPriority,
    getSubjectStyle,
} from '../types';
import {
    addDays,
    getDiffDays,
    toIsoString,
    formatToPersianDigits,
    minutesToTime,
    timeToMinutes,
    getShamsiDate,
    toJalaali,
    toGregorian,
} from '../utils';
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
    Plus,
    Pencil,
    Trash2,
    RotateCcw,
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

const SHAMSI_MONTHS = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const getJalaaliMonthDays = (jy: number, jm: number) => {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    const isLeap = ((((jy - 474) % 2820) + 474 + 38) * 682) % 2816 < 682;
    return isLeap ? 30 : 29;
};

const QUICK_CATEGORY_EMOJIS = ['📚', '🧬', '🧪', '⚛️', '📐', '💼', '🏋️', '🎨', '🎯', '📌'];

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
    const {
        startDate,
        subjects: customSubjects,
        addSubject,
        settings,
        updateSettings,
        tasks = [],
        showToast,
    } = useStore();

    const [formData, setFormData] = useState<Partial<SubjectTask>>({});
    const [tab, setTab] = useState<'info' | 'report'>('info');
    const [activeSection, setActiveSection] = useState<'schedule' | 'subject' | 'options' | null>(null);
    const [tagInput, setTagInput] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [errors, setErrors] = useState<TaskValidationResult['errors']>({});
    const [shakeActive, setShakeActive] = useState(false);
    const [showAllTypes, setShowAllTypes] = useState(false);
    const [showAllSubjects, setShowAllSubjects] = useState(false);
    const [hasSmartPrefill, setHasSmartPrefill] = useState(false);
    const [isAddingSubject, setIsAddingSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newSubjectIcon, setNewSubjectIcon] = useState('📚');
    const [isManagingTypes, setIsManagingTypes] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');
    const [newTypeIcon, setNewTypeIcon] = useState('✨');
    const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
    const [editingTypeLabel, setEditingTypeLabel] = useState('');
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
        setActiveSection(null);
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

        const syncedDayId = defaultDateStr
            ? Math.max(1, getDiffDays(startDate, targetDate) + 1)
            : currentDayId;

        const defaultDraft: Partial<SubjectTask> = {
            dayId: syncedDayId,
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
                showToast?.(firstErr, 'error');
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
            const customMatch = (settings?.customActivityTypes || []).find((t) => t.id === formData.studyType);
            const matchedType = ALL_ACTIVITY_TYPES.find((t) => t.id === formData.studyType);
            onSave({
                ...formData,
                date: safeDate,
                durationMinutes: safeDurationMinutes,
                actualDuration: safeActualDuration,
                details: formData.details?.trim() || customMatch?.label || matchedType?.label || 'برنامه‌ریزی شده',
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
        <div className="w-full">
            {/* Fixed-width 2-Tab Segmented Control (never shifts width between tabs) */}
            <div
                role="tablist"
                aria-label="بخش‌های مدیریت تسک"
                className="w-full grid grid-cols-2 bg-surface-container p-1 squircle-sm gap-1 relative"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'info'}
                    onClick={() => {
                        haptics.selection();
                        setTab('info');
                    }}
                    className={`relative min-h-[38px] w-full px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        tab === 'info'
                            ? 'text-primary'
                            : 'text-[var(--text-secondary)] hover:text-on-surface'
                    }`}
                >
                    {tab === 'info' && (
                        <motion.span
                            layoutId="taskModalActiveTabPill"
                            transition={
                                prefersReducedMotion
                                    ? { duration: 0 }
                                    : { type: 'spring', stiffness: 380, damping: 28 }
                            }
                            aria-hidden="true"
                            className="absolute inset-0 bg-[var(--surface-elevated)] rounded-lg shadow-xs"
                        />
                    )}
                    <span
                        aria-hidden="true"
                        className={`relative z-10 w-4 h-4 rounded-full text-[11px] font-black inline-flex items-center justify-center shrink-0 ${
                            tab === 'info' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-[var(--text-secondary)]'
                        }`}
                    >
                        ۱
                    </span>
                    <span className="relative z-10">اطلاعات و زمان</span>
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'report'}
                    onClick={() => {
                        haptics.selection();
                        setTab('report');
                    }}
                    className={`relative min-h-[38px] w-full px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        tab === 'report'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-[var(--text-secondary)] hover:text-on-surface'
                    }`}
                >
                    {tab === 'report' && (
                        <motion.span
                            layoutId="taskModalActiveTabPill"
                            transition={
                                prefersReducedMotion
                                    ? { duration: 0 }
                                    : { type: 'spring', stiffness: 380, damping: 28 }
                            }
                            aria-hidden="true"
                            className="absolute inset-0 bg-[var(--surface-elevated)] rounded-lg shadow-xs"
                        />
                    )}
                    <span
                        aria-hidden="true"
                        className={`relative z-10 w-4 h-4 rounded-full text-[11px] font-black inline-flex items-center justify-center shrink-0 ${
                            tab === 'report'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-surface-container-high text-[var(--text-secondary)]'
                        }`}
                    >
                        ۲
                    </span>
                    <span className="relative z-10">ثبت عملکرد</span>
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
            zIndexClass="z-[var(--z-modal)]"
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
                    <div role="tabpanel" className="p-4 sm:p-5 space-y-4">
                        {/* 1. Primary Title Input (Always first, zero clutter) */}
                        {!isExamMode && (
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
                                    className={`w-full min-h-[48px] bg-surface-container-low border rounded-2xl px-4 py-3 text-base sm:text-sm font-bold outline-none focus:bg-[var(--surface-elevated)] transition text-on-surface ${
                                        errors.topic
                                            ? 'border-rose-500 focus:border-rose-500'
                                            : 'border-[var(--border-subtle)] focus:border-primary'
                                    }`}
                                    placeholder="مثلاً: تمرین ورزشی، جلسه هفتگی یا فصل ۳ کتاب..."
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
                        )}

                        {/* 2. Compact 1-Row Duration + Quick Chips */}
                        <div className="bg-surface-container-low/75 px-3.5 py-3 squircle-md border border-[var(--border-subtle)] space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <label
                                    htmlFor="task-duration-input"
                                    className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5"
                                >
                                    <Clock size={14} className="text-primary" aria-hidden="true" />
                                    مدت هدف (دقیقه)
                                </label>
                                <div className="flex items-center gap-2">
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
                                        className={`w-16 min-h-[36px] text-center bg-[var(--surface-elevated)] rounded-xl px-2 py-1 text-xs font-mono font-bold text-on-surface outline-none border focus:border-primary ${
                                            errors.durationMinutes ? 'border-rose-500' : 'border-[var(--border-subtle)]'
                                        }`}
                                        dir="ltr"
                                    />
                                    <div className="flex items-center gap-1" role="group" aria-label="مدت زمان‌های پیشنهادی">
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
                                                    className={`px-2.5 min-h-[34px] rounded-xl text-[11px] font-bold tabular-nums transition cursor-pointer ${
                                                        active
                                                            ? 'bg-primary text-on-primary shadow-xs'
                                                            : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-primary'
                                                    }`}
                                                >
                                                    {mins}′
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            {errors.durationMinutes && (
                                <p
                                    id="task-duration-error"
                                    role="alert"
                                    className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1"
                                >
                                    <AlertCircle size={13} aria-hidden="true" />
                                    <span>{errors.durationMinutes}</span>
                                </p>
                            )}
                        </div>

                        {/* 3. Progressive Smart Summary Chips (Clean 1-row disclosure for Schedule, Subject, Options) */}
                        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="تنظیمات تکمیلی تسک">
                            <button
                                type="button"
                                aria-label="زمان‌بندی تاریخ و ساعت"
                                aria-expanded={activeSection === 'schedule'}
                                onClick={() => {
                                    haptics.selection();
                                    setActiveSection((prev) => (prev === 'schedule' ? null : 'schedule'));
                                }}
                                className={`min-h-[38px] px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                                    activeSection === 'schedule'
                                        ? 'bg-primary text-on-primary border-primary shadow-xs'
                                        : 'bg-surface-container-low text-on-surface border-[var(--border-subtle)] hover:bg-surface-container'
                                }`}
                            >
                                <Calendar size={13} aria-hidden="true" />
                                <span>
                                    {(() => {
                                        const activeIso = formData.date || defaultDateStr || toIsoString(new Date());
                                        const todayIso = toIsoString(new Date());
                                        const label =
                                            activeIso === todayIso
                                                ? `امروز (${getShamsiDate(activeIso)})`
                                                : getShamsiDate(activeIso);
                                        return `${label}${formData.startTime ? ` • ${formatToPersianDigits(formData.startTime)}` : ''}`;
                                    })()}
                                </span>
                            </button>

                            <button
                                type="button"
                                aria-label="انتخاب حوزه یا درس"
                                aria-expanded={activeSection === 'subject'}
                                onClick={() => {
                                    haptics.selection();
                                    setActiveSection((prev) => (prev === 'subject' ? null : 'subject'));
                                }}
                                className={`min-h-[38px] px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                                    activeSection === 'subject'
                                        ? 'bg-primary text-on-primary border-primary shadow-xs'
                                        : 'bg-surface-container-low text-on-surface border-[var(--border-subtle)] hover:bg-surface-container'
                                }`}
                            >
                                <span aria-hidden="true">{SUBJECT_ICONS[formData.subject || '']?.icon || '📌'}</span>
                                <span>{isExamMode ? 'دروس آزمون' : formData.subject || 'حوزه'}</span>
                            </button>

                            <button
                                type="button"
                                aria-expanded={activeSection === 'options'}
                                onClick={() => {
                                    haptics.selection();
                                    setActiveSection((prev) => (prev === 'options' ? null : 'options'));
                                }}
                                className={`min-h-[38px] px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                                    activeSection === 'options'
                                        ? 'bg-primary text-on-primary border-primary shadow-xs'
                                        : 'bg-surface-container-low text-on-surface border-[var(--border-subtle)] hover:bg-surface-container'
                                }`}
                            >
                                <Flag size={13} aria-hidden="true" />
                                <span>
                                    نوع، اولویت و جزئیات
                                    {formData.isMIT ? ' ★' : ''}
                                </span>
                            </button>
                        </div>

                        {/* Progressive Drawer 1: Schedule (Shamsi Date + Start Time) */}
                        {activeSection === 'schedule' && (() => {
                            const activeIso = formData.date || defaultDateStr || toIsoString(new Date());
                            const parsedDate = new Date(activeIso);
                            const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
                            const jDate = toJalaali(validDate.getFullYear(), validDate.getMonth() + 1, validDate.getDate());
                            const maxMonthDays = getJalaaliMonthDays(jDate.jy, jDate.jm);
                            const currentJYear = toJalaali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()).jy;
                            const years = Array.from({ length: 6 }, (_, i) => currentJYear - 1 + i);
                            const todayIso = toIsoString(new Date());
                            const tomorrowIso = toIsoString(addDays(new Date(), 1));

                            const setTaskIsoDate = (nextIso: string) => {
                                const syncedDay = startDate ? Math.max(1, getDiffDays(startDate, nextIso) + 1) : formData.dayId || 1;
                                setFormData({ ...formData, date: nextIso, dayId: syncedDay });
                            };

                            const handleShamsiChange = (part: 'jy' | 'jm' | 'jd', val: number) => {
                                const nextJy = part === 'jy' ? val : jDate.jy;
                                const nextJm = part === 'jm' ? val : jDate.jm;
                                const nextMax = getJalaaliMonthDays(nextJy, nextJm);
                                const nextJd = Math.min(part === 'jd' ? val : jDate.jd, nextMax);
                                const gDate = toGregorian(nextJy, nextJm, nextJd);
                                setTaskIsoDate(toIsoString(gDate));
                            };

                            return (
                                <div className="bg-surface-container-low p-3.5 squircle-md border border-[var(--border-subtle)] space-y-3">
                                    {hasSmartPrefill && !initialData && (
                                        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 squircle-sm bg-primary/8 border border-primary/15 text-[11px] text-primary font-semibold">
                                            <span>زمان‌بندی هوشمند بر اساس برنامه امروز پیش‌فرض پر شد</span>
                                            {formData.startTime && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData((prev) => ({ ...prev, startTime: '' }));
                                                        setHasSmartPrefill(false);
                                                    }}
                                                    className="px-2 py-0.5 rounded-md bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-on-surface text-[11px] font-bold cursor-pointer shrink-0"
                                                >
                                                    حذف ساعت
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1">
                                                    <Calendar size={13} aria-hidden="true" /> تاریخ (شمسی)
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            haptics.selection();
                                                            setTaskIsoDate(todayIso);
                                                        }}
                                                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                                                            activeIso === todayIso
                                                                ? 'bg-primary text-on-primary'
                                                                : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                                                        }`}
                                                    >
                                                        امروز
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            haptics.selection();
                                                            setTaskIsoDate(tomorrowIso);
                                                        }}
                                                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                                                            activeIso === tomorrowIso
                                                                ? 'bg-primary text-on-primary'
                                                                : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                                                        }`}
                                                    >
                                                        فردا
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                <select
                                                    aria-label="روز شمسی"
                                                    value={Math.min(jDate.jd, maxMonthDays)}
                                                    onChange={(e) => handleShamsiChange('jd', Number(e.target.value))}
                                                    className="min-h-[42px] bg-[var(--surface-elevated)] rounded-xl px-2 py-1.5 text-xs font-bold text-on-surface border border-[var(--border-subtle)] outline-none focus:border-primary text-center cursor-pointer tabular-nums"
                                                >
                                                    {Array.from({ length: maxMonthDays }, (_, i) => i + 1).map((d) => (
                                                        <option key={d} value={d}>
                                                            {formatToPersianDigits(d)}
                                                        </option>
                                                    ))}
                                                </select>
                                                <select
                                                    aria-label="ماه شمسی"
                                                    value={jDate.jm}
                                                    onChange={(e) => handleShamsiChange('jm', Number(e.target.value))}
                                                    className="min-h-[42px] bg-[var(--surface-elevated)] rounded-xl px-1.5 py-1.5 text-xs font-bold text-on-surface border border-[var(--border-subtle)] outline-none focus:border-primary text-center cursor-pointer"
                                                >
                                                    {SHAMSI_MONTHS.map((m, idx) => (
                                                        <option key={m} value={idx + 1}>
                                                            {m}
                                                        </option>
                                                    ))}
                                                </select>
                                                <select
                                                    aria-label="سال شمسی"
                                                    value={jDate.jy}
                                                    onChange={(e) => handleShamsiChange('jy', Number(e.target.value))}
                                                    className="min-h-[42px] bg-[var(--surface-elevated)] rounded-xl px-1.5 py-1.5 text-xs font-bold text-on-surface border border-[var(--border-subtle)] outline-none focus:border-primary text-center cursor-pointer tabular-nums"
                                                >
                                                    {years.map((y) => (
                                                        <option key={y} value={y}>
                                                            {formatToPersianDigits(y)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
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
                                                className="w-full min-h-[42px] bg-[var(--surface-elevated)] rounded-xl px-3 py-2 text-base sm:text-xs font-mono font-bold text-on-surface outline-none border border-[var(--border-subtle)] focus:border-primary"
                                                dir="ltr"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Progressive Drawer 2: Subject / Category Picker */}
                        {activeSection === 'subject' && (
                            <div className="bg-surface-container-low p-3.5 squircle-md border border-[var(--border-subtle)] space-y-2.5">
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
                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition cursor-pointer ${
                                                        viewMode === 'grid'
                                                            ? 'bg-[var(--surface-elevated)] shadow-xs text-primary'
                                                            : 'text-[var(--text-secondary)]'
                                                    }`}
                                                >
                                                    <LayoutGrid size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label="نمایش فهرستی"
                                                    aria-pressed={viewMode === 'list'}
                                                    onClick={() => setViewMode('list')}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition cursor-pointer ${
                                                        viewMode === 'list'
                                                            ? 'bg-[var(--surface-elevated)] shadow-xs text-primary'
                                                            : 'text-[var(--text-secondary)]'
                                                    }`}
                                                >
                                                    <List size={14} />
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
                                                ? 'grid grid-cols-2 gap-2 max-h-52 overflow-y-auto p-0.5 custom-scrollbar'
                                                : 'grid grid-cols-3 gap-2 max-h-52 overflow-y-auto p-0.5 custom-scrollbar'
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
                                                    className={`relative min-h-[46px] flex ${
                                                        viewMode === 'list' && !isExamMode
                                                            ? 'flex-row items-center gap-2 px-3 py-2 text-start'
                                                            : 'flex-col items-center justify-center p-2'
                                                    } squircle-sm border transition active:scale-95 cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-primary/10 border-primary/40 text-primary font-bold shadow-xs'
                                                            : 'bg-[var(--surface-elevated)] border-[var(--border-subtle)] text-on-surface hover:bg-surface-container'
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
                                            className="mt-2 w-full min-h-[36px] px-3 py-1.5 squircle-sm border border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:bg-surface-container text-xs font-bold text-primary flex items-center justify-center gap-1.5 transition cursor-pointer"
                                        >
                                            <span>
                                                {showAllSubjects
                                                    ? 'نمایش کمتر (۶ مورد برتر)'
                                                    : `مشاهده همه حوزه‌ها (${formatToPersianDigits(sortedIcons.length)})`}
                                            </span>
                                            {showAllSubjects ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                    )}

                                    {/* Add Custom Category Inline */}
                                    <div className="mt-2.5 pt-2.5 border-t border-[var(--border-subtle)]">
                                        {!isAddingSubject ? (
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingSubject(true)}
                                                className="w-full min-h-[38px] px-3 py-1.5 squircle-sm border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-xs font-bold text-primary flex items-center justify-center gap-1.5 transition cursor-pointer"
                                            >
                                                <Plus size={14} aria-hidden="true" />
                                                <span>افزودن دسته‌بندی دلخواه</span>
                                            </button>
                                        ) : (
                                            <div className="p-2.5 rounded-xl bg-[var(--surface-elevated)] border border-primary/30 space-y-2">
                                                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                                                    {QUICK_CATEGORY_EMOJIS.map((em) => (
                                                        <button
                                                            key={em}
                                                            type="button"
                                                            onClick={() => setNewSubjectIcon(em)}
                                                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 cursor-pointer border transition ${
                                                                newSubjectIcon === em
                                                                    ? 'bg-primary/15 border-primary'
                                                                    : 'bg-surface-container-low border-transparent'
                                                            }`}
                                                        >
                                                            {em}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="text"
                                                        value={newSubjectName}
                                                        onChange={(e) => setNewSubjectName(e.target.value)}
                                                        placeholder="نام دسته‌بندی یا درس جدید..."
                                                        className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-surface-container-low border border-[var(--border-subtle)] text-xs font-bold text-on-surface outline-none focus:border-primary"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const trimmed = newSubjectName.trim();
                                                            if (!trimmed) return;
                                                            addSubject?.({
                                                                id: crypto.randomUUID(),
                                                                name: trimmed,
                                                                icon: newSubjectIcon,
                                                                color: 'indigo',
                                                            });
                                                            setFormData({ ...formData, subject: trimmed as Subject });
                                                            setNewSubjectName('');
                                                            setIsAddingSubject(false);
                                                            haptics.success();
                                                            showToast?.(`دسته‌بندی «${trimmed}» اضافه شد`, 'success');
                                                        }}
                                                        className="min-h-[38px] px-3 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer shrink-0"
                                                    >
                                                        افزودن
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsAddingSubject(false);
                                                            setNewSubjectName('');
                                                        }}
                                                        className="min-h-[38px] px-2.5 rounded-xl bg-surface-container-low text-[var(--text-secondary)] text-xs font-bold cursor-pointer shrink-0"
                                                    >
                                                        لغو
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                            </div>
                        )}

                        {/* Progressive Drawer 3: Activity Type, Priority, MIT, Short Description & Tags */}
                        {activeSection === 'options' && (
                            <div className="bg-surface-container-low p-3.5 squircle-md border border-[var(--border-subtle)] space-y-4">
                                {/* Activity Type (Customizable + Add/Edit/Delete) */}
                                {(() => {
                                    const isAcademicStream =
                                        settings?.stream === 'riazi' || settings?.stream === 'tajrobi' || settings?.stream === 'ensani';
                                    const hiddenIds = new Set(settings?.hiddenActivityTypes || []);
                                    const customTypes = settings?.customActivityTypes || [];
                                    const overrideMap = new Map(customTypes.map((ct) => [ct.id, ct]));

                                    const builtInVisible = ALL_ACTIVITY_TYPES.filter((t) => !hiddenIds.has(t.id)).map((t) => {
                                        const customOverride = overrideMap.get(t.id);
                                        return {
                                            id: t.id,
                                            label: customOverride?.label || t.label,
                                            icon: t.icon,
                                            emojiIcon: customOverride?.icon,
                                            isCustom: false,
                                        };
                                    });

                                    const pureCustomTypes = customTypes
                                        .filter((ct) => !ALL_ACTIVITY_TYPES.some((bt) => bt.id === ct.id) && !hiddenIds.has(ct.id))
                                        .map((ct) => ({
                                            id: ct.id,
                                            label: ct.label,
                                            icon: CheckSquare,
                                            emojiIcon: ct.icon || '✨',
                                            isCustom: true,
                                        }));

                                    const mergedTypes = [...builtInVisible, ...pureCustomTypes];
                                    const primaryIds = isAcademicStream ? PRIMARY_ACADEMIC_TYPES : PRIMARY_GENERAL_TYPES;
                                    const curatedPrimary = mergedTypes.filter((t) => primaryIds.includes(t.id as StudyType));
                                    if (curatedPrimary.length === 0 && mergedTypes.length > 0) {
                                        curatedPrimary.push(...mergedTypes.slice(0, 4));
                                    }
                                    if (formData.studyType && !curatedPrimary.some((t) => t.id === formData.studyType)) {
                                        const selectedTypeObj = mergedTypes.find((t) => t.id === formData.studyType);
                                        if (selectedTypeObj) {
                                            if (curatedPrimary.length >= 4) curatedPrimary.splice(curatedPrimary.length - 1, 1, selectedTypeObj);
                                            else curatedPrimary.push(selectedTypeObj);
                                        }
                                    }

                                    const handleAddCustomActivityType = () => {
                                        const trimmed = newTypeName.trim();
                                        if (!trimmed) return;
                                        const newId = `custom_${Date.now()}`;
                                        const nextCustom = [...customTypes, { id: newId, label: trimmed, icon: newTypeIcon || '✨' }];
                                        updateSettings?.({ customActivityTypes: nextCustom });
                                        setFormData({ ...formData, studyType: newId });
                                        setNewTypeName('');
                                        haptics.success();
                                    };

                                    const handleSaveEditType = (id: string) => {
                                        const trimmed = editingTypeLabel.trim();
                                        if (!trimmed) return;
                                        const exists = customTypes.some((c) => c.id === id);
                                        const nextCustom = exists
                                            ? customTypes.map((c) => (c.id === id ? { ...c, label: trimmed } : c))
                                            : [...customTypes, { id, label: trimmed }];
                                        updateSettings?.({ customActivityTypes: nextCustom });
                                        setEditingTypeId(null);
                                        setEditingTypeLabel('');
                                        haptics.selection();
                                    };

                                    const handleDeleteType = (id: string) => {
                                        const isPureCustom = !ALL_ACTIVITY_TYPES.some((bt) => bt.id === id);
                                        if (isPureCustom) {
                                            updateSettings?.({
                                                customActivityTypes: customTypes.filter((c) => c.id !== id),
                                            });
                                        } else {
                                            updateSettings?.({
                                                hiddenActivityTypes: Array.from(new Set([...(settings?.hiddenActivityTypes || []), id])),
                                            });
                                        }
                                        if (formData.studyType === id) {
                                            const fallback = mergedTypes.find((m) => m.id !== id);
                                            if (fallback) setFormData({ ...formData, studyType: fallback.id });
                                        }
                                        haptics.warning();
                                    };

                                    const renderTypeBtn = (type: (typeof mergedTypes)[number], isAcademicAccent = false) => {
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
                                                className={`min-h-[42px] flex items-center sm:flex-col justify-center gap-1.5 sm:gap-1 px-2.5 py-1.5 squircle-sm border transition cursor-pointer ${
                                                    isSelected
                                                        ? isAcademicAccent
                                                            ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 shadow-xs font-bold'
                                                            : 'bg-primary/10 border-primary/40 text-primary font-bold shadow-xs'
                                                        : 'bg-[var(--surface-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-surface-container'
                                                }`}
                                            >
                                                {type.emojiIcon ? (
                                                    <span className="text-sm leading-none" aria-hidden="true">{type.emojiIcon}</span>
                                                ) : (
                                                    <type.icon size={15} aria-hidden="true" />
                                                )}
                                                <span className="text-xs sm:text-[11px] font-bold truncate max-w-full">
                                                    {type.label}
                                                </span>
                                            </button>
                                        );
                                    };

                                    return (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <span className="text-xs font-bold text-[var(--text-secondary)] block">نوع فعالیت</span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsManagingTypes((prev) => !prev)}
                                                        className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer ${
                                                            isManagingTypes
                                                                ? 'bg-primary text-on-primary'
                                                                : 'bg-primary/10 text-primary hover:bg-primary/15'
                                                        }`}
                                                    >
                                                        <Plus size={12} aria-hidden="true" />
                                                        <span>{isManagingTypes ? 'بستن مدیریت' : 'افزودن / ویرایش'}</span>
                                                    </button>
                                                    {mergedTypes.length > curatedPrimary.length && !isManagingTypes && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowAllTypes((prev) => !prev)}
                                                            aria-expanded={showAllTypes}
                                                            className="min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-bold text-[var(--text-secondary)] hover:text-primary hover:bg-primary/10 inline-flex items-center gap-1 transition cursor-pointer"
                                                        >
                                                            <span>
                                                                {showAllTypes
                                                                    ? 'نمایش گزینه‌های اصلی'
                                                                    : `انواع بیشتر (${formatToPersianDigits(mergedTypes.length - curatedPrimary.length)})`}
                                                            </span>
                                                            {showAllTypes ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {isManagingTypes ? (
                                                <div className="p-3 rounded-2xl bg-[var(--surface-elevated)] border border-primary/25 space-y-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            type="text"
                                                            value={newTypeIcon}
                                                            onChange={(e) => setNewTypeIcon(e.target.value)}
                                                            aria-label="آیکون فعالیت جدید"
                                                            className="w-11 min-h-[38px] text-center rounded-xl bg-surface-container-low border border-[var(--border-subtle)] text-sm outline-none"
                                                            maxLength={4}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={newTypeName}
                                                            onChange={(e) => setNewTypeName(e.target.value)}
                                                            placeholder="نام نوع فعالیت جدید (مثلاً کدزنی، کلاس آنلاین)..."
                                                            className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-surface-container-low border border-[var(--border-subtle)] text-xs font-bold text-on-surface outline-none focus:border-primary"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleAddCustomActivityType}
                                                            className="min-h-[38px] px-3 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer shrink-0"
                                                        >
                                                            افزودن
                                                        </button>
                                                    </div>

                                                    <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar">
                                                        {mergedTypes.map((type) => (
                                                            <div
                                                                key={type.id}
                                                                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-surface-container-low border border-[var(--border-subtle)] text-xs"
                                                            >
                                                                {editingTypeId === type.id ? (
                                                                    <div className="flex items-center gap-1.5 flex-1">
                                                                        <input
                                                                            type="text"
                                                                            value={editingTypeLabel}
                                                                            onChange={(e) => setEditingTypeLabel(e.target.value)}
                                                                            className="flex-1 min-h-[32px] px-2 rounded-lg bg-[var(--surface-elevated)] border border-primary text-xs font-bold outline-none"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSaveEditType(type.id)}
                                                                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                                                                        >
                                                                            ذخیره
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <span className="font-bold text-on-surface truncate">
                                                                            {type.emojiIcon ? `${type.emojiIcon} ` : ''}{type.label}
                                                                        </span>
                                                                        <div className="flex items-center gap-1 shrink-0">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setEditingTypeId(type.id);
                                                                                    setEditingTypeLabel(type.label);
                                                                                }}
                                                                                aria-label={`ویرایش ${type.label}`}
                                                                                className="p-1.5 rounded-lg text-primary hover:bg-primary/10 cursor-pointer"
                                                                            >
                                                                                <Pencil size={13} />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDeleteType(type.id)}
                                                                                aria-label={`حذف ${type.label}`}
                                                                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                                                            >
                                                                                <Trash2 size={13} />
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {(hiddenIds.size > 0 || customTypes.length > 0) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                updateSettings?.({
                                                                    hiddenActivityTypes: [],
                                                                    customActivityTypes: [],
                                                                });
                                                                haptics.light();
                                                            }}
                                                            className="w-full min-h-[34px] rounded-xl border border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-secondary)] hover:text-on-surface flex items-center justify-center gap-1 cursor-pointer"
                                                        >
                                                            <RotateCcw size={12} />
                                                            بازگردانی انواع پیش‌فرض
                                                        </button>
                                                    )}
                                                </div>
                                            ) : !showAllTypes ? (
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                    {curatedPrimary.map((type) => renderTypeBtn(type))}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                    {mergedTypes.map((type) =>
                                                        renderTypeBtn(
                                                            type,
                                                            ACADEMIC_TYPES.some((a) => a.id === type.id)
                                                        )
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Priority & MIT */}
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
                                                    className={`min-h-[36px] px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
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
                                        className={`min-h-[38px] px-3 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition cursor-pointer ${
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

                                {/* Short description & Test range */}
                                {!isExamMode && (
                                    <div className={`grid ${isAcademicTestMode ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-3 pt-2.5 border-t border-[var(--border-subtle)]`}>
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
                                                className="w-full min-h-[42px] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-base sm:text-xs outline-none focus:border-primary transition text-on-surface"
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
                                                    className="w-full min-h-[42px] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-base sm:text-xs outline-none focus:border-primary transition text-on-surface"
                                                    placeholder="اختیاری"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tags */}
                                <div className="pt-2.5 border-t border-[var(--border-subtle)]">
                                    <label
                                        htmlFor="task-tag-input"
                                        className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5"
                                    >
                                        تگ‌ها
                                    </label>
                                    {(formData.tags || []).length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {(formData.tags || []).map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="bg-[var(--surface-elevated)] text-on-surface border border-[var(--border-subtle)] text-xs pe-2.5 ps-1 py-0.5 rounded-xl flex items-center gap-1"
                                                >
                                                    <span>{tag}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTag(tag)}
                                                        aria-label={`حذف تگ ${tag}`}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-rose-600 transition cursor-pointer"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="relative">
                                        <Tag
                                            size={15}
                                            aria-hidden="true"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                                        />
                                        <input
                                            id="task-tag-input"
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={addTag}
                                            className="w-full min-h-[42px] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl ps-3 pe-9 py-2 text-base sm:text-xs outline-none focus:border-primary transition text-on-surface"
                                            placeholder="تگ جدید و اینتر..."
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Exam Mode Subject Topics */}
                        {isExamMode && (
                            <div className="space-y-3">
                                <span className="text-xs font-bold text-[var(--text-secondary)] block">مباحث آزمون</span>
                                {selectedExamSubjects.length === 0 && (
                                    <p className="text-xs text-[var(--text-secondary)] text-center py-3 bg-surface-container-low rounded-xl">
                                        از بخش حوزه، دروس آزمون را انتخاب کنید.
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
                        )}
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
