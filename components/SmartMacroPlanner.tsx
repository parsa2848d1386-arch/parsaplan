import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Target, BrainCircuit, Activity, BookOpen, Star, Sparkles, Moon, Loader2 } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

const tryParseJson = (str: string) => {
    try {
        return JSON.parse(str);
    } catch {
        return null;
    }
};

export default function SmartMacroPlanner() {
    const { tasks, getProgress, studyHoursLog, subjects, geminiApiKey, settings } = useStore();

    const [step, setStep] = useState(0);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiReport, setAiReport] = useState<any>(null);

    // Form State
    const [profile, setProfile] = useState({
        targetRank: '',
        examProvider: 'ghalamchi',
        examScore: '',
        sleepHours: 7,
        mathLevel: 'medium',
        scienceLevel: 'medium',
        readingLevel: 'medium'
    });

    const EXAM_PROVIDERS = [
        { id: 'ghalamchi', label: 'قلم‌چی' },
        { id: 'maz', label: 'ماز' },
        { id: 'sanjesh', label: 'سنجش' },
        { id: 'gaj', label: 'گاج' },
        { id: 'other', label: 'سایر / مدرسه' }
    ];

    const RESOURCE_LEVELS = [
        { id: 'weak', label: 'پایه و ضعیف (درسنامه محور)' },
        { id: 'medium', label: 'متوسط و استاندارد' },
        { id: 'hard', label: 'سخت و چالشی (آی‌کیو، نردبام...)' }
    ];

    const handleAnalyze = async () => {
        const activeApiKey = geminiApiKey || (import.meta as any).env.VITE_GEMINI_API_KEY;
        if (!activeApiKey) {
            alert('ابتدا باید API Key جمینای را در تنظیمات وارد کنید.');
            return;
        }
        setStep(3); // Analyzing step
        setIsAnalyzing(true);

        const ai = new GoogleGenerativeAI(activeApiKey);
        if (!ai) {
            setIsAnalyzing(false);
            setStep(0);
            return;
        }

        const completed = tasks.filter(t => t.isCompleted);
        const totalDuration = completed.reduce((acc, t) => acc + (t.actualDuration || 0), 0) / 60;
        const testTasks = completed.filter(t => t.testStats && t.testStats.total > 0);
        const totalTests = testTasks.reduce((acc, t) => acc + (t.testStats?.total || 0), 0);
        const totalCorrect = testTasks.reduce((acc, t) => acc + (t.testStats?.correct || 0), 0);

        const prompt = `
        You are a highly professional Iranian University Entrance Exam (Konkur) consultant.
        Analyze the student's status based on this data and provide a JSON response.
        
        System Data:
        - Study Hours Tracked: ${totalDuration.toFixed(1)} hours
        - Total Tasks Completed: ${completed.length}
        - Total Tests Practiced: ${totalTests} (Correct: ${totalCorrect})
        - General Progress: ${getProgress()}%
        
        Student Questionnaire:
        - Target: ${profile.targetRank}
        - Exam Provider: ${profile.examProvider} (Score/Level: ${profile.examScore})
        - Daily Sleep: ${profile.sleepHours} hours
        - Math/Physics Books Level: ${profile.mathLevel}
        - Biology/Chemistry Books Level: ${profile.scienceLevel}
        - General Subjects Level: ${profile.readingLevel}

        Return exactly a JSON format like this:
        {
            "overview": "a short paragraph of the overall situation",
            "strengths": ["point 1", "point 2"],
            "weaknesses": ["point 1", "point 2"],
            "actionPlan": ["action 1", "action 2", "action 3"],
            "resourceAdvice": "specific advice on tests and books based on their current level and target"
        }
        Do not use markdown blocks (\`\`\`). Just plain JSON text. Write in friendly Persian.
        `;

        try {
            const model = ai.getGenerativeModel({ model: settings?.geminiModel || 'gemini-1.5-flash' });
            const result = await model.generateContent(prompt);
            const response = result.response.text();

            const parsed = tryParseJson(response.replace(/```json/g, '').replace(/```/g, ''));
            if (parsed && parsed.overview) {
                setAiReport(parsed);
                setStep(4); // Result step
            } else {
                throw new Error("Invalid output format from AI");
            }
        } catch (e) {
            console.error(e);
            alert('متاسفانه در تحلیل مشکلی پیش آمد. دوباره تلاش کنید.');
            setStep(0);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {step === 0 && (
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <BrainCircuit size={32} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h2 className="text-xl font-black text-gray-800 dark:text-white mb-2">مشاور هوشمند فاز ۷</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6 leading-relaxed">
                        این بخش فراتر از آمارهای عادی عمل می‌کند. با پرسیدن شرایط آزمون‌ها و منابعی که می‌خوانید، الگوریتم هوش مصنوعی یک <b>نقشه راه دقیق و شخصی‌سازی شده</b> برای شما تدوین می‌کند.
                    </p>
                    <button onClick={() => setStep(1)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md shadow-indigo-200 dark:shadow-none transition flex items-center gap-2 mx-auto">
                        <Sparkles size={18} /> شروع تحلیل هوشمند
                    </button>
                </div>
            )}

            {step === 1 && (
                <div className="p-6 md:p-8 animate-in slide-in-from-left-4">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                        <Target className="text-indigo-500" /> اطلاعات پایه و هدف‌گذاری
                    </h3>

                    <div className="space-y-4 max-w-md mx-auto">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">رتبه و رشته هدف شما چیست؟</label>
                            <input value={profile.targetRank} onChange={e => setProfile({ ...profile, targetRank: e.target.value })} type="text" placeholder="مثلا: پزشکی تهران، مهندسی کامپیوتر شریف" className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">در کدام آزمون آزمایشی شرکت می‌کنید؟</label>
                            <div className="grid grid-cols-3 gap-2">
                                {EXAM_PROVIDERS.map(ep => (
                                    <button
                                        key={ep.id}
                                        onClick={() => setProfile({ ...profile, examProvider: ep.id })}
                                        className={`p-2 rounded-xl border text-xs font-bold transition ${profile.examProvider === ep.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-700 dark:text-indigo-300' : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                    >
                                        {ep.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">میانگین تراز یا درصد شما در آزمون‌ها چقدر است؟</label>
                            <input value={profile.examScore} onChange={e => setProfile({ ...profile, examScore: e.target.value })} type="text" placeholder="مثلا: تراز 6500 یا میانگین 40%" className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center gap-1"><Moon size={14} /> میزان خواب شبانه‌روز (ساعت)</label>
                            <input value={profile.sleepHours} onChange={e => setProfile({ ...profile, sleepHours: Number(e.target.value) })} type="range" min="4" max="10" step="0.5" className="w-full accent-indigo-600" />
                            <div className="text-center text-indigo-600 font-bold mt-1">{profile.sleepHours} ساعت</div>
                        </div>

                        <div className="pt-4 flex justify-end gap-2">
                            <button onClick={() => setStep(0)} className="px-4 py-2 text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm font-bold transition">انصراف</button>
                            <button onClick={() => setStep(2)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition">مرحله بعد</button>
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="p-6 md:p-8 animate-in slide-in-from-right-4">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                        <BookOpen className="text-emerald-500" /> سطح منابع تستی شما
                    </h3>

                    <div className="space-y-6 max-w-md mx-auto">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">درس‌های ریاضی و فیزیک (محاسباتی)</label>
                            <div className="flex flex-col gap-2 mt-3">
                                {RESOURCE_LEVELS.map(rl => (
                                    <button
                                        key={rl.id}
                                        onClick={() => setProfile({ ...profile, mathLevel: rl.id })}
                                        className={`p-3 rounded-xl border text-sm font-bold transition text-right ${profile.mathLevel === rl.id ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-300' : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                    >
                                        {rl.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">درس‌های زیست و شیمی یا دروس تخصصی دیگر</label>
                            <div className="flex flex-col gap-2 mt-3">
                                {RESOURCE_LEVELS.map(rl => (
                                    <button
                                        key={rl.id}
                                        onClick={() => setProfile({ ...profile, scienceLevel: rl.id })}
                                        className={`p-3 rounded-xl border text-sm font-bold transition text-right ${profile.scienceLevel === rl.id ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-300' : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                    >
                                        {rl.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 flex justify-between items-center">
                            <button onClick={() => setStep(1)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-bold flex items-center gap-1"><Target size={14} /> بازگشت</button>
                            <button onClick={handleAnalyze} className="px-6 py-3 bg-gradient-to-l from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition flex items-center gap-2">
                                <Activity size={18} /> تحلیل و پردازش
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="p-12 text-center animate-in zoom-in-95">
                    <Loader2 size={48} className="animate-spin text-indigo-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">هوش مصنوعی در حال بررسی است...</h3>
                    <p className="text-sm text-gray-500">در حال تطبیق عملکرد شما با رتبه هدف و سطح منابع تستی.</p>
                </div>
            )}

            {step === 4 && aiReport && (
                <div className="p-6 md:p-8 animate-in fade-in">
                    <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                        <div>
                            <h3 className="text-xl font-black text-indigo-700 dark:text-indigo-400 flex items-center gap-2 mb-1">
                                <Sparkles size={22} className="text-amber-500" /> گزارش هوشمند شما
                            </h3>
                            <p className="text-xs font-bold text-gray-500">هدف: {profile.targetRank || 'ثبت نشده'} | آزمون: {EXAM_PROVIDERS.find(e => e.id === profile.examProvider)?.label}</p>
                        </div>
                        <button onClick={() => setStep(0)} className="text-gray-400 hover:text-gray-600">اجرای مجدد</button>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 text-sm leading-8 text-gray-700 dark:text-gray-300">
                            <strong>تحلیل کلی وضعیت: </strong>
                            {aiReport.overview}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                <h4 className="font-bold text-emerald-700 dark:text-emerald-400 mb-3 text-sm">نقاط قوت عملکرد شما</h4>
                                <ul className="space-y-2">
                                    {aiReport.strengths?.map((item: string, i: number) => <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex gap-2 before:content-['✓'] before:text-emerald-500">{item}</li>)}
                                </ul>
                            </div>
                            <div className="bg-rose-50 dark:bg-rose-900/10 p-5 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                                <h4 className="font-bold text-rose-700 dark:text-rose-400 mb-3 text-sm">چالش‌ها و نیاز به توجه</h4>
                                <ul className="space-y-2">
                                    {aiReport.weaknesses?.map((item: string, i: number) => <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex gap-2 before:content-['⚠'] before:text-rose-500">{item}</li>)}
                                </ul>
                            </div>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                            <h4 className="font-bold text-amber-700 dark:text-amber-400 mb-3 text-sm flex items-center gap-2"><Star size={16} /> برنامه عملیاتی (نقشه راه)</h4>
                            <ul className="space-y-3">
                                {aiReport.actionPlan?.map((item: string, i: number) => (
                                    <li key={i} className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-start gap-2 bg-white/50 dark:bg-gray-800/50 p-2 rounded-lg">
                                        <span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-700 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">{i + 1}</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-2xl border border-gray-100 dark:border-gray-600">
                            <h4 className="font-bold text-gray-800 dark:text-white mb-2 text-sm flex items-center gap-2"><BookOpen size={16} className="text-blue-500" /> مشاوره منابع تستی</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                                {aiReport.resourceAdvice}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
