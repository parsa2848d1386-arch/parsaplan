import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from 'firebase/firestore';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    signInAnonymously,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile,
    User,
    Auth,
} from 'firebase/auth';
import { FirebaseConfig } from '../types';
import { DEFAULT_FIREBASE_CONFIG, IS_DEFAULT_FIREBASE_ENABLED } from '../firebaseConfig';
import { useUI } from './UIContext';

// --- TYPES ---
interface AuthContextType {
    user: User | null;
    userId: string;
    userName: string;
    setUserName: (name: string) => void;
    authError: string | null;
    clearAuthError: () => void;
    login: (identifier: string, password: string) => Promise<boolean>;
    register: (identifier: string, password: string, name: string) => Promise<boolean>;
    loginWithGoogle: () => Promise<boolean>;
    resetPassword: (identifier: string) => Promise<boolean>;
    loginAsGuest: () => Promise<boolean>;
    loginOffline: () => void;
    logout: () => Promise<void>;
    firebaseConfig: FirebaseConfig | null;
    updateFirebaseConfig: (config: FirebaseConfig) => void;
    removeFirebaseConfig: () => void;
    cloudStatus: 'disconnected' | 'connected' | 'error';
    cloudError: string | null;
    reportCloudStatus: (status: 'disconnected' | 'connected' | 'error', errorMessage?: string | null) => void;
    db: Firestore | null;
    auth: Auth | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeAuthEmail = (identifier: string): string => {
    const trimmed = identifier.trim();
    if (trimmed.includes('@')) return trimmed.toLowerCase();
    return `${trimmed.toLowerCase()}@parsaplan.user`;
};

const formatFirebaseAuthError = (
    error: unknown,
    action: 'login' | 'register' | 'google' | 'reset',
    identifier?: string
): string => {
    const code = typeof (error as any)?.code === 'string' ? (error as any).code : '';
    const message = typeof (error as any)?.message === 'string' ? (error as any).message : '';
    const host = typeof window !== 'undefined' ? window.location.hostname : '';

    if (code === 'auth/configuration-not-found') {
        return 'سرویس Authentication هنوز در کنسول فایربیس فعال نشده است. در Firebase Console وارد بخش Authentication شوید و Get started را بزنید.';
    }
    if (code === 'auth/operation-not-allowed') {
        if (action === 'google') {
            return 'ورود با گوگل در کنسول فایربیس غیرفعال است. در Firebase Console > Authentication > Sign-in method گزینه Google را فعال کنید.';
        }
        return 'ثبت‌نام با ایمیل و رمز عبور در کنسول فایربیس غیرفعال است. در Firebase Console > Authentication > Sign-in method گزینه Email/Password را فعال کنید.';
    }
    if (code === 'auth/unauthorized-domain') {
        return `دامنه فعلی (${host}) در فایربیس مجاز نیست. آن را در Firebase Console > Authentication > Settings > Authorized domains اضافه کنید.`;
    }
    if (code === 'auth/network-request-failed') {
        return 'خطای شبکه در ارتباط با فایربیس. اتصال اینترنت (یا فیلترشکن) را بررسی کنید یا از ورود آفلاین استفاده نمایید.';
    }
    if (code === 'auth/invalid-api-key' || code.includes('api-key-not-valid')) {
        return 'کلید تنظیمات فایربیس (API Key) نامعتبر است. مقادیر تنظیمات فایربیس را بررسی کنید.';
    }
    if (code === 'auth/email-already-in-use') {
        return `حسابی با «${identifier || 'این ایمیل'}» قبلاً ثبت شده است؛ لطفاً از تب ورود وارد شوید.`;
    }
    if (code === 'auth/weak-password') {
        return 'رمز عبور ضعیف است و باید حداقل ۶ کاراکتر باشد.';
    }
    if (code === 'auth/invalid-email') {
        return 'فرمت ایمیل یا نام کاربری معتبر نیست.';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        return action === 'reset'
            ? 'کاربری با این ایمیل یافت نشد.'
            : 'ایمیل/نام کاربری یا رمز عبور اشتباه است.';
    }
    if (code === 'auth/user-disabled') {
        return 'این حساب کاربری غیرفعال شده است.';
    }
    if (code === 'auth/too-many-requests') {
        return 'تعداد درخواست‌ها بیش از حد مجاز بود. لطفاً چند دقیقه دیگر دوباره تلاش کنید.';
    }
    if (code === 'auth/popup-blocked') {
        return 'پنجره ورود گوگل توسط مرورگر مسدود شد. اجازه Popup را فعال کنید یا برنامه را در تب جداگانه باز کنید.';
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return 'پنجره ورود گوگل بسته شد.';
    }
    if (code === 'auth/account-exists-with-different-credential') {
        return 'این ایمیل قبلاً با روش ورود دیگری ثبت شده است.';
    }

    const baseLabel =
        action === 'register'
            ? 'خطا در ثبت‌نام'
            : action === 'login'
              ? 'خطا در ورود به حساب'
              : action === 'google'
                ? 'ورود با گوگل ناموفق بود'
                : 'خطا در ارسال ایمیل بازیابی';

    return code ? `${baseLabel} (${code})` : message ? `${baseLabel}: ${message}` : baseLabel;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { showToast, askConfirm } = useUI();
    const KEY_PREFIX = 'parsa_plan_v4_';
    const KEY_FB_CONFIG = KEY_PREFIX + 'firebase_config';

    const [user, setUser] = useState<User | null>(null);
    const [userId, setUserId] = useState<string>('parsaplan_local_user');
    const [userName, setUserNameState] = useState('');
    const [authError, setAuthError] = useState<string | null>(null);
    const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig | null>(null);
    const [db, setDb] = useState<Firestore | null>(null);
    const [auth, setAuth] = useState<Auth | null>(null);
    const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');
    const [cloudError, setCloudError] = useState<string | null>(null);

    const clearAuthError = () => setAuthError(null);

    const reportCloudStatus = (status: 'disconnected' | 'connected' | 'error', errorMessage?: string | null) => {
        setCloudStatus(status);
        setCloudError(status === 'error' ? errorMessage || null : null);
    };

    const setUserName = (name: string) => {
        setUserNameState(name);
        showToast('نام ذخیره شد', 'success');
    };

    // --- FIREBASE INITIALIZATION ---
    useEffect(() => {
        let unsubscribeAuth: (() => void) | undefined;

        const initFirebase = async () => {
            const storedConfig = localStorage.getItem(KEY_FB_CONFIG);
            if (storedConfig) {
                try {
                    const config = JSON.parse(storedConfig);
                    setFirebaseConfig(config);
                    unsubscribeAuth = await initializeFirebaseApp(config);
                } catch (e) {
                    console.error('Error loading firebase config', e);
                }
            } else if (IS_DEFAULT_FIREBASE_ENABLED) {
                try {
                    setFirebaseConfig(DEFAULT_FIREBASE_CONFIG);
                    unsubscribeAuth = await initializeFirebaseApp(DEFAULT_FIREBASE_CONFIG);
                } catch (e) {
                    console.error('Error loading default firebase config', e);
                }
            }
        };
        initFirebase();

        return () => {
            unsubscribeAuth?.();
        };
    }, []);

    const initializeFirebaseApp = async (config: FirebaseConfig): Promise<(() => void) | undefined> => {
        try {
            const apps = getApps();
            let app: FirebaseApp;
            if (apps.length > 0) {
                app = apps[0];
            } else {
                app = initializeApp(config);
            }

            let firestore: Firestore;
            try {
                firestore = initializeFirestore(app, {
                    localCache: persistentLocalCache({
                        tabManager: persistentMultipleTabManager(),
                    }),
                });
            } catch {
                firestore = getFirestore(app);
            }
            const firebaseAuth = getAuth(app);

            setDb(firestore);
            setAuth(firebaseAuth);
            setCloudStatus('connected');

            const unsub = onAuthStateChanged(firebaseAuth, (currentUser) => {
                setUser(currentUser);
                if (currentUser) {
                    setUserId(currentUser.uid);
                    setCloudStatus('connected');
                    setCloudError(null);
                    if (currentUser.displayName && !userName) {
                        setUserNameState(currentUser.displayName);
                    }
                    try {
                        localStorage.setItem('parsaplan_onboarded', '1');
                    } catch {}
                } else {
                    setUserId('parsaplan_local_user');
                    setCloudError(null);
                }
            });
            return unsub;
        } catch (error) {
            console.error('Firebase init failed:', error);
            setCloudStatus('error');
            showToast('خطا در اتصال به فایربیس. تنظیمات را چک کنید.', 'error');
            return undefined;
        }
    };

    const updateFirebaseConfig = (config: FirebaseConfig) => {
        localStorage.setItem(KEY_FB_CONFIG, JSON.stringify(config));
        setFirebaseConfig(config);
        window.location.reload();
    };

    const removeFirebaseConfig = () => {
        localStorage.removeItem(KEY_FB_CONFIG);
        setFirebaseConfig(null);
        setDb(null);
        setCloudStatus('disconnected');
        showToast('تنظیمات فایربیس حذف شد.', 'warning');
        window.location.reload();
    };

    const login = async (identifier: string, password: string): Promise<boolean> => {
        setAuthError(null);
        if (!auth) {
            const msg = 'اتصال فایربیس برقرار نیست — می‌توانید از ادامه آفلاین استفاده کنید';
            setAuthError(msg);
            showToast(msg, 'error');
            return false;
        }
        try {
            const email = normalizeAuthEmail(identifier);
            await signInWithEmailAndPassword(auth, email, password);
            try {
                localStorage.setItem('parsaplan_onboarded', '1');
            } catch {}
            showToast('خوش آمدید 🎉', 'success');
            return true;
        } catch (e: any) {
            console.error('Login error:', e?.code, e?.message, e);
            const msg = formatFirebaseAuthError(e, 'login', identifier);
            setAuthError(msg);
            showToast(msg, 'error');
            return false;
        }
    };

    const register = async (identifier: string, password: string, name: string): Promise<boolean> => {
        setAuthError(null);
        if (!auth) {
            const msg = 'اتصال فایربیس برقرار نیست — تنظیمات فایربیس را بررسی کنید یا از ادامه آفلاین استفاده کنید';
            setAuthError(msg);
            showToast(msg, 'error');
            return false;
        }
        try {
            const email = normalizeAuthEmail(identifier);
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            if (name.trim() && cred?.user && typeof updateProfile === 'function') {
                await updateProfile(cred.user, { displayName: name.trim() }).catch(() => {});
            }
            if (name.trim()) setUserNameState(name.trim());
            try {
                localStorage.setItem('parsaplan_onboarded', '1');
            } catch {}
            showToast(`خوش آمدی ${name || 'دوست من'} 🎉`, 'success');
            return true;
        } catch (e: any) {
            console.error('Register error:', e?.code, e?.message, e);
            const msg = formatFirebaseAuthError(e, 'register', identifier);
            setAuthError(msg);
            showToast(msg, 'error');
            return false;
        }
    };

    const loginWithGoogle = async (): Promise<boolean> => {
        setAuthError(null);
        if (!auth) {
            const msg = 'ابتدا اتصال فایربیس را در تنظیمات فعال کنید یا از ادامه آفلاین استفاده نمایید';
            setAuthError(msg);
            showToast(msg, 'error');
            return false;
        }
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            const cred = await signInWithPopup(auth, provider);
            if (cred?.user?.displayName) {
                setUserNameState(cred.user.displayName);
            }
            try {
                localStorage.setItem('parsaplan_onboarded', '1');
            } catch {}
            showToast('ورود با گوگل موفقیت‌آمیز بود 🎉', 'success');
            return true;
        } catch (e: any) {
            console.error('Google Sign-In error:', e?.code, e?.message, e);
            if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') {
                showToast('پنجره ورود گوگل بسته شد', 'info');
                return false;
            }
            const msg = formatFirebaseAuthError(e, 'google');
            setAuthError(msg);
            showToast(msg, 'error');
            return false;
        }
    };

    const resetPassword = async (identifier: string): Promise<boolean> => {
        setAuthError(null);
        if (!auth) {
            const msg = 'اتصال فایربیس برقرار نیست';
            setAuthError(msg);
            showToast(msg, 'error');
            return false;
        }
        if (!identifier.trim() || !identifier.includes('@')) {
            const msg = 'برای بازیابی رمز عبور، ایمیل واقعی ثبت‌شده خود را وارد کنید';
            setAuthError(msg);
            showToast(msg, 'warning');
            return false;
        }
        try {
            await sendPasswordResetEmail(auth, identifier.trim().toLowerCase());
            showToast('لینک بازیابی رمز عبور به ایمیل شما ارسال شد 📧', 'success');
            return true;
        } catch (e: any) {
            console.error('Password reset error:', e?.code, e?.message, e);
            const msg = formatFirebaseAuthError(e, 'reset', identifier);
            setAuthError(msg);
            showToast(msg, 'error');
            return false;
        }
    };

    const loginOffline = () => {
        setAuthError(null);
        const dummyUser = {
            uid: 'parsaplan_local_user',
            displayName: userName || 'کاربر محلی',
            isAnonymous: true,
            email: 'local@parsaplan.local',
        };
        setUser(dummyUser as unknown as User);
        setUserId('parsaplan_local_user');
        setUserNameState(userName || 'کاربر محلی');
        try {
            localStorage.setItem('parsaplan_onboarded', '1');
        } catch {}
        showToast('ورود آفلاین موفقیت‌آمیز بود 🔌', 'success');
    };

    const loginAsGuest = async (): Promise<boolean> => {
        setAuthError(null);
        if (!auth) {
            loginOffline();
            return true;
        }
        try {
            await signInAnonymously(auth);
            setUserNameState((prev) => prev || 'مهمان');
            try {
                localStorage.setItem('parsaplan_onboarded', '1');
            } catch {}
            showToast('به عنوان مهمان ابری وارد شدید 👋', 'info');
            return true;
        } catch (e: any) {
            console.error('Anonymous auth failed, falling back to local login:', e?.code, e?.message, e);
            loginOffline();
            return true;
        }
    };

    const logout = async () => {
        if (userId === 'parsaplan_local_user') {
            setUser(null);
            showToast('از حساب آفلاین خارج شدید', 'info');
            return;
        }
        if (!auth) {
            setUser(null);
            showToast('خارج شدید', 'info');
            return;
        }
        askConfirm(
            'خروج از حساب',
            'آیا مطمئن هستید؟ دیتای لوکال باقی می‌ماند.',
            async () => {
                await signOut(auth);
                showToast('خارج شدید', 'info');
            },
            'info'
        );
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                userId,
                userName,
                setUserName,
                authError,
                clearAuthError,
                login,
                register,
                loginWithGoogle,
                resetPassword,
                loginAsGuest,
                loginOffline,
                logout,
                firebaseConfig,
                updateFirebaseConfig,
                removeFirebaseConfig,
                cloudStatus,
                cloudError,
                reportCloudStatus,
                db,
                auth,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
