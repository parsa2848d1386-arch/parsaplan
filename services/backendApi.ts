import {
    collection,
    doc,
    Firestore,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    QueryDocumentSnapshot,
    startAfter,
    writeBatch,
    DocumentData,
} from 'firebase/firestore';
import { PublicProfileDetail, PublicProfileSummary, SubjectTask } from '../types';

export type BackendErrorCode =
    | 'unauthenticated'
    | 'permission-denied'
    | 'not-found'
    | 'already-exists'
    | 'resource-exhausted'
    | 'unavailable'
    | 'validation-error'
    | 'rate-limited'
    | 'unknown';

export interface BackendError {
    code: BackendErrorCode;
    message: string;
    retryable: boolean;
}

export type ApiResponse<T> =
    | { ok: true; data: T; cached?: boolean; error?: undefined }
    | { ok: false; error: BackendError; data?: undefined; cached?: undefined };

export const ROOM_CATEGORIES = [
    'عمومی و زندگی',
    'کار و پروژه',
    'برنامه‌نویسی',
    'مطالعه و یادگیری',
    'زبان',
    'سلامت و عادت‌ها',
] as const;

/**
 * Normalizes Firebase/Firestore errors into standardized ApiResponse errors.
 */
export function normalizeBackendError(err: unknown): BackendError {
    const rawCode = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: string }).code) : '';
    const msg = err instanceof Error ? err.message : String(err || '');

    if (rawCode.includes('permission-denied')) {
        return { code: 'permission-denied', message: 'دسترسی غیرمجاز یا خطای مجوز سرور', retryable: false };
    }
    if (rawCode.includes('unauthenticated')) {
        return { code: 'unauthenticated', message: 'ابتدا وارد حساب کاربری خود شوید', retryable: false };
    }
    if (rawCode.includes('not-found')) {
        return { code: 'not-found', message: 'مورد درخواستی در سرور پیدا نشد', retryable: false };
    }
    if (rawCode.includes('already-exists')) {
        return { code: 'already-exists', message: 'این شناسه یا رکورد قبلاً ثبت شده است', retryable: false };
    }
    if (rawCode.includes('resource-exhausted')) {
        return { code: 'resource-exhausted', message: 'تعداد درخواست‌ها زیاد است؛ کمی صبر کنید', retryable: true };
    }
    if (rawCode.includes('unavailable') || rawCode.includes('deadline-exceeded') || msg.toLowerCase().includes('network')) {
        return { code: 'unavailable', message: 'ارتباط با سرور موقتاً برقرار نیست', retryable: true };
    }

    return { code: 'unknown', message: msg || 'خطای غیرمنتظره سرور', retryable: true };
}

export async function withApiEnvelope<T>(fn: () => Promise<T>): Promise<ApiResponse<T>> {
    try {
        const data = await fn();
        return { ok: true, data };
    } catch (err) {
        return { ok: false, error: normalizeBackendError(err) };
    }
}

/**
 * In-memory TTL cache + in-flight request deduplication to eliminate redundant Firestore reads.
 */
class BackendCache {
    private store = new Map<string, { value: unknown; expiresAt: number }>();
    private inFlight = new Map<string, Promise<unknown>>();
    private throttles = new Map<string, number>();

    get<T>(key: string): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.value as T;
    }

    set<T>(key: string, value: T, ttlMs: number): void {
        this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    }

    async getOrFetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>, forceRefresh = false): Promise<{ data: T; cached: boolean }> {
        if (!forceRefresh) {
            const hit = this.get<T>(key);
            if (hit !== null) return { data: hit, cached: true };
        }

        const existing = this.inFlight.get(key);
        if (existing) {
            const data = (await existing) as T;
            return { data, cached: false };
        }

        const promise = fetcher()
            .then((val) => {
                this.set(key, val, ttlMs);
                return val;
            })
            .finally(() => {
                this.inFlight.delete(key);
            });

        this.inFlight.set(key, promise);
        const data = await promise;
        return { data, cached: false };
    }

    invalidate(prefix: string): void {
        for (const k of this.store.keys()) {
            if (k.startsWith(prefix)) this.store.delete(k);
        }
    }

    canProceed(actionKey: string, cooldownMs: number): boolean {
        const now = Date.now();
        const prev = this.throttles.get(actionKey) || 0;
        if (now - prev < cooldownMs) return false;
        this.throttles.set(actionKey, now);
        return true;
    }

    clear(): void {
        this.store.clear();
        this.inFlight.clear();
        this.throttles.clear();
    }
}

export const backendCache = new BackendCache();

export interface LeaderboardPageResult {
    items: PublicProfileSummary[];
    nextCursor: QueryDocumentSnapshot<DocumentData> | null;
    hasMore: boolean;
}

class LeaderboardApiService {
    private lastPublishedHashes = new Map<string, string>();

