
import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Save, RefreshCw, User, ShieldAlert, Calendar, Wand2, Download, Upload, HardDrive, Moon, LayoutList, Eye, Sun, History, Printer, HelpCircle, ChevronDown, ChevronUp, CheckCircle2, Cloud, CloudOff, Lock, Code, Trash2, Clock } from 'lucide-react';
import { getFullShamsiDate } from '../utils';
import { FirebaseConfig } from '../types';

const HelpSection = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const faqs = [
        {
            q: "آیا اطلاعات من با رفرش صفحه پاک می‌شود؟",
            a: "خیر! سیستم جدید (نسخه ۴) اطلاعات را به صورت ایمن در حافظه مرورگر ذخیره می‌کند."
        },
        {
            q: "چگونه فایربیس (ذخیره ابری) را فعال کنم؟",
            a: "به کنسول فایربیس بروید، یک پروژه بسازید، Firestore را فعال کنید و تنظیمات Web App را کپی کرده و در بخش 'تنظیمات فایربیس' در همین صفحه وارد کنید."
        },
        {
            q: "چسباندن هوشمند (Smart Paste) چیست؟",
            a: "شما می‌توانید کل کد تنظیمات (const firebaseConfig = { ... }) را از کنسول فایربیس کپی کرده و در کادر مربوطه پیست کنید. برنامه خودش اطلاعات لازم را استخراج می‌کند."
        }
    ];

    return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4 text-cyan-600 dark:text-cyan-400">
                <HelpCircle size={20} />
                <h2 className="font-bold">راهنما</h2>
            </div>
            <div className="space-y-2">
                {faqs.map((item, index) => (
                    <div key={index} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setOpenIndex(openIndex === index ? null : index)}
                            className="w-full flex justify-between items-center p-3 text-right bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200 leading-5">{item.q}</span>
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
            const regex = new RegExp(`${key}:\\s*["']([^"']+)["']`);
            const match = text.match(regex);
            return match ? match[1] : '';
        };

        const newConfig = {
            apiKey: extract('apiKey'),
            authDomain: extract('authDomain'),
            projectId: extract('projectId'),
            storageBucket: extract('storageBucket'),
            messagingSenderId: extract('messagingSenderId'),
            appId: extract('appId')
        };

        // If simple JSON pasted
        if (!newConfig.apiKey) {
            try {
                const json = JSON.parse(text);
                setForm({ ...form, ...json });
                return;
            } catch (e) { }
        }

        if (newConfig.apiKey) setForm({ ...form, ...newConfig });
    };

    const handleSave = () => {
        updateFirebaseConfig(form);
        setIsEditing(false);
    };

    if (!isEditing && firebaseConfig) {
        return (
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                        <Cloud size={20} />
                        <h2 className="font-bold">تنظیمات فایربیس</h2>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${cloudStatus === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {cloudStatus === 'connected' ? 'متصل' : 'قطع'}
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl mb-4 border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 mb-1">Project ID</p>
                    <code className="text-sm font-mono font-bold text-gray-800 dark:text-gray-200">{firebaseConfig.projectId}</code>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsEditing(true)} className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 transition">
                        ویرایش
                    </button>
                    <button onClick={removeFirebaseConfig} className="bg-rose-50 text-rose-600 py-2 px-4 rounded-xl text-xs font-bold hover:bg-rose-100 transition">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4 text-blue-600 dark:text-blue-400">
                <Cloud size={20} />
                <h2 className="font-bold">اتصال به فایربیس</h2>
            </div>

            <div className="space-y-3 mb-4">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800">
                    <p className="text-xs text-indigo-800 dark:text-indigo-300 font-bold mb-2 flex items-center gap-2">
                        <Code size={14} />
                        چسباندن هوشمند (Smart Paste)
                    </p>
                    <textarea
                        rows={3}
                        placeholder="کد کانفیگ فایربیس را اینجا پیست کنید..."
                        className="w-full text-[10px] font-mono p-2 rounded-lg bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 outline-none"
                        value={pasteArea}
                        onChange={(e) => setPasteArea(e.target.value)}
                        onBlur={handleSmartPaste}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <input placeholder="apiKey" value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} className="input-field" />
                    <input placeholder="projectId" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className="input-field" />
                    <input placeholder="authDomain" value={form.authDomain} onChange={e => setForm({ ...form, authDomain: e.target.value })} className="input-field" />
                    <input placeholder="storageBucket" value={form.storageBucket} onChange={e => setForm({ ...form, storageBucket: e.target.value })} className="input-field" />
                    <input placeholder="messagingSenderId" value={form.messagingSenderId} onChange={e => setForm({ ...form, messagingSenderId: e.target.value })} className="input-field" />
                    <input placeholder="appId" value={form.appId} onChange={e => setForm({ ...form, appId: e.target.value })} className="input-field" />
                </div>
            </div>

            <button onClick={handleSave} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition flex justify-center items-center gap-2">
                <Save size={18} />
                ذخیره و اتصال
            </button>
            <style>{`
                .input-field {
                    width: 100%;
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    padding: 0.5rem;
                    font-size: 0.75rem;
                    font-family: monospace;
                    outline: none;
                }
                .dark .input-field {
                    background: #374151;
                    border-color: #4b5563;
                    color: white;
                }
                .input-field:focus {
                    border-color: #4f46e5;
                }
            `}</style>
        </div>
    );
};

