import '@testing-library/jest-dom';
import { vi } from 'vitest';

// 1. Browser polyfills for JSDOM
if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as any;
}

if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
}

if (!window.scrollTo) {
    window.scrollTo = vi.fn();
}

if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
}

if (!URL.createObjectURL) {
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
}
if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = vi.fn();
}

if (!window.AudioContext && !(window as any).webkitAudioContext) {
    (window as any).AudioContext = class {
        createOscillator() {
            return {
                connect: () => {},
                start: () => {},
                stop: () => {},
                frequency: { setValueAtTime: () => {} },
            };
        }
        createGain() {
            return {
                connect: () => {},
                gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
            };
        }
        get destination() { return {}; }
        get currentTime() { return 0; }
    };
}

// 2. Mock Vite PWA virtual modules for JSDOM test suite
vi.mock('virtual:pwa-register', () => ({
    registerSW: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
}));

vi.mock('virtual:pwa-register/react', () => ({
    useRegisterSW: () => ({
        offlineReady: [false, vi.fn()],
        needRefresh: [false, vi.fn()],
        updateServiceWorker: vi.fn(),
    }),
}));

