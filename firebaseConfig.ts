
// --- تنظیمات پیش‌فرض فایربیس ---
// این تنظیمات به صورت پیش‌فرض استفاده می‌شوند.
// کاربر می‌تواند از بخش تنظیمات، کانفیگ خودش را جایگزین کند.

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBOt_mxj4mZ3eKXnwIpF-Jc1AXEeSAJVGM",
  authDomain: "lifeos-cfe82.firebaseapp.com",
  projectId: "lifeos-cfe82",
  storageBucket: "lifeos-cfe82.firebasestorage.app",
  messagingSenderId: "616355996390",
  appId: "1:616355996390:web:07d2a615e9252d7ded1127",
  measurementId: "G-1LPBK6BY2M"
};

// اگر کاربر کانفیگ سفارشی وارد کرده، از آن استفاده می‌شود.
// در غیر این صورت از DEFAULT_FIREBASE_CONFIG استفاده می‌شود.
export const IS_DEFAULT_FIREBASE_ENABLED = true; 
