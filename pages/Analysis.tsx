
import React from 'react';
import { useStore } from '../context/StoreContext';
import { Subject } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, CheckCircle, Clock, Award, Target, Zap, Activity, FileText } from 'lucide-react';
import ActivityHeatmap from '../components/ActivityHeatmap';

const Analysis = () => {
    const { tasks, getProgress, subjects } = useStore();

    // --- 1. Basic Stats ---
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.isCompleted);
    const completedCount = completedTasks.length;
    const overallProgress = getProgress();

    // --- 2. Advanced Metrics ---

    // Duration
    const totalDurationMinutes = completedTasks.reduce((acc, t) => acc + (t.actualDuration || 0), 0);
    const totalDurationHours = Math.round(totalDurationMinutes / 60 * 10) / 10;

    // Quality (Average 1-5)
    const ratedTasks = completedTasks.filter(t => t.qualityRating);
    const averageQuality = ratedTasks.length > 0
        ? Math.round((ratedTasks.reduce((acc, t) => acc + (t.qualityRating || 0), 0) / ratedTasks.length) * 10) / 10
        : 0;

    // Test Accuracy
    const testedTasks = completedTasks.filter(t => t.testStats && t.testStats.total > 0);
    const totalTests = testedTasks.reduce((acc, t) => acc + (t.testStats?.total || 0), 0);
    const totalCorrect = testedTasks.reduce((acc, t) => acc + (t.testStats?.correct || 0), 0);
    const totalWrong = testedTasks.reduce((acc, t) => acc + (t.testStats?.wrong || 0), 0);

    const accuracy = totalTests > 0
        ? Math.round(((totalCorrect * 3 - totalWrong) / (totalTests * 3)) * 100)
        : 0;

    // --- 3. Subject-wise Deep Analysis ---
    // Get all active subjects from Store (dynamic list) - ensures new/empty subjects are shown
    const allSubjectNames = subjects.map(s => s.name);

    // Sort logic? Maybe default order or alphabetical? 
    // Store order is likely insertion order, which is fine.

    const subjectAnalysis = allSubjectNames.map(subject => {
        const subTasks = tasks.filter(t => t.subject === subject);
        const subCompleted = subTasks.filter(t => t.isCompleted);

        // Progress
        const progress = subTasks.length > 0 ? Math.round((subCompleted.length / subTasks.length) * 100) : 0;

        // Avg Quality
        const subRated = subCompleted.filter(t => t.qualityRating);
        const avgQ = subRated.length > 0
            ? (subRated.reduce((acc, t) => acc + (t.qualityRating || 0), 0) / subRated.length)
            : 0;

        // Test Stats - Count tests per subject
        const subTested = subCompleted.filter(t => t.testStats && t.testStats.total > 0);
        const sTotal = subTested.reduce((acc, t) => acc + (t.testStats?.total || 0), 0);
        const sCorrect = subTested.reduce((acc, t) => acc + (t.testStats?.correct || 0), 0);
        const sWrong = subTested.reduce((acc, t) => acc + (t.testStats?.wrong || 0), 0);
        const sAcc = sTotal > 0 ? Math.round(((sCorrect * 3 - sWrong) / (sTotal * 3)) * 100) : 0;

        return {
            subject,
            progress,
            qualityScore: avgQ * 20, // 1-5 to 20-100
            displayQuality: avgQ,
            accuracy: sAcc > 0 ? sAcc : 0,
            realAccuracy: sAcc,
            completedCount: subCompleted.length,
            totalCount: subTasks.length,
            // NEW: Test counts
            totalTests: sTotal,
            correctTests: sCorrect,
            wrongTests: sWrong
        };
    });

    const StatCard = ({ title, value, subtitle, icon: Icon, colorName }: any) => (
        <div className="bg-white dark:bg-gray-800 p-4 lg:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between relative overflow-hidden group">
            <div className={`absolute right-0 top-0 w-20 h-20 opacity-10 -mr-6 -mt-6 rounded-full transition-transform group-hover:scale-125 bg-${colorName}-500`}></div>
            <div className="relative z-10">
                <p className="text-gray-500 dark:text-gray-400 text-xs font-bold mb-1">{title}</p>
                <h3 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">{value}</h3>
                <p className={`text-xs mt-1 font-bold text-${colorName}-700 dark:text-${colorName}-400`}>{subtitle}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${colorName}-50 dark:bg-${colorName}-900/20 text-${colorName}-600 dark:text-${colorName}-400 relative z-10`}>
                <Icon size={24} />
            </div>
        </div>
    );

    // --- 4. Tabs & UI ---
    const [activeTab, setActiveTab] = React.useState<'general' | 'exam'>('general');

    // --- Exam Specific Data ---
    const examTasks = tasks.filter(t => t.studyType === 'exam' && t.isCompleted);

    // Exam Trend Data (Date vs Score)
    const examTrendData = examTasks
        .filter(t => t.testStats && t.testStats.total > 0)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(t => {
            const total = t.testStats!.total;
            const correct = t.testStats!.correct;
            const wrong = t.testStats!.wrong;
            const percentage = total > 0 ? Math.round(((correct * 3 - wrong) / (total * 3)) * 100) : 0;
            return {
                date: t.date.split('T')[0], // Simple date
                shamsiDate: new Date(t.date).toLocaleDateString('fa-IR'), // Rough estimation or use helper
                score: percentage > 0 ? percentage : 0,
                subject: t.subject
            };
        });

    return (
        <div className="p-4 md:p-6 pb-32 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 dark:text-white">داشبورد تحلیل 📊</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">نگاهی عمیق به کمیت و کیفیت مطالعه شما</p>
                </div>

                {/* Tab Switcher */}
                <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-xl flex">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'general' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        مطالعه عمومی
                    </button>
                    <button
                        onClick={() => setActiveTab('exam')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'exam' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        تحلیل آزمون‌ها
                    </button>
                </div>
            </div>

            {activeTab === 'general' ? (
                <>
                    {/* Feature 2: Heatmap */}
                    <ActivityHeatmap />

                    {/* Top Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            title="ساعت مطالعه کل"
                            value={totalDurationHours}
                            subtitle="ساعت مفید"
                            icon={Clock}
                            colorName="indigo"
                        />
                        <StatCard
                            title="میانگین تمرکز"
                            value={averageQuality || '-'}
                            subtitle="از ۵ ستاره"
                            icon={Zap}
                            colorName="amber"
                        />
                        <StatCard
                            title="دقت تست‌زنی"
                            value={accuracy + '%'}
                            subtitle={`${totalTests} تست زده شده`}
                            icon={Target}
                            colorName="emerald"
                        />
                        <StatCard
                            title="پیشرفت کل"
                            value={`${overallProgress}%`}
                            subtitle={`${completedCount} از ${totalTasks} تسک`}
                            icon={Award}
                            colorName="rose"
                        />
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6">

                        {/* 1. Radar Chart */}
                        <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                            <div className="mb-4">
                                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Activity size={18} className="text-indigo-500" />
                                    تعادل مطالعاتی
                                </h3>
                            </div>
                            <div className="flex-1 min-h-[250px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={subjectAnalysis}>
                                        <PolarGrid stroke="#9ca3af" strokeOpacity={0.3} />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 'bold' }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar
                                            name="پیشرفت"
                                            dataKey="progress"
                                            stroke="#4f46e5"
                                            strokeWidth={2}
                                            fill="#4f46e5"
                                            fillOpacity={0.2}
                                        />
                                        <Radar
                                            name="دقت"
                                            dataKey="accuracy"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                            fill="#10b981"
                                            fillOpacity={0.2}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', fontSize: '12px', color: '#000' }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 2. Detailed Table/Bars */}
                        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                <TrendingUp size={18} className="text-emerald-500" />
                                جزئیات عملکرد دروس
                            </h3>
                            <div className="space-y-6">
                                {subjectAnalysis.map((sub, idx) => (
                                    <div key={idx} className="group">
                                        <div className="flex justify-between items-end mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300`}>
                                                    {sub.subject[0]}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">{sub.subject}</h4>
                                                    <div className="flex gap-2 text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                                        <span>کیفیت: {sub.displayQuality > 0 ? sub.displayQuality.toFixed(1) : '-'}</span>
                                                        <span>•</span>
                                                        <span>{sub.completedCount} تسک</span>
                                                        {sub.totalTests > 0 && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="text-emerald-600 dark:text-emerald-400">{sub.totalTests} تست ({sub.correctTests}✓)</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`block text-lg font-black ${sub.realAccuracy >= 50 ? 'text-emerald-600' : sub.realAccuracy > 0 ? 'text-amber-500' : 'text-gray-300'}`}>
                                                    {sub.realAccuracy > 0 ? sub.realAccuracy + '%' : '-'}
                                                </span>
                                                <span className="text-[10px] text-gray-400">دقت تست</span>
                                            </div>
                                        </div>

                                        <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-indigo-500" style={{ width: `${sub.progress}%` }} title="پیشرفت حجمی"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-5">
                    {/* Exam Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            title="تعداد آزمون‌ها"
                            value={examTasks.length}
                            subtitle="شرکت کرده"
                            icon={FileText}
                            colorName="indigo"
                        />
                        <StatCard
                            title="میانگین تراز/درصد"
                            value={examTrendData.length > 0 ? Math.round(examTrendData.reduce((a, b) => a + b.score, 0) / examTrendData.length) + '%' : '-'}
                            subtitle="کل آزمون‌ها"
                            icon={Award}
                            colorName="amber"
                        />
                        {/* More exam stats can be added here */}
                    </div>

                    {/* Exam Trend Chart */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 min-h-[300px]">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                            <TrendingUp size={18} className="text-indigo-500" />
                            روند پیشرفت آزمون‌ها
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={examTrendData}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                                    labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                                />
                                <Area type="monotone" dataKey="score" stroke="#8884d8" fillOpacity={1} fill="url(#colorScore)" name="درصد کل" />
                            </AreaChart>
                        </ResponsiveContainer>
                        {examTrendData.length === 0 && <p className="text-center text-gray-400 text-sm mt-4">هیچ داده‌ای برای نمایش وجود ندارد.</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Analysis;
