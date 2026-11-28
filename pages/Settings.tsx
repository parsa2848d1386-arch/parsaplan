import React, { useRef, useState, useEffect } from 'react';
import { useStore, useStoreSyncStatus } from '../context/StoreContext';
import { ModalSheet } from '../components/ui/ModalSheet';
import { HeroSegmentedTabs } from '../components/layout/CompactPageHero';
import {
    Save,
    RefreshCw,
    User,
    Calendar,
    Wand2,
    Download,
    Upload,
    HardDrive,
    Moon,
    LayoutList,
    Sun,
    Sparkles,
    Palette,
    Smartphone,
    Check,
    GraduationCap,
    Printer,
    Quote,
    Zap,
    Trophy,
    Cloud,
    BookOpen,
    Target,
    HelpCircle,
    ChevronUp,
    ChevronDown,
    Eye,
    History as HistoryIcon,
    BarChart2,
    AlertTriangle,
    Copy,
    Lock,
    EyeOff,
    Sliders,
    Database,
    Wrench,
} from 'lucide-react';
import { formatToPersianDigits, getFullShamsiDate, toJalaali, toGregorian, toIsoString } from '../utils';
import { FirebaseConfig, StreamType } from '../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { identifierRegex } from '../utils/schemas';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { AnimatedSwitch } from '../components/ui/MotionPrimitives';
import { isHapticsEnabled, setHapticsEnabled, haptics } from '../utils/haptics';
import { BlobatarStudio } from '../components/settings/BlobatarStudio';
import { BlobatarBot } from '../components/ui/BlobatarBot';

type SettingsTabId = 'plan' | 'appearance' | 'account' | 'data';

