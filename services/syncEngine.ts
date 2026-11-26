import { get, set } from 'idb-keyval';
import {
    collection,
    doc,
    Firestore,
    getDoc,
    getDocs,
    limit,
    query,
    setDoc,
    writeBatch,
} from 'firebase/firestore';
import { AppDataV1 } from '../utils/StorageManager';
import { Flashcard, NotebookPage, StudySession, SubjectTask } from '../types';

export type OutboxOpType =
    | 'upsert_task'
    | 'delete_task'
    | 'upsert_session'
    | 'delete_session'
    | 'upsert_flashcard'
    | 'delete_flashcard'
    | 'upsert_page'
    | 'delete_page'
    | 'save_profile';

export interface OutboxTransaction {
    id: string;
    type: OutboxOpType;
    entityId: string;
    payload?: unknown;
    timestamp: number;
    retryCount: number;
    lastError?: string;
}

const getOutboxKey = (userId: string) => `parsaplan_outbox_${userId}`;
const getDeadLetterKey = (userId: string) => `parsaplan_deadletter_${userId}`;
const MAX_RETRY_COUNT = 5;

/**
 * Unique identifier per browser tab so Firestore listeners can skip self-echoes.
 */
export const CLIENT_INSTANCE_ID = `cli_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/**
 * Strips client-only secrets and undefined values before cloud persistence.
 */
export function sanitizeSnapshotForCloud(snapshot: Partial<AppDataV1>): Record<string, unknown> {
    const cloned = JSON.parse(JSON.stringify(snapshot));
    if (cloned.settings && 'geminiApiKey' in cloned.settings) {
        delete cloned.settings.geminiApiKey;
    }
    if (typeof cloned.userName === 'string') {
        cloned.userName = cloned.userName.trim().slice(0, 80);
    }
    if (cloned.xp !== undefined) {
        const numericXp = Number(cloned.xp);
        cloned.xp = Number.isFinite(numericXp) ? Math.min(10000000, Math.max(0, numericXp)) : 0;
    }
    return cloned;
}

export function isCloudSyncAllowed(db: Firestore | null, userId: string | undefined, user: unknown): boolean {
    if (!db || !user || !userId || userId === 'parsaplan_local_user') return false;
    const uid = typeof user === 'object' && user !== null && 'uid' in user ? (user as { uid?: string }).uid : undefined;
    return !uid || uid === userId;
}

export function isFirestorePermissionDenied(err: unknown): boolean {
    const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: string }).code) : '';
    const msg = err instanceof Error ? err.message : String(err || '');
    return code.includes('permission-denied') || msg.includes('Missing or insufficient permissions');
}

class CloudSyncEngine {
    private isFlushing = false;

    async getQueue(userId: string): Promise<OutboxTransaction[]> {
        if (!userId || userId === 'parsaplan_local_user') return [];
        try {
            const items = await get<OutboxTransaction[]>(getOutboxKey(userId));
            return Array.isArray(items) ? items : [];
        } catch {
            return [];
        }
    }

    async getDeadLetters(userId: string): Promise<OutboxTransaction[]> {
        if (!userId || userId === 'parsaplan_local_user') return [];
        try {
            const items = await get<OutboxTransaction[]>(getDeadLetterKey(userId));
            return Array.isArray(items) ? items : [];
        } catch {
            return [];
        }
    }

    async retryDeadLetters(
        db: Firestore | null,
        userId: string,
        user: unknown
    ): Promise<{ flushed: number; remaining: number; permissionDenied?: boolean }> {
        const deadLetters = await this.getDeadLetters(userId);
        if (deadLetters.length === 0) {
            return { flushed: 0, remaining: (await this.getQueue(userId)).length };
        }
        const resetItems = deadLetters.map((tx) => ({ ...tx, retryCount: 0, lastError: undefined }));
        const currentQueue = await this.getQueue(userId);
        await set(getOutboxKey(userId), [...currentQueue, ...resetItems]);
        await set(getDeadLetterKey(userId), []);
        return this.flushOutbox(db, userId, user);
    }

    async enqueue(userId: string, op: Omit<OutboxTransaction, 'id' | 'timestamp' | 'retryCount'>): Promise<number> {
        if (!userId || userId === 'parsaplan_local_user') return 0;
        const queue = await this.getQueue(userId);
        // Coalesce conflicting operations on the same entity to keep queue minimal
        const filtered = queue.filter((q) => {
            if (q.type === op.type && q.entityId === op.entityId) return false;
            if (op.type === 'delete_task' && q.type === 'upsert_task' && q.entityId === op.entityId) return false;
            if (op.type === 'delete_session' && q.type === 'upsert_session' && q.entityId === op.entityId) return false;
            if (op.type === 'delete_flashcard' && q.type === 'upsert_flashcard' && q.entityId === op.entityId) return false;
            if (op.type === 'delete_page' && q.type === 'upsert_page' && q.entityId === op.entityId) return false;
            return true;
        });
        filtered.push({
            ...op,
            id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            timestamp: Date.now(),
            retryCount: 0,
        });
        await set(getOutboxKey(userId), filtered);
        return filtered.length;
    }

    async enqueueMany(
        userId: string,
        ops: Array<Omit<OutboxTransaction, 'id' | 'timestamp' | 'retryCount'>>
    ): Promise<number> {
        if (!userId || userId === 'parsaplan_local_user' || ops.length === 0) return 0;
        const queue = await this.getQueue(userId);
        const incomingKeys = new Set(ops.map((o) => `${o.type}:${o.entityId}`));
        const filtered = queue.filter((q) => !incomingKeys.has(`${q.type}:${q.entityId}`));
        const now = Date.now();
        ops.forEach((op, idx) => {
            filtered.push({
                ...op,
                id: `tx_${now}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
                timestamp: now,
                retryCount: 0,
            });
        });
        await set(getOutboxKey(userId), filtered);
        return filtered.length;
    }

    /**
     * Flushes queued delta operations in efficient Firestore writeBatches (up to 250 ops per batch)
     * with retry-cap protection and dead-letter recovery for scalability.
     */
    async flushOutbox(
        db: Firestore | null,
        userId: string,
        user: unknown
    ): Promise<{ flushed: number; remaining: number; permissionDenied?: boolean }> {
        const existingDead = await this.getDeadLetters(userId);
        if (!isCloudSyncAllowed(db, userId, user) || !db) {
            return {
                flushed: 0,
                remaining: (await this.getQueue(userId)).length,
            };
        }
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return {
                flushed: 0,
                remaining: (await this.getQueue(userId)).length,
            };
        }
        if (this.isFlushing) {
            return {
                flushed: 0,
                remaining: (await this.getQueue(userId)).length,
            };
        }

        this.isFlushing = true;
        try {
            const queue = await this.getQueue(userId);
            if (queue.length === 0) {
                return { flushed: 0, remaining: 0 };
            }

            let flushed = 0;
            let permissionDenied = false;
            const remaining: OutboxTransaction[] = [];
            const deadLetters: OutboxTransaction[] = [...existingDead];
            const BATCH_LIMIT = 250;

            for (let i = 0; i < queue.length; i += BATCH_LIMIT) {
                const slice = queue.slice(i, i + BATCH_LIMIT);
                if (permissionDenied) {
                    remaining.push(...slice);
                    continue;
                }
                try {
                    const batch = writeBatch(db);
                    for (const tx of slice) {
                        this.addTxToBatch(batch, db, userId, tx);
                    }
                    await batch.commit();
                    flushed += slice.length;
                } catch (batchErr) {
                    if (isFirestorePermissionDenied(batchErr)) {
                        permissionDenied = true;
                        console.warn('[SyncEngine] Firestore permission-denied; keeping ops queued locally.');
                        remaining.push(...slice);
                        continue;
                    }
                    console.warn('[SyncEngine] Batch flush fallback to single ops:', batchErr);
                    for (let j = 0; j < slice.length; j++) {
                        const tx = slice[j];
                        if (permissionDenied) {
                            remaining.push(tx);
                            continue;
                        }
                        try {
                            const singleBatch = writeBatch(db);
                            this.addTxToBatch(singleBatch, db, userId, tx);
                            await singleBatch.commit();
                            flushed++;
                        } catch (err: any) {
                            if (isFirestorePermissionDenied(err)) {
                                permissionDenied = true;
                                console.warn('[SyncEngine] Outbox tx blocked by Firestore rules (permission-denied).');
                                remaining.push(tx);
                                continue;
                            }
                            console.warn('[SyncEngine] Outbox tx failed:', tx.type, err);
                            const errMsg = err?.message || String(err || 'Sync error');
                            if (tx.retryCount + 1 < MAX_RETRY_COUNT) {
                                remaining.push({ ...tx, retryCount: tx.retryCount + 1, lastError: errMsg });
                            } else {
                                deadLetters.push({ ...tx, retryCount: tx.retryCount + 1, lastError: errMsg });
                            }
                        }
                    }
                }
            }

            await set(getOutboxKey(userId), remaining);
            if (deadLetters.length !== existingDead.length) {
                await set(getDeadLetterKey(userId), deadLetters.slice(-50));
            }
            return permissionDenied
                ? { flushed, remaining: remaining.length, permissionDenied: true }
                : { flushed, remaining: remaining.length };
        } finally {
            this.isFlushing = false;
        }
    }

    private addTxToBatch(
        batch: ReturnType<typeof writeBatch>,
        db: Firestore,
        userId: string,
        tx: OutboxTransaction
    ): void {
        const cleanPayload = tx.payload ? JSON.parse(JSON.stringify(tx.payload)) : undefined;
        switch (tx.type) {
            case 'upsert_task':
                batch.set(doc(db, 'users', userId, 'tasks', tx.entityId), cleanPayload, { merge: true });
                break;
            case 'delete_task':
                batch.delete(doc(db, 'users', userId, 'tasks', tx.entityId));
                break;
            case 'upsert_session':
                batch.set(doc(db, 'users', userId, 'sessions', tx.entityId), cleanPayload, { merge: true });
                break;
            case 'delete_session':
                batch.delete(doc(db, 'users', userId, 'sessions', tx.entityId));
                break;
            case 'upsert_flashcard':
                batch.set(doc(db, 'users', userId, 'flashcards', tx.entityId), cleanPayload, { merge: true });
                break;
            case 'delete_flashcard':
                batch.delete(doc(db, 'users', userId, 'flashcards', tx.entityId));
                break;
            case 'upsert_page':
                batch.set(doc(db, 'users', userId, 'pages', tx.entityId), cleanPayload, { merge: true });
                break;
            case 'delete_page':
                batch.delete(doc(db, 'users', userId, 'pages', tx.entityId));
                break;
            case 'save_profile': {
                const safeProfile = sanitizeSnapshotForCloud(cleanPayload || {});
                safeProfile.lastClientId = CLIENT_INSTANCE_ID;
                safeProfile.lastUpdated = Date.now();
                batch.set(doc(db, 'users', userId), safeProfile, { merge: true });
                break;
            }
        }
    }

    /**
     * Full snapshot cloud sync (explicit upload / migration).
     */
    async syncFullState(db: Firestore, userId: string, snapshot: Partial<AppDataV1>): Promise<number> {
        const syncTs = Number(snapshot.lastUpdated || Date.now());
        const safeProfile = sanitizeSnapshotForCloud({
            userName: snapshot.userName,
            xp: snapshot.xp,
            logs: snapshot.logs?.slice(0, 50),
            moods: snapshot.moods,
            studyHoursLog: snapshot.studyHoursLog,
            perfectDates: snapshot.perfectDates,
            startDate: snapshot.startDate,
            totalDays: snapshot.totalDays,
            subjects: snapshot.subjects,
            archivedPlans: snapshot.archivedPlans,
            settings: snapshot.settings,
            lastUpdated: syncTs,
            schemaVersion: 3,
        });
        safeProfile.lastClientId = CLIENT_INSTANCE_ID;

        await setDoc(doc(db, 'users', userId), safeProfile, { merge: true });

        const commitInChunks = async (items: Array<{ col: string; id: string; data: unknown }>) => {
            const CHUNK_SIZE = 400;
            for (let i = 0; i < items.length; i += CHUNK_SIZE) {
                const batch = writeBatch(db);
                const slice = items.slice(i, i + CHUNK_SIZE);
                for (const item of slice) {
                    batch.set(
                        doc(db, 'users', userId, item.col, item.id),
                        JSON.parse(JSON.stringify(item.data)),
                        { merge: true }
                    );
                }
                await batch.commit();
            }
        };

        const batchItems: Array<{ col: string; id: string; data: unknown }> = [];
        for (const t of snapshot.tasks || []) {
            if (t.id) batchItems.push({ col: 'tasks', id: t.id, data: t });
        }
        for (const s of snapshot.sessions || []) {
            if (s.id) batchItems.push({ col: 'sessions', id: s.id, data: s });
        }
        for (const c of snapshot.flashcards || []) {
            if (c.id) batchItems.push({ col: 'flashcards', id: c.id, data: c });
        }
        for (const p of snapshot.notebookPages || []) {
            if (p.id) batchItems.push({ col: 'pages', id: p.id, data: p });
        }

        if (batchItems.length > 0) {
            await commitInChunks(batchItems);
        }

        await set(getOutboxKey(userId), []);
        return syncTs;
    }

    /**
     * Loads user state from Firestore bounded subcollections (with legacy monolithic fallback).
     */
    async loadFullState(db: Firestore, userId: string): Promise<Partial<AppDataV1> | null> {
        const profileSnap = await getDoc(doc(db, 'users', userId));
        if (!profileSnap.exists()) return null;

        const profileData = profileSnap.data() as Partial<AppDataV1>;

        const [tasksSnap, sessionsSnap, flashcardsSnap, pagesSnap] = await Promise.all([
            getDocs(query(collection(db, 'users', userId, 'tasks'), limit(1500))),
            getDocs(query(collection(db, 'users', userId, 'sessions'), limit(1500))),
            getDocs(query(collection(db, 'users', userId, 'flashcards'), limit(500))),
            getDocs(query(collection(db, 'users', userId, 'pages'), limit(300))),
        ]);

        const subTasks: SubjectTask[] = [];
        tasksSnap.forEach((d) => subTasks.push(d.data() as SubjectTask));

        const subSessions: StudySession[] = [];
        sessionsSnap.forEach((d) => subSessions.push(d.data() as StudySession));

        const subFlashcards: Flashcard[] = [];
        flashcardsSnap.forEach((d) => subFlashcards.push(d.data() as Flashcard));

        const subPages: NotebookPage[] = [];
        pagesSnap.forEach((d) => subPages.push(d.data() as NotebookPage));

        return {
            ...profileData,
            tasks: subTasks.length > 0 ? subTasks : profileData.tasks || [],
            sessions: subSessions.length > 0 ? subSessions : profileData.sessions || [],
            flashcards: subFlashcards.length > 0 ? subFlashcards : profileData.flashcards || [],
            notebookPages: subPages.length > 0 ? subPages : profileData.notebookPages || [],
        };
    }
}

export const syncEngine = new CloudSyncEngine();
