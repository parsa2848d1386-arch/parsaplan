import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// اطمینان از موک بودن virtual:pwa-register قبل از ایمپورت ماژول
vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn((_options?: any) => {
    return vi.fn().mockResolvedValue(undefined);
  }),
}));

import { clearAllAppCaches, setupPwaAutoUpdater, forceUpdatePwa } from '../../services/pwaManager';

describe('PWA & Cache Management Acceptance Verification (Milestone 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC1: vercel.json contains strict anti-cache headers for HTML/SW, immutable cache for assets, and SPA rewrites', () => {
    const vercelConfigPath = path.resolve(__dirname, '../../vercel.json');
    expect(fs.existsSync(vercelConfigPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'));

    // بررسی rewrite برای SPA (با استثنای /api/ برای فانکشن‌های سرورلس جمینای)
    expect(config.rewrites).toBeDefined();
    expect(
      config.rewrites.some(
        (r: any) =>
          (r.source === '/((?!api/).*)' || r.source === '/(.*)') && r.destination === '/index.html'
      )
    ).toBe(true);

    // بررسی هدرها
    const headers = config.headers;
    expect(Array.isArray(headers)).toBe(true);

    // روت کلی ضدکش
    const rootHeader = headers.find((h: any) => h.source === '/(.*)');
    expect(rootHeader).toBeDefined();
    expect(rootHeader.headers.some((kv: any) => kv.key === 'Cache-Control' && kv.value.includes('no-cache'))).toBe(true);
    expect(rootHeader.headers.some((kv: any) => kv.key === 'Pragma' && kv.value === 'no-cache')).toBe(true);
    expect(rootHeader.headers.some((kv: any) => kv.key === 'Expires' && kv.value === '0')).toBe(true);

    // روت سرویس‌ورکر ضدکش
    const swHeader = headers.find((h: any) => h.source.includes('sw\\.js'));
    expect(swHeader).toBeDefined();
    expect(swHeader.headers.some((kv: any) => kv.key === 'Cache-Control' && kv.value.includes('no-store'))).toBe(true);

    // روت assets با کش طولانی
    const assetHeader = headers.find((h: any) => h.source === '/assets/(.*)');
    expect(assetHeader).toBeDefined();
    expect(assetHeader.headers.some((kv: any) => kv.key === 'Cache-Control' && kv.value.includes('31536000') && kv.value.includes('immutable'))).toBe(true);

    // بررسی تقدم روت کلی نسبت به assets
    const rootIndex = headers.findIndex((h: any) => h.source === '/(.*)');
    const assetIndex = headers.findIndex((h: any) => h.source === '/assets/(.*)');
    expect(rootIndex).toBeLessThan(assetIndex);
  });

  it('AC2: index.html includes production anti-cache meta tags in <head>', () => {
    const indexPath = path.resolve(__dirname, '../../index.html');
    expect(fs.existsSync(indexPath)).toBe(true);

    const html = fs.readFileSync(indexPath, 'utf-8');
    expect(html).toContain('<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />');
    expect(html).toContain('<meta http-equiv="Pragma" content="no-cache" />');
    expect(html).toContain('<meta http-equiv="Expires" content="0" />');
  });

  it('AC3: vite.config.ts does not intercept native Firestore offline cache with conflicting runtime rules', () => {
    const viteConfigPath = path.resolve(__dirname, '../../vite.config.ts');
    const content = fs.readFileSync(viteConfigPath, 'utf-8');

    // اطمینان از حذف رول کش firestore.googleapis.com
    expect(content).not.toContain('firestore.googleapis.com');
  });

  it('AC4: clearAllAppCaches safely deletes CacheStorage without touching IndexedDB or localStorage', async () => {
    const deleteSpy = vi.fn().mockResolvedValue(true);
    const keysSpy = vi.fn().mockResolvedValue(['workbox-precache-v2', 'images-cache']);

    Object.defineProperty(globalThis, 'caches', {
      value: { keys: keysSpy, delete: deleteSpy },
      configurable: true,
      writable: true,
    });

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const clearSpy = vi.spyOn(Storage.prototype, 'clear');

    await clearAllAppCaches();

    expect(keysSpy).toHaveBeenCalled();
    expect(deleteSpy).toHaveBeenCalledWith('workbox-precache-v2');
    expect(deleteSpy).toHaveBeenCalledWith('images-cache');
    // اطمینان از عدم دستکاری دیتای کاربر
    expect(clearSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('AC5: setupPwaAutoUpdater registers controllerchange listener and cleans up safely', () => {
    const addEventListenerSpy = vi.fn();
    const removeEventListenerSpy = vi.fn();

    const originalNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        ...originalNavigator,
        serviceWorker: {
          controller: null,
          addEventListener: addEventListenerSpy,
          removeEventListener: removeEventListenerSpy,
        },
      },
      configurable: true,
      writable: true,
    });

    const cleanup = setupPwaAutoUpdater();
    expect(addEventListenerSpy).toHaveBeenCalledWith('controllerchange', expect.any(Function));

    cleanup();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('controllerchange', expect.any(Function));
  });

  it('AC6: forceUpdatePwa purges caches and initiates update', async () => {
    const deleteSpy = vi.fn().mockResolvedValue(true);
    const keysSpy = vi.fn().mockResolvedValue(['test-cache']);
    const updateSpy = vi.fn().mockResolvedValue(undefined);
    const reloadSpy = vi.fn();

    Object.defineProperty(globalThis, 'caches', {
      value: { keys: keysSpy, delete: deleteSpy },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(globalThis, 'location', {
      value: { reload: reloadSpy },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        serviceWorker: {
          getRegistration: vi.fn().mockResolvedValue({ update: updateSpy }),
        },
      },
      configurable: true,
      writable: true,
    });

    await forceUpdatePwa();

    expect(keysSpy).toHaveBeenCalled();
    expect(deleteSpy).toHaveBeenCalledWith('test-cache');
    expect(updateSpy).toHaveBeenCalled();
    expect(reloadSpy).toHaveBeenCalled();
  });
});
