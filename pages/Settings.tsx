
import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Save, RefreshCw, User, ShieldAlert, Calendar, Wand2, Download, Upload, HardDrive, Moon, LayoutList, Eye, Sun, HelpCircle, ChevronDown, ChevronUp, CheckCircle2, Cloud, Lock, Clock, BookOpen, Zap, Trophy, Target, Activity, MessageSquare, History, FileText, X, Settings2, Printer } from 'lucide-react';
import { getFullShamsiDate, toJalaali, toGregorian, toIsoString } from '../utils';
import { FirebaseConfig, LogEntry } from '../types';
import { AISettings } from '../components/AISettings';

// --- Components ---

const HelpSection = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const faqs = [
        { q: "چگونه شروع کنم؟", a: "پس از ورود به اپ، تاریخ شروع برنامه را در بخش تنظیمات تنظیم کنید. سپس به داشبورد بروید و تسک‌های روزانه را ببینید. هر تسک را بعد از انجام تیک بزنید.", icon: Zap },
        { q: "سیستم XP و سطح چیست؟", a: "با انجام تسک‌ها و روتین روزانه XP کسب می‌کنید. هر ۱۰۰ XP یک سطح بالاتر می‌روید. در بخش لیگ می‌توانید رتبه خود را ببینید.", icon: Trophy },
        { q: "چگونه ذخیره ابری را فعال کنم؟", a: "در بخش 'مدیریت داده‌های ابری' می‌توانید با وارد کردن اطلاعات فایربیس، ذخیره ابری را فعال کنید. سپس با ثبت‌نام/ورود، اطلاعات شما در همه دستگاه‌ها هماهنگ می‌شود.", icon: Cloud },
        { q: "آیا اطلاعات من پاک می‌شود؟", a: "خیر! اطلاعات به صورت خودکار در مرورگر و (اگر فعال کرده باشید) در سرور ذخیره می‌شود. حتی با رفرش صفحه چیزی پاک نمی‌شود.", icon: HardDrive },
        { q: "روتین روزانه چیست؟", a: "در بخش روتین می‌توانید برنامه ساعتی روزانه خود را تنظیم کنید. می‌توانید از قالب‌های آماده استفاده کنید یا برنامه شخصی بسازید.", icon: Calendar },
        { q: "چگونه درس اضافه کنم؟", a: "در بخش دروس، روی دکمه + کلیک کنید و نام، رنگ و آیکون درس جدید را انتخاب کنید. می‌توانید سپس تسک‌های مربوط به آن درس را اضافه کنید.", icon: BookOpen },
        { q: "تحلیل چه اطلاعاتی نشان می‌دهد؟", a: "بخش تحلیل عملکرد شما را نمایش می‌دهد: نمودار پیشرفت، توازن مطالعه بین دروس، فعالیت ۳۰ روز گذشته، و آمار دقیق هر درس.", icon: Target },
    ];

    return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
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
                            <div className="p-3 bg-white dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-2">
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
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isLogin) await login(username, password);
            else await register(username, password);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 text-center">
                {isLogin ? 'ورود به حساب کاربری' : 'ثبت‌نام حساب جدید'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
                <input
                    type="text"
                    placeholder="نام کاربری"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 transition text-right"
                    dir="ltr"
                />
                <input
                    type="password"
                    placeholder="رمز عبور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 transition text-right"
                    dir="ltr"
                />
                <button
                    type="submit"
                    disabled={loading || !username || !password}
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                    {loading ? '...' : (isLogin ? 'ورود' : 'ثبت‌نام')}
                </button>
            </form>
            <div className="mt-3 text-center">
                <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-[10px] text-indigo-500 hover:text-indigo-600 underline"
                >
                    {isLogin ? 'حساب ندارید؟ ثبت‌نام کنید' : 'حساب دارید؟ وارد شوید'}
                </button>
            </div>
        </div>
    );
};

