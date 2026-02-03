
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Bot, Sparkles, Key, Loader2, Wand2, Calendar, BookOpen, Clock, AlertCircle, Check, X } from 'lucide-react';
import { Subject } from '../types';

interface AISettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

// System prompts for AI
const SYSTEM_PROMPTS = {
    taskGeneration: `شما یک دستیار هوشمند برای برنامه‌ریزی تحصیلی هستید. وظیفه شما تولید لیست تسک‌های مطالعاتی برای دانش‌آموز کنکوری است.

قواعد:
1. تسک‌ها باید واقع‌بینانه و قابل اجرا باشند
2. هر تسک باید دارای عنوان فارسی، توضیحات کوتاه، و اولویت (بالا/متوسط/پایین) باشد
3. تسک‌ها را بر اساس درس‌های موجود توزیع کنید
4. برای هر روز حداکثر 5-7 تسک تولید کنید
5. خروجی را به صورت JSON بدهید

فرمت خروجی:
[{"title": "عنوان تسک", "subject": "درس", "priority": "high|medium|low", "description": "توضیحات کوتاه"}]`,

    routineGeneration: `شما یک دستیار برنامه‌ریزی روزانه هستید. وظیفه شما تولید یک برنامه روزانه بهینه برای دانش‌آموز کنکوری است.

قواعد:
1. زمان‌بندی از ساعت 6 صبح تا 11 شب باشد
2. هر اسلات شامل عنوان، زمان، نوع (مطالعه/استراحت/ورزش/خواب) و توضیحات باشد
3. استراحت‌های کوتاه بین مطالعات قرار دهید
4. تعادل بین دروس مختلف رعایت شود

فرمت خروجی:
[{"title": "عنوان", "time": "08:00 - 09:30", "type": "study|rest|exercise|class", "description": "توضیحات"}]`
};

