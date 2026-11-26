import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    OptimisticCoordinator,
    runOptimisticMutation,
    applyPendingCheersToPeers,
    mergeOptimisticRoomMessages,
} from '../../utils/optimisticMutation';
import { backendCache } from '../../services/backendApi';
import { LiveRoomMessage, LiveRoomPeer } from '../../types';

describe('Optimistic Update Engine — Snapshot, Rollback, Race-Condition & Out-of-Order Guard', () => {
    let coordinator: OptimisticCoordinator;

    beforeEach(() => {
        coordinator = new OptimisticCoordinator();
        backendCache.clear();
    });

    it('runs cancelQueries -> onMutate (snapshot) -> mutationFn -> onSettled in order on success', async () => {
        const events: string[] = [];
        let state = { liked: false, count: 10 };

        const result = await runOptimisticMutation(
            {
                mutationKey: 'like_post_1',
                cancelQueries: () => {
                    events.push('cancelQueries');
                },
                onMutate: () => {
                    events.push('onMutate');
                    const snapshot = { ...state };
                    state = { liked: true, count: 11 };
                    return snapshot;
                },
                mutationFn: async () => {
                    events.push('mutationFn');
                    return { serverCount: 11 };
                },
                onError: (_err, snapshot) => {
                    events.push('onError');
                    state = snapshot;
                },
                onSettled: () => {
                    events.push('onSettled');
                },
            },
            coordinator
        );

        expect(result.ok).toBe(true);
        expect(state).toEqual({ liked: true, count: 11 });
        expect(events).toEqual(['cancelQueries', 'onMutate', 'mutationFn', 'onSettled']);
    });

    it('rolls back state to exact snapshot on server error and still calls onSettled', async () => {
        let state = { isPublic: false };
        const onSettledSpy = vi.fn();

        const result = await runOptimisticMutation(
            {
                mutationKey: 'toggle_public_u1',
                onMutate: () => {
                    const snapshot = { ...state };
                    state = { isPublic: true };
                    return snapshot;
                },
                mutationFn: async () => {
                    throw new Error('Network error');
                },
                onError: (_err, snapshot) => {
                    state = snapshot;
                },
                onSettled: onSettledSpy,
            },
            coordinator
        );

        expect(result.ok).toBe(false);
        expect(state).toEqual({ isPublic: false });
        expect(onSettledSpy).toHaveBeenCalledTimes(1);
    });

    it('prevents out-of-order late failure from rolling back newer rapid mutation', async () => {
        let state = { isPublic: false };
        const settledOrder: string[] = [];

        let rejectFirst!: (err: Error) => void;
        const firstPromise = new Promise<void>((_, rej) => {
            rejectFirst = rej;
        });

        // Mutation 1: toggle false -> true (slow, will fail late)
        const m1 = runOptimisticMutation(
            {
                mutationKey: 'toggle_public_u1',
                onMutate: () => {
                    const snapshot = { ...state };
                    state = { isPublic: true };
                    return snapshot;
                },
                mutationFn: async () => firstPromise,
                onError: (_err, snapshot) => {
                    state = snapshot;
                },
                onSettled: () => {
                    settledOrder.push('m1');
                },
            },
            coordinator
        );

        // Mutation 2 immediately follows: toggle true -> false (fast, succeeds)
        const m2 = runOptimisticMutation(
            {
                mutationKey: 'toggle_public_u1',
                onMutate: () => {
                    const snapshot = { ...state };
                    state = { isPublic: false };
                    return snapshot;
                },
                mutationFn: async () => Promise.resolve(),
                onError: (_err, snapshot) => {
                    state = snapshot;
                },
                onSettled: () => {
                    settledOrder.push('m2');
                },
            },
            coordinator
        );

        await m2;
        expect(state).toEqual({ isPublic: false });

        // Now m1 fails late; it is stale and MUST NOT roll back m2's state (which had snapshot true)
        rejectFirst(new Error('Late timeout'));
        const res1 = await m1;

        expect(res1.stale).toBe(true);
        expect(state).toEqual({ isPublic: false });
        expect(settledOrder).toEqual(['m2']);
    });

    it('cancels in-flight BackendCache fetches so stale reads do not poison cache', async () => {
        let resolveFetch!: (val: string) => void;
        const slowFetch = new Promise<string>((res) => {
            resolveFetch = res;
        });

        const fetchPromise = backendCache.getOrFetch('lb_xp_25_first', 30_000, () => slowFetch);
        backendCache.cancelInFlight('lb_');
        resolveFetch('stale_server_page');
        await fetchPromise;

        // Because the in-flight query was cancelled, stale data must not be cached
        expect(backendCache.get('lb_xp_25_first')).toBeNull();
    });

    it('preserves pending cheer deltas and merges pending optimistic room messages without duplicates', () => {
        const peers: LiveRoomPeer[] = [
            { uid: 'p1', displayName: 'علی', avatar: '🎓', status: 'STUDYING', activeSubject: 'ریاضی', elapsedSeconds: 100, dailyStudySeconds: 100, cheersReceived: 2, lastPing: 1 },
        ];
        const deltas = new Map<string, number>([['p1', 1]]);
        expect(applyPendingCheersToPeers(peers, deltas)[0].cheersReceived).toBe(3);

        const now = Date.now();
        const serverMsgs: LiveRoomMessage[] = [
            { id: 'srv_1', senderId: 'u1', senderName: 'پارسا', text: 'سلام', createdAt: now },
        ];
        const pendingMsgs: LiveRoomMessage[] = [
            { id: 'opt_1', senderId: 'u1', senderName: 'پارسا', text: 'سلام', createdAt: now - 200 },
            { id: 'opt_2', senderId: 'u1', senderName: 'پارسا', text: 'موفق باشی', createdAt: now },
        ];
        const merged = mergeOptimisticRoomMessages(serverMsgs, pendingMsgs);
        expect(merged.map((m) => m.id)).toEqual(['srv_1', 'opt_2']);
    });
});