const HelpSection = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const faqs = [
        { q: 'چگونه برنامه خود را شروع کنم؟', a: 'ابتدا در تب «برنامه و هدف»، تاریخ شروع و طول دوره را مشخص کنید. سپس از بخش حوزه‌ها یا تایم‌لاین ۲۴ ساعته، تسک‌ها و برنامه‌های روزانه خود را زمان‌بندی کنید.', icon: Zap },
        { q: 'سیستم امتیازدهی و سطح (Level) چگونه کار می‌کند؟', a: 'با انجام هر تسک در داشبورد یا تایم‌لاین و تکمیل جلسات تایمر فوکوس، XP کسب می‌کنید و در لیگ با دیگران مقایسه می‌شوید.', icon: Trophy },
        { q: 'چگونه از داده‌هایم نسخه پشتیبان بگیرم؟', a: 'برنامه به‌صورت خودکار داده‌ها را در حافظه مرورگر ذخیره می‌کند؛ همچنین می‌توانید فایل JSON خود را دانلود کرده یا همگام‌سازی ابری را فعال کنید.', icon: Cloud },
        { q: 'چرا تسک‌های من در روزهای دیگر نمایش داده نمی‌شوند؟', a: 'داشبورد به‌صورت هوشمند فقط تسک‌های تاریخ انتخابی را نشان می‌دهد. برای روزهای دیگر از نوار تقویم بالای داشبورد یا تایم‌لاین استفاده کنید.', icon: Calendar },
        { q: 'چگونه حوزه‌ها یا دروس شخصی جدید اضافه کنم؟', a: 'به صفحه «حوزه‌ها» بروید. در آنجا می‌توانید حوزه‌های پیش‌فرض را ویرایش کنید یا موضوع جدید با آیکون و رنگ دلخواه بسازید.', icon: BookOpen },
        { q: 'تحلیل‌ها چه کمکی به من می‌کنند؟', a: 'در بخش تحلیل، نمودار توزیع هفتگی، تعادل مطالعاتی و هیت‌مپ تداوم، ثبات و الگوی تمرکز شما را نمایش می‌دهند.', icon: Target },
        { q: 'تسک‌های ویژه (آزمون و تحلیل) چه تفاوتی دارند؟', a: 'این تسک‌ها امکان ثبت تعداد تست، زمان صرف‌شده و درصد پاسخگویی را برای تحلیل روند آزمون‌ها فراهم می‌کنند.', icon: BarChart2 },
        { q: 'چگونه پارساپلان را روی گوشی نصب کنم؟ (PWA)', a: 'در آیفون گزینه Share و سپس Add to Home Screen را بزنید؛ در اندروید از منوی کروم گزینه Install app را انتخاب کنید.', icon: Smartphone },
    ];

    return (
        <div className="bg-[var(--surface-elevated)] p-4 sm:p-5 squircle-lg shadow-xs border border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5 mb-3.5 text-primary">
                <HelpCircle size={19} aria-hidden="true" />
                <h2 className="font-bold text-sm sm:text-base text-on-surface">راهنمای کامل و سوالات متداول</h2>
            </div>
            <div className="space-y-2">
                {faqs.map((item, index) => (
                    <div key={index} className="border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setOpenIndex(openIndex === index ? null : index)}
                            className="w-full min-h-[44px] flex justify-between items-center p-3 text-start bg-surface-container-low hover:bg-surface-container transition cursor-pointer"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <item.icon size={15} className="text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
                                <span className="text-xs font-bold text-on-surface leading-5">{item.q}</span>
                            </div>
                            {openIndex === index ? (
                                <ChevronUp size={16} className="text-[var(--text-secondary)] shrink-0" />
                            ) : (
                                <ChevronDown size={16} className="text-[var(--text-secondary)] shrink-0" />
                            )}
                        </button>
                        {openIndex === index && (
                            <div className="p-3 bg-[var(--surface-elevated)] text-xs text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)]">
                                {item.a}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const inlineAuthSchema = z.object({
    username: z
        .string({ error: 'نام کاربری یا ایمیل الزامی است' })
        .trim()
        .min(3, { error: 'نام کاربری یا ایمیل باید حداقل ۳ کاراکتر باشد.' })
        .regex(identifierRegex, { error: 'ایمیل معتبر یا نام کاربری انگلیسی وارد کنید.' }),
    password: z
        .string({ error: 'رمز عبور الزامی است' })
        .min(6, { error: 'رمز عبور باید حداقل ۶ کاراکتر باشد.' }),
});

type InlineAuthInputs = z.infer<typeof inlineAuthSchema>;

const InlineAuthForm = () => {
    const { login, register: registerAccount } = useStore();
    const [isLogin, setIsLogin] = useState(true);
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<InlineAuthInputs>({
        resolver: zodResolver(inlineAuthSchema),
        mode: 'onBlur',
        defaultValues: { username: '', password: '' },
    });

    const firstError = errors.username?.message || errors.password?.message || null;

    const onValid = async (data: InlineAuthInputs) => {
        if (isLogin) await login(data.username, data.password);
        else await registerAccount(data.username, data.password, data.username);
    };

    return (
        <div className="bg-surface-container-low p-4 squircle-card border border-[var(--border-subtle)]">
            <h3 className="text-sm font-bold text-on-surface mb-3 text-center">
                {isLogin ? 'ورود به حساب کاربری' : 'ثبت‌نام حساب جدید'}
            </h3>
            <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-3">
                <div>
                    <label htmlFor="settings-inline-username" className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                        ایمیل یا نام کاربری
                    </label>
                    <input
                        id="settings-inline-username"
                        type="text"
                        autoComplete="username"
                        inputMode="email"
                        placeholder="name@example.com یا نام کاربری"
                        aria-invalid={Boolean(errors.username)}
                        aria-describedby={errors.username ? 'settings-inline-username-err' : undefined}
                        {...register('username')}
                        className="w-full min-h-[44px] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-base sm:text-sm outline-none focus:border-primary transition text-on-surface"
                        dir="ltr"
                    />
                    {errors.username && (
                        <p id="settings-inline-username-err" className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                            {errors.username.message}
                        </p>
                    )}
                </div>
                <div>
                    <label htmlFor="settings-inline-password" className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                        رمز عبور
                    </label>
                    <input
                        id="settings-inline-password"
                        type="password"
                        autoComplete={isLogin ? 'current-password' : 'new-password'}
                        placeholder="••••••••"
                        aria-invalid={Boolean(errors.password)}
                        aria-describedby={errors.password ? 'settings-inline-password-err' : undefined}
                        {...register('password')}
                        className="w-full min-h-[44px] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-base sm:text-sm outline-none focus:border-primary transition text-on-surface"
                        dir="ltr"
                    />
                    {errors.password && (
                        <p id="settings-inline-password-err" className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                            {errors.password.message}
                        </p>
                    )}
                </div>
                {firstError && (
                    <p role="alert" className="sr-only">
                        {firstError}
                    </p>
                )}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full min-h-[44px] bg-primary text-on-primary py-2.5 rounded-xl text-xs font-bold hover:brightness-110 transition disabled:opacity-50 cursor-pointer"
                >
                    {isSubmitting ? 'در حال بررسی...' : isLogin ? 'ورود' : 'ثبت‌نام'}
                </button>
            </form>
            <div className="mt-2 text-center">
                <button
                    type="button"
                    onClick={() => {
                        reset();
                        setIsLogin(!isLogin);
                    }}
                    className="min-h-[44px] px-3 text-xs text-primary hover:underline font-semibold cursor-pointer"
                >
                    {isLogin ? 'حساب ندارید؟ ثبت‌نام کنید' : 'حساب دارید؟ وارد شوید'}
                </button>
            </div>
        </div>
    );
};

const GeminiModelSettings = () => {
    const { settings, updateSettings } = useStore();
    const activeModel =
        settings?.geminiModel === 'gemini-3.1-flash-lite' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/12 text-primary flex items-center justify-center shrink-0">
                    <Sparkles size={16} aria-hidden="true" />
                </div>
                <div>
                    <h3 className="font-bold text-on-surface text-xs sm:text-sm">مدل دستیار هوشمند</h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">انتخاب موتور پردازش هوش مصنوعی</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                    type="button"
                    onClick={() => updateSettings({ geminiModel: 'gemini-4-hydrogen' })}
                    className={`p-3 min-h-[44px] squircle-sm border text-start transition-all cursor-pointer ${
                        activeModel === 'gemini-4-hydrogen'
                            ? 'bg-primary-fixed/45 border-primary ring-1 ring-primary/30'
                            : 'bg-surface-container-low border-[var(--border-subtle)] hover:border-primary/40'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-extrabold text-on-surface">جمینای ۴ پیشرفته</span>
                        <span className="px-2 py-0.5 rounded-md bg-primary text-on-primary text-[11px] font-bold">پیشنهادی</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)]">دقت تحلیلی بالا و برنامه‌ریزی هوشمند</p>
                </button>

                <button
                    type="button"
                    onClick={() => updateSettings({ geminiModel: 'gemini-3.1-flash-lite' })}
                    className={`p-3 min-h-[44px] squircle-sm border text-start transition-all cursor-pointer ${
                        activeModel === 'gemini-3.1-flash-lite'
                            ? 'bg-primary-fixed/45 border-primary ring-1 ring-primary/30'
                            : 'bg-surface-container-low border-[var(--border-subtle)] hover:border-primary/40'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-extrabold text-on-surface">جمینای ۳.۱ سریع</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)]">پاسخ سریع و سبک برای کارهای روزمره</p>
                </button>
            </div>
        </div>
    );
};

const FIRESTORE_RULES_GUIDE = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }
    function isAuthenticated() { return request.auth != null && request.auth.uid != null; }
    function isOwner(userId) { return isAuthenticated() && request.auth.uid == userId; }
    function isValidId(id) { return id is string && id.size() >= 1 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\\\-:]+$'); }
    function isValidNonNegNumber(val, maxVal) { return val is number && val >= 0 && val <= maxVal; }
    function isValidBoundedString(val, maxLen) { return val is string && val.size() <= maxLen; }

    match /users/{userId} {
      allow read: if isOwner(userId) && isValidId(userId);
      allow create, update: if isOwner(userId) && isValidId(userId) &&
        (!('settings' in request.resource.data) || !('geminiApiKey' in request.resource.data.settings)) &&
        (!('xp' in request.resource.data) || isValidNonNegNumber(request.resource.data.xp, 10000000)) &&
        (!('userName' in request.resource.data) || isValidBoundedString(request.resource.data.userName, 80));
      allow delete: if isOwner(userId) && isValidId(userId);
      match /tasks/{taskId} { allow read, write: if isOwner(userId) && isValidId(userId) && isValidId(taskId); }
      match /sessions/{sessionId} { allow read, write: if isOwner(userId) && isValidId(userId) && isValidId(sessionId); }
      match /flashcards/{cardId} { allow read, write: if isOwner(userId) && isValidId(userId) && isValidId(cardId); }
      match /pages/{pageId} { allow read, write: if isOwner(userId) && isValidId(userId) && isValidId(pageId); }
    }
    match /publicProfiles/{profileId} {
      allow read: if isAuthenticated();
      allow create, update: if isOwner(profileId) && isValidId(profileId);
      allow delete: if isOwner(profileId) && isValidId(profileId);
    }
    match /publicProfileDetails/{profileId} {
      allow read: if isAuthenticated();
      allow create, update: if isOwner(profileId) && isValidId(profileId);
      allow delete: if isOwner(profileId) && isValidId(profileId);
    }
    match /liveSessions/{sessionId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isOwner(sessionId) && isValidId(sessionId);
    }
    match /study_rooms/{roomId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && isValidId(roomId) && request.resource.data.creatorId == request.auth.uid;
      allow update, delete: if isAuthenticated() && isValidId(roomId) && resource.data.creatorId == request.auth.uid;
      match /members/{memberId} {
        allow read: if isAuthenticated();
        allow create, delete: if isOwner(memberId) && isValidId(roomId) && isValidId(memberId);
        allow update: if isValidId(memberId) && (isOwner(memberId) || (isAuthenticated() && memberId != request.auth.uid && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['cheersReceived'])));
      }
      match /messages/{messageId} {
        allow read: if isAuthenticated();
        allow create: if isAuthenticated() && isValidId(roomId) && isValidId(messageId) && request.resource.data.senderId == request.auth.uid;
        allow update, delete: if false;
      }
    }
  }
}`;

const FirebaseSettings = () => {
    const { firebaseConfig, updateFirebaseConfig, removeFirebaseConfig, cloudStatus, cloudError, syncData, showToast } =
        useStore();
    const [isEditing, setIsEditing] = useState(!firebaseConfig);
    const [copiedRules, setCopiedRules] = useState(false);
    const [showRulesBox, setShowRulesBox] = useState(false);
    const [form, setForm] = useState<FirebaseConfig>({
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
    });
    const [pasteArea, setPasteArea] = useState('');

    useEffect(() => {
        if (firebaseConfig) setForm(firebaseConfig);
    }, [firebaseConfig]);

    const handleSmartPaste = () => {
        const text = pasteArea;
        const extract = (key: string) => {
            const match = text.match(new RegExp(`${key}\\s*[:=]\\s*["']([^"']+)["']`));
            return match ? match[1] : '';
        };
        setForm({
            apiKey: extract('apiKey') || form.apiKey,
            authDomain: extract('authDomain') || form.authDomain,
            projectId: extract('projectId') || form.projectId,
            storageBucket: extract('storageBucket') || form.storageBucket,
            messagingSenderId: extract('messagingSenderId') || form.messagingSenderId,
            appId: extract('appId') || form.appId,
        });
        setPasteArea('');
    };

    const handleSave = () => {
        if (Object.values(form).every((v) => v)) {
            updateFirebaseConfig(form);
            setIsEditing(false);
        }
    };

    const handleCopyRules = async () => {
        try {
            await navigator.clipboard.writeText(FIRESTORE_RULES_GUIDE);
            setCopiedRules(true);
            showToast('قوانین Firestore کپی شد — در کنسول فایربیس جای‌گذاری و Publish کنید', 'success');
            setTimeout(() => setCopiedRules(false), 2500);
        } catch {
            showToast('کپی خودکار انجام نشد؛ متن قوانین را دستی کپی کنید.', 'warning');
        }
    };

    if (!isEditing && firebaseConfig) {
        const statusBadge =
            cloudStatus === 'connected'
                ? { cls: 'bg-secondary-container text-on-secondary-container', dot: 'bg-secondary', label: 'متصل' }
                : cloudStatus === 'error'
                  ? { cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', label: 'خطای Firestore' }
                  : { cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-300', dot: 'bg-rose-500', label: 'قطع' };

        return (
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <Cloud size={18} />
                        <h3 className="font-bold text-xs sm:text-sm text-on-surface">اتصال ابری (<bdi>Firebase</bdi>)</h3>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 ${statusBadge.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                        {statusBadge.label}
                    </div>
                </div>
                <div className="bg-surface-container-low p-3 rounded-xl border border-[var(--border-subtle)]">
                    <p className="text-[11px] text-[var(--text-secondary)] mb-0.5">Project ID</p>
                    <p className="font-mono text-xs text-on-surface" dir="ltr">{firebaseConfig.projectId}</p>
                </div>

                {(cloudStatus === 'error' || cloudError) && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                        <div className="flex items-start gap-2 font-bold">
                            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                            <span>{cloudError || 'قوانین امنیتی Firestore اجازه دسترسی نمی‌دهد.'}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                            <button
                                type="button"
                                onClick={handleCopyRules}
                                className="min-h-[36px] px-3 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
                            >
                                {copiedRules ? <Check size={13} /> : <Copy size={13} />}
                                {copiedRules ? 'کپی شد!' : 'کپی قوانین Firestore Rules'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowRulesBox((v) => !v)}
                                className="min-h-[36px] px-3 py-1 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] font-bold text-[11px] cursor-pointer"
                            >
                                {showRulesBox ? 'بستن کد' : 'مشاهده کد قوانین'}
                            </button>
                            <button
                                type="button"
                                onClick={() => syncData?.()}
                                className="min-h-[36px] px-3 py-1 rounded-lg bg-secondary text-on-secondary font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                                <RefreshCw size={12} /> بررسی مجدد
                            </button>
                        </div>
                        {showRulesBox && (
                            <pre dir="ltr" className="mt-2 p-2.5 rounded-lg bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-44">
                                {FIRESTORE_RULES_GUIDE}
                            </pre>
                        )}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="flex-1 min-h-[40px] py-2 text-xs font-bold text-on-surface bg-surface-container-low hover:bg-surface-container rounded-xl border border-[var(--border-subtle)] transition cursor-pointer"
                    >
                        ویرایش اتصال
                    </button>
                    <button
                        type="button"
                        onClick={removeFirebaseConfig}
                        className="flex-1 min-h-[40px] py-2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition cursor-pointer"
                    >
                        حذف اتصال
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Cloud size={18} />
                <h3 className="font-bold text-xs sm:text-sm text-on-surface">پیکربندی دستی <bdi>Firebase</bdi></h3>
            </div>

            <div>
                <textarea
                    placeholder="کد کانفیگ Firebase را اینجا پیست کنید..."
                    value={pasteArea}
                    onChange={(e) => setPasteArea(e.target.value)}
                    className="w-full h-20 bg-surface-container-low border border-[var(--border-subtle)] rounded-xl p-3 text-xs font-mono outline-none focus:border-primary transition resize-none text-left text-on-surface"
                    dir="ltr"
                />
                {pasteArea && (
                    <button
                        type="button"
                        onClick={handleSmartPaste}
                        className="mt-2 w-full min-h-[40px] py-2 bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <Zap size={14} /> استخراج خودکار فیلدها
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(form) as Array<keyof FirebaseConfig>).map((key) => (
                    <div key={key}>
                        <label className="text-[11px] text-[var(--text-secondary)] mb-1 block uppercase">{key}</label>
                        <input
                            type="text"
                            value={form[key] || ''}
                            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                            className="w-full min-h-[42px] bg-surface-container-low border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-primary transition text-left text-on-surface"
                            dir="ltr"
                        />
                    </div>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
                {firebaseConfig && (
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-surface-container transition cursor-pointer"
                    >
                        انصراف
                    </button>
                )}
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!Object.values(form).every((v) => v)}
                    className="flex-1 min-h-[42px] bg-primary text-on-primary py-2 rounded-xl text-xs font-bold hover:brightness-110 transition disabled:opacity-50 cursor-pointer"
                >
                    ذخیره تنظیمات فایربیس
                </button>
            </div>
        </div>
    );
};

const isJalaaliLeapYear = (jy: number): boolean => {
    const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
    let jp = breaks[0];
    let jump = 0;
    for (let i = 1; i < breaks.length; i++) {
        const jm = breaks[i];
        jump = jm - jp;
        if (jy < jm) break;
        jp = jm;
    }
    let n = jy - jp;
    if (jump - n < 6) n = n - jump + Math.floor((jump + 4) / 33) * 33;
    let leap = (((n + 1) % 33) - 1) % 4;
    if (leap === -1) leap = 4;
    return leap === 0;
};

const getJalaaliMonthLength = (jy: number, jm: number): number => {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return isJalaaliLeapYear(jy) ? 30 : 29;
};

const ShamsiDatePicker = ({ date, onChange }: { date: string; onChange: (iso: string) => void }) => {
    const parsed = new Date(date);
    const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    const now = new Date();
    const currentYear = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate()).jy;

    const [jDate, setJDate] = useState(() =>
        toJalaali(safeDate.getFullYear(), safeDate.getMonth() + 1, safeDate.getDate())
    );

    useEffect(() => {
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return;
        const { jy, jm, jd } = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
        setJDate({ jy, jm, jd });
    }, [date]);

    const handleChange = (field: 'jy' | 'jm' | 'jd', value: number) => {
        const nextYear = field === 'jy' ? value : jDate.jy;
        const nextMonth = field === 'jm' ? value : jDate.jm;
        const maxDay = getJalaaliMonthLength(nextYear, nextMonth);
        const nextDay = Math.min(field === 'jd' ? value : jDate.jd, maxDay);
        const newJDate = { jy: nextYear, jm: nextMonth, jd: nextDay };
        setJDate(newJDate);
        onChange(toIsoString(toGregorian(newJDate.jy, newJDate.jm, newJDate.jd)));
    };

    const months = [
        'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
        'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
    ];

    const baseYear = Math.min(currentYear, jDate.jy);
    const years = Array.from({ length: 10 }, (_, i) => baseYear - 2 + i);
    const maxDays = getJalaaliMonthLength(jDate.jy, jDate.jm);
    const days = Array.from({ length: maxDays }, (_, i) => i + 1);

    return (
        <div className="flex items-center gap-2">
            <select
                aria-label="روز"
                value={Math.min(jDate.jd, maxDays)}
                onChange={(e) => handleChange('jd', Number(e.target.value))}
                className="min-h-[42px] bg-surface-container-low border border-[var(--border-subtle)] text-on-surface text-sm rounded-xl px-2 py-2 outline-none focus:border-primary appearance-none text-center cursor-pointer min-w-[50px]"
            >
                {days.map((d) => (
                    <option key={d} value={d}>
                        {d}
                    </option>
                ))}
            </select>
            <select
                aria-label="ماه"
                value={jDate.jm}
                onChange={(e) => handleChange('jm', Number(e.target.value))}
                className="min-h-[42px] bg-surface-container-low border border-[var(--border-subtle)] text-on-surface text-sm rounded-xl px-2 py-2 outline-none focus:border-primary appearance-none text-center cursor-pointer min-w-[96px]"
            >
                {months.map((m, i) => (
                    <option key={i} value={i + 1}>
                        {m}
                    </option>
                ))}
            </select>
            <select
                aria-label="سال"
                value={jDate.jy}
                onChange={(e) => handleChange('jy', Number(e.target.value))}
                className="min-h-[42px] bg-surface-container-low border border-[var(--border-subtle)] text-on-surface text-sm rounded-xl px-2 py-2 outline-none focus:border-primary appearance-none text-center cursor-pointer min-w-[70px]"
            >
                {years.map((y) => (
                    <option key={y} value={y}>
                        {y}
                    </option>
                ))}
            </select>
        </div>
    );
};

const Settings = () => {
    const {
        user,
        logout,
        userName,
        setUserName,
        syncData,
        loadFromCloud,
        firebaseConfig,
        retryDeadLetters,
        startDate,
        setStartDate,
        autoFixDate,
        totalDays,
        setTotalDays,
        exportData,
        importData,
        resetProgress,
        viewMode,
        setViewMode,
        showToast,
        showQuotes,
        toggleShowQuotes,
        settings,
        updateSettings,
        archiveCurrentPlan,
        level = 1,
        streakStats,
    } = useStore();
    const { deadLetterCount } = useStoreSyncStatus();
    const { themePalette, setThemePalette, themePreference, setThemePreference } = useTheme();
    const navigate = useNavigate();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<SettingsTabId>('plan');
    const [isBlobStudioOpen, setIsBlobStudioOpen] = useState(false);
    const [isAdvancedCloudOpen, setIsAdvancedCloudOpen] = useState(false);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [archiveTitleInput, setArchiveTitleInput] = useState('');
    const [hapticsActive, setHapticsActive] = useState<boolean>(() => isHapticsEnabled());

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) importData(ev.target.result as string);
            };
            reader.readAsText(file);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSaveName = () => {
        if (nameInputRef.current && nameInputRef.current.value.trim()) {
            setUserName(nameInputRef.current.value.trim());
        }
    };

    const displayUsername = user?.email ? user.email.split('@')[0] : userName || user?.displayName || 'کاربر مهمان';
    const botSeed = userName || user?.displayName || user?.email?.split('@')[0] || 'Parsashz';

    return (
        <div className="max-w-4xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 pt-2 md:pt-6 pb-28 space-y-4 sm:space-y-5">
            {/* Capsule-Aligned Compact Header */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-on-surface">تنظیمات</h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        ذخیره خودکار · نسخه ۲.۴ پلاس
                    </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold">
                    {user ? 'همگام ابری' : 'حالت محلی'}
                </span>
            </div>

            {/* 4 Categorized Segmented Pills */}
            <HeroSegmentedTabs
                layoutId="settings-category-tabs"
                ariaLabel="دسته‌بندی تنظیمات"
                variant="surface"
                value={activeTab}
                onChange={setActiveTab}
                items={[
                    { id: 'plan', label: 'برنامه و هدف', icon: Sliders },
                    { id: 'appearance', label: 'ظاهر و بات', icon: Palette },
                    { id: 'account', label: 'حساب و ابر', icon: User },
                    { id: 'data', label: 'داده و راهنما', icon: Database },
                ]}
            />

            {/* TAB 1: PLAN & FOCUS */}
            {activeTab === 'plan' && (
                <div className="bg-[var(--surface-elevated)] p-4 sm:p-6 squircle-lg shadow-xs border border-[var(--border-subtle)] space-y-5">
                    <div className="flex items-center gap-2 text-primary">
                        <Calendar size={19} aria-hidden="true" />
                        <h2 className="font-bold text-sm sm:text-base text-on-surface">تنظیمات عمومی برنامه</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] mb-2 block">
                                تاریخ شروع برنامه (شمسی)
                            </label>
                            <div className="flex items-center gap-2">
                                <ShamsiDatePicker date={startDate} onChange={setStartDate} />
                                <button
                                    type="button"
                                    onClick={autoFixDate}
                                    aria-label="تنظیم تاریخ شروع از امروز"
                                    className="min-w-[42px] min-h-[42px] flex items-center justify-center bg-secondary-container text-on-secondary-container p-2 rounded-xl hover:brightness-95 transition cursor-pointer"
                                    title="تنظیم تاریخ شروع از امروز"
                                >
                                    <Wand2 size={17} />
                                </button>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                                {getFullShamsiDate(new Date(startDate))}
                            </p>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] mb-2 block">
                                طول دوره (روز)
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min="7"
                                    max="60"
                                    value={totalDays}
                                    onChange={(e) => setTotalDays(Number(e.target.value))}
                                    onMouseUp={() =>
                                        showToast(`طول دوره به ${formatToPersianDigits(totalDays)} روز تغییر کرد`, 'success')
                                    }
                                    onTouchEnd={() =>
                                        showToast(`طول دوره به ${formatToPersianDigits(totalDays)} روز تغییر کرد`, 'success')
                                    }
                                    className="flex-1 h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <div className="bg-primary-fixed text-on-primary-fixed px-3 py-1.5 rounded-xl font-bold text-xs min-w-[48px] text-center tabular-nums">
                                    {formatToPersianDigits(totalDays)}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] mb-2 block">
                                عنوان هدف یا رویداد مهم (<bdi>D-Day</bdi>)
                            </label>
                            <input
                                type="text"
                                value={settings?.targetExamTitle ?? ''}
                                onChange={(e) => updateSettings({ targetExamTitle: e.target.value })}
                                placeholder="مثلاً: اتمام پروژه، سفر یا آزمون..."
                                className="w-full min-h-[44px] bg-surface-container-low border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-sm outline-none focus:border-primary text-on-surface"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] mb-2 block">تاریخ هدف</label>
                            <ShamsiDatePicker
                                date={settings?.targetExamDate || startDate}
                                onChange={(val) => updateSettings({ targetExamDate: val })}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-[var(--border-subtle)] grid sm:grid-cols-2 gap-4">
                        <div className="bg-surface-container-low p-3.5 rounded-2xl border border-[var(--border-subtle)]">
                            <label className="text-xs font-bold text-on-surface mb-1.5 block tabular-nums">
                                ساعت شروع روز مطالعاتی ({formatToPersianDigits(settings?.dayCutoffHour ?? 5)}:۰۰ بامداد)
                            </label>
                            <input
                                type="range"
                                min={0}
                                max={8}
                                value={settings?.dayCutoffHour ?? 5}
                                onChange={(e) => updateSettings({ dayCutoffHour: Number(e.target.value) })}
                                className="w-full accent-primary cursor-pointer"
                            />
                            <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                                پیش‌فرض ۵ صبح (مناسب شب‌زنده‌داری)
                            </p>
                        </div>

                        <div className="bg-surface-container-low p-3.5 rounded-2xl border border-[var(--border-subtle)]">
                            <label className="text-xs font-bold text-on-surface mb-1.5 block tabular-nums">
                                ظرفیت تمرکز روزانه ({formatToPersianDigits(Math.round(((settings?.dailyCapacityMinutes ?? 360) / 60) * 10) / 10)} ساعت)
                            </label>
                            <input
                                type="range"
                                min={120}
                                max={720}
                                step={30}
                                value={settings?.dailyCapacityMinutes ?? 360}
                                onChange={(e) => updateSettings({ dailyCapacityMinutes: Number(e.target.value) })}
                                className="w-full accent-primary cursor-pointer"
                            />
                        </div>

                        <div className="bg-surface-container-low p-3.5 rounded-2xl border border-[var(--border-subtle)]">
                            <label className="text-xs font-bold text-on-surface mb-1.5 block tabular-nums">
                                مدت پومودورو تمرکز ({formatToPersianDigits(settings?.pomodoroWorkMinutes ?? 25)} دقیقه)
                            </label>
                            <input
                                type="range"
                                min={15}
                                max={90}
                                step={5}
                                value={settings?.pomodoroWorkMinutes ?? 25}
                                onChange={(e) => updateSettings({ pomodoroWorkMinutes: Number(e.target.value) })}
                                className="w-full accent-primary cursor-pointer"
                            />
                        </div>

                        <div className="bg-surface-container-low p-3.5 rounded-2xl border border-[var(--border-subtle)]">
                            <label className="text-xs font-bold text-on-surface mb-1.5 block tabular-nums">
                                مدت استراحت پومودورو ({formatToPersianDigits(settings?.pomodoroBreakMinutes ?? 5)} دقیقه)
                            </label>
                            <input
                                type="range"
                                min={5}
                                max={30}
                                step={5}
                                value={settings?.pomodoroBreakMinutes ?? 5}
                                onChange={(e) => updateSettings({ pomodoroBreakMinutes: Number(e.target.value) })}
                                className="w-full accent-emerald-500 cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: APPEARANCE & BLOBATAR */}
            {activeTab === 'appearance' && (
                <div className="space-y-4">
                    <div className="bg-[var(--surface-elevated)] p-4 sm:p-6 squircle-lg shadow-xs border border-[var(--border-subtle)] space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                            <Eye size={19} aria-hidden="true" />
                            <h2 className="font-bold text-sm sm:text-base text-on-surface">شخصی‌سازی ظاهر</h2>
                        </div>

                        <div className="flex flex-wrap justify-between items-center gap-2 p-3 bg-surface-container-low rounded-2xl border border-[var(--border-subtle)]">
                            <span className="text-xs font-bold text-on-surface flex items-center gap-2">
                                <Moon size={16} className="text-primary" aria-hidden="true" /> حالت نمایش
                            </span>
                            <div className="flex bg-surface-container p-1 rounded-xl gap-1" role="group" aria-label="انتخاب حالت نمایش">
                                {(
                                    [
                                        { id: 'system', label: 'سیستم' },
                                        { id: 'light', label: 'روشن' },
                                        { id: 'dark', label: 'تیره' },
                                    ] as const
                                ).map((opt) => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        aria-pressed={themePreference === opt.id}
                                        onClick={() => setThemePreference(opt.id)}
                                        className={`px-3 min-h-[38px] text-xs font-bold rounded-lg transition cursor-pointer ${
                                            themePreference === opt.id
                                                ? 'bg-[var(--surface-elevated)] shadow-xs text-primary'
                                                : 'text-[var(--text-secondary)] hover:text-on-surface'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Theme Palette */}
                        <div className="p-3 bg-surface-container-low rounded-2xl border border-[var(--border-subtle)] space-y-2.5">
                            <span className="text-xs font-bold text-on-surface flex items-center gap-2">
                                <Palette size={16} className="text-primary" aria-hidden="true" />
                                پالت رنگی برنامه
                            </span>
                            <div className="grid grid-cols-3 gap-2">
                                {(
                                    [
                                        { id: 'indigo', name: 'نیلی نئونی', color: 'from-indigo-500 to-indigo-700' },
                                        { id: 'forest', name: 'جنگل آرام', color: 'from-emerald-500 to-green-600' },
                                        { id: 'rosegold', name: 'رز گلد لوکس', color: 'from-rose-400 to-rose-600' },
                                    ] as const
                                ).map((theme) => (
                                    <button
                                        key={theme.id}
                                        type="button"
                                        onClick={() => setThemePalette(theme.id)}
                                        className={`p-3 squircle-sm border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                                            themePalette === theme.id
                                                ? 'bg-[var(--surface-elevated)] border-primary shadow-xs ring-1 ring-primary/30'
                                                : 'bg-transparent border-[var(--border-subtle)] hover:bg-[var(--surface-elevated)]/60'
                                        }`}
                                    >
                                        <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${theme.color} flex items-center justify-center`}>
                                            {themePalette === theme.id && <Check size={13} className="text-white" />}
                                        </div>
                                        <span className="text-xs font-bold text-on-surface">{theme.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-between items-center gap-2 p-3 bg-surface-container-low rounded-2xl border border-[var(--border-subtle)]">
                            <span className="text-xs font-bold text-on-surface flex items-center gap-2">
                                <LayoutList size={16} className="text-primary" aria-hidden="true" /> تراکم کارت‌ها
                            </span>
                            <div className="flex bg-surface-container p-1 rounded-xl gap-1">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('normal')}
                                    className={`px-3 min-h-[38px] text-xs font-bold rounded-lg transition cursor-pointer ${
                                        viewMode === 'normal'
                                            ? 'bg-[var(--surface-elevated)] shadow-xs text-primary'
                                            : 'text-[var(--text-secondary)]'
                                    }`}
                                >
                                    عادی
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('compact')}
                                    className={`px-3 min-h-[38px] text-xs font-bold rounded-lg transition cursor-pointer ${
                                        viewMode === 'compact'
                                            ? 'bg-[var(--surface-elevated)] shadow-xs text-primary'
                                            : 'text-[var(--text-secondary)]'
                                    }`}
                                >
                                    فشرده
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 pt-1">
                            <AnimatedSwitch
                                checked={showQuotes}
                                onChange={toggleShowQuotes}
                                label={
                                    <>
                                        <Quote size={16} aria-hidden="true" />
                                        <span>نمایش جملات انگیزشی</span>
                                    </>
                                }
                            />
                            <AnimatedSwitch
                                checked={Boolean(settings?.bioTheme)}
                                onChange={() => updateSettings({ bioTheme: !settings?.bioTheme })}
                                label={
                                    <>
                                        <Sun size={16} aria-hidden="true" />
                                        <span>حالت هوشمند زمان‌بندی (<bdi>BioTheme</bdi>)</span>
                                    </>
                                }
                            />
                            <AnimatedSwitch
                                checked={Boolean(settings?.strictLockEnabled)}
                                onChange={() => updateSettings({ strictLockEnabled: !settings?.strictLockEnabled })}
                                label={
                                    <>
                                        <Lock size={16} aria-hidden="true" />
                                        <span>قفل تمرکز (تمام‌صفحه و تشخیص خروج)</span>
                                    </>
                                }
                            />
                            <AnimatedSwitch
                                checked={Boolean(settings?.anonymizedLeaderboard)}
                                onChange={() => updateSettings({ anonymizedLeaderboard: !settings?.anonymizedLeaderboard })}
                                label={
                                    <>
                                        <EyeOff size={16} aria-hidden="true" />
                                        <span>نمایش ناشناس در جدول لیگ</span>
                                    </>
                                }
                            />
                            <AnimatedSwitch
                                checked={hapticsActive}
                                onChange={() => {
                                    const next = !hapticsActive;
                                    setHapticsActive(next);
                                    setHapticsEnabled(next);
                                    if (next) haptics.medium();
                                }}
                                label={
                                    <>
                                        <Smartphone size={16} aria-hidden="true" />
                                        <span>بازخورد لمسی (ویبره در لمس و ژست‌ها)</span>
                                    </>
                                }
                            />
                        </div>
                    </div>

                    {/* Collapsible Blobatar Studio Card */}
                    <div className="bg-[var(--surface-elevated)] squircle-lg shadow-xs border border-[var(--border-subtle)] overflow-hidden">
                        <button
                            type="button"
                            onClick={() => {
                                haptics.selection();
                                setIsBlobStudioOpen((v) => !v);
                            }}
                            aria-expanded={isBlobStudioOpen}
                            className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-start hover:bg-surface-container-low/60 transition cursor-pointer"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="rounded-2xl bg-surface-container-low border border-[var(--border-subtle)] p-1 shrink-0">
                                    <BlobatarBot
                                        seed={botSeed}
                                        config={settings?.blobatar}
                                        level={level}
                                        streak={streakStats?.currentStreak ?? 0}
                                        size="md"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-sm text-on-surface truncate">
                                        کاراکتر اختصاصی (<bdi>Blobatar</bdi>)
                                    </h3>
                                    <p className="text-xs text-[var(--text-secondary)] truncate">
                                        {isBlobStudioOpen
                                            ? 'برای بستن استودیو دوباره لمس کنید'
                                            : 'تغییر شکل، رنگ و حالت چهره بات پروفایل'}
                                    </p>
                                </div>
                            </div>
                            <span className="px-3 py-1.5 rounded-xl bg-primary-fixed text-on-primary-fixed text-xs font-bold flex items-center gap-1 shrink-0">
                                <span>{isBlobStudioOpen ? 'بستن' : 'شخصی‌سازی'}</span>
                                <ChevronDown size={14} className={isBlobStudioOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                            </span>
                        </button>

                        {isBlobStudioOpen && (
                            <div className="border-t border-[var(--border-subtle)]">
                                <BlobatarStudio />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: ACCOUNT, CLOUD & ADVANCED AI/FIREBASE */}
            {activeTab === 'account' && (
                <div className="space-y-4">
                    <div className="bg-[var(--surface-elevated)] p-4 sm:p-6 squircle-lg shadow-xs border border-[var(--border-subtle)] space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                            <User size={19} aria-hidden="true" />
                            <h2 className="font-bold text-sm sm:text-base text-on-surface">حساب کاربری و سبک کاری</h2>
                        </div>

                        <div className="flex gap-2">
                            <input
                                ref={nameInputRef}
                                defaultValue={userName}
                                type="text"
                                placeholder="نام نمایشی..."
                                className="flex-1 min-h-[44px] bg-surface-container-low border border-[var(--border-subtle)] rounded-xl px-4 py-2 text-sm outline-none focus:border-primary text-on-surface"
                            />
                            <button
                                type="button"
                                onClick={handleSaveName}
                                aria-label="ذخیره نام نمایشی"
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-primary text-on-primary p-2 rounded-xl cursor-pointer hover:brightness-110 transition"
                            >
                                <Save size={18} />
                            </button>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">
                                سبک کاری و دسته‌بندی پیش‌فرض
                            </label>
                            <div className="relative">
                                <GraduationCap size={18} className="absolute start-3.5 top-3 text-[var(--text-secondary)] pointer-events-none" />
                                <select
                                    value={settings?.stream || 'life'}
                                    onChange={(e) => updateSettings({ stream: e.target.value as StreamType })}
                                    className="w-full min-h-[44px] bg-surface-container-low border border-[var(--border-subtle)] rounded-xl ps-11 pe-4 py-2 text-sm outline-none focus:border-primary appearance-none cursor-pointer text-on-surface"
                                >
                                    <option value="life">زندگی، عادت‌ها و بهره‌وری کل (پیشنهادی)</option>
                                    <option value="work">کار، پروژه و فریلنسینگ</option>
                                    <option value="general">مطالعه و یادگیری آزاد</option>
                                    <option value="riazi">تحصیلی: ریاضی و فیزیک</option>
                                    <option value="tajrobi">تحصیلی: علوم تجربی</option>
                                    <option value="ensani">تحصیلی: علوم انسانی</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-[var(--border-subtle)]">
                            {user ? (
                                <div className="bg-secondary-container/40 rounded-2xl p-3.5 border border-secondary/20 flex items-center justify-between gap-2">
                                    <div>
                                        <span className="font-bold text-on-surface text-sm block">{displayUsername}</span>
                                        <span className="text-[11px] text-secondary font-bold">متصل به ابر</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={logout}
                                        className="min-h-[38px] px-3.5 rounded-xl bg-rose-500/12 text-rose-600 dark:text-rose-300 text-xs font-bold cursor-pointer"
                                    >
                                        خروج از حساب
                                    </button>
                                </div>
                            ) : (
                                <InlineAuthForm />
                            )}
                        </div>
                    </div>

                    {firebaseConfig && (
                        <div className="bg-[var(--surface-elevated)] p-4 sm:p-5 squircle-lg shadow-xs border border-[var(--border-subtle)] space-y-3">
                            <h2 className="font-bold text-sm text-on-surface flex items-center gap-2">
                                <RefreshCw size={17} className="text-primary" /> همگام‌سازی دستی
                            </h2>
                            {(deadLetterCount ?? 0) > 0 && (
                                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 tabular-nums">
                                        <AlertTriangle size={15} />
                                        {formatToPersianDigits(deadLetterCount)} تغییر در صف ناموفق مانده است.
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => retryDeadLetters()}
                                        className="min-h-[36px] px-3 py-1 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer shrink-0"
                                    >
                                        تلاش مجدد
                                    </button>
                                </div>
                            )}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                    type="button"
                                    onClick={syncData}
                                    className="flex-1 min-h-[42px] bg-primary text-on-primary rounded-xl text-xs font-bold cursor-pointer"
                                >
                                    آپلود تغییرات
                                </button>
                                <button
                                    type="button"
                                    onClick={loadFromCloud}
                                    className="flex-1 min-h-[42px] bg-surface-container-low text-on-surface border border-[var(--border-subtle)] rounded-xl text-xs font-bold cursor-pointer"
                                >
                                    دانلود از سرور
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Collapsible Advanced Cloud & AI Drawer */}
                    <div className="bg-[var(--surface-elevated)] squircle-lg shadow-xs border border-[var(--border-subtle)] overflow-hidden">
                        <button
                            type="button"
                            onClick={() => {
                                haptics.selection();
                                setIsAdvancedCloudOpen((v) => !v);
                            }}
                            aria-expanded={isAdvancedCloudOpen}
                            className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-start hover:bg-surface-container-low/60 transition cursor-pointer"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <Wrench size={18} className="text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
                                <div className="min-w-0">
                                    <h3 className="font-bold text-sm text-on-surface">تنظیمات پیشرفته (هوش مصنوعی و فایربیس)</h3>
                                    <p className="text-xs text-[var(--text-secondary)] truncate">
                                        انتخاب مدل جمینای و پیکربندی سرور ابری شخصی
                                    </p>
                                </div>
                            </div>
                            <ChevronDown
                                size={16}
                                className={`text-[var(--text-secondary)] shrink-0 transition-transform ${
                                    isAdvancedCloudOpen ? 'rotate-180' : ''
                                }`}
                            />
                        </button>

                        {isAdvancedCloudOpen && (
                            <div className="p-4 sm:p-5 border-t border-[var(--border-subtle)] space-y-6">
                                <GeminiModelSettings />
                                <div className="h-px bg-[var(--border-subtle)]" />
                                <FirebaseSettings />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 4: DATA, ARCHIVE & HELP */}
            {activeTab === 'data' && (
                <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-[var(--surface-elevated)] p-4 sm:p-5 squircle-lg shadow-xs border border-[var(--border-subtle)] space-y-3">
                            <div className="flex items-center gap-2 text-secondary">
                                <HardDrive size={19} aria-hidden="true" />
                                <h2 className="font-bold text-sm sm:text-base text-on-surface">پشتیبان‌گیری</h2>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)]">
                                خروجی یا بازگردانی فایل پشتیبان <bdi>JSON</bdi> از کل تسک‌ها و تاریخچه.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={exportData}
                                    className="flex-1 min-h-[44px] bg-secondary-container text-on-secondary-container rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <Download size={15} /> دانلود
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 min-h-[44px] bg-primary-fixed text-on-primary-fixed rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <Upload size={15} /> بازگردانی
                                </button>
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                        </div>

                        <div className="bg-[var(--surface-elevated)] p-4 sm:p-5 squircle-lg shadow-xs border border-[var(--border-subtle)] space-y-3">
                            <div className="flex items-center gap-2 text-primary">
                                <Printer size={19} aria-hidden="true" />
                                <h2 className="font-bold text-sm sm:text-base text-on-surface">چاپ برنامه (<bdi>PDF</bdi>)</h2>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                خروجی استاندارد برای چاپ یا ذخیره برنامه مطالعاتی و تحلیل‌ها.
                            </p>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="w-full min-h-[44px] bg-surface-container-low hover:bg-surface-container text-on-surface border border-[var(--border-subtle)] rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Printer size={16} /> دانلود / چاپ برنامه
                            </button>
                        </div>
                    </div>

                    <div className="bg-amber-500/8 p-4 sm:p-5 squircle-lg border border-amber-500/25 space-y-3.5">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                            <HistoryIcon size={19} aria-hidden="true" />
                            <h2 className="font-bold text-sm sm:text-base">مدیریت دوره‌ها (آرشیو)</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => {
                                    setArchiveTitleInput(`برنامه ${getFullShamsiDate(new Date(startDate))}`);
                                    setIsArchiveModalOpen(true);
                                }}
                                className="min-h-[44px] flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-xl font-bold hover:brightness-110 transition text-xs cursor-pointer"
                            >
                                <Save size={16} />
                                آرشیو برنامه فعلی و شروع جدید
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate('/history')}
                                className="min-h-[44px] flex items-center justify-center gap-2 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-on-surface py-2.5 rounded-xl font-bold hover:bg-surface-container-low transition text-xs cursor-pointer"
                            >
                                <Eye size={16} />
                                مشاهده آرشیو و تاریخچه دوره‌ها
                            </button>
                        </div>

                        <div className="pt-2 border-t border-amber-500/20">
                            <button
                                type="button"
                                onClick={resetProgress}
                                className="w-full min-h-[44px] flex items-center justify-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl py-2 font-bold text-xs cursor-pointer transition"
                            >
                                <RefreshCw size={14} />
                                پاک‌سازی کامل همه داده‌ها
                            </button>
                        </div>
                    </div>

                    <HelpSection />
                </div>
            )}

            <ModalSheet
                isOpen={isArchiveModalOpen}
                onClose={() => setIsArchiveModalOpen(false)}
                title="نام‌گذاری دوره برای آرشیو"
                subtitle="برنامه فعلی در تاریخچه ذخیره شده و دوره جدید آغاز می‌شود"
                historyKey="settings-archive-modal"
                maxWidthClass="max-w-md"
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const trimmed = archiveTitleInput.trim();
                        if (!trimmed) return;
                        archiveCurrentPlan(trimmed);
                        setIsArchiveModalOpen(false);
                    }}
                    className="p-5 space-y-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5"
                >
                    <div>
                        <label
                            htmlFor="archive-title-input"
                            className="text-xs font-bold text-[var(--text-secondary)] block mb-2"
                        >
                            نامی برای برنامه فعلی خود انتخاب کنید:
                        </label>
                        <input
                            id="archive-title-input"
                            data-autofocus="true"
                            type="text"
                            value={archiveTitleInput}
                            onChange={(e) => setArchiveTitleInput(e.target.value)}
                            className="w-full min-h-[44px] bg-surface-container-low border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-base sm:text-sm outline-none focus:border-primary text-on-surface"
                        />
                    </div>
                    <div className="flex items-center justify-end gap-2.5 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsArchiveModalOpen(false)}
                            className="min-h-[44px] px-4 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-bold cursor-pointer"
                        >
                            انصراف
                        </button>
                        <button
                            type="submit"
                            disabled={!archiveTitleInput.trim()}
                            className="min-h-[44px] px-5 py-2 rounded-xl bg-primary hover:brightness-110 text-on-primary text-xs font-bold disabled:opacity-50 cursor-pointer"
                        >
                            آرشیو و شروع جدید
                        </button>
                    </div>
                </form>
            </ModalSheet>
        </div>
    );
};

export default Settings;
