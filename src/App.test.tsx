import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, waitFor } from '@testing-library/react';

vi.mock('virtual:pwa-register/react', () => ({
    useRegisterSW: () => ({
        offlineReady: [false, vi.fn()],
        needRefresh: [false, vi.fn()],
        updateServiceWorker: vi.fn(),
    }),
}));

vi.mock('idb-keyval', () => ({
    get: vi.fn(async () => undefined),
    set: vi.fn(async () => undefined),
    del: vi.fn(async () => undefined),
}));

import App from '../App';

beforeAll(() => {
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
});

describe('App root integration smoke test', () => {
    it('renders StoreProvider, FocusProvider, and App shell without throwing', async () => {
        const { container } = render(<App />);
        await waitFor(() => {
            expect(container.firstChild).not.toBeNull();
        });
    });
});