const FirebaseSettings = () => {
    const { firebaseConfig, updateFirebaseConfig, removeFirebaseConfig, cloudStatus } = useStore();
    const [isEditing, setIsEditing] = useState(!firebaseConfig);
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

    if (!isEditing && firebaseConfig) {
        return (
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3 text-orange-600 dark:text-orange-400">
                        <Cloud size={20} />
                        <h2 className="font-bold">اتصال ابری (Firebase)</h2>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${cloudStatus === 'connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${cloudStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        {cloudStatus === 'connected' ? 'متصل' : 'قطع'}
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 mb-1">Project ID</p>
                    <p className="font-mono text-sm text-gray-800 dark:text-gray-200">{firebaseConfig.projectId}</p>
                </div>
                <div className="flex gap-2 mt-4">
                    <button onClick={() => setIsEditing(true)} className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">ویرایش</button>
                    <button onClick={removeFirebaseConfig} className="flex-1 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition">حذف اتصال</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
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

            <div className="flex gap-2 mt-4">
                {firebaseConfig && <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition">انصراف</button>}
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

const ShamsiDatePicker = ({ date, onChange }: { date: string, onChange: (iso: string) => void }) => {
    // Basic implementation using 3 selects
    const d = new Date(date);
    const [jDate, setJDate] = useState({ jy: 1403, jm: 1, jd: 1 });

    useEffect(() => {
        const { jy, jm, jd } = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
        setJDate({ jy, jm, jd });
    }, [date]);

    const handleChange = (field: 'jy' | 'jm' | 'jd', value: number) => {
        const newJDate = { ...jDate, [field]: value };
        setJDate(newJDate);
        // Convert back to Gregorian for storage
        const gDate = toGregorian(newJDate.jy, newJDate.jm, newJDate.jd);
        onChange(toIsoString(gDate));
    };

    const months = [
        'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
        'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
    ];

    const currentYear = 1403; // Base
    const years = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i); // 1401 to 1410
    const days = Array.from({ length: 31 }, (_, i) => i + 1);

    return (
        <div className="flex items-center gap-2">
            <select
                value={jDate.jd}
                onChange={(e) => handleChange('jd', Number(e.target.value))}
                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white text-sm rounded-xl px-2 py-2 outline-none focus:border-indigo-500 appearance-none text-center cursor-pointer min-w-[50px]"
            >
                {days.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
                value={jDate.jm}
                onChange={(e) => handleChange('jm', Number(e.target.value))}
                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white text-sm rounded-xl px-2 py-2 outline-none focus:border-indigo-500 appearance-none text-center cursor-pointer min-w-[100px]"
            >
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select
                value={jDate.jy}
                onChange={(e) => handleChange('jy', Number(e.target.value))}
                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white text-sm rounded-xl px-2 py-2 outline-none focus:border-indigo-500 appearance-none text-center cursor-pointer min-w-[70px]"
            >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
        </div>
    );
};

// --- New Components for Modal & Logs ---

const RecentChangesLog = ({ category }: { category: string }) => {
    const { auditLog } = useStore();

    // Filter logs based on category
    const filteredLogs = auditLog.filter(log => {
        if (category === 'subjects') return log.action.includes('subject');
        if (category === 'routine') return log.action.includes('routine');
        if (category === 'analysis') return log.action.includes('analysis') || log.action.includes('chart');
        return true;
    });

    if (filteredLogs.length === 0) {
        return (
            <div className="text-center py-10 text-gray-400">
                <History size={40} className="mx-auto mb-2 opacity-30" />
                <p>هیچ تغییری اخیراً ثبت نشده است</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {filteredLogs.map(log => (
                <div key={log.id} className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl flex items-start justify-between border border-gray-100 dark:border-gray-700">
                    <div className="flex gap-3">
                        <div className="mt-1 text-gray-400">
                            <Clock size={16} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{log.details}</p>
                            <span className="text-[10px] text-gray-400 font-mono italic">
                                {log.action}
                            </span>
                        </div>
                    </div>
                    <span className="text-[10px] text-gray-400 dir-ltr font-mono">
                        {new Date(log.timestamp).toLocaleTimeString('fa-IR')}
                    </span>
                </div>
            ))}
        </div>
    );
};

const SettingsModal = ({ isOpen, onClose, category }: { isOpen: boolean, onClose: () => void, category: string | null }) => {
    const [activeTab, setActiveTab] = useState<'settings' | 'history'>('settings');

    if (!isOpen || !category) return null;

    const getTitle = () => {
        switch (category) {
            case 'analysis': return 'تنظیمات تحلیل و آمار';
            case 'subjects': return 'مدیریت دروس';
            case 'routine': return 'تنظیمات روتین';
            default: return 'تنظیمات';
        }
    };

    const getIcon = () => {
        switch (category) {
            case 'analysis': return Target;
            case 'subjects': return BookOpen;
            case 'routine': return Clock;
            default: return Settings2;
        }
    };

    const Icon = getIcon();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg h-[70vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3 text-gray-800 dark:text-white">
                        <Icon size={24} className="text-indigo-500" />
                        <h2 className="text-lg font-bold">{getTitle()}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 gap-2 border-b border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'settings'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                    >
                        <Settings2 size={16} />
                        تنظیمات عمومی
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'history'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                    >
                        <History size={16} />
                        تغییرات اخیر
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {activeTab === 'history' ? (
                        <RecentChangesLog category={category} />
                    ) : (
                        <div className="space-y-4">
                            {/* Content based on category */}
                            {category === 'subjects' && (
                                <div className="text-center py-8">
                                    <BookOpen size={48} className="mx-auto text-emerald-200 mb-4" />
                                    <p className="text-gray-600 dark:text-gray-300 font-bold mb-2">مدیریت دروس</p>
                                    <p className="text-gray-500 text-xs mb-4 max-w-xs mx-auto">برای اضافه کردن، ویرایش یا حذف دروس می‌توانید به صفحه "دروس" مراجعه کنید. در اینجا فقط لاگ تغییرات نمایش داده می‌شود.</p>
                                </div>
                            )}
                            {category === 'routine' && (
                                <div className="text-center py-8">
                                    <Clock size={48} className="mx-auto text-amber-200 mb-4" />
                                    <p className="text-gray-600 dark:text-gray-300 font-bold mb-2">تنظیمات روتین</p>
                                    <p className="text-gray-500 text-xs mb-4 max-w-xs mx-auto">برای ویرایش قالب روتین و زمان‌بندی‌ها، لطفاً از بخش "امروز" استفاده کنید.</p>
                                </div>
                            )}
                            {category === 'analysis' && (
                                <div className="text-center py-8">
                                    <Target size={48} className="mx-auto text-rose-200 mb-4" />
                                    <p className="text-gray-600 dark:text-gray-300 font-bold mb-2">تنظیمات تحلیل</p>
                                    <p className="text-gray-500 text-xs mb-4">تنظیمات پیشرفته نمودارها به زودی اضافه خواهد شد.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Settings = () => {
    const {
        user, login, register, logout, userName, setUserName, userId,
        cloudStatus, syncData, loadFromCloud, firebaseConfig, updateFirebaseConfig, removeFirebaseConfig,
        startDate, setStartDate, autoFixDate, totalDays, setTotalDays,
        exportData, importData, resetProgress,
        darkMode, toggleDarkMode, viewMode, setViewMode, showToast
    } = useStore();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Modal States
    const [modalCategory, setModalCategory] = useState<string | null>(null);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);

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

    const displayUsername = user?.email ? user.email.split('@')[0] : (userName || 'کاربر مهمان');

    // Handle button clicks from the grid
    const handleSectionClick = (category: string) => {
        if (category === 'ai') {
            setIsAIModalOpen(true);
        } else {
            setModalCategory(category);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24 space-y-6">
            <SettingsModal
                isOpen={!!modalCategory}
                onClose={() => setModalCategory(null)}
                category={modalCategory}
            />

            <AISettings
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
            />

            <div>
                <h1 className="text-2xl font-black text-gray-800 dark:text-white">تنظیمات ⚙️</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">مدیریت حساب، ظاهر و پیکربندی برنامه</p>
            </div>

            {/* --- 1. General Settings (Date & Duration) --- */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
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
                            <button onClick={autoFixDate} className="bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 p-2 rounded-xl hover:bg-teal-100 dark:hover:bg-teal-900/40 transition border border-teal-100 dark:border-teal-800" title="یافتن 11 بهمن">
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
                </div>
            </div>

            {/* --- 2. Sections Configuration --- */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { id: 'analysis', title: 'تنظیمات تحلیل', icon: Target, color: 'rose', desc: 'مدیریت نمودارها' },
                    { id: 'subjects', title: 'مدیریت دروس', icon: BookOpen, color: 'emerald', desc: 'ویرایش نام و آیکون' },
                    { id: 'routine', title: 'تنظیمات روتین', icon: Clock, color: 'amber', desc: 'قالب‌های شخصی' },
                    { id: 'ai', title: 'هوش مصنوعی', icon: Zap, color: 'violet', desc: 'پیکربندی دستیار' },
                ].map((item, idx) => (
                    <div
                        key={idx}
                        onClick={() => handleSectionClick(item.id)}
                        className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:shadow-md transition cursor-pointer group active:scale-95"
                    >
                        <div className={`w-10 h-10 rounded-xl bg-${item.color}-50 dark:bg-${item.color}-900/20 text-${item.color}-600 dark:text-${item.color}-400 flex items-center justify-center mb-3 group-hover:scale-110 transition`}>
                            <item.icon size={20} />
                        </div>
                        <h3 className="font-bold text-gray-800 dark:text-white text-sm">{item.title}</h3>
                        <p className="text-[10px] text-gray-400 mt-1">{item.desc}</p>
                    </div>
                ))}
            </div>

            {/* --- 3. Account & Data --- */}
            <div className="grid md:grid-cols-2 gap-6">

                {/* Profile */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
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
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-4 text-purple-600 dark:text-purple-400">
                            <Eye size={20} />
                            <h2 className="font-bold">شخصی‌سازی</h2>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button onClick={toggleDarkMode} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2"><Moon size={16} /> حالت شب</span>
                                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors relative ${darkMode ? 'bg-indigo-500' : 'bg-gray-300'}`} dir="ltr">
                                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform absolute top-0.5 left-0.5 ${darkMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                </div>
                            </button>
                            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2"><LayoutList size={16} /> فشرده</span>
                                <div className="flex bg-gray-200 dark:bg-gray-600 p-0.5 rounded-lg">
                                    <button onClick={() => setViewMode('normal')} className={`px-2 py-0.5 text-[10px] rounded-md transition ${viewMode === 'normal' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>عادی</button>
                                    <button onClick={() => setViewMode('compact')} className={`px-2 py-0.5 text-[10px] rounded-md transition ${viewMode === 'compact' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>فشرده</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Backup */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                <HardDrive size={20} />
                                <h2 className="font-bold">پشتیبان‌گیری</h2>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={exportData} className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 py-2 rounded-xl text-xs font-bold hover:bg-emerald-100 transition flex items-center justify-center gap-1"><Download size={14} /> دانلود</button>
                            <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 py-2 rounded-xl text-xs font-bold hover:bg-sky-100 transition flex items-center justify-center gap-1"><Upload size={14} /> بازگردانی</button>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                    </div>
                </div>
            </div>

            {/* --- Print Settings --- */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
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
                <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <RefreshCw size={18} className="text-blue-500" />
                            همگام‌سازی دستی
                        </h2>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={syncData} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition">آپلود تغییرات</button>
                        <button onClick={loadFromCloud} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-200 transition">دانلود از سرور</button>
                    </div>
                </div>
            )}

            {/* Danger Zone */}
            <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-3xl border border-red-100 dark:border-red-900/30">
                <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
                    <ShieldAlert size={20} />
                    <h2 className="font-bold">منطقه خطر</h2>
                </div>
                <button
                    onClick={resetProgress}
                    className="w-full flex items-center justify-center gap-2 bg-white dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 py-3 rounded-xl font-bold hover:bg-red-50 dark:hover:bg-red-900/40 transition text-sm"
                >
                    <RefreshCw size={18} />
                    شروع مجدد کل برنامه (Reset Factory)
                </button>
            </div>

            {/* Help Section (Moved to Bottom) */}
            <HelpSection />

            <div className="text-center mt-8 pb-8">
                <p className="text-[10px] text-gray-300 dark:text-gray-600">ParsaPlan v4.4 - Designed for Excellence</p>
            </div>
        </div>
    );
};

export default Settings;
