
import React, { useRef, useState, useEffect } from 'react';
import { useStore, useStoreSyncStatus } from '../context/StoreContext';
import { ModalSheet } from '../components/ui/ModalSheet';
import {
    Save, RefreshCw, User, Calendar, Wand2, Download, Upload, HardDrive, Moon, LayoutList, Sun,
    Sparkles, Palette, Smartphone, Check, GraduationCap, Printer, Quote,
    Zap, Trophy, Cloud, BookOpen, Target, HelpCircle, ChevronUp, ChevronDown, Eye, History as HistoryIcon, BarChart2, X, AlertTriangle, Copy
} from 'lucide-react';
import { getFullShamsiDate, toJalaali, toGregorian, toIsoString } from '../utils';
import { FirebaseConfig } from '../types';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { AnimatedSwitch } from '../components/ui/MotionPrimitives';
import { isHapticsEnabled, setHapticsEnabled, haptics } from '../utils/haptics';

// --- Components ---

const HelpSection = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const faqs = [
        { q: "چگونه برنامه خود را شروع کنم؟", a: "ابتدا در تنظیمات، تاریخ شروع و طول دوره (مثلاً ۳۰ روز) را مشخص کنید. سپس از بخش حوزه‌ها یا تایم‌لاین ۲۴ ساعته، تسک‌ها و برنامه‌های روزانه خود را زمان‌بندی کنید.", icon: Zap },
        { q: "سیستم امتیازدهی و سطح (Level) چگونه کار می‌کند؟", a: "با انجام هر تسک در داشبورد یا تایم‌لاین و تکمیل جلسات تایمر فوکوس، XP کسب می‌کنید. با افزایش XP به سطوح بالاتر صعود می‌کنید و در لیگ رقابت با دیگران مقایسه می‌شوید.", icon: Trophy },
        { q: "چگونه از داده‌هایم نسخه پشتیبان بگیرم؟", a: "برنامه به صورت خودکار داده‌ها را در حافظه مرورگر ذخیره می‌کند. اما توصیه می‌شود از بخش 'پشتیبان‌گیری'، فایل JSON خود را دانلود کنید یا با تنظیم فایربیس، ذخیره ابری را فعال کنید.", icon: Cloud },
        { q: "چرا تسک‌های من در روزهای دیگر نمایش داده نمی‌شوند؟", a: "داشبورد به صورت هوشمند فقط تسک‌های مربوط به تاریخ امروز را نشان می‌دهد. برای دیدن یا اضافه کردن تسک برای روزهای آینده، از تقویم بالای داشبورد استفاده کنید.", icon: Calendar },
        { q: "چگونه دروس شخصی یا جدید اضافه کنم؟", a: "به صفحه 'دروس' بروید. در آنجا می‌توانید دروس پیش‌فرض را ویرایش کنید یا با زدن دکمه + در پایین صفحه، درس کاملاً جدید با آیکون و رنگ دلخواه بسازید.", icon: BookOpen },
        { q: "تحلیل‌ها چه کمکی به من می‌کنند؟", a: "در بخش تحلیل، نمودار 'توازن مطالعه' نشان می‌دهد که آیا به همه دروس توجه کافی دارید یا خیر. همچنین 'هیت‌مپ' فعالیت، ثبات مطالعه شما را در ماه اخیر به تصویر می‌کشد.", icon: Target },
        { q: "تسک‌های ویژه (آزمون و تحلیل) چه تفاوتی دارند؟", a: "این تسک‌ها به شما اجازه می‌دهند تعداد تست، زمان صرف شده و درصد پاسخگویی را ثبت کنید. سیستم از این داده‌ها برای تحلیل دقیق سطح علمی شما استفاده می‌کند.", icon: BarChart2 },
        { q: "چگونه پارساپلان را در گوشی نصب کنم؟ (PWA)", a: "پارساپلان یک اپلیکیشن تحت وب پیشرو است. در آیفون کافیست دکمه Share و سپس Add to Home Screen را بزنید. در اندروید نیز از منوی سه نقطه کروم گزینه Install app را انتخاب کنید.", icon: Smartphone },
    ];

    return (
        <div className="bg-white dark:bg-gray-800 p-5 squircle-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4 text-cyan-600 dark:text-cyan-400">
                <HelpCircle size={20} />
                <h2 className="font-bold">راهنمای کامل و سوالات متداول</h2>
            </div>
            <div className="space-y-2">
                {faqs.map((item, index) => (
                    <div key={index} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setOpenIndex(openIndex === index ? null : index)}
                            className="w-full flex justify-between items-center p-3 text-right bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                            <div className="flex items-center gap-2">
                                <item.icon size={16} className="text-gray-400" />
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 leading-5">{item.q}</span>
                            </div>
                            {openIndex === index ? <ChevronUp size={16} className="text-gray-400 min-w-[16px]" /> : <ChevronDown size={16} className="text-gray-400 min-w-[16px]" />}
                        </button>
                        {openIndex === index && (
                            <div className="p-3 bg-white dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-700">
                                {item.a}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const InlineAuthForm = () => {
    const { login, register } = useStore();
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (username.trim().length < 3) {
            setFormError('نام کاربری یا ایمیل باید حداقل ۳ کاراکتر باشد.');
            return;
        }
        if (password.length < 6) {
            setFormError('رمز عبور باید حداقل ۶ کاراکتر باشد.');
            return;
        }
        setFormError(null);
        setLoading(true);
        try {
            if (isLogin) await login(username.trim(), password);
            else await register(username.trim(), password, username.trim());
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-surface-container-low p-4 squircle-card border border-[var(--border-subtle)]">
            <h3 className="text-sm font-bold text-on-surface mb-3 text-center">
                {isLogin ? 'ورود به حساب کاربری' : 'ثبت‌نام حساب جدید'}
            </h3>
            <form onSubmit={handleSubmit} noValidate className="space-y-3">
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
                        value={username}
                        onChange={(e) => {
                            if (formError) setFormError(null);
                            setUsername(e.target.value);
                        }}
                        className="w-full min-h-[44px] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-base sm:text-sm outline-none focus:border-primary transition text-on-surface"
                        dir="ltr"
                    />
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
                        value={password}
                        onChange={(e) => {
                            if (formError) setFormError(null);
                            setPassword(e.target.value);
                        }}
                        className="w-full min-h-[44px] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-base sm:text-sm outline-none focus:border-primary transition text-on-surface"
                        dir="ltr"
                    />
                </div>
                {formError && (
                    <p role="alert" className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                        <AlertTriangle size={14} aria-hidden="true" />
                        <span>{formError}</span>
                    </p>
                )}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[44px] bg-primary text-on-primary py-2.5 rounded-xl text-xs font-bold hover:brightness-110 transition disabled:opacity-50 cursor-pointer"
                >
                    {loading ? 'در حال بررسی...' : isLogin ? 'ورود' : 'ثبت‌نام'}
                </button>
            </form>
            <div className="mt-3 text-center">
                <button
                    type="button"
                    onClick={() => {
                        setFormError(null);
                        setIsLogin(!isLogin);
                    }}
                    className="min-h-[36px] px-2 text-xs text-primary hover:underline font-semibold cursor-pointer"
                >
                    {isLogin ? 'حساب ندارید؟ ثبت‌نام کنید' : 'حساب دارید؟ وارد شوید'}
                </button>
            </div>
        </div>
    );
};

/* ──────────────────────────────────────────────
   Gemini AI Model Settings Component
   ────────────────────────────────────────────── */
const GeminiModelSettings = () => {
    const { settings, updateSettings } = useStore();
    const activeModel =
        settings?.geminiModel === 'gemini-3.1-flash-lite'
            ? 'gemini-3.1-flash-lite'
            : 'gemini-4-hydrogen';

    return (
        <div className="bg-white dark:bg-gray-800 squircle-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200/50 dark:shadow-none">
                        <Sparkles size={17} className="text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-800 dark:text-white text-sm">تنظیمات دستیار هوشمند</h2>
                        <p className="text-[11px] text-gray-400 mt-0.5">انتخاب مدل هوش مصنوعی Gemini</p>
                    </div>
                </div>
            </div>

            <div className="p-5 space-y-3">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block">مدل Gemini</label>
                {/* Principle 13 (Von Restorff Effect): Highlighted recommended model option */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                        type="button"
                        onClick={() => updateSettings({ geminiModel: 'gemini-4-hydrogen' })}
                        className={`p-3 squircle-sm border text-right transition-all duration-200 cursor-pointer relative ${
                            activeModel === 'gemini-4-hydrogen'
                                ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xs'
                                : 'bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-600 hover:border-indigo-400'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <span dir="ltr" className="text-xs font-extrabold font-mono text-gray-900 dark:text-white">
                                gemini-4-hydrogen
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold">
                                پیشنهادی
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">دقت تحلیلی بالا و برنامه‌ریزی هوشمند</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => updateSettings({ geminiModel: 'gemini-3.1-flash-lite' })}
                        className={`p-3 squircle-sm border text-right transition-all duration-200 cursor-pointer ${
                            activeModel === 'gemini-3.1-flash-lite'
                                ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xs'
                                : 'bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-600 hover:border-indigo-400'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <span dir="ltr" className="text-xs font-extrabold font-mono text-gray-900 dark:text-white">
                                gemini-3.1-flash-lite
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">پاسخ سریع و سبک برای کارهای روزمره</p>
                    </button>
                </div>
                <select
                    aria-label="انتخاب مدل هوش مصنوعی Gemini"
                    value={activeModel}
                    onChange={(e) => updateSettings({ geminiModel: e.target.value })}
                    className="sr-only"
                    tabIndex={-1}
                >
                    <option value="gemini-4-hydrogen">gemini-4-hydrogen (پیشنهادی)</option>
                    <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (سریع و سبک)</option>
                </select>
                <p className="text-[10px] text-gray-400">درخواست‌های هوش مصنوعی به‌صورت خودکار از طریق سرور برنامه پردازش می‌شوند.</p>
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

    const { firebaseConfig, updateFirebaseConfig, removeFirebaseConfig, cloudStatus, cloudError, syncData, showToast } = useStore();
    const [isEditing, setIsEditing] = useState(!firebaseConfig);
    const [copiedRules, setCopiedRules] = useState(false);
    const [showRulesBox, setShowRulesBox] = useState(false);
    const [form, setForm] = useState<FirebaseConfig>({
        apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: ''
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

        const newConfig = {
            apiKey: extract('apiKey') || form.apiKey,
            authDomain: extract('authDomain') || form.authDomain,
            projectId: extract('projectId') || form.projectId,
            storageBucket: extract('storageBucket') || form.storageBucket,
            messagingSenderId: extract('messagingSenderId') || form.messagingSenderId,
            appId: extract('appId') || form.appId,
        };
        setForm(newConfig);
        setPasteArea('');
    };

    const handleSave = () => {
        if (Object.values(form).every(v => v)) {
            updateFirebaseConfig(form);
            setIsEditing(false);
        }
    };

    const handleCopyRules = async () => {
        try {
            await navigator.clipboard.writeText(FIRESTORE_RULES_GUIDE);
            setCopiedRules(true);
            showToast('قوانین Firestore کپی شد — در بخش Rules کنسول فایربیس جای‌گذاری و Publish کنید', 'success');
            setTimeout(() => setCopiedRules(false), 2500);
        } catch {
            showToast('کپی خودکار انجام نشد؛ متن قوانین را به‌صورت دستی کپی کنید.', 'warning');
        }
    };

    if (!isEditing && firebaseConfig) {
        const statusBadge =
            cloudStatus === 'connected'
                ? { cls: 'bg-green-100 text-green-700', dot: 'bg-green-500', label: 'متصل' }
                : cloudStatus === 'error'
                  ? { cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', dot: 'bg-amber-500', label: 'خطای دسترسی Firestore' }
                  : { cls: 'bg-red-100 text-red-700', dot: 'bg-red-500', label: 'قطع' };

        return (
            <div className="bg-white dark:bg-gray-800 p-5 squircle-lg shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3 text-orange-600 dark:text-orange-400">
                        <Cloud size={20} />
                        <h2 className="font-bold">اتصال ابری (Firebase)</h2>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${statusBadge.cls}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`}></div>
                        {statusBadge.label}
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 mb-1">Project ID</p>
                    <p className="font-mono text-sm text-gray-800 dark:text-gray-200">{firebaseConfig.projectId}</p>
                </div>

                {(cloudStatus === 'error' || cloudError) && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                        <div className="flex items-start gap-2 font-bold">
                            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                            <span>{cloudError || 'قوانین امنیتی Firestore در پروژه فایربیس شما اجازه خواندن/نوشتن را مسدود کرده است.'}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-90">
                            در Firebase Console وارد <span dir="ltr" className="font-mono font-semibold">Firestore Database → Rules</span> شوید، قوانین را جای‌گذاری کرده و دکمه <strong>Publish</strong> را بزنید؛ سپس «بررسی مجدد اتصال» را کلیک کنید.
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                            <button
                                type="button"
                                onClick={handleCopyRules}
                                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-[11px] flex items-center gap-1.5 hover:bg-amber-700 transition"
                            >
                                {copiedRules ? <Check size={13} /> : <Copy size={13} />}
                                {copiedRules ? 'کپی شد!' : 'کپی قوانین Firestore Rules'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowRulesBox((v) => !v)}
                                className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 font-bold text-[11px]"
                            >
                                {showRulesBox ? 'بستن کد قوانین' : 'مشاهده کد قوانین'}
                            </button>
                            <button
                                type="button"
                                onClick={() => syncData?.()}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 hover:bg-emerald-700 transition"
                            >
                                <RefreshCw size={12} />
                                بررسی مجدد اتصال
                            </button>
                        </div>
                        {showRulesBox && (
                            <pre dir="ltr" className="mt-2 p-2.5 rounded-lg bg-slate-900 text-slate-100 text-[10px] font-mono overflow-x-auto max-h-44">
                                {FIRESTORE_RULES_GUIDE}
                            </pre>
                        )}
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-2 mt-4">
                    <button onClick={() => setIsEditing(true)} className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition">ویرایش</button>
                    <button onClick={removeFirebaseConfig} className="flex-1 py-2 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition">حذف اتصال</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-5 squircle-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4 text-orange-600 dark:text-orange-400">
                <Cloud size={20} />
                <h2 className="font-bold">تنظیمات فایربیس</h2>
            </div>

            <div className="mb-4">
                <textarea
                    placeholder="کد کانفیگ Firebase را اینجا پیست کنید (Smart Paste)..."
                    value={pasteArea}
                    onChange={(e) => setPasteArea(e.target.value)}
                    className="w-full h-20 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-xs font-mono outline-none focus:border-orange-500 transition resize-none text-left"
                    dir="ltr"
                />
                {pasteArea && (
                    <button onClick={handleSmartPaste} className="mt-2 w-full py-2 bg-orange-100 text-orange-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-orange-200 transition">
                        <Zap size={14} />
                        استخراج اطلاعات
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                {Object.keys(form).map((key) => (
                    <div key={key} className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] text-gray-400 mb-1 block uppercase">{key}</label>
                        <input
                            type="text"
                            value={(form as any)[key]}
                            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-orange-500 transition text-left text-gray-800 dark:text-white"
                            dir="ltr"
                        />
                    </div>
                ))}
            </div>

            <div className="flex flex-col md:flex-row gap-2 mt-4">
                {firebaseConfig && <button onClick={() => setIsEditing(false)} className="md:px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition">انصراف</button>}
                <button
                    onClick={handleSave}
                    disabled={!Object.values(form).every(v => v)}
                    className="flex-1 bg-orange-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    ذخیره تنظیمات
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

const ShamsiDatePicker = ({ date, onChange }: { date: string, onChange: (iso: string) => void }) => {
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
        const gDate = toGregorian(newJDate.jy, newJDate.jm, newJDate.jd);
        onChange(toIsoString(gDate));
    };

    const months = [
        'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
        'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
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
                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white text-sm rounded-xl px-2 py-2 outline-none focus:border-indigo-500 appearance-none text-center cursor-pointer min-w-[50px]"
            >
                {days.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
                aria-label="ماه"
                value={jDate.jm}
                onChange={(e) => handleChange('jm', Number(e.target.value))}
                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white text-sm rounded-xl px-2 py-2 outline-none focus:border-indigo-500 appearance-none text-center cursor-pointer min-w-[100px]"
            >
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select
                aria-label="سال"
                value={jDate.jy}
                onChange={(e) => handleChange('jy', Number(e.target.value))}
                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white text-sm rounded-xl px-2 py-2 outline-none focus:border-indigo-500 appearance-none text-center cursor-pointer min-w-[70px]"
            >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
        </div>
    );
};

const Settings = () => {
    const {
        user, logout, userName, setUserName,
        syncData, loadFromCloud, firebaseConfig,
        retryDeadLetters,
        startDate, setStartDate, autoFixDate, totalDays, setTotalDays,
        exportData, importData, resetProgress,
        darkMode, toggleDarkMode, viewMode, setViewMode, showToast, showQuotes, toggleShowQuotes,
        settings, updateSettings, archiveCurrentPlan
    } = useStore();
    const { deadLetterCount } = useStoreSyncStatus();

    const { themePalette, setThemePalette, themePreference, setThemePreference } = useTheme();
    const navigate = useNavigate();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [archiveTitleInput, setArchiveTitleInput] = useState('');
    const [hapticsActive, setHapticsActive] = useState<boolean>(() => isHapticsEnabled());

    useEffect(() => {
        if (!isArchiveModalOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsArchiveModalOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isArchiveModalOpen]);

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

    const displayUsername = user?.email ? user.email.split('@')[0] : (userName || user?.displayName || 'کاربر مهمان');



    return (
        <div className="max-w-5xl mx-auto p-3 xs:p-4 sm:p-5 md:p-6 lg:p-8 max-app-container pb-32 space-y-6">


            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200/50 dark:shadow-none shrink-0">
                        <User className="text-white" size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white tracking-tight">تنظیمات</h1>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">مدیریت حساب، ظاهر و داده‌ها</p>
                    </div>
                </div>

                <div className="flex gap-2">
                </div>
            </div>

            {/* --- 1. General Settings (Date & Duration) --- */}
            <div className="bg-white dark:bg-gray-800 p-5 squircle-lg shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4 text-teal-600 dark:text-teal-400">
                    <Calendar size={20} />
                    <h2 className="font-bold">تنظیمات عمومی</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Date Picker */}
                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">تاریخ شروع برنامه (شمسی)</label>
                        <div className="flex items-center gap-2">
                            <ShamsiDatePicker date={startDate} onChange={setStartDate} />
                            <button onClick={autoFixDate} className="bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 p-2 rounded-xl hover:bg-teal-100 dark:hover:bg-teal-900/40 transition border border-teal-100 dark:border-teal-800" title="تنظیم تاریخ شروع از امروز">
                                <Wand2 size={18} />
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1.5">{getFullShamsiDate(new Date(startDate))}</p>
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">طول دوره (روز)</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="7"
                                max="60"
                                value={totalDays}
                                onChange={(e) => setTotalDays(Number(e.target.value))}
                                onMouseUp={() => showToast(`طول دوره به ${totalDays} روز تغییر کرد`, 'success')}
                                onTouchEnd={() => showToast(`طول دوره به ${totalDays} روز تغییر کرد`, 'success')}
                                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg font-bold text-sm min-w-[50px] text-center">
                                {totalDays}
                            </div>
                        </div>
                    </div>

                    {/* Target Goal D-Day */}
                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">عنوان هدف یا رویداد مهم (شمارش معکوس D-Day)</label>
                        <input
                            type="text"
                            value={settings?.targetExamTitle ?? ''}
                            onChange={(e) => updateSettings({ targetExamTitle: e.target.value })}
                            placeholder="مثلاً: اتمام پروژه، دوی ۱۰ کیلومتر، سفر یا آزمون..."
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500 text-gray-800 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">تاریخ هدف</label>
                        <ShamsiDatePicker
                            date={settings?.targetExamDate || startDate}
                            onChange={(val) => updateSettings({ targetExamDate: val })}
                        />
                    </div>
                </div>

                {/* Focus & Study Day Cycle Preferences */}
                <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                            ساعت شروع روز مطالعاتی ({settings?.dayCutoffHour ?? 5}:۰۰ بامداد)
                        </label>
                        <input
                            type="range"
                            min={0}
                            max={8}
                            value={settings?.dayCutoffHour ?? 5}
                            onChange={(e) => updateSettings({ dayCutoffHour: Number(e.target.value) })}
                            className="w-full accent-indigo-600"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">پیش‌فرض ۵ صبح (مشابه YPT برای شب‌زنده‌داری)</p>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                            مدت پومودورو تمرکز ({settings?.pomodoroWorkMinutes ?? 25} دقیقه)
                        </label>
                        <input
                            type="range"
                            min={15}
                            max={90}
                            step={5}
                            value={settings?.pomodoroWorkMinutes ?? 25}
                            onChange={(e) => updateSettings({ pomodoroWorkMinutes: Number(e.target.value) })}
                            className="w-full accent-indigo-600"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                            مدت استراحت پومودورو ({settings?.pomodoroBreakMinutes ?? 5} دقیقه)
                        </label>
                        <input
                            type="range"
                            min={5}
                            max={30}
                            step={5}
                            value={settings?.pomodoroBreakMinutes ?? 5}
                            onChange={(e) => updateSettings({ pomodoroBreakMinutes: Number(e.target.value) })}
                            className="w-full accent-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                            ظرفیت مطالعه روزانه ({Math.round((settings?.dailyCapacityMinutes ?? 360) / 60 * 10) / 10} ساعت)
                        </label>
                        <input
                            type="range"
                            min={120}
                            max={720}
                            step={30}
                            value={settings?.dailyCapacityMinutes ?? 360}
                            onChange={(e) => updateSettings({ dailyCapacityMinutes: Number(e.target.value) })}
                            className="w-full accent-purple-600"
                        />
                    </div>
                </div>
            </div>

            {/* --- 2. Gemini AI Model Settings --- */}
            <GeminiModelSettings />

            {/* --- 3. Account & Data --- */}
            <div className="grid md:grid-cols-2 gap-6">

                {/* Profile */}
                <div className="bg-white dark:bg-gray-800 p-5 squircle-lg shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-4 text-indigo-600 dark:text-indigo-400">
                        <User size={20} />
                        <h2 className="font-bold">حساب کاربری</h2>
                    </div>
                    {/* User Name Input */}
                    <div className="mb-4 flex gap-2">
                        <input
                            ref={nameInputRef}
                            defaultValue={userName}
                            type="text"
                            placeholder="نام نمایشی..."
                            className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500 transition"
                        />
                        <button onClick={handleSaveName} className="bg-indigo-600 text-white p-2 rounded-xl">
                            <Save size={18} />
                        </button>
                    </div>

                    {/* Workspace Profile / Mode Selection */}
                    <div className="mb-4">
                        <label className="text-[11px] font-bold text-gray-400 block mb-1.5">سبک کاری و دسته‌بندی پیش‌فرض</label>
                        <div className="relative">
                            <GraduationCap size={18} className="absolute right-4 top-3 text-gray-400" />
                            <select
                                value={settings?.stream || 'life'}
                                onChange={(e) => updateSettings({ stream: e.target.value as any })}
                                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl pr-12 pl-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition appearance-none cursor-pointer text-gray-800 dark:text-white"
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

                    {/* Auth Status */}
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                        {user ? (
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-100 dark:border-green-800">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-green-700 dark:text-green-400 text-sm">{displayUsername}</span>
                                    <span className="text-[10px] bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full">آنلاین</span>
                                </div>
                                <button onClick={logout} className="w-full text-xs text-red-500 hover:text-red-700 py-1 font-bold">خروج از حساب</button>
                            </div>
                        ) : (
                            <InlineAuthForm />
                        )}
                    </div>
                </div>

                {/* Personalization & Backup */}
                <div className="space-y-6">
                    {/* Personalization */}
                    <div className="bg-white dark:bg-gray-800 p-5 squircle-lg shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-4 text-purple-600 dark:text-purple-400">
                            <Eye size={20} />
                            <h2 className="font-bold">شخصی‌سازی</h2>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap justify-between items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                    <Moon size={16} aria-hidden="true" /> حالت نمایش
                                </span>
                                <div className="flex bg-gray-200 dark:bg-gray-600 p-0.5 rounded-xl gap-0.5" role="group" aria-label="انتخاب حالت نمایش">
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
                                            className={`px-2.5 min-h-[32px] text-xs font-bold rounded-lg transition cursor-pointer ${
                                                themePreference === opt.id
                                                    ? 'bg-white dark:bg-slate-800 shadow-xs text-primary dark:text-white'
                                                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2"><LayoutList size={16} /> فشرده</span>
                                <div className="flex bg-gray-200 dark:bg-gray-600 p-0.5 rounded-lg">
                                    <button type="button" onClick={() => setViewMode('normal')} className={`px-2 py-0.5 text-[10px] rounded-md transition cursor-pointer ${viewMode === 'normal' ? 'bg-white shadow text-black' : 'text-gray-500 dark:text-gray-300'}`}>عادی</button>
                                    <button type="button" onClick={() => setViewMode('compact')} className={`px-2 py-0.5 text-[10px] rounded-md transition cursor-pointer ${viewMode === 'compact' ? 'bg-white shadow text-black' : 'text-gray-500 dark:text-gray-300'}`}>فشرده</button>
                                </div>
                            </div>
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
                                        <span>حالت هوشمند زمان‌بندی (BioTheme)</span>
                                    </>
                                }
                            />
                            <AnimatedSwitch
                                checked={Boolean(settings?.strictLockEnabled)}
                                onChange={() => updateSettings({ strictLockEnabled: !settings?.strictLockEnabled })}
                                label={<span>🔒 قفل سخت تمرکز (Fullscreen + تشخیص خروج)</span>}
                            />
                            <AnimatedSwitch
                                checked={Boolean(settings?.anonymizedLeaderboard)}
                                onChange={() => updateSettings({ anonymizedLeaderboard: !settings?.anonymizedLeaderboard })}
                                label={<span>🕵️ نمایش ناشناس در جدول لیگ (حفظ حریم خصوصی)</span>}
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

                            {/* انتخاب تم رنگی (Theme Palette Picker) */}
                            <div className="p-3 bg-gray-50 dark:bg-gray-900/30 squircle-card border border-gray-200/60 dark:border-gray-800/40 mt-1">
                                <span className="text-xs font-extrabold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                                    <Palette size={16} className="text-purple-500" />
                                    پالت رنگی برنامه
                                </span>
                                <div className="grid grid-cols-3 gap-2.5">
                                    {[
                                        { id: 'indigo', name: 'نیلی نئونی', color: 'from-indigo-500 to-indigo-700', border: 'border-indigo-500/20' },
                                        { id: 'forest', name: 'جنگل آرام', color: 'from-emerald-500 to-green-600', border: 'border-emerald-500/20' },
                                        { id: 'rosegold', name: 'رز گلد لوکس', color: 'from-rose-400 to-rose-600', border: 'border-rose-500/20' }
                                    ].map(theme => (
                                        <button
                                            key={theme.id}
                                            type="button"
                                            onClick={() => setThemePalette(theme.id as any)}
                                            className={`relative p-3.5 squircle-sm border text-center transition-all duration-300 flex flex-col items-center gap-2 cursor-pointer btn-micro-interactive ${
                                                themePalette === theme.id
                                                    ? 'bg-white dark:bg-gray-800 border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                                                    : 'bg-transparent border-gray-200 dark:border-gray-700 hover:bg-white/5 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                        >
                                            <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${theme.color} shadow-inner flex items-center justify-center`}>
                                                {themePalette === theme.id && <Check size={14} className="text-white drop-shadow" />}
                                            </div>
                                            <span className="text-[10px] font-black text-gray-800 dark:text-gray-200">{theme.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Backup */}
                    <div className="bg-white dark:bg-gray-800 p-5 squircle-lg shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                <HardDrive size={20} />
                                <h2 className="font-bold">پشتیبان‌گیری</h2>
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row gap-2">
                            <button onClick={exportData} className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 py-2 rounded-xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition flex items-center justify-center gap-1"><Download size={14} /> دانلود</button>
                            <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 py-2 rounded-xl text-xs font-bold hover:bg-sky-100 dark:hover:bg-sky-900/40 transition flex items-center justify-center gap-1"><Upload size={14} /> بازگردانی</button>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                    </div>
                </div>
            </div>

            {/* --- Print Settings --- */}
            <div className="bg-white dark:bg-gray-800 p-5 squircle-lg shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4 text-sky-600 dark:text-sky-400">
                    <Printer size={20} />
                    <h2 className="font-bold">چاپ برنامه</h2>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex-1 leading-6">
                        دریافت فایل PDF استاندارد و مرتب از کل برنامه مطالعاتی، تسک‌ها و تحلیل‌ها جهت چاپ یا ذخیره.
                        برای بهترین نتیجه، در تنظیمات چاپ گزینه "Background graphics" را فعال کنید.
                    </p>
                    <button
                        onClick={() => window.print()}
                        className="w-full sm:w-auto px-6 py-3 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition shadow-sm border border-sky-100 dark:border-sky-800"
                    >
                        <Printer size={18} />
                        دانلود / چاپ برنامه
                    </button>
                </div>
            </div>



            {/* Cloud Settings */}
            <FirebaseSettings />

            {/* Sync Controls (Only if connected) */}
            {firebaseConfig && (
                <div className="bg-white dark:bg-gray-800 p-5 squircle-lg shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <RefreshCw size={18} className="text-blue-500" />
                            همگام‌سازی دستی
                        </h2>
                    </div>
                    {(deadLetterCount ?? 0) > 0 && (
                        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                <AlertTriangle size={16} />
                                {deadLetterCount} تغییر در صف ناموفق همگام‌سازی باقی مانده است.
                            </span>
                            <button
                                type="button"
                                onClick={() => retryDeadLetters()}
                                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer shrink-0"
                            >
                                تلاش مجدد
                            </button>
                        </div>
                    )}
                    <div className="flex flex-col md:flex-row gap-3">
                        <button type="button" onClick={syncData} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition cursor-pointer">آپلود تغییرات</button>
                        <button type="button" onClick={loadFromCloud} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-200 transition cursor-pointer">دانلود از سرور</button>
                    </div>
                </div>
            )}

            {/* Danger Zone & Archive */}
            <div className="bg-amber-50 dark:bg-amber-900/10 p-5 squircle-lg border border-amber-100 dark:border-amber-900/30 space-y-4">
                <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                    <HistoryIcon size={20} />
                    <h2 className="font-bold">مدیریت دوره‌ها (آرشیو)</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setArchiveTitleInput(`برنامه ${getFullShamsiDate(new Date(startDate))}`);
                            setIsArchiveModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition text-sm shadow-md cursor-pointer"
                    >
                        <Save size={18} />
                        آرشیو برنامه فعلی و شروع جدید
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/history')}
                        className="flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm cursor-pointer"
                    >
                        <Eye size={18} />
                        مشاهده آرشیو و تاریخچه دوره‌ها
                    </button>
                </div>

                <div className="pt-4 border-t border-amber-100 dark:border-amber-900/30">
                    <button
                        type="button"
                        onClick={resetProgress}
                        className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-700 py-2 font-bold text-xs cursor-pointer"
                    >
                        <RefreshCw size={14} />
                        پاک کردن کامل همه داده‌ها (انجام نشود مگر در مورد اضطراری)
                    </button>
                </div>
            </div>

            {/* Help Section (Moved to Bottom) */}
            <HelpSection />

            {/* Controlled Archive Title ModalSheet */}
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

            <div className="text-center mt-8 pb-8">
                <p className="text-[10px] text-gray-300 dark:text-gray-600">ParsaPlan v4.5 - Designed for Excellence</p>
            </div>
        </div>
    );
};

export default Settings;
