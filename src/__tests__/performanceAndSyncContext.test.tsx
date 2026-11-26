import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { StoreProvider, useStore, useStoreSyncStatus } from '../../context/StoreContext';
import { FocusProvider, useFocus, useFocusTick } from '../../context/FocusContext';
import { StorageManager } from '../../utils/StorageManager';

describe('Phase 5 Performance & Context Isolation', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('isolates StoreSyncStatusContext auto-save transitions from memoized useStore() consumers while preserving backward-compatible getters', async () => {
        vi.spyOn(StorageManager, 'save').mockResolvedValue(true);

        let coreRenders = 0;
        let syncRenders = 0;
        let latestGetterSaveStatus: string | undefined;

        const CoreConsumer = React.memo(() => {
            const store = useStore();
            coreRenders += 1;
            latestGetterSaveStatus = store.saveStatus;
            return (
                <div>
                    <span data-testid="core-xp">{store.xp}</span>
                    <button type="button" onClick={() => store.addXp(25)}>
                        Add XP
                    </button>
                </div>
            );
        });
        CoreConsumer.displayName = 'CoreConsumer';

        const SyncStatusConsumer = React.memo(() => {
            const { saveStatus, isSyncing, syncQueueCount } = useStoreSyncStatus();
            syncRenders += 1;
            return (
                <div>
                    <span data-testid="sync-save-status">{saveStatus}</span>
                    <span data-testid="sync-is-syncing">{String(isSyncing)}</span>
                    <span data-testid="sync-queue">{syncQueueCount}</span>
                </div>
            );
        });
        SyncStatusConsumer.displayName = 'SyncStatusConsumer';

        render(
            <StoreProvider>
                <CoreConsumer />
                <SyncStatusConsumer />
            </StoreProvider>
        );

        // Wait for StoreProvider initialization and initial debounced auto-save to settle to 'saved'
        await waitFor(
            () => {
                expect(screen.getByTestId('core-xp')).toBeInTheDocument();
                expect(screen.getByTestId('sync-save-status').textContent).toBe('saved');
            },
            { timeout: 3000 }
        );

        const coreRendersBeforeEdit = coreRenders;
        const syncRendersBeforeEdit = syncRenders;

        // Trigger a core data edit (xp changes -> triggers debounced local save: 'saving' -> 'saved')
        fireEvent.click(screen.getByRole('button', { name: 'Add XP' }));

        await waitFor(() => {
            expect(screen.getByTestId('core-xp').textContent).toBe('25');
            expect(screen.getByTestId('sync-save-status').textContent).toBe('saving');
        });

        const coreRendersDuringSaving = coreRenders;

        // Wait for the 280ms debounced save to complete ('saving' -> 'saved')
        await waitFor(
            () => {
                expect(screen.getByTestId('sync-save-status').textContent).toBe('saved');
            },
            { timeout: 2500 }
        );

        // SyncStatusConsumer MUST have re-rendered for 'saving' -> 'saved'
        expect(syncRenders).toBeGreaterThan(syncRendersBeforeEdit);
        // CoreConsumer MUST NOT re-render solely because saveStatus transitioned from 'saving' -> 'saved'
        expect(coreRenders).toBe(coreRendersDuringSaving);
        expect(coreRendersDuringSaving).toBe(coreRendersBeforeEdit + 1);
        expect(latestGetterSaveStatus).toBeDefined();
    });

    it('isolates 1-second FocusTickContext updates from memoized useFocus() parents and provides exact getElapsedSeconds()', async () => {
        vi.spyOn(StorageManager, 'save').mockResolvedValue(true);

        let shellRenders = 0;
        let tickRenders = 0;
        let readElapsed: (() => number) | null = null;

        const FocusShellConsumer = React.memo(() => {
            const { status, startTimer, getElapsedSeconds } = useFocus();
            shellRenders += 1;
            readElapsed = getElapsedSeconds;
            return (
                <div>
                    <span data-testid="focus-status">{status}</span>
                    <button type="button" onClick={startTimer}>
                        Start Focus
                    </button>
                </div>
            );
        });
        FocusShellConsumer.displayName = 'FocusShellConsumer';

        const FocusTickConsumer = React.memo(() => {
            const { elapsedSeconds } = useFocusTick();
            tickRenders += 1;
            return <span data-testid="focus-elapsed">{elapsedSeconds}</span>;
        });
        FocusTickConsumer.displayName = 'FocusTickConsumer';

        render(
            <StoreProvider>
                <FocusProvider>
                    <FocusShellConsumer />
                    <FocusTickConsumer />
                </FocusProvider>
            </StoreProvider>
        );

        await waitFor(
            () => {
                expect(screen.getByTestId('focus-status').textContent).toBe('idle');
            },
            { timeout: 3000 }
        );

        // Fake only interval & Date so Promise/IndexedDB microtasks remain unblocked
        vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });

        fireEvent.click(screen.getByRole('button', { name: 'Start Focus' }));
        expect(screen.getByTestId('focus-status').textContent).toBe('running');

        const shellRendersAfterStart = shellRenders;
        const tickRendersAfterStart = tickRenders;

        // Advance 3 discrete 1-second focus ticks
        for (let i = 0; i < 3; i += 1) {
            act(() => {
                vi.advanceTimersByTime(1000);
            });
        }

        expect(screen.getByTestId('focus-elapsed').textContent).toBe('3');
        expect(readElapsed?.()).toBe(3);

        // Tick consumer updated on every second; parent shell did NOT re-render during ticks
        expect(tickRenders).toBeGreaterThanOrEqual(tickRendersAfterStart + 3);
        expect(shellRenders).toBe(shellRendersAfterStart);
    });
});
