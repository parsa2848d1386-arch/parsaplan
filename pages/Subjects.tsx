
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Subject, SubjectTask } from '../types';
import { ChevronDown, ChevronUp, Circle, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import TaskModal from '../components/TaskModal';

const Subjects = () => {
    const { toggleTask, tasks, updateTask, deleteTask, getDayDate } = useStore();
    const [expandedSubject, setExpandedSubject] = useState<Subject | null>(Subject.Biology);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<SubjectTask | null>(null);

    const subjects = Object.values(Subject);

    const getSubjectTasks = (sub: Subject) => {
        return tasks.filter(t => t.subject === sub).sort((a, b) => a.dayId - b.dayId);
    };

    const handleSaveTask = (taskData: Partial<SubjectTask>) => {
        if (editingTask) {
            updateTask({ ...editingTask, ...taskData } as SubjectTask);
        }
    };

    const openEdit = (e: React.MouseEvent, task: SubjectTask) => {
        e.stopPropagation();
        setEditingTask(task);
        setIsModalOpen(true);
    }

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        deleteTask(id);
    }

    return (
        <div className="p-5 pb-20">
            <TaskModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSaveTask}
                initialData={editingTask}
                currentDayId={1} // Default fallback
            />

             <h1 className="text-xl font-bold text-gray-800 mb-6">بودجه‌بندی دروس</h1>
            
            <div className="space-y-4">
                {subjects.map(subject => {
                    const subjectTasks = getSubjectTasks(subject);
                    // Skip custom section if empty
                    if (subject === Subject.Custom && subjectTasks.length === 0) return null;

                    const completedCount = subjectTasks.filter(t => t.isCompleted).length;
                    const progress = subjectTasks.length > 0 ? Math.round((completedCount / subjectTasks.length) * 100) : 0;
                    const isExpanded = expandedSubject === subject;

                    let color = "indigo";
                    if(subject === Subject.Biology) color = "emerald";
                    if(subject === Subject.Physics) color = "violet";
                    if(subject === Subject.Chemistry) color = "orange";
                    if(subject === Subject.Math) color = "blue";
                    if(subject === Subject.Custom) color = "gray";

                    // Use Tailwind's arbitrary values or standard palette. 
                    // Dynamic classes like `bg-${color}-50` work if safelisted or via CDN JIT.
                    // Darkened text colors to 700/800.
                    
                    return (
                        <div key={subject} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                            <div 
                                onClick={() => setExpandedSubject(isExpanded ? null : subject)}
                                className="p-4 flex items-center justify-between cursor-pointer active:bg-gray-50 select-none"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-2xl bg-${color}-50 text-${color}-600 flex items-center justify-center font-black text-lg`}>
                                        {subject === Subject.Custom ? '?' : subject[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-lg">{subject}</h3>
                                        <p className="text-xs text-gray-500 font-medium">{completedCount} از {subjectTasks.length} انجام شده</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-xs font-bold text-gray-400">{progress}%</div>
                                    {isExpanded ? <ChevronUp size={20} className="text-gray-400"/> : <ChevronDown size={20} className="text-gray-400"/>}
                                </div>
                            </div>

                            {/* Progress Bar Line */}
                            <div className="h-1.5 w-full bg-gray-50">
                                <div className={`h-full bg-${color}-500 transition-all duration-500`} style={{width: `${progress}%`}}></div>
                            </div>

                            {isExpanded && (
                                <div className="bg-gray-50/50 divide-y divide-gray-100">
                                    {subjectTasks.map(task => {
                                        const isDone = task.isCompleted;
                                        return (
                                            <div 
                                                key={task.id} 
                                                onClick={() => toggleTask(task.id)}
                                                className={`group p-4 flex items-start gap-3 transition-all duration-200 hover:bg-white cursor-pointer relative ${isDone ? 'bg-gray-50/80' : ''}`}
                                            >
                                                <div className={`mt-1 transition-all duration-300 ${isDone ? `text-${color}-500 scale-110` : 'text-gray-300 hover:text-gray-400'}`}>
                                                    {isDone ? <CheckCircle2 size={20} fill="currentColor" className="text-white"/> : <Circle size={20} strokeWidth={2} />}
                                                </div>
                                                <div className={`flex-1 transition-all duration-500 pl-10 ${isDone ? 'opacity-50 grayscale' : ''}`}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] font-bold text-gray-400">روز {task.dayId} ({getDayDate(task.dayId)})</span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold bg-${color}-100 text-${color}-800`}>{task.details}</span>
                                                    </div>
                                                    <p className={`text-sm text-gray-800 font-bold leading-5 transition-all ${isDone ? 'line-through' : ''}`}>{task.topic}</p>
                                                    {task.testRange && <p className="text-xs text-gray-500 mt-1 font-mono bg-white inline-block px-1 rounded border border-gray-100">{task.testRange}</p>}
                                                </div>

                                                {/* Edit controls */}
                                                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity pl-1 absolute left-2 top-4">
                                                     <button 
                                                        onClick={(e) => openEdit(e, task)} 
                                                        className="text-blue-500 hover:text-blue-700 bg-white p-1 rounded-md shadow-sm border border-gray-100"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleDelete(e, task.id)} 
                                                        className="text-rose-500 hover:text-rose-700 bg-white p-1 rounded-md shadow-sm border border-gray-100"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Subjects;