    /**
     * Fetches a bounded, indexed page of public leaderboard summaries (excludes heavy nested tasks arrays).
     */
    async fetchPage(
        db: Firestore,
        options: {
            sortBy: 'xp' | 'exam';
            pageSize?: number;
            cursor?: QueryDocumentSnapshot<DocumentData> | null;
            forceRefresh?: boolean;
        }
    ): Promise<ApiResponse<LeaderboardPageResult>> {
        const pageSize = Math.min(50, Math.max(5, options.pageSize ?? 25));
        const sortField = options.sortBy === 'exam' ? 'examAverage' : 'xp';
        const cacheKey = `lb_${sortField}_${pageSize}_${options.cursor?.id || 'first'}`;

        return withApiEnvelope(async () => {
            const { data } = await backendCache.getOrFetch(
                cacheKey,
                45_000,
                async () => {
                    const baseRef = collection(db, 'publicProfiles');
                    const q = options.cursor
                        ? query(baseRef, orderBy(sortField, 'desc'), startAfter(options.cursor), limit(pageSize + 1))
                        : query(baseRef, orderBy(sortField, 'desc'), limit(pageSize + 1));

                    const snap = await getDocs(q);
                    const docs = snap.docs;
                    const hasMore = docs.length > pageSize;
                    const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;

                    const items: PublicProfileSummary[] = pageDocs.map((d) => {
                        const raw = d.data() as PublicProfileSummary;
                        return {
                            id: raw.id || d.id,
                            userName: raw.userName || 'کاربر',
                            xp: Number(raw.xp || 0),
                            level: Number(raw.level || 1),
                            progress: Number(raw.progress || 0),
                            tasksCompleted: Number(raw.tasksCompleted || 0),
                            totalTasks: Number(raw.totalTasks || 0),
                            lastActive: Number(raw.lastActive || Date.now()),
                            examAverage: Number(raw.examAverage || 0),
                        };
                    });

                    return {
                        items,
                        nextCursor: hasMore ? pageDocs[pageDocs.length - 1] : null,
                        hasMore,
                    };
                },
                options.forceRefresh
            );
            return data;
        });
    }

    /**
     * Checks if user's own leaderboard doc currently exists (1 single doc read instead of scanning whole collection).
     */
    async checkIsPublic(db: Firestore, uid: string): Promise<boolean> {
        try {
            const snap = await getDoc(doc(db, 'publicProfiles', uid));
            return snap.exists();
        } catch {
            return false;
        }
    }

    /**
     * Lazily loads profile task preview ONLY when inspecting a specific user's card.
     */
    async fetchProfileDetail(db: Firestore, targetUid: string): Promise<ApiResponse<PublicProfileDetail | null>> {
        return withApiEnvelope(async () => {
            const { data } = await backendCache.getOrFetch(`lb_detail_${targetUid}`, 90_000, async () => {
                const detailSnap = await getDoc(doc(db, 'publicProfileDetails', targetUid));
                if (detailSnap.exists()) {
                    return detailSnap.data() as PublicProfileDetail;
                }
                const summarySnap = await getDoc(doc(db, 'publicProfiles', targetUid));
                if (summarySnap.exists()) {
                    return summarySnap.data() as PublicProfileDetail;
                }
                return null;
            });
            return data;
        });
    }

    async publishProfile(
        db: Firestore,
        uid: string,
        summary: PublicProfileSummary,
        tasks: SubjectTask[]
    ): Promise<ApiResponse<void>> {
        return withApiEnvelope(async () => {
            const safeSummary: PublicProfileSummary = {
                id: uid,
                userName: (summary.userName || 'کاربر').trim().slice(0, 60),
                xp: Math.max(0, Number(summary.xp || 0)),
                level: Math.max(1, Number(summary.level || 1)),
                progress: Math.min(100, Math.max(0, Number(summary.progress || 0))),
                tasksCompleted: Math.max(0, Number(summary.tasksCompleted || 0)),
                totalTasks: Math.max(0, Number(summary.totalTasks || 0)),
                lastActive: Date.now(),
                examAverage: Math.min(100, Math.max(0, Number(summary.examAverage || 0))),
            };

            const trimmedTasks = tasks.slice(0, 30).map((t) => ({
                id: t.id,
                subject: t.subject,
                topic: t.topic,
                isCompleted: Boolean(t.isCompleted),
                date: t.date,
            }));

            const batch = writeBatch(db);
            batch.set(doc(db, 'publicProfiles', uid), safeSummary, { merge: true });
            batch.set(
                doc(db, 'publicProfileDetails', uid),
                { ...safeSummary, tasks: trimmedTasks },
                { merge: true }
            );
            await batch.commit();

            this.lastPublishedHashes.set(
                uid,
                `${safeSummary.xp}:${safeSummary.progress}:${safeSummary.tasksCompleted}:${safeSummary.userName}:${safeSummary.examAverage}`
            );
            backendCache.invalidate('lb_');
        });
    }

    async unpublishProfile(db: Firestore, uid: string): Promise<ApiResponse<void>> {
        return withApiEnvelope(async () => {
            const batch = writeBatch(db);
            batch.delete(doc(db, 'publicProfiles', uid));
            batch.delete(doc(db, 'publicProfileDetails', uid));
            await batch.commit();
            this.lastPublishedHashes.delete(uid);
            backendCache.invalidate('lb_');
        });
    }

    /**
     * Background stat sync guarded by dirty-hash check + 30s throttle so high user counts do not spam Firestore.
     */
    async syncStatsIfDirty(
        db: Firestore,
        uid: string,
        summary: PublicProfileSummary,
        tasks: SubjectTask[]
    ): Promise<void> {
        const hash = `${summary.xp}:${summary.progress}:${summary.tasksCompleted}:${summary.userName}:${summary.examAverage}`;
        if (this.lastPublishedHashes.get(uid) === hash) return;
        if (!backendCache.canProceed(`pub_sync_${uid}`, 30_000)) return;
        await this.publishProfile(db, uid, summary, tasks);
    }
}

export const leaderboardApi = new LeaderboardApiService();
