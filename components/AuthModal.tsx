import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
    Eye,
    EyeOff,
    LogIn,
    UserPlus,
    Sparkles,
    Ghost,
    CloudOff,
    X,
    KeyRound,
    Mail,
    AlertCircle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useStore } from '../context/StoreContext';
import { ModalSheet } from './ui/ModalSheet';
import { haptics } from '../utils/haptics';
import { EXAGGERATED_SHAKE_KEYFRAMES, TRANSITION_SHAKE } from '../utils/motionPresets';

/* ----------------------------------------------------------------
   Schemas
   ---------------------------------------------------------------- */
const identifierRegex = /^([^\s@]+@[^\s@]+\.[^\s@]+|[a-zA-Z0-9_]{3,})$/;

const loginSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, 'حداقل ۳ کاراکتر وارد کنید')
        .regex(identifierRegex, 'ایمیل معتبر یا نام کاربری انگلیسی وارد کنید'),
    password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد'),
});
const registerSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, 'حداقل ۳ کاراکتر وارد کنید')
        .regex(identifierRegex, 'ایمیل معتبر یا نام کاربری انگلیسی (حروف، عدد و _)'),
    displayName: z.string().trim().min(2, 'نام نمایشی حداقل ۲ کاراکتر باشد'),
    password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد'),
});
const resetSchema = z.object({
    identifier: z
        .string()
        .trim()
        .min(3, 'حداقل ۳ کاراکتر وارد کنید')
        .regex(identifierRegex, 'ایمیل یا نام کاربری معتبر وارد کنید'),
});

type LoginInputs = z.infer<typeof loginSchema>;
type RegisterInputs = z.infer<typeof registerSchema>;
type ResetInputs = z.infer<typeof resetSchema>;

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: (u: string, p: string) => Promise<any>;
    onRegister: (u: string, p: string, name: string) => Promise<any>;
    isLoading: boolean;
}

const StudentIllustration = ({ mode }: { mode: 'login' | 'register' }) => (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" aria-hidden="true">
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
    </svg>
);

const LoadingSpinnerInline = () => (
    <span
        aria-hidden="true"
        className="inline-block w-4 h-4 rounded-full border-2 border-white/35 border-t-white animate-spin"
    />
);