export const AISettings: React.FC<AISettingsProps> = ({ isOpen, onClose }) => {
    const { showToast, addTask, getDayDate, totalDays } = useStore();
    const [apiKey, setApiKey] = useState('');
    const [savedApiKey, setSavedApiKey] = useState<string | null>(() => localStorage.getItem('openai_api_key'));
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3]);
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([Subject.Biology, Subject.Physics, Subject.Chemistry]);
    const [generatedTasks, setGeneratedTasks] = useState<any[]>([]);

    const handleSaveApiKey = () => {
        if (!apiKey.trim()) {
            showToast('لطفاً API Key را وارد کنید', 'warning');
            return;
        }
        localStorage.setItem('openai_api_key', apiKey);
        setSavedApiKey(apiKey);
        setApiKey('');
        showToast('API Key ذخیره شد', 'success');
    };

    const handleRemoveApiKey = () => {
        localStorage.removeItem('openai_api_key');
        setSavedApiKey(null);
        showToast('API Key حذف شد', 'warning');
    };

    const generateTasks = async () => {
        if (!savedApiKey) {
            showToast('ابتدا API Key را وارد کنید', 'warning');
            return;
        }

        setIsGenerating(true);
        setGeneratedTasks([]);

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${savedApiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPTS.taskGeneration },
                        {
                            role: 'user',
                            content: `برای ${selectedDays.length} روز آینده، تسک‌های مطالعاتی برای دروس ${selectedSubjects.join('، ')} تولید کن. در مجموع ${totalDays} روز تا کنکور مانده.`
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                })
            });

            if (!response.ok) {
                throw new Error('خطا در ارتباط با API');
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;

            // Parse JSON from response
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const tasks = JSON.parse(jsonMatch[0]);
                setGeneratedTasks(tasks);
                showToast(`${tasks.length} تسک تولید شد`, 'success');
            } else {
                throw new Error('خروجی نامعتبر');
            }
        } catch (error: any) {
            console.error('AI Error:', error);
            showToast(error.message || 'خطا در تولید تسک‌ها', 'error');
        }

        setIsGenerating(false);
    };

    const applyGeneratedTasks = () => {
        generatedTasks.forEach((task, index) => {
            const dayIndex = index % selectedDays.length;
            const date = getDayDate(selectedDays[dayIndex]);

            addTask({
                id: crypto.randomUUID(),
                title: task.title,
                subject: task.subject || Subject.Custom,
                priority: task.priority === 'high' ? 'high' : task.priority === 'low' ? 'low' : 'medium',
                isCompleted: false,
                date: date,
                note: task.description || ''
            });
        });

        showToast(`${generatedTasks.length} تسک به برنامه اضافه شد`, 'success');
        setGeneratedTasks([]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-violet-500 to-purple-600 text-white">
                    <div className="flex items-center gap-3">
                        <Bot size={24} />
                        <div>
                            <h2 className="text-lg font-bold">دستیار هوشمند</h2>
                            <p className="text-xs opacity-80">تولید خودکار برنامه با هوش مصنوعی</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                    {/* API Key Section */}
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-3">
                            <Key size={16} className="text-violet-500" />
                            <span className="font-bold text-sm text-gray-700 dark:text-gray-200">OpenAI API Key</span>
                        </div>

                        {savedApiKey ? (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Check size={16} className="text-green-500" />
                                    <span className="text-xs text-green-600 dark:text-green-400">API Key ذخیره شده</span>
                                    <code className="text-[10px] bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">...{savedApiKey.slice(-8)}</code>
                                </div>
                                <button onClick={handleRemoveApiKey} className="text-xs text-rose-500 hover:text-rose-600">
                                    حذف
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="sk-..."
                                    className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-violet-500"
                                />
                                <button
                                    onClick={handleSaveApiKey}
                                    className="bg-violet-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-violet-700 transition"
                                >
                                    ذخیره
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                        <div className="flex gap-2">
                            <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                برای استفاده از این قابلیت نیاز به API Key از <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI</a> دارید.
                            </p>
                        </div>
                    </div>

                    {/* Day Selection */}
                    <div>
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
                            <Calendar size={16} />
                            روزهای هدف
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                <button
                                    key={day}
                                    onClick={() => {
                                        setSelectedDays(prev =>
                                            prev.includes(day)
                                                ? prev.filter(d => d !== day)
                                                : [...prev, day]
                                        );
                                    }}
                                    className={`w-10 h-10 rounded-xl text-sm font-bold transition ${selectedDays.includes(day)
                                            ? 'bg-violet-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                        }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Subject Selection */}
                    <div>
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
                            <BookOpen size={16} />
                            دروس
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {Object.values(Subject).filter(s => s !== Subject.Custom).map(subject => (
                                <button
                                    key={subject}
                                    onClick={() => {
                                        setSelectedSubjects(prev =>
                                            prev.includes(subject)
                                                ? prev.filter(s => s !== subject)
                                                : [...prev, subject]
                                        );
                                    }}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition ${selectedSubjects.includes(subject)
                                            ? 'bg-violet-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                        }`}
                                >
                                    {subject}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={generateTasks}
                        disabled={isGenerating || !savedApiKey || selectedDays.length === 0}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white py-4 rounded-2xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-95"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                در حال تولید...
                            </>
                        ) : (
                            <>
                                <Sparkles size={20} />
                                تولید برنامه با AI
                            </>
                        )}
                    </button>

                    {/* Generated Tasks Preview */}
                    {generatedTasks.length > 0 && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-bold text-green-700 dark:text-green-300 text-sm">
                                    {generatedTasks.length} تسک آماده افزودن
                                </span>
                                <button
                                    onClick={applyGeneratedTasks}
                                    className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-700 transition flex items-center gap-1"
                                >
                                    <Check size={14} />
                                    اضافه کن
                                </button>
                            </div>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {generatedTasks.map((task, i) => (
                                    <div key={i} className="bg-white dark:bg-gray-800 p-2 rounded-lg text-xs">
                                        <span className="font-bold text-gray-700 dark:text-gray-200">{task.title}</span>
                                        <span className="text-gray-400 mr-2">({task.subject})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AISettings;
