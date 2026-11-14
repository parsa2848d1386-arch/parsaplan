// @ts-ignore
import { registerSW } from 'virtual:pwa-register';

let swUpdateInterval: ReturnType<typeof setInterval> | null = null;

/**
 * پاکسازی امن و کامل کش‌های موقت مرورگر در CacheStorage
 * بدون هیچ‌گونه دستکاری یا حذف داده‌های کاربر در IndexedDB و localStorage
 */
export async function clearAllAppCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    console.log('[PWA] CacheStorage caches purged successfully:', cacheNames);
  } catch (err) {
    console.warn('[PWA] Warning while clearing CacheStorage:', err);
  }
}

/**
 * راه‌اندازی و مدیریت خودکار چرخه حیات Service Worker و دریافت آنی نسخه‌های جدید
 */
export function setupPwaAutoUpdater(): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !navigator.serviceWorker) {
    return () => {};
  }

  let refreshing = false;
  let hadController = Boolean(navigator.serviceWorker.controller);

  // لیسنر ریلود تک‌باره هنگام تغییر کنترلر به نسخه تازه (controllerchange)
  const handleControllerChange = () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    if (refreshing) return;
    refreshing = true;
    console.log('[PWA] New controller detected. Reloading page...');
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

  // ثبت و بروزرسانی خودکار
  let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;
  try {
    updateSW = registerSW({
      immediate: true,
      async onNeedRefresh() {
        console.log('[PWA] New update available. Purging caches and activating new worker...');
        await clearAllAppCaches();
        if (updateSW) {
          await updateSW(true);
        }
      },
      onOfflineReady() {
        console.log('[PWA] ParsaPlan is ready for offline use.');
      },
      onRegisteredSW(_swUrl: string, registration: ServiceWorkerRegistration | undefined) {
        if (!registration) return;
        console.log('[PWA] Service Worker registered successfully.');

        // استعلام بررسی نسخه به محض بارگذاری
        registration.update().catch(() => {});

        // الف) بررسی دوره‌ای هر ۱۵ دقیقه
        if (swUpdateInterval) {
          clearInterval(swUpdateInterval);
        }
        swUpdateInterval = setInterval(() => {
          if (navigator.onLine) {
            registration.update().catch(() => {});
          }
        }, 15 * 60 * 1000);

        // ب) بررسی هنگام بازگشت کاربر به تب برنامه (visibilitychange)
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible' && navigator.onLine) {
            registration.update().catch(() => {});
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // ج) بررسی هنگام اتصال مجدد به اینترنت (online)
        const handleOnline = () => {
          registration.update().catch(() => {});
        };
        window.addEventListener('online', handleOnline);
      },
      onRegisterError(error: unknown) {
        console.warn('[PWA] Service Worker registration failed:', error);
      },
    });
  } catch (err) {
    console.warn('[PWA] Failed to initialize registerSW:', err);
  }

  return () => {
    if (swUpdateInterval) {
      clearInterval(swUpdateInterval);
      swUpdateInterval = null;
    }
    navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  };
}

/**
 * بررسی دستی یا اجباری بروزرسانی کش کلاینت همراه با ریلود
 */
export async function forceUpdatePwa(): Promise<void> {
  await clearAllAppCaches();
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    } catch (e) {
      console.warn('[PWA] Error updating registration during forceUpdate:', e);
    }
  }
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}
