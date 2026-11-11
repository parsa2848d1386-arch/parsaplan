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
}

const getOutboxKey = (userId: string) => `parsaplan_outbox_${userId}`;
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
    return cloned;
}

export function isCloudSyncAllowed(db: Firestore | null, userId: string | undefined, user: unknown): boolean {
    return Boolean(db && user && userId && userId !== 'parsaplan_local_user');
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

    async enqueue(userId: string, op: Omit<OutboxTransaction, 'id' | 'timestamp' | 'retryCount'>): Promise<number> {
        if (!userId || userId === 'parsaplan_local_user') return 0;
        const queue = await this.getQueue(userId);
        // Coalesce conflicting operations on the same entity to keep queue minimal
        const filtered = queue.filter((q) => {
            if (q.type === op.type && q.entityId === op.entityId) return false;
            if (op.type === 'delete_task' && q.type === 'upsert_task' && q.entityId === op.entityId) return false;
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
     * with retry-cap protection for scalability.
     */
    async flushOutbox(db: Firestore | null, userId: string, user: unknown): Promise<{ flushed: number; remaining: number }> {
        if (!isCloudSyncAllowed(db, userId, user) || !db) {
            return { flushed: 0, remaining: (await this.getQueue(userId)).length };
        }
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return { flushed: 0, remaining: (await this.getQueue(userId)).length };
        }
        if (this.isFlushing) {
            return { flushed: 0, remaining: (await this.getQueue(userId)).length };
        }

        this.isFlushing = true;
        try {
            const queue = await this.getQueue(userId);
            if (queue.length === 0) return { flushed: 0, remaining: 0 };

            let flushed = 0;
            const remaining: OutboxTransaction[] = [];
            const BATCH_LIMIT = 250;

            for (let i = 0; i < queue.length; i += BATCH_LIMIT) {
                const slice = queue.slice(i, i + BATCH_LIMIT);
                try {
                    const batch = writeBatch(db);
                    for (const tx of slice) {
                        this.addTxToBatch(batch, db, userId, tx);
                    }
                    await batch.commit();
                    flushed += slice.length;
                } catch (batchErr) {
                    console.warn('[SyncEngine] Batch flush fallback to single ops:', batchErr);
                    for (const tx of slice) {
                        try {
                            const singleBatch = writeBatch(db);
                            this.addTxToBatch(singleBatch, db, userId, tx);
                            await singleBatch.commit();
                            flushed++;
                        } catch (err) {
                            console.warn('[SyncEngine] Outbox tx failed:', tx.type, err);
                            if (tx.retryCount + 1 < MAX_RETRY_COUNT) {
                                remaining.push({ ...tx, retryCount: tx.retryCount + 1 });
                            }
                        }
                    }
                }
            }

            await set(getOutboxKey(userId), remaining);
            return { flushed, remaining: remaining.length };
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
