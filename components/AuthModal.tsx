
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, LogIn, UserPlus, Sparkles, Ghost, CloudOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../context/AuthContext';

/* ----------------------------------------------------------------
   Schemas
   ---------------------------------------------------------------- */
const loginSchema = z.object({
    username: z.string().min(3, 'حداقل ۳ کاراکتر'),
    password: z.string().min(6, 'حداقل ۶ کاراکتر'),
});
const registerSchema = z.object({
    username: z.string().min(3, 'حداقل ۳ کاراکتر').regex(/^[a-zA-Z0-9_]+$/, 'فقط حروف انگلیسی، عدد و _'),
    displayName: z.string().min(2, 'حداقل ۲ کاراکتر'),
    password: z.string().min(6, 'حداقل ۶ کاراکتر'),
});

type LoginInputs = z.infer<typeof loginSchema>;
type RegisterInputs = z.infer<typeof registerSchema>;

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: (u: string, p: string) => Promise<any>;
    onRegister: (u: string, p: string, name: string) => Promise<any>;
    isLoading: boolean;
}

/* ----------------------------------------------------------------
   Animated Student SVG
   ---------------------------------------------------------------- */
const StudentIllustration = ({ mode }: { mode: 'login' | 'register' }) => (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <ellipse cx="100" cy="165" rx="45" ry="22" fill={mode === 'login' ? '#6366f1' : '#8b5cf6'} opacity="0.15" />
        <rect x="72" y="120" width="56" height="50" rx="14" fill={mode === 'login' ? '#6366f1' : '#8b5cf6'} />
        <path d="M86 120 L100 135 L114 120" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M72 130 Q50 135 48 155" stroke={mode === 'login' ? '#6366f1' : '#8b5cf6'} strokeWidth="12" strokeLinecap="round" />
        <path d="M128 130 Q150 135 152 155" stroke={mode === 'login' ? '#6366f1' : '#8b5cf6'} strokeWidth="12" strokeLinecap="round" />
        <rect x="40" y="148" width="22" height="28" rx="4" fill={mode === 'login' ? '#e0e7ff' : '#ede9fe'} />
        <rect x="42" y="152" width="18" height="2" rx="1" fill="#6366f1" opacity="0.5" />
        <rect x="42" y="157" width="14" height="2" rx="1" fill="#6366f1" opacity="0.5" />
        <rect x="42" y="162" width="16" height="2" rx="1" fill="#6366f1" opacity="0.5" />
        <rect x="92" y="105" width="16" height="18" rx="8" fill="#fcd9bd" />
        <ellipse cx="100" cy="88" rx="26" ry="28" fill="#fde8d0" />
        {mode === 'login' ? (
            <>
                <path d="M74 80 Q76 52 100 50 Q124 52 126 80 Q120 68 100 67 Q80 68 74 80Z" fill="#1e1b4b" />
                <path d="M74 80 Q70 88 74 95" stroke="#1e1b4b" strokeWidth="8" strokeLinecap="round" />
                <rect x="82" y="60" width="36" height="6" rx="2" fill="#312e81" />
                <polygon points="100,45 118,62 82,62" fill="#312e81" />
                <line x1="118" y1="62" x2="122" y2="74" stroke="#312e81" strokeWidth="2" />
                <circle cx="122" cy="76" r="3" fill="#fbbf24" />
            </>
        ) : (
            <>
                <path d="M74 80 Q76 50 100 48 Q124 50 126 80 Q120 65 100 64 Q80 65 74 80Z" fill="#7c3aed" />
                <path d="M74 80 Q68 90 72 98" stroke="#7c3aed" strokeWidth="7" strokeLinecap="round" />
                <path d="M126 80 Q132 90 128 100" stroke="#7c3aed" strokeWidth="7" strokeLinecap="round" />
            </>
        )}
        <ellipse cx="90" cy="90" rx="4" ry="4.5" fill="#1e1b4b" />
        <ellipse cx="110" cy="90" rx="4" ry="4.5" fill="#1e1b4b" />
        <circle cx="91.5" cy="88.5" r="1.5" fill="white" />
        <circle cx="111.5" cy="88.5" r="1.5" fill="white" />
        <path d="M90 101 Q100 108 110 101" stroke="#e87070" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <ellipse cx="82" cy="98" rx="5" ry="3" fill="#f9a5a5" opacity="0.6" />
        <ellipse cx="118" cy="98" rx="5" ry="3" fill="#f9a5a5" opacity="0.6" />
        <g className="animate-float" style={{ animationDelay: '0s' }}><text x="155" y="75" fontSize="14">⭐</text></g>
        <g className="animate-float" style={{ animationDelay: '0.5s' }}><text x="28" y="100" fontSize="11">✨</text></g>
        <g className="animate-float" style={{ animationDelay: '1s' }}><text x="160" y="110" fontSize="10">🎯</text></g>
    </svg>
);

/* ----------------------------------------------------------------
   Loading Dots
   ---------------------------------------------------------------- */