const Settings = () => {
    const {
        userName, setUserName, userId, resetProgress,
        startDate, setStartDate, autoFixDate,
        exportData, importData, syncData, loadFromCloud, cloudStatus, firebaseConfig,
        darkMode, toggleDarkMode,
        viewMode, setViewMode,
        totalDays, setTotalDays,
        auditLog, showToast
    } = useStore();

    const nameInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showLog, setShowLog] = useState(false);

    const handleSaveName = () => {
        if (nameInputRef.current) {
            setUserName(nameInputRef.current.value);
        }
    }

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setStartDate(e.target.value);
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            importData(text);
        };
        reader.readAsText(file);
    };

    const handlePrint = () => {
        showToast('در حال آماده‌سازی نسخه چاپی...', 'info');
        setTimeout(() => {
            window.print();
        }, 500);
    }

    return (
        <div className="p-5 pb-20 space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">تنظیمات</h1>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-indigo-600 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                    <Printer size={16} />
                    پرینت برنامه
                </button>
            </div>

            {/* Help Section */}
            <HelpSection />

            {/* New Firebase Config Section */}
            <FirebaseSettings />

            {/* Sync Controls (Only visible if connected) */}
            {firebaseConfig && (
                <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <RefreshCw size={18} className="text-gray-500" />
                            مدیریت داده‌های ابری
                        </h2>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl mb-4 flex justify-between items-center">
                        <span className="text-xs text-gray-500">شناسه کاربری (User ID):</span>
                        <code className="text-[10px] font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded select-all">{userId}</code>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={syncData}
                            className="flex items-center justify-center gap-2 bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 dark:shadow-none"
                        >
                            <Upload size={18} />
                            <span className="text-xs font-bold">آپلود به سرور</span>
                        </button>
                        <button
                            onClick={loadFromCloud}
                            className="flex items-center justify-center gap-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition"
                        >
                            <Download size={18} />
                            <span className="text-xs font-bold">دانلود از سرور</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Profile Section */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4 text-indigo-600 dark:text-indigo-400">
                    <User size={20} />
                    <h2 className="font-bold">پروفایل</h2>
                </div>
                <div className="flex gap-2">
                    <input
                        ref={nameInputRef}
                        defaultValue={userName}
                        type="text"
                        className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition text-sm text-gray-900 dark:text-white"
                    />
                    <button onClick={handleSaveName} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 dark:shadow-none">
                        <Save size={20} />
                    </button>
                </div>
            </div>

            {/* Personalization */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4 text-purple-600 dark:text-purple-400">
                    <Eye size={20} />
                    <h2 className="font-bold">ظاهر و شخصی‌سازی</h2>
                </div>

                <div className="space-y-4">
                    {/* Dark Mode Toggle */}
                    <div className="flex justify-between items-center p-2">
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                            {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                            حالت شب
                        </span>
                        <button
                            onClick={toggleDarkMode}
                            className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 flex items-center ${darkMode ? 'bg-indigo-600 justify-end' : 'bg-gray-200 justify-start'}`}
                        >
                            <div className="w-6 h-6 bg-white rounded-full shadow-sm"></div>
                        </button>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex justify-between items-center p-2">
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                            <LayoutList size={18} />
                            نمایش فشرده
                        </span>
                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                            <button
                                onClick={() => setViewMode('normal')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'normal' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-400'}`}
                            >
                                عادی
                            </button>
                            <button
                                onClick={() => setViewMode('compact')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'compact' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-400'}`}
                            >
                                فشرده
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Backup & Restore */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4 text-emerald-600 dark:text-emerald-400">
                    <HardDrive size={20} />
                    <h2 className="font-bold">پشتیبان‌گیری (فایل)</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={exportData} className="flex flex-col items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 p-4 rounded-2xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition">
                        <Download size={24} />
                        <span className="text-xs font-bold">دانلود بکاپ</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-sky-800 p-4 rounded-2xl hover:bg-sky-100 dark:hover:bg-sky-900/40 transition">
                        <Upload size={24} />
                        <span className="text-xs font-bold">بازگردانی</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                </div>
            </div>

            {/* Audit Log */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div
                    className="flex items-center justify-between mb-4 cursor-pointer"
                    onClick={() => setShowLog(!showLog)}
                >
                    <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                        <History size={20} />
                        <h2 className="font-bold">تاریخچه تغییرات</h2>
                    </div>
                    <span className="text-xs text-gray-400">{showLog ? 'بستن' : 'مشاهده'}</span>
                </div>

                {showLog && (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl">
                        {auditLog.length === 0 ? (
                            <p className="text-center text-xs text-gray-400 py-4">هیچ فعالیتی ثبت نشده است.</p>
                        ) : (
                            auditLog.map(log => (
                                <div key={log.id} className="text-xs border-b border-gray-200 dark:border-gray-700 last:border-0 pb-2 mb-2">
                                    <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-1">
                                        <span className="font-mono">{new Date(log.timestamp).toLocaleTimeString('fa-IR')}</span>
                                        <span className="font-bold">{log.action}</span>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300">{log.details}</p>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Date Settings */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4 text-teal-600 dark:text-teal-400">
                    <Calendar size={20} />
                    <h2 className="font-bold">تقویم و طول دوره</h2>
                </div>
                <div className="flex flex-col gap-4">
                    {/* Start Date */}
                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">تاریخ شروع</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={handleDateChange}
                                className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 outline-none focus:border-indigo-500 transition text-gray-900 dark:text-white"
                            />
                            <button onClick={autoFixDate} className="bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 p-2.5 rounded-xl hover:bg-teal-100 dark:hover:bg-teal-900/40 transition border border-teal-100 dark:border-teal-800">
                                <Wand2 size={20} />
                            </button>
                        </div>
                        <p className="text-xs text-center text-gray-400 mt-1">{getFullShamsiDate(new Date(startDate))}</p>
                    </div>

                    {/* Duration Control */}
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                            <Clock size={14} />
                            طول دوره (روز)
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="7"
                                max="60"
                                value={totalDays}
                                onChange={(e) => setTotalDays(Number(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg font-bold text-sm min-w-[50px] text-center">
                                {totalDays}
                            </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                            <span>۷ روز</span>
                            <span>۶۰ روز</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4 text-rose-600 dark:text-rose-400">
                    <ShieldAlert size={20} />
                    <h2 className="font-bold">منطقه خطر</h2>
                </div>
                <button
                    onClick={resetProgress}
                    className="w-full flex items-center justify-center gap-2 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 py-3 rounded-xl font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition text-sm"
                >
                    <RefreshCw size={18} />
                    شروع مجدد برنامه
                </button>
            </div>

            <div className="text-center mt-8">
                <p className="text-[10px] text-gray-300 dark:text-gray-600">ParsaPlan v4.2</p>
            </div>
        </div>
    );
};

export default Settings;
