/// <reference types="vite/client" />
// --- تنظیمات پیش‌فرض فایربیس ---
// مقادیر از متغیرهای محیطی خوانده می‌شوند و کاربر می‌تواند از بخش تنظیمات، کانفیگ سفارشی وارد کند.

const cleanEnv = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const projectId = cleanEnv(import.meta.env?.VITE_FIREBASE_PROJECT_ID);

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: cleanEnv(import.meta.env?.VITE_FIREBASE_API_KEY),
  authDomain:
    cleanEnv(import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) ||
    (projectId ? `${projectId}.firebaseapp.com` : ''),
  projectId,
  storageBucket: cleanEnv(import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(import.meta.env?.VITE_FIREBASE_APP_ID),
  measurementId: cleanEnv(import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID),
};

export const IS_DEFAULT_FIREBASE_ENABLED = Boolean(
  DEFAULT_FIREBASE_CONFIG.apiKey && DEFAULT_FIREBASE_CONFIG.projectId
);
