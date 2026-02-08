
import React, { useState } from 'react';
import { X, User, Lock, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// --- ZOD SCHEMAS ---
const loginSchema = z.object({
    username: z.string().min(3, "نام کاربری باید حداقل ۳ کاراکتر باشد"),
    password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد"),
});

const registerSchema = z.object({
    username: z.string().min(3, "نام کاربری باید حداقل ۳ کاراکتر باشد").regex(/^[a-zA-Z0-9_]+$/, "فقط حروف انگلیسی، اعداد و زیرخط مجاز است"),
    password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد"),
    displayName: z.string().min(2, "نام نمایشی باید حداقل ۲ کاراکتر باشد"),
});

type LoginFormInputs = z.infer<typeof loginSchema>;
type RegisterFormInputs = z.infer<typeof registerSchema>;

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: (u: string, p: string) => Promise<any>;
    onRegister: (u: string, p: string, name: string) => Promise<any>;
    isLoading: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, onRegister, isLoading }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [showPassword, setShowPassword] = useState(false);

    // React Hook Form Setup
    const {
        register: registerLogin,
        handleSubmit: handleSubmitLogin,
        formState: { errors: loginErrors },
        reset: resetLogin
    } = useForm<LoginFormInputs>({
        resolver: zodResolver(loginSchema)
    });

    const {
        register: registerRegister,
        handleSubmit: handleSubmitRegister,
        formState: { errors: registerErrors },
        reset: resetRegister
    } = useForm<RegisterFormInputs>({
        resolver: zodResolver(registerSchema)
    });

    if (!isOpen) return null;

    const onModeChange = (newMode: 'login' | 'register') => {
        setMode(newMode);
        resetLogin();
        resetRegister();
    };

    const onSubmitLogin = async (data: LoginFormInputs) => {
        await onLogin(data.username, data.password);
    };

    const onSubmitRegister = async (data: RegisterFormInputs) => {
        await onRegister(data.username, data.password, data.displayName);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" style={{ zIndex: 2147483647 }}>
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] sm:rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700 overflow-y-auto max-h-[85vh] mb-32 sm:mb-0 scrollbar-hide">

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
                            onClick={() => onModeChange('login')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'login'
                                ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                }`}
                        >
                            <LogIn size={16} />
                            ورود
                        </button>
                        <button
                            onClick={() => onModeChange('register')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'register'
                                ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                }`}
                        >
                            <UserPlus size={16} />
                            ساخت حساب
                        </button>
                    </div>

                    {mode === 'login' ? (
                        <form onSubmit={handleSubmitLogin(onSubmitLogin)} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-1">
                                    نام کاربری (ID)
                                </label>
                                <div className="relative">
                                    <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        {...registerLogin('username')}
                                        placeholder="مثلا: parsa2025"
                                        className={`w-full pr-10 pl-4 py-3 rounded-xl border ${loginErrors.username ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white`}
                                        dir="ltr"
                                    />
                                </div>
                                {loginErrors.username && <p className="text-xs text-red-500">{loginErrors.username.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-1">
                                    رمز عبور
                                </label>
                                <div className="relative">
                                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        {...registerLogin('password')}
                                        placeholder="••••••••"
                                        className={`w-full pr-10 pl-12 py-3 rounded-xl border ${loginErrors.password ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white`}
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
                                {loginErrors.password && <p className="text-xs text-red-500">{loginErrors.password.message}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full py-3 px-4 text-white font-bold rounded-xl shadow-lg transform transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-indigo-500/30`}
                            >
                                {isLoading ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <LogIn size={20} />
                                        ورود به حساب
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmitRegister(onSubmitRegister)} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-1">
                                    نام کاربری (ID)
                                </label>
                                <div className="relative">
                                    <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        {...registerRegister('username')}
                                        placeholder="مثلا: parsa2025"
                                        className={`w-full pr-10 pl-4 py-3 rounded-xl border ${registerErrors.username ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white`}
                                        dir="ltr"
                                    />
                                </div>
                                {registerErrors.username && <p className="text-xs text-red-500">{registerErrors.username.message}</p>}
                            </div>

                            <div className="space-y-2 animate-in fade-in zoom-in duration-300">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-1">
                                    نام نمایشی
                                </label>
                                <div className="relative">
                                    <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        {...registerRegister('displayName')}
                                        placeholder="مثلا: پارسا"
                                        className={`w-full pr-10 pl-4 py-3 rounded-xl border ${registerErrors.displayName ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white`}
                                    />
                                </div>
                                {registerErrors.displayName && <p className="text-xs text-red-500">{registerErrors.displayName.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-1">
                                    رمز عبور
                                </label>
                                <div className="relative">
                                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        {...registerRegister('password')}
                                        placeholder="••••••••"
                                        className={`w-full pr-10 pl-12 py-3 rounded-xl border ${registerErrors.password ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white`}
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
                                {registerErrors.password && <p className="text-xs text-red-500">{registerErrors.password.message}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full py-3 px-4 text-white font-bold rounded-xl shadow-lg transform transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-purple-500/30`}
                            >
                                {isLoading ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <UserPlus size={20} />
                                        ایجاد حساب کاربری
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div >
            </div >
        </div >
    );
};
