import React, { useState } from 'react';
import {
    Sparkles, Mic, Link2, ImagePlus, Send, Settings2,
    GraduationCap, ClipboardList, CalendarDays, BookOpen, School
} from 'lucide-react';

/* ===== کامپوننت پنل دستیار هوشمند AI =====
   این پنل در ستون سمت چپ داشبورد قرار می‌گیرد و شامل:
   - هدر با عنوان و دکمه Pro Account
   - پیام خوش‌آمد
   - دکمه‌های دسترسی سریع (Quick Categories)
   - پیشنهادات هوشمند (Suggestion Chips)
   - فیلد ورودی مینیمال
*/

// دسته‌بندی‌های سریع
const quickCategories = [
    { label: 'امتحانات', icon: GraduationCap, color: 'text-purple-600 bg-purple-50' },
    { label: 'تکالیف', icon: ClipboardList, color: 'text-blue-600 bg-blue-50' },
    { label: 'رویدادها', icon: CalendarDays, color: 'text-orange-600 bg-orange-50' },
    { label: 'برنامه', icon: BookOpen, color: 'text-amber-600 bg-amber-50' },
    { label: 'کلاس‌ها', icon: School, color: 'text-green-600 bg-green-50' },
];

// پیشنهادات هوشمند
const suggestions = [
    'ساخت ۱۰ سوال ریاضی',
    'برنامه مطالعه امتحان',
    'کمک در تکالیف',
];

const AIChatPanel: React.FC = () => {
    const [message, setMessage] = useState('');

    return (
        <div className="flex flex-col h-full bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100/80 overflow-hidden">
            {/* ===== هدر پنل ===== */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-indigo-500" />
                    <h3 className="text-sm font-extrabold text-gray-800">دستیار AI شما</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 bg-gray-900 text-white text-[10px] font-bold rounded-full flex items-center gap-1.5 hover:bg-gray-800 transition-all active:scale-95">
                        <Sparkles size={11} />
                        Pro Account
                    </button>
                    <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 transition">
                        <Settings2 size={16} />
                    </button>
                </div>
            </div>

            {/* ===== محتوای اصلی ===== */}
            <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 overflow-y-auto">
                {/* پیام خوش‌آمد */}
                <div className="text-center mb-6">
                    <h2 className="text-xl font-black text-gray-800 mb-2 leading-relaxed">
                        چطور می‌تونم<br />کمکت کنم، <span className="text-indigo-600">امیر</span>؟
                    </h2>
                    <p className="text-xs text-gray-400 leading-relaxed max-w-[200px] mx-auto">
                        درباره وضعیت تحصیلی، تکالیف، امتحانات و دروست سوال بپرس.
                    </p>
                </div>

                {/* دکمه‌های دسته‌بندی سریع */}
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {quickCategories.map((cat) => (
                        <button
                            key={cat.label}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border border-gray-100 hover:shadow-sm transition-all active:scale-95 ${cat.color}`}
                        >
                            <cat.icon size={14} />
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ===== پیشنهادات هوشمند ===== */}
            <div className="px-4 pb-3">
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {suggestions.map((s) => (
                        <button
                            key={s}
                            className="whitespace-nowrap px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-[10px] font-bold rounded-xl border border-gray-100 transition-all active:scale-95"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* ===== فیلد ورودی پیام ===== */}
            <div className="px-4 pb-4">
                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-3">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="چطور می‌تونم کمکت کنم؟"
                        className="w-full bg-transparent text-sm outline-none text-gray-700 placeholder:text-gray-400 mb-3"
                    />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <button className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
                                <Mic size={16} />
                            </button>
                            <button className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
                                <Link2 size={16} />
                            </button>
                            <button className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
                                <ImagePlus size={16} />
                            </button>
                        </div>
                        <button
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 ${message.trim()
                                    ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                            disabled={!message.trim()}
                        >
                            Send
                            <Send size={13} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIChatPanel;