const LoadingDots = () => (
    <div className="flex gap-1 items-center">
        {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
    </div>
);

/* ----------------------------------------------------------------
   Floating Input
   ---------------------------------------------------------------- */
const FloatingInput = ({
    id, label, type = 'text', placeholder, error, register: reg, dir = 'ltr',
    rightIcon, leftSlot,
}: {
    id: string; label: string; type?: string; placeholder?: string;
    error?: string; register: any; dir?: 'ltr' | 'rtl';
    rightIcon?: React.ReactNode; leftSlot?: React.ReactNode;
}) => (
    <div className="space-y-1.5">
        <label htmlFor={id} className="text-xs font-bold text-gray-600 dark:text-gray-300 block">{label}</label>
        <div className="relative">
            {rightIcon && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{rightIcon}</div>
            )}
            <input
                id={id} type={type} placeholder={placeholder} dir={dir} {...reg}
                className={`w-full ${rightIcon ? 'pr-10' : 'pr-4'} ${leftSlot ? 'pl-12' : 'pl-4'} py-3 rounded-2xl border-2 text-sm outline-none transition-all duration-200 bg-white dark:bg-gray-900/50 text-gray-800 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600
                    ${error ? 'border-rose-400 focus:border-rose-500' : 'border-gray-100 dark:border-gray-700 focus:border-indigo-400 dark:focus:border-indigo-500'}`}
            />
            {leftSlot && <div className="absolute left-3 top-1/2 -translate-y-1/2">{leftSlot}</div>}
        </div>
        {error && (
            <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                <span className="text-[10px]">⚠️</span> {error}
            </p>
        )}
    </div>
);

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, onRegister, isLoading }) => {
    const { loginAsGuest, loginOffline } = useAuth();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [showPass, setShowPass] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [loadingAction, setLoadingAction] = useState<'login' | 'register' | 'guest' | null>(null);

    useEffect(() => {
        if (isOpen) setTimeout(() => setMounted(true), 50);
        else { setMounted(false); setLoadingAction(null); }
    }, [isOpen]);

    const {
        register: regLogin,
        handleSubmit: submitLogin,
        formState: { errors: loginErr },
        reset: resetLogin,
    } = useForm<LoginInputs>({ resolver: zodResolver(loginSchema) });

    const {
        register: regRegister,
        handleSubmit: submitRegister,
        formState: { errors: regErr },
        reset: resetRegister,
    } = useForm<RegisterInputs>({ resolver: zodResolver(registerSchema) });

    if (!isOpen) return null;

    const switchMode = (m: 'login' | 'register') => {
        setMode(m); resetLogin(); resetRegister(); setShowPass(false);
    };

    const handleLogin = async (d: LoginInputs) => {
        setLoadingAction('login');
        await onLogin(d.username, d.password);
        setLoadingAction(null);
    };

    const handleRegister = async (d: RegisterInputs) => {
        setLoadingAction('register');
        await onRegister(d.username, d.password, d.displayName);
        setLoadingAction(null);
    };

    const handleGuest = async () => {
        setLoadingAction('guest');
        const ok = await loginAsGuest();
        if (ok) onClose();
        setLoadingAction(null);
    };

    const isBusy = loadingAction !== null || isLoading;
    const isLogin = mode === 'login';

    return (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ zIndex: 2147483647 }}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/60 to-violet-900/80 backdrop-blur-md" onClick={!isBusy ? onClose : undefined} />

            {/* Decorative blobs */}
            <div className="absolute top-8 left-8 w-24 h-24 bg-indigo-400/20 rounded-full blur-2xl animate-float" />
            <div className="absolute top-16 right-12 w-32 h-32 bg-violet-400/15 rounded-full blur-3xl animate-float-slow" />

            {/* Card */}
            <div className={`relative w-full sm:max-w-sm rounded-t-[2.5rem] sm:rounded-3xl overflow-hidden shadow-2xl transition-all duration-500
                ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>

                {/* ── Gradient Header ── */}
                <div className={`relative overflow-hidden transition-all duration-500 ${isLogin
                    ? 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700'
                    : 'bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-700'}`}>
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
                    <div className="absolute -bottom-8 -left-6 w-32 h-32 bg-white/5 rounded-full" />

                    <div className="relative flex items-center justify-between px-6 pt-7 pb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center">
                                    {isLogin ? <LogIn size={14} className="text-white" /> : <UserPlus size={14} className="text-white" />}
                                </div>
                                <span className="text-white/80 text-xs font-semibold">
                                    {isLogin ? 'خوش اومدی!' : 'بیا عضو بشو!'}
                                </span>
                            </div>
                            <h1 className="text-2xl font-black text-white leading-tight">
                                {isLogin ? 'ورود به' : 'ثبت‌نام در'}<br />
                                <span className="text-white/90">ParsaPlan 🚀</span>
                            </h1>
                        </div>
                        <div className="w-28 h-28 -mt-2 -mb-2 flex-shrink-0">
                            <StudentIllustration mode={mode} />
                        </div>
                    </div>

                    {/* Tab switcher */}
                    <div className="mx-5 mb-5">
                        <div className="bg-white/15 backdrop-blur-md rounded-2xl p-1 flex gap-1">
                            <button onClick={() => switchMode('login')} disabled={isBusy}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300
                                    ${isLogin ? 'bg-white text-indigo-600 shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                                <LogIn size={13} /> ورود
                            </button>
                            <button onClick={() => switchMode('register')} disabled={isBusy}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300
                                    ${!isLogin ? 'bg-white text-violet-600 shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                                <UserPlus size={13} /> ثبت‌نام
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Form Area ── */}
                <div className="bg-gray-50 dark:bg-gray-900 px-5 pt-5 pb-4 space-y-4">
                    {/* Feature badges (register only) */}
                    {!isLogin && (
                        <div className="flex gap-2 flex-wrap animate-fade-in-up">
                            {[
                                { icon: '🎯', text: 'برنامه‌ریزی هوشمند' },
                                { icon: '⚡', text: 'سیستم XP' },
                                { icon: '🤖', text: 'دستیار AI' },
                            ].map((b) => (
                                <span key={b.text} className="flex items-center gap-1 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">
                                    {b.icon} {b.text}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* LOGIN */}
                    {isLogin ? (
                        <form onSubmit={submitLogin(handleLogin)} className="space-y-3.5 animate-fade-in-up">
                            <FloatingInput id="login-user" label="نام کاربری" placeholder="parsa2025"
                                error={loginErr.username?.message} register={regLogin('username')}
                                rightIcon={<span className="text-sm">👤</span>} />
                            <FloatingInput id="login-pass" label="رمز عبور" type={showPass ? 'text' : 'password'}
                                placeholder="••••••••" error={loginErr.password?.message} register={regLogin('password')}
                                rightIcon={<span className="text-sm">🔑</span>}
                                leftSlot={
                                    <button type="button" onClick={() => setShowPass(!showPass)}
                                        className="text-gray-400 hover:text-gray-600 transition p-1">
                                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                } />
                            <button type="submit" disabled={isBusy}
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-l from-indigo-600 to-violet-600 text-white font-black text-sm shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 hover:shadow-xl active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2 mt-1 disabled:opacity-70">
                                {loadingAction === 'login' ? <LoadingDots /> : <><LogIn size={16} /> ورود به حساب</>}
                            </button>
                        </form>
                    ) : (
                        /* REGISTER */
                        <form onSubmit={submitRegister(handleRegister)} className="space-y-3 animate-fade-in-up">
                            <FloatingInput id="reg-name" label="نام نمایشی" placeholder="پارسا" dir="rtl"
                                error={regErr.displayName?.message} register={regRegister('displayName')}
                                rightIcon={<span className="text-sm">✍️</span>} />
                            <FloatingInput id="reg-user" label="نام کاربری (ID)" placeholder="parsa2025"
                                error={regErr.username?.message} register={regRegister('username')}
                                rightIcon={<span className="text-sm">🆔</span>} />
                            <FloatingInput id="reg-pass" label="رمز عبور" type={showPass ? 'text' : 'password'}
                                placeholder="••••••••" error={regErr.password?.message} register={regRegister('password')}
                                rightIcon={<span className="text-sm">🔑</span>}
                                leftSlot={
                                    <button type="button" onClick={() => setShowPass(!showPass)}
                                        className="text-gray-400 hover:text-gray-600 transition p-1">
                                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                } />
                            <button type="submit" disabled={isBusy}
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-l from-violet-600 to-fuchsia-600 text-white font-black text-sm shadow-lg shadow-violet-200 dark:shadow-violet-900/40 hover:shadow-xl active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2 mt-1 disabled:opacity-70">
                                {loadingAction === 'register' ? <LoadingDots /> : <><Sparkles size={16} /> ساخت حساب کاربری</>}
                            </button>
                        </form>
                    )}

                    {/* ── Divider ── */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                        <span className="text-[10px] text-gray-400 font-bold">یا</span>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    </div>

                    {/* ── Guest Button ── */}
                    <button
                        onClick={handleGuest}
                        disabled={isBusy}
                        className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-bold text-sm hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                        {loadingAction === 'guest' ? (
                            <LoadingDots />
                        ) : (
                            <>
                                <Ghost size={16} />
                                ورود به عنوان مهمان
                            </>
                        )}
                    </button>

                    {/* ── Offline Button ── */}
                    <button
                        onClick={() => {
                            loginOffline();
                            onClose();
                        }}
                        disabled={isBusy}
                        className="w-full py-3 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-300 dark:hover:bg-slate-700 active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                        <CloudOff size={16} className="text-amber-500" />
                        ورود آفلاین (ذخیره روی دستگاه)
                    </button>

                    {/* Footer */}
                    <p className="text-center text-[10px] text-gray-400 pb-1">
                        {isLogin ? 'حساب نداری؟ ' : 'حساب داری؟ '}
                        <button onClick={() => switchMode(isLogin ? 'register' : 'login')} disabled={isBusy}
                            className={`font-black underline-offset-2 underline ${isLogin ? 'text-violet-500' : 'text-indigo-500'}`}>
                            {isLogin ? 'ثبت‌نام کن! 🚀' : 'وارد بشو!'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};
