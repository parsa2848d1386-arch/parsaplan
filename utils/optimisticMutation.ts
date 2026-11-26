import { LiveRoomMessage, LiveRoomPeer } from '../types';

export interface OptimisticMutationOptions<TData, TSnapshot> {
    /** Unique key per target entity/action (e.g. `toggle_public_${uid}`, `cheer_${roomCode}_${targetUid}`) */
    mutationKey: string;
    /** Cancels related in-flight queries/fetches before applying optimistic state */
    cancelQueries?: () => void | Promise<void>;
    /** Captures a snapshot of prior state and applies the immediate optimistic UI update */
    onMutate: () => TSnapshot;
    /** Executes the actual server mutation; passes an AbortSignal tied to this mutationKey */
    mutationFn: (signal: AbortSignal) => Promise<TData>;
    /** Restores snapshot and surfaces error feedback when the server mutation fails */
    onError: (error: unknown, snapshot: TSnapshot) => void;
    /** Runs on both success and failure (for latest non-stale mutation) to invalidate and resync from server */
    onSettled?: (data: TData | undefined, error: unknown | undefined, snapshot: TSnapshot) => void | Promise<void>;
}

export type OptimisticMutationResult<TData> =
    | { ok: true; data: TData; stale: boolean }
    | { ok: false; error: unknown; stale: boolean };

/**
 * Coordinates optimistic updates across rapid user interactions:
 * - Tracks per-key monotonic sequence numbers to drop out-of-order responses
 * - Aborts superseded in-flight mutations via AbortController
 * - Enforces onMutate -> mutationFn -> onError (rollback) -> onSettled (invalidate/resync)
 */
export class OptimisticCoordinator {
    private sequences = new Map<string, number>();
    private controllers = new Map<string, AbortController>();

    begin(key: string): { seq: number; signal: AbortSignal } {
        const prevController = this.controllers.get(key);
        if (prevController) {
            prevController.abort();
        }
        const controller = new AbortController();
        this.controllers.set(key, controller);

        const nextSeq = (this.sequences.get(key) || 0) + 1;
        this.sequences.set(key, nextSeq);
        return { seq: nextSeq, signal: controller.signal };
    }

    isLatest(key: string, seq: number): boolean {
        return this.sequences.get(key) === seq;
    }

    clear(key: string, seq: number): void {
        if (this.isLatest(key, seq)) {
            this.controllers.delete(key);
        }
    }

    reset(): void {
        for (const ctrl of this.controllers.values()) {
            ctrl.abort();
        }
        this.controllers.clear();
        this.sequences.clear();
    }
}

export const defaultOptimisticCoordinator = new OptimisticCoordinator();

export async function runOptimisticMutation<TData, TSnapshot>(
    options: OptimisticMutationOptions<TData, TSnapshot>,
    coordinator: OptimisticCoordinator = defaultOptimisticCoordinator
): Promise<OptimisticMutationResult<TData>> {
    const { mutationKey, cancelQueries, onMutate, mutationFn, onError, onSettled } = options;

    // 1. Cancel any related in-flight queries before taking snapshot / mutating
    if (cancelQueries) {
        await cancelQueries();
    }

    // 2. Register monotonic sequence + AbortController for race-condition protection
    const { seq, signal } = coordinator.begin(mutationKey);

    // 3. Snapshot prior state & apply optimistic UI immediately
    const snapshot = onMutate();

    let data: TData | undefined;
    let error: unknown | undefined;

    try {
        data = await mutationFn(signal);
        const stale = !coordinator.isLatest(mutationKey, seq);
        if (!stale && onSettled) {
            await onSettled(data, undefined, snapshot);
        }
        coordinator.clear(mutationKey, seq);
        return { ok: true, data, stale };
    } catch (err) {
        error = err;
        const stale = !coordinator.isLatest(mutationKey, seq);
        if (!stale) {
            // 4. Rollback only if a newer optimistic mutation hasn't superseded this one
            onError(err, snapshot);
            if (onSettled) {
                await onSettled(undefined, err, snapshot);
            }
        }
        coordinator.clear(mutationKey, seq);
        return { ok: false, error: err, stale };
    }
}

/**
 * Merges server room peers with any in-flight optimistic cheer deltas so
 * intermediate Firestore snapshots don't flicker counts backwards.
 */
export function applyPendingCheersToPeers(
    peers: LiveRoomPeer[],
    pendingDeltas: ReadonlyMap<string, number>
): LiveRoomPeer[] {
    if (pendingDeltas.size === 0) return peers;
    return peers.map((p) => {
        const delta = pendingDeltas.get(p.uid) || 0;
        if (delta === 0) return p;
        return { ...p, cheersReceived: Math.max(0, (p.cheersReceived || 0) + delta) };
    });
}

/**
 * Merges authoritative server messages with still-pending optimistic messages,
 * removing optimistic entries once their matching server echo arrives.
 */
export function mergeOptimisticRoomMessages(
    serverMessages: LiveRoomMessage[],
    pendingMessages: LiveRoomMessage[]
): LiveRoomMessage[] {
    if (pendingMessages.length === 0) return serverMessages;
    const remainingPending = pendingMessages.filter((opt) => {
        const matched = serverMessages.some(
            (srv) =>
                srv.senderId === opt.senderId &&
                srv.text === opt.text &&
                Math.abs((srv.createdAt || 0) - (opt.createdAt || 0)) < 30_000
        );
        return !matched;
    });
    return [...serverMessages, ...remainingPending];
}
