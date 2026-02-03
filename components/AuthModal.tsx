
import React, { useState } from 'react';
import { X, User, Lock, LogIn, UserPlus } from 'lucide-react';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: (u: string, p: string) => Promise<void>;
    onRegister: (u: string, p: string) => Promise<void>;
    isLoading: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, onRegister, isLoading }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'login') {
            await onLogin(username, password);
        } else {
            await onRegister(username, password);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">

                {/* Header */}
                <div className="relative h-32 bg-gradient-to-br from-indigo-600 to-purple-700 flex flex-col items-center justify-center text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="bg-white/20 p-3 rounded-full mb-2 backdrop-blur-md shadow-inner">
                        <User size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold">
                        {mode === 'login' ? 'ورود به حساب' : 'ساخت حساب کاربری'}
                    </h2>
                </div>

                {/* Body */}
                <div className="p-6 pt-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-1">
                                نام کاربری (ID)
                            </label>
                            <div className="relative">
                                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="مثلا: parsa2025"
                                    className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                    dir="ltr"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-1">
                                رمز عبور
                            </label>
                            <div className="relative">
                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                    dir="ltr"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {mode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
                                    {mode === 'login' ? 'وارد شوید' : 'ثبت نام کنید'}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{mode === 'login' ? 'حساب کاربری ندارید؟' : 'قبلاً ثبت نام کرده‌اید؟'}</span>
                        <button
                            type="button"
                            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                        >
                            {mode === 'login' ? 'ساخت حساب' : 'ورود'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
