
import React, { useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { X, CheckCircle2, AlertTriangle, Info, AlertOctagon, Trash2 } from 'lucide-react';

export const ToastContainer = () => {
    const { toasts, removeToast } = useStore();

    return (
        <div className="fixed top-20 md:top-4 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none px-4 transition-all duration-500" style={{ zIndex: 2147483647 }}>
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border animate-in slide-in-from-top-5 fade-in duration-300 max-w-sm w-full backdrop-blur-md transition-all
                        ${toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800 dark:bg-emerald-900/90 dark:border-emerald-700 dark:text-emerald-100' : ''}
                        ${toast.type === 'error' ? 'bg-rose-50/90 border-rose-200 text-rose-800 dark:bg-rose-900/90 dark:border-rose-700 dark:text-rose-100' : ''}
                        ${toast.type === 'warning' ? 'bg-amber-50/90 border-amber-200 text-amber-800 dark:bg-amber-900/90 dark:border-amber-700 dark:text-amber-100' : ''}
                        ${toast.type === 'info' ? 'bg-blue-50/90 border-blue-200 text-blue-800 dark:bg-blue-900/90 dark:border-blue-700 dark:text-blue-100' : ''}
                    `}
                >
                    {toast.type === 'success' && <CheckCircle2 size={20} />}
                    {toast.type === 'error' && <AlertOctagon size={20} />}
                    {toast.type === 'warning' && <AlertTriangle size={20} />}
                    {toast.type === 'info' && <Info size={20} />}

                    <p className="text-sm font-bold flex-1">{toast.message}</p>

                    <button onClick={() => removeToast(toast.id)} className="opacity-60 hover:opacity-100">
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};

export const ConfirmModal = () => {
    const { confirmState, closeConfirm } = useStore();

    if (!confirmState.isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4" style={{ zIndex: 2147483647 }}>
            <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-2xl max-w-xs w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700 mb-32 sm:mb-0">
                <div className={`p-6 text-center ${confirmState.type === 'danger' ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-gray-50 dark:bg-gray-700'}`}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${confirmState.type === 'danger' ? 'bg-rose-100 text-rose-600 dark:bg-rose-800 dark:text-rose-200' : 'bg-indigo-100 text-indigo-600'}`}>
                        {confirmState.type === 'danger' ? <Trash2 size={32} /> : <Info size={32} />}
                    </div>
                    <h3 className="text-lg font-black text-gray-800 dark:text-white mb-2">{confirmState.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed">{confirmState.message}</p>
                </div>
                <div className="p-4 flex gap-3 bg-white dark:bg-gray-800">
                    <button
                        onClick={closeConfirm}
                        className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition"
                    >
                        انصراف
                    </button>
                    <button
                        onClick={() => { confirmState.onConfirm(); closeConfirm(); }}
                        className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition transform active:scale-95 ${confirmState.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 dark:shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'}`}
                    >
                        تایید می‌کنم
                    </button>
                </div>
            </div>
        </div>
    );
};
