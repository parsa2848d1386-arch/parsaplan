import { get, set } from 'idb-keyval';
import {
    collection,
    deleteDoc,
    doc,
    Firestore,
    getDoc,
    getDocs,
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

/**
 * Strips sensitive client-only secrets (such as geminiApiKey) before cloud persistence.
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
        // Deduplicate same entity/type to keep queue compact
        const filtered = queue.filter((q) => !(q.type === op.type && q.entityId === op.entityId));
        filtered.push({
            ...op,
            id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            timestamp: Date.now(),
            retryCount: 0,
        });
        await set(getOutboxKey(userId), filtered);
        return filtered.length;
    }

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

            for (const tx of queue) {
                try {
                    await this.applyTransactionToFirestore(db, userId, tx);
                    flushed++;
                } catch (err) {
                    console.warn('[SyncEngine] Outbox tx failed, will retry:', tx.type, err);
                    remaining.push({ ...tx, retryCount: tx.retryCount + 1 });
                }
            }

            await set(getOutboxKey(userId), remaining);
            return { flushed, remaining: remaining.length };
        } finally {
            this.isFlushing = false;
        }
    }

    private async applyTransactionToFirestore(db: Firestore, userId: string, tx: OutboxTransaction): Promise<void> {
        const cleanPayload = tx.payload ? JSON.parse(JSON.stringify(tx.payload)) : undefined;
        switch (tx.type) {
            case 'upsert_task':
                await setDoc(doc(db, 'users', userId, 'tasks', tx.entityId), cleanPayload, { merge: true });
                break;
            case 'delete_task':
                await deleteDoc(doc(db, 'users', userId, 'tasks', tx.entityId));
                break;
            case 'upsert_session':
                await setDoc(doc(db, 'users', userId, 'sessions', tx.entityId), cleanPayload, { merge: true });
                break;
            case 'upsert_flashcard':
                await setDoc(doc(db, 'users', userId, 'flashcards', tx.entityId), cleanPayload, { merge: true });
                break;
            case 'delete_flashcard':
                await deleteDoc(doc(db, 'users', userId, 'flashcards', tx.entityId));
                break;
            case 'upsert_page':
                await setDoc(doc(db, 'users', userId, 'pages', tx.entityId), cleanPayload, { merge: true });
                break;
            case 'delete_page':
                await deleteDoc(doc(db, 'users', userId, 'pages', tx.entityId));
                break;
            case 'save_profile':
                await setDoc(doc(db, 'users', userId), sanitizeSnapshotForCloud(cleanPayload || {}), { merge: true });
                break;
        }
    }

    /**
     * Performs a clean cloud sync: writes profile metadata to users/{uid} (without geminiApiKey)
     * and batches tasks, sessions, flashcards, and notebookPages to dedicated subcollections.
     */
    async syncFullState(db: Firestore, userId: string, snapshot: Partial<AppDataV1>): Promise<number> {
        const safeProfile = sanitizeSnapshotForCloud({
            userName: snapshot.userName,
            routine: snapshot.routine,
            routineTemplate: snapshot.routineTemplate,
            notes: snapshot.notes,
            xp: snapshot.xp,
            logs: snapshot.logs?.slice(0, 100),
            moods: snapshot.moods,
            studyHoursLog: snapshot.studyHoursLog,
            startDate: snapshot.startDate,
            totalDays: snapshot.totalDays,
            subjects: snapshot.subjects,
            archivedPlans: snapshot.archivedPlans,
            settings: snapshot.settings,
            lastUpdated: snapshot.lastUpdated || Date.now(),
            schemaVersion: 3,
        });

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
        for (const f of snapshot.flashcards || []) {
            if (f.id) batchItems.push({ col: 'flashcards', id: f.id, data: f });
        }
        for (const p of snapshot.notebookPages || []) {
            if (p.id) batchItems.push({ col: 'pages', id: p.id, data: p });
        }

        if (batchItems.length > 0) {
            await commitInChunks(batchItems);
        }

        // Clear outbox on full sync success
        await set(getOutboxKey(userId), []);
        return Number(safeProfile.lastUpdated || Date.now());
    }

    /**
     * Loads user state from Firestore subcollections while supporting seamless
     * fallback from legacy monolithic users/{uid} documents.
     */
    async loadFullState(db: Firestore, userId: string): Promise<Partial<AppDataV1> | null> {
        const profileSnap = await getDoc(doc(db, 'users', userId));
        if (!profileSnap.exists()) return null;

        const profileData = profileSnap.data() as Partial<AppDataV1>;

        const [tasksSnap, sessionsSnap, flashcardsSnap, pagesSnap] = await Promise.all([
            getDocs(collection(db, 'users', userId, 'tasks')),
            getDocs(collection(db, 'users', userId, 'sessions')),
            getDocs(collection(db, 'users', userId, 'flashcards')),
            getDocs(collection(db, 'users', userId, 'pages')),
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
