
import React, { useState } from 'react';
import { X, User, Lock, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';

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
    const [showPassword, setShowPassword] = useState(false);

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
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" style={{ zIndex: 2147483647 }}>
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] sm:rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden max-h-[60vh] mb-32 sm:mb-0">

                {/* Header */}
                <div className={`relative h-32 flex flex-col items-center justify-center text-white transition-colors duration-300 ${mode === 'login'
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-800'
                    : 'bg-gradient-to-br from-purple-600 to-purple-800'
                    }`}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="bg-white/20 p-3 rounded-full mb-2 backdrop-blur-md shadow-inner">
                        {mode === 'login' ? <User size={32} className="text-white" /> : <UserPlus size={32} className="text-white" />}
                    </div>
                    <h2 className="text-2xl font-bold">
                        {mode === 'login' ? 'ورود به حساب' : 'ساخت حساب کاربری'}
                    </h2>
                </div>

                {/* Body */}
                <div className="p-6 pt-6">
                    {/* Segmented Control */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl mb-6">
                        <button
                            onClick={() => setMode('login')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'login'
                                ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                }`}
                        >
                            <LogIn size={16} />
                            ورود
                        </button>
                        <button
                            onClick={() => setMode('register')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'register'
                                ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                }`}
                        >
                            <UserPlus size={16} />
                            ساخت حساب
                        </button>
                    </div>

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
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pr-10 pl-12 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                    dir="ltr"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-3 px-4 text-white font-bold rounded-xl shadow-lg transform transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-6 ${mode === 'login'
                                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-indigo-500/30'
                                : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-purple-500/30'
                                }`}
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {mode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
                                    {mode === 'login' ? 'ورود به حساب' : 'ایجاد حساب کاربری'}
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