const FloatingInput = ({
    id,
    label,
    type = 'text',
    placeholder,
    error,
    register: reg,
    dir = 'ltr',
    autoComplete,
    inputMode,
    rightIcon,
    leftSlot,
    autoFocusField = false,
}: {
    id: string;
    label: string;
    type?: string;
    placeholder?: string;
    error?: string;
    register: any;
    dir?: 'ltr' | 'rtl';
    autoComplete?: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
    rightIcon?: React.ReactNode;
    leftSlot?: React.ReactNode;
    autoFocusField?: boolean;
}) => {
    const errorId = `${id}-error`;
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="text-xs font-bold text-[var(--text-secondary)] block">
                {label}
            </label>
            <div className="relative">
                {rightIcon && (
                    <div
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                        aria-hidden="true"
                    >
                        {rightIcon}
                    </div>
                )}
                <input
                    id={id}
                    type={type}
                    placeholder={placeholder}
                    dir={dir}
                    autoComplete={autoComplete}
                    inputMode={inputMode}
                    data-autofocus={autoFocusField ? 'true' : undefined}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    {...reg}
                    className={`w-full min-h-[46px] ${rightIcon ? 'pr-10' : 'pr-4'} ${
                        leftSlot ? 'pl-12' : 'pl-4'
                    } py-2.5 rounded-2xl border-2 text-base sm:text-sm outline-none transition bg-[var(--surface-elevated)] text-on-surface placeholder:text-[var(--text-muted)] ${
                        error
                            ? 'border-rose-500 focus:border-rose-500'
                            : 'border-[var(--border-subtle)] focus:border-primary'
                    }`}
                />
                {leftSlot && <div className="absolute left-1.5 top-1/2 -translate-y-1/2">{leftSlot}</div>}
            </div>
            {error && (
                <p
                    id={errorId}
                    role="alert"
                    className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5"
                >
                    <AlertCircle size={13} className="shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                </p>
            )}
        </div>
    );
};

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, onRegister, isLoading }) => {
    const { loginWithGoogle, resetPassword, loginAsGuest, loginOffline, authError, clearAuthError } = useStore();
    const prefersReducedMotion = useReducedMotion();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [isResetMode, setIsResetMode] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [loadingAction, setLoadingAction] = useState<'login' | 'register' | 'google' | 'reset' | 'guest' | null>(null);
    const [shakeActive, setShakeActive] = useState(false);
    const shakeTimerRef = useRef<number | null>(null);

    const triggerShake = useCallback(() => {
        haptics.warning();
        setShakeActive(false);
        if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current);
        window.requestAnimationFrame(() => {
            setShakeActive(true);
            shakeTimerRef.current = window.setTimeout(() => setShakeActive(false), 400);
        });
    }, []);

    useEffect(() => {
        if (authError) {
            triggerShake();
        }
    }, [authError, triggerShake]);

    useEffect(() => {
        if (isOpen) {
            clearAuthError?.();
        } else {
            setLoadingAction(null);
            setIsResetMode(false);
            setShakeActive(false);
            clearAuthError?.();
        }
    }, [isOpen, clearAuthError]);

    const {
        register: regLogin,
        handleSubmit: submitLogin,
        formState: { errors: loginErr },
        reset: resetLogin,
    } = useForm<LoginInputs>({
        resolver: zodResolver(loginSchema),
        mode: 'onBlur',
    });

    const {
        register: regRegister,
        handleSubmit: submitRegister,
        formState: { errors: regErr },
        reset: resetRegister,
    } = useForm<RegisterInputs>({
        resolver: zodResolver(registerSchema),
        mode: 'onBlur',
    });

    const {
        register: regReset,
        handleSubmit: submitReset,
        formState: { errors: resetErr },
        reset: resetResetForm,
    } = useForm<ResetInputs>({
        resolver: zodResolver(resetSchema),
        mode: 'onBlur',
    });

    const isBusy = loadingAction !== null || isLoading;

    const markOnboarded = () => {
        try {
            localStorage.setItem('parsaplan_onboarded', '1');
        } catch {}
    };

    const switchMode = (m: 'login' | 'register') => {
        haptics.selection();
        clearAuthError?.();
        setMode(m);
        setIsResetMode(false);
        resetLogin();
        resetRegister();
        resetResetForm();
        setShowPass(false);
    };

    const handleLogin = async (d: LoginInputs) => {
        setLoadingAction('login');
        try {
            const ok = await onLogin(d.username, d.password);
            if (ok !== false) {
                haptics.success();
                markOnboarded();
                onClose();
            } else {
                triggerShake();
            }
        } finally {
            setLoadingAction(null);
        }
    };

    const handleRegister = async (d: RegisterInputs) => {
        setLoadingAction('register');
        try {
            const ok = await onRegister(d.username, d.password, d.displayName);
            if (ok !== false) {
                haptics.success();
                markOnboarded();
                onClose();
            } else {
                triggerShake();
            }
        } finally {
            setLoadingAction(null);
        }
    };

    const handleReset = async (d: ResetInputs) => {
        if (!resetPassword) return;
        setLoadingAction('reset');
        try {
            const ok = await resetPassword(d.identifier);
            if (ok) {
                haptics.success();
                setIsResetMode(false);
                resetResetForm();
            } else {
                triggerShake();
            }
        } finally {
            setLoadingAction(null);
        }
    };

    const handleGoogle = async () => {
        if (!loginWithGoogle) return;
        setLoadingAction('google');
        try {
            const ok = await loginWithGoogle();
            if (ok) {
                haptics.success();
                markOnboarded();
                onClose();
            }
        } finally {
            setLoadingAction(null);
        }
    };

    const handleGuest = async () => {
        if (!loginAsGuest) return;
        setLoadingAction('guest');
        try {
            const ok = await loginAsGuest();
            if (ok) {
                haptics.success();
                markOnboarded();
                onClose();
            }
        } finally {
            setLoadingAction(null);
        }
    };

    const isLogin = mode === 'login';

    return (
        <ModalSheet
            isOpen={isOpen}
            onClose={onClose}
            title={isLogin ? 'ورود به حساب کاربری' : 'ساخت حساب کاربری'}
            showHeader={false}
            dismissDisabled={isBusy}
            historyKey="auth-modal"
            maxWidthClass="max-w-sm"
            zIndexClass="z-[2147483647]"
            contentClassName="border-0"
        >
            <motion.div
                animate={
                    prefersReducedMotion || !shakeActive
                        ? { x: 0 }
                        : { x: EXAGGERATED_SHAKE_KEYFRAMES }
                }
                transition={TRANSITION_SHAKE}
            >
            {/* Brand Header */}
            <div
                className={`relative overflow-hidden transition-colors duration-300 ${
                    isLogin ? 'bg-indigo-600' : 'bg-violet-600'
                }`}
            >
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isBusy}
                    aria-label="بستن پنجره ورود"
                    className="absolute top-3 left-3 z-20 w-11 h-11 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white transition disabled:opacity-50 cursor-pointer"
                >
                    <X size={18} />
                </button>

                <div className="relative flex items-center justify-between px-6 pt-6 pb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center">
                                {isLogin ? (
                                    <LogIn size={14} className="text-white" aria-hidden="true" />
                                ) : (
                                    <UserPlus size={14} className="text-white" aria-hidden="true" />
                                )}
                            </div>
                            <span className="text-white/90 text-xs font-semibold">
                                {isResetMode ? 'بازیابی رمز عبور' : isLogin ? 'خوش اومدی!' : 'عضویت ابری'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-white leading-tight">
                            {isResetMode ? 'بازیابی حساب' : isLogin ? 'ورود به' : 'ثبت‌نام در'}
                            <br />
                            <bdi className="text-white/95">ParsaPlan</bdi>
                        </h2>
                    </div>
                    <div className="w-24 h-24 -mt-2 -mb-2 flex-shrink-0">
                        <StudentIllustration mode={mode} />
                    </div>
                </div>

                {/* Accessible Tab Switcher */}
                <div className="mx-5 mb-5">
                    <div
                        role="tablist"
                        aria-label="حالت احراز هویت"
                        className="bg-white/15 rounded-2xl p-1 flex gap-1"
                    >
                        <button
                            type="button"
                            role="tab"
                            aria-selected={isLogin}
                            onClick={() => switchMode('login')}
                            disabled={isBusy}
                            className={`flex-1 min-h-[42px] flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                                isLogin
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-white/90 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            <LogIn size={13} aria-hidden="true" /> ورود
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={!isLogin}
                            onClick={() => switchMode('register')}
                            disabled={isBusy}
                            className={`flex-1 min-h-[42px] flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                                !isLogin
                                    ? 'bg-white text-violet-700 shadow-sm'
                                    : 'text-white/90 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            <UserPlus size={13} aria-hidden="true" /> ثبت‌نام
                        </button>
                    </div>
                </div>
            </div>

            {/* Form Area */}
            <div className="bg-[var(--surface-canvas)] px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5 space-y-4">
                <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={isBusy}
                    className="w-full min-h-[46px] py-3 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-on-surface font-bold text-sm hover:bg-surface-container active:scale-[0.98] transition flex items-center justify-center gap-2.5 shadow-xs disabled:opacity-60 cursor-pointer"
                >
                    {loadingAction === 'google' ? (
                        <span className="text-xs font-bold">در حال اتصال به گوگل...</span>
                    ) : (
                        <>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                    fill="#EA4335"
                                    d="M12 10.2v3.9h5.5c-.2 1.2-1.5 3.6-5.5 3.6-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-2H12z"
                                />
                            </svg>
                            <span>ورود سریع با حساب گوگل</span>
                        </>
                    )}
                </button>

                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                    <span className="text-[11px] text-[var(--text-secondary)] font-semibold">
                        یا با ایمیل / نام کاربری
                    </span>
                    <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                </div>

                {authError && (
                    <div
                        role="alert"
                        className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-200 text-xs leading-relaxed"
                    >
                        <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" aria-hidden="true" />
                        <span className="font-bold">{authError}</span>
                    </div>
                )}

                {isResetMode ? (
                    <form onSubmit={submitReset(handleReset, triggerShake)} noValidate className="space-y-3.5">
                        <FloatingInput
                            id="reset-identifier"
                            label="ایمیل یا نام کاربری"
                            placeholder="name@example.com یا parsa2025"
                            autoComplete="username"
                            inputMode="email"
                            autoFocusField
                            error={resetErr.identifier?.message}
                            register={regReset('identifier')}
                            rightIcon={<Mail size={15} />}
                        />
                        <button
                            type="submit"
                            disabled={isBusy}
                            className="w-full min-h-[46px] py-3 rounded-2xl bg-primary hover:brightness-110 text-on-primary font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                        >
                            {loadingAction === 'reset' ? (
                                <LoadingSpinnerInline />
                            ) : (
                                <>
                                    <KeyRound size={15} aria-hidden="true" /> ارسال لینک بازیابی
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsResetMode(false)}
                            className="w-full min-h-[40px] text-xs text-primary font-bold py-1 cursor-pointer"
                        >
                            بازگشت به فرم ورود
                        </button>
                    </form>
                ) : isLogin ? (
                    <form onSubmit={submitLogin(handleLogin, triggerShake)} noValidate className="space-y-3.5">
                        <FloatingInput
                            id="login-user"
                            label="ایمیل یا نام کاربری"
                            placeholder="name@example.com یا parsa2025"
                            autoComplete="username"
                            inputMode="email"
                            autoFocusField
                            error={loginErr.username?.message}
                            register={regLogin('username')}
                            rightIcon={<Mail size={15} />}
                        />
                        <FloatingInput
                            id="login-pass"
                            label="رمز عبور"
                            type={showPass ? 'text' : 'password'}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            error={loginErr.password?.message}
                            register={regLogin('password')}
                            rightIcon={<KeyRound size={15} />}
                            leftSlot={
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    aria-label={showPass ? 'مخفی کردن رمز' : 'نمایش رمز'}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-on-surface transition cursor-pointer"
                                >
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            }
                        />
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsResetMode(true)}
                                className="min-h-[36px] px-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                            >
                                رمز عبور را فراموش کرده‌ام
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={isBusy}
                            className="w-full min-h-[48px] py-3 rounded-2xl bg-primary hover:brightness-110 text-on-primary font-black text-sm shadow-sm active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                        >
                            {loadingAction === 'login' ? (
                                <LoadingSpinnerInline />
                            ) : (
                                <>
                                    <LogIn size={16} aria-hidden="true" /> ورود به حساب
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={submitRegister(handleRegister, triggerShake)} noValidate className="space-y-3">
                        <FloatingInput
                            id="reg-name"
                            label="نام نمایشی"
                            placeholder="نام شما"
                            dir="rtl"
                            autoComplete="name"
                            autoFocusField
                            error={regErr.displayName?.message}
                            register={regRegister('displayName')}
                            rightIcon={<Sparkles size={15} />}
                        />
                        <FloatingInput
                            id="reg-user"
                            label="ایمیل یا نام کاربری (ID)"
                            placeholder="name@example.com یا parsa2025"
                            autoComplete="username"
                            inputMode="email"
                            error={regErr.username?.message}
                            register={regRegister('username')}
                            rightIcon={<Mail size={15} />}
                        />
                        <FloatingInput
                            id="reg-pass"
                            label="رمز عبور"
                            type={showPass ? 'text' : 'password'}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            error={regErr.password?.message}
                            register={regRegister('password')}
                            rightIcon={<KeyRound size={15} />}
                            leftSlot={
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    aria-label={showPass ? 'مخفی کردن رمز' : 'نمایش رمز'}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-on-surface transition cursor-pointer"
                                >
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            }
                        />
                        <button
                            type="submit"
                            disabled={isBusy}
                            className="w-full min-h-[48px] py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black text-sm shadow-sm active:scale-[0.98] transition flex items-center justify-center gap-2 mt-1 disabled:opacity-70 cursor-pointer"
                        >
                            {loadingAction === 'register' ? (
                                <LoadingSpinnerInline />
                            ) : (
                                <>
                                    <Sparkles size={16} aria-hidden="true" /> ساخت حساب کاربری
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Quick Access Divider */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                    <span className="text-[11px] text-[var(--text-secondary)] font-semibold">حالت سریع بدون ثبت‌نام</span>
                    <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                    <button
                        type="button"
                        onClick={handleGuest}
                        disabled={isBusy}
                        className="min-h-[44px] py-2.5 px-3 rounded-2xl border border-dashed border-[var(--border-strong)] text-on-surface font-bold text-xs hover:border-primary hover:text-primary transition flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                    >
                        <Ghost size={15} aria-hidden="true" />
                        <span>مهمان ابری</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            haptics.selection();
                            markOnboarded();
                            loginOffline?.();
                            onClose();
                        }}
                        disabled={isBusy}
                        className="min-h-[44px] py-2.5 px-3 rounded-2xl bg-surface-container text-on-surface font-bold text-xs hover:bg-surface-container-high transition flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                    >
                        <CloudOff size={15} className="text-amber-500" aria-hidden="true" />
                        <span>ادامه آفلاین</span>
                    </button>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-[var(--text-secondary)] pt-1">
                    {isLogin ? 'حساب نداری؟ ' : 'حساب داری؟ '}
                    <button
                        type="button"
                        onClick={() => switchMode(isLogin ? 'register' : 'login')}
                        disabled={isBusy}
                        className="font-extrabold underline-offset-2 underline text-primary cursor-pointer px-1 py-1"
                    >
                        {isLogin ? 'ثبت‌نام کن' : 'وارد شو'}
                    </button>
                </p>
            </div>
            </motion.div>
        </ModalSheet>
    );
};
