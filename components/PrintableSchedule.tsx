
import React from 'react';
import { useStore } from '../context/StoreContext';
import { TOTAL_DAYS } from '../constants';
import { getShamsiDate } from '../utils';

const PrintableSchedule = () => {
    const { getTasksForDay, getDayDate, userName, startDate, getProgress, totalDays } = useStore();

    const days = Array.from({ length: totalDays }, (_, i) => i + 1);

    const getSubjectColor = (subject: string) => {
        if (subject.includes('زیست')) return '#10b981';
        if (subject.includes('ریاضی')) return '#3b82f6';
        if (subject.includes('فیزیک')) return '#8b5cf6';
        if (subject.includes('شیمی')) return '#f97316';
        return '#6b7280';
    };

    return (
        <div className="print-only bg-white text-black font-[Vazirmatn]">
            {/* Cover Page */}
            <div className="h-screen flex flex-col justify-center items-center p-8 page-break-after">
                <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-6 bg-indigo-600 rounded-2xl flex items-center justify-center">
                        <span className="text-white text-4xl font-black">PP</span>
                    </div>
                    <h1 className="text-4xl font-black mb-4">برنامه مطالعاتی ۱۲ روزه</h1>
                    <h2 className="text-2xl font-bold text-gray-600 mb-8">پارسا پلن</h2>

                    <div className="border-t-2 border-b-2 border-gray-300 py-6 my-8">
                        <div className="grid grid-cols-2 gap-8 text-right max-w-md mx-auto">
                            <div>
                                <p className="text-sm text-gray-500">نام دانش‌آموز</p>
                                <p className="text-xl font-bold">{userName}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">تاریخ شروع</p>
                                <p className="text-xl font-bold">{getShamsiDate(startDate)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">تعداد روزها</p>
                                <p className="text-xl font-bold">{totalDays} روز</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">پیشرفت کلی</p>
                                <p className="text-xl font-bold">{getProgress()}%</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 flex justify-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                            <span className="text-sm">زیست‌شناسی</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                            <span className="text-sm">ریاضیات</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></div>
                            <span className="text-sm">فیزیک</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#f97316' }}></div>
                            <span className="text-sm">شیمی</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Each Day on a Separate Page */}
            {days.map(dayId => {
                const tasks = getTasksForDay(dayId);
                const date = getShamsiDate(getDayDate(dayId));
                if (tasks.length === 0) return null;

                const completedCount = tasks.filter(t => t.isCompleted).length;

                return (
                    <div key={dayId} className="p-8 page-break-after min-h-screen">
                        {/* Day Header */}
                        <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-800">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gray-900 text-white rounded-xl flex items-center justify-center">
                                    <span className="text-2xl font-black">{dayId}</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black">روز {dayId}</h2>
                                    <p className="text-lg text-gray-600">{date}</p>
                                </div>
                            </div>
                            <div className="text-left">
                                <p className="text-sm text-gray-500">تعداد تسک‌ها</p>
                                <p className="text-xl font-bold">{completedCount} / {tasks.length}</p>
                            </div>
                        </div>

                        {/* Tasks Table */}
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr>
                                    <th className="border-2 border-gray-800 bg-gray-100 p-3 text-right w-12">#</th>
                                    <th className="border-2 border-gray-800 bg-gray-100 p-3 text-right w-28">درس</th>
                                    <th className="border-2 border-gray-800 bg-gray-100 p-3 text-right">مبحث و بازه تست</th>
                                    <th className="border-2 border-gray-800 bg-gray-100 p-3 text-center w-20">جزئیات</th>
                                    <th className="border-2 border-gray-800 bg-gray-100 p-3 text-center w-16">✓</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map((task, idx) => (
                                    <tr key={task.id}>
                                        <td className="border-2 border-gray-800 p-3 text-center font-bold">{idx + 1}</td>
                                        <td className="border-2 border-gray-800 p-3">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: getSubjectColor(task.subject) }}
                                                ></div>
                                                <span className="font-bold">{task.subject}</span>
                                            </div>
                                        </td>
                                        <td className="border-2 border-gray-800 p-3">
                                            <div>
                                                <span className="font-medium">{task.topic}</span>
                                                {task.testRange && (
                                                    <span className="text-gray-500 mr-2">({task.testRange})</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="border-2 border-gray-800 p-3 text-center font-bold">{task.details}</td>
                                        <td className="border-2 border-gray-800 p-3 text-center">
                                            <div className="w-6 h-6 border-2 border-gray-800 rounded mx-auto flex items-center justify-center">
                                                {task.isCompleted && <span className="text-lg">✓</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Notes Section */}
                        <div className="mt-6 border-2 border-gray-400 rounded-lg p-4">
                            <p className="text-sm font-bold text-gray-600 mb-2">یادداشت‌های روز:</p>
                            <div className="h-20 border-b border-dashed border-gray-300"></div>
                            <div className="h-20 border-b border-dashed border-gray-300"></div>
                        </div>

                        {/* Footer */}
                        <div className="mt-auto pt-6 text-center text-xs text-gray-400 absolute bottom-8 left-0 right-0">
                            ParsaPlan | روز {dayId} از {totalDays}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default PrintableSchedule;
