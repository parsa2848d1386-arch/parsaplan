import React from 'react';
import { Plus, MessageSquare, Edit2, Trash2, X, ChevronLeft, History } from 'lucide-react';

export interface ChatSession {
    id: string;
    title: string;
    messages: any[]; // Generalized for now, will refine
    timestamp: number;
}

interface ChatSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    sessions: ChatSession[];
    activeSessionId: string | null;
    onSelectSession: (id: string) => void;
    onNewChat: () => void;
    onRenameSession: (id: string, newTitle: string) => void;
    onDeleteSession: (id: string, e?: React.MouseEvent) => void;
    isHistoryCollapsed: boolean;
    setIsHistoryCollapsed: (collapsed: boolean) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
    isOpen,
    onClose,
    sessions,
    activeSessionId,
    onSelectSession,
    onNewChat,
    onRenameSession,
    onDeleteSession,
    isHistoryCollapsed,
    setIsHistoryCollapsed
}) => {
    return (
        <>
            {/* Backdrop for Mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
                fixed inset-y-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-l border-gray-200 dark:border-gray-800 transition-all duration-300 ease-out md:relative md:translate-x-0 shadow-2xl md:shadow-none
                ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                ${isHistoryCollapsed ? 'w-20' : 'w-80'}
            `}>
                <div className="h-full flex flex-col">

                    {/* Header */}
                    <div className={`p-4 border-b border-gray-100 dark:border-gray-800 flex items-center ${isHistoryCollapsed ? 'justify-center' : 'justify-between'}`}>
                        {!isHistoryCollapsed && (
                            <h2 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <History size={20} className="text-indigo-500" />
                                <span className="text-lg">تاریخچه چت</span>
                            </h2>
                        )}
                        <button
                            onClick={() => isOpen ? onClose() : setIsHistoryCollapsed(!isHistoryCollapsed)}
                            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 transition-colors ${isHistoryCollapsed ? '' : 'md:hover:bg-gray-100'}`}
                        >
                            {window.innerWidth < 768 ? <X size={20} /> : (isHistoryCollapsed ? <ChevronLeft size={20} className="rotate-180" /> : <ChevronLeft size={20} />)}
                        </button>
                    </div>

                    {/* New Chat Button */}
                    <div className="p-4">
                        <button
                            onClick={onNewChat}
                            className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white p-3.5 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/30 active:scale-95 group ${isHistoryCollapsed ? 'aspect-square p-0' : ''}`}
                            title="چت جدید"
                        >
                            <Plus size={24} className="group-hover:rotate-90 transition-transform" />
                            {!isHistoryCollapsed && <span>چت جدید</span>}
                        </button>
                    </div>

                    {/* Sessions List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4 space-y-2">
                        {sessions.length === 0 && !isHistoryCollapsed && (
                            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2 opacity-60">
                                <MessageSquare size={32} />
                                <p className="text-xs">هیچ چتی یافت نشد</p>
                            </div>
                        )}

                        {sessions.map(session => (
                            <div
                                key={session.id}
                                onClick={() => { onSelectSession(session.id); onClose(); }}
                                className={`group relative p-3 rounded-2xl border transition-all cursor-pointer select-none overflow-hidden
                                    ${activeSessionId === session.id
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm'
                                        : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                    }
                                    ${isHistoryCollapsed ? 'flex justify-center items-center aspect-square p-0' : ''}
                                `}
                            >
                                {activeSessionId === session.id && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full"></div>
                                )}

                                {!isHistoryCollapsed ? (
                                    <>
                                        <div className="flex items-start justify-between gap-2 overflow-hidden pl-2">
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-bold text-sm truncate mb-1 ${activeSessionId === session.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`} title={session.title}>
                                                    {session.title}
                                                </div>
                                                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                    <span>{new Date(session.timestamp).toLocaleDateString('fa-IR')}</span>
                                                    <span>•</span>
                                                    <span>{new Date(session.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions (Hover) */}
                                        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg p-1 shadow-sm px-1.5">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const newName = prompt('نام جدید:', session.title);
                                                    if (newName) onRenameSession(session.id, newName);
                                                }}
                                                className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition"
                                                title="تغییر نام"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => onDeleteSession(session.id, e)}
                                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition"
                                                title="حذف"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="relative">
                                        <MessageSquare size={20} className={activeSessionId === session.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'} />
                                        {activeSessionId === session.id && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white dark:border-gray-900"></div>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </aside>
        </>
    );
};
