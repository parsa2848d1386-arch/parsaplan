import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User, Auth } from 'firebase/auth';
import { FirebaseConfig, ToastType } from '../types';
import { DEFAULT_FIREBASE_CONFIG, IS_DEFAULT_FIREBASE_ENABLED } from '../firebaseConfig';
import { useUI } from './UIContext';

// --- TYPES ---
interface AuthContextType {
    user: User | null;
    userId: string;
    userName: string;
    setUserName: (name: string) => void;
    login: (u: string, p: string) => Promise<boolean>;
    register: (u: string, p: string, name: string) => Promise<boolean>;
    logout: () => Promise<void>;
    firebaseConfig: FirebaseConfig | null;
    updateFirebaseConfig: (config: FirebaseConfig) => void;
    removeFirebaseConfig: () => void;
    cloudStatus: 'disconnected' | 'connected' | 'error';
    db: Firestore | null;
    auth: Auth | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { showToast, askConfirm } = useUI();
    const KEY_PREFIX = 'parsa_plan_v4_';
    const KEY_FB_CONFIG = KEY_PREFIX + 'firebase_config';

    const [user, setUser] = useState<User | null>(null);
    const [userId, setUserId] = useState<string>('');
    const [userName, setUserNameState] = useState('');
    const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig | null>(null);
    const [db, setDb] = useState<Firestore | null>(null);
    const [auth, setAuth] = useState<Auth | null>(null);
    const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');

    const setUserName = (name: string) => { setUserNameState(name); showToast('نام ذخیره شد', 'success'); };

    // --- FIREBASE INITIALIZATION ---
    useEffect(() => {
        const initFirebase = async () => {
            const storedConfig = localStorage.getItem(KEY_FB_CONFIG);
            if (storedConfig) {
                try {
                    const config = JSON.parse(storedConfig);
                    setFirebaseConfig(config);
                    await initializeFirebaseApp(config);
                } catch (e) {
                    console.error("Error loading firebase config", e);
                }
            } else if (IS_DEFAULT_FIREBASE_ENABLED) {
                try {
                    setFirebaseConfig(DEFAULT_FIREBASE_CONFIG);
                    await initializeFirebaseApp(DEFAULT_FIREBASE_CONFIG);
                } catch (e) {
                    console.error("Error loading default firebase config", e);
                }
            }
        };
        initFirebase();
    }, []);

    const initializeFirebaseApp = async (config: FirebaseConfig) => {
        try {
            const apps = getApps();
            let app: FirebaseApp;
            if (apps.length > 0) {
                app = apps[0];
            } else {
                app = initializeApp(config);
            }

            const firestore = getFirestore(app);
            const firebaseAuth = getAuth(app);

            setDb(firestore);
            setAuth(firebaseAuth);
            setCloudStatus('connected');
            // console.log("Firebase initialized dynamically");

            onAuthStateChanged(firebaseAuth, (currentUser) => {
                setUser(currentUser);
                if (currentUser) {
                    setUserId(currentUser.uid);
                } else {
                    setUserId('parsaplan_local_user');
                }
            });

        } catch (error) {
            console.error("Firebase init failed:", error);
            setCloudStatus('error');
            showToast('خطا در اتصال به فایربیس. تنظیمات را چک کنید.', 'error');
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

    const generateEmail = (username: string) => `${username.toLowerCase()}@parsaplan.user`;

    const login = async (u: string, p: string): Promise<boolean> => {
        if (!auth) { showToast('اتصال فایربیس برقرار نیست', 'error'); return false; }
        try {
            await signInWithEmailAndPassword(auth, generateEmail(u), p);
            showToast('خوش آمدید', 'success');
            return true;
        } catch (e: any) {
            console.error(e);
            let msg = 'خطا در ورود';
            if (e.code === 'auth/invalid-credential') msg = 'نام کاربری یا رمز عبور اشتباه است';
            showToast(msg, 'error');
            return false;
        }
    };

    const register = async (u: string, p: string, name: string): Promise<boolean> => {
        if (!auth) { showToast('اتصال فایربیس برقرار نیست', 'error'); return false; }
        try {
            const cred = await createUserWithEmailAndPassword(auth, generateEmail(u), p);
            // NOTE: Data initialization for new user is handled in DataContext
            return true;
        } catch (e: any) {
            let msg = 'خطا در ثبت نام';
            if (e.code === 'auth/email-already-in-use') msg = 'این نام کاربری قبلاً استفاده شده است';
            else if (e.code === 'auth/weak-password') msg = 'رمز عبور باید حداقل ۶ رقم باشد';
            showToast(msg, 'error');
            return false;
        }
    };

    const logout = async () => {
        if (!auth) return;
        askConfirm('خروج از حساب', 'آیا مطمئن هستید؟ دیتای لوکال باقی می‌ماند.', async () => {
            await signOut(auth);
            showToast('خارج شدید', 'info');
        }, 'info');
    };

    return (
        <AuthContext.Provider value={{
            user, userId, userName, setUserName, login, register, logout,
            firebaseConfig, updateFirebaseConfig, removeFirebaseConfig,
            cloudStatus, db, auth
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};
