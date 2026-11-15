
// --- تنظیمات پیش‌فرض فایربیس ---
// این تنظیمات به صورت پیش‌فرض استفاده می‌شوند.
// کاربر می‌تواند از بخش تنظیمات، کانفیگ خودش را جایگزین کند.

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FIREBASE_API_KEY) || "AIzaSyBOt_mxj4mZ3eKXnwIpF-Jc1AXEeSAJVGM",
  authDomain: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN) || "lifeos-cfe82.firebaseapp.com",
  projectId: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID) || "lifeos-cfe82",
  storageBucket: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET) || "lifeos-cfe82.firebasestorage.app",
  messagingSenderId: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || "616355996390",
  appId: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FIREBASE_APP_ID) || "1:616355996390:web:07d2a615e9252d7ded1127",
  measurementId: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID) || "G-1LPBK6BY2M"
};

// اگر کاربر کانفیگ سفارشی وارد کرده، از آن استفاده می‌شود.
// در غیر این صورت از DEFAULT_FIREBASE_CONFIG استفاده می‌شود.
export const IS_DEFAULT_FIREBASE_ENABLED = true; 
