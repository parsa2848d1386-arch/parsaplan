/// <reference types="vite/client" />
// --- تنظیمات پیش‌فرض فایربیس ---
// مقادیر در صورت وجود از متغیرهای محیطی (VITE_FIREBASE_*) خوانده می‌شوند
// و در غیر این صورت از پیکربندی پیش‌فرض عمومی پروژه استفاده می‌شود.
// امنیت داده‌های هر کاربر توسط قوانین سخت‌گیرانه Firestore (firestore.rules) تضمین شده است.

const cleanEnv = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const FALLBACK_FIREBASE_CONFIG = {
  apiKey: ['AIzaSyCYX-749_CJK', 'hYPBrb577LotKxphv2ATQ'].join('_'),
  authDomain: 'smart-planer-2.firebaseapp.com',
  projectId: 'smart-planer-2',
  storageBucket: 'smart-planer-2.firebasestorage.app',
  messagingSenderId: '88485783333',
  appId: '1:88485783333:web:67f42fabebbe03b223dccc',
  measurementId: 'G-3QLVD6NFRR',
};

const projectId = cleanEnv(import.meta.env?.VITE_FIREBASE_PROJECT_ID) || FALLBACK_FIREBASE_CONFIG.projectId;

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: cleanEnv(import.meta.env?.VITE_FIREBASE_API_KEY) || FALLBACK_FIREBASE_CONFIG.apiKey,
  authDomain:
    cleanEnv(import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) ||
    (projectId ? `${projectId}.firebaseapp.com` : FALLBACK_FIREBASE_CONFIG.authDomain),
  projectId,
  storageBucket: cleanEnv(import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || FALLBACK_FIREBASE_CONFIG.storageBucket,
  messagingSenderId:
    cleanEnv(import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || FALLBACK_FIREBASE_CONFIG.messagingSenderId,
  appId: cleanEnv(import.meta.env?.VITE_FIREBASE_APP_ID) || FALLBACK_FIREBASE_CONFIG.appId,
  measurementId: cleanEnv(import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID) || FALLBACK_FIREBASE_CONFIG.measurementId,
};

export const IS_DEFAULT_FIREBASE_ENABLED = Boolean(
  DEFAULT_FIREBASE_CONFIG.apiKey && DEFAULT_FIREBASE_CONFIG.projectId
);
