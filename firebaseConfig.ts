
// --- تنظیمات فایربیس ---
// لطفاً اطلاعات پروژه فایربیس خود را در اینجا وارد کنید.
// 1. به console.firebase.google.com بروید.
// 2. یک پروژه جدید بسازید.
// 3. Firestore Database را فعال کنید (در حالت Test Mode).
// 4. در تنظیمات پروژه (Project Settings)، اسکریپت Web SDK را کپی کنید و مقادیر زیر را پر کنید.

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// اگر هنوز تنظیمات را وارد نکرده‌اید، این متغیر را false نگه دارید تا اپ با LocalStorage کار کند.
export const IS_FIREBASE_CONFIGURED = false; 
