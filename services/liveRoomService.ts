import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    Firestore,
    getDoc,
    getDocs,
    increment,
    limit,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore';
import { LiveRoomInfo, LiveRoomMessage, LiveRoomPeer, LiveRoomPresenceStatus } from '../types';
import { ApiResponse, backendCache, normalizeBackendError, withApiEnvelope } from './backendApi';

export interface PublicLiveCabinSession {
    id: string;
    userName: string;
    subject: string;
    topic: string;
    startedAt: number;
    lastPing: number;
}

export interface CreateRoomInput {
    creatorId: string;
    creatorName: string;
    name: string;
    category?: string;
    description?: string;
    targetHours?: number;
    maxMembers?: number;
    isPublic?: boolean;
}

export function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

class LiveRoomService {
    // --- PUBLIC CABINS (Bounded & Indexed Leaderboard Live Sessions) ---
    subscribePublicCabins(
        db: Firestore,
        onUpdate: (sessions: PublicLiveCabinSession[]) => void,
        onError?: (err: unknown) => void
    ): () => void {
        const ref = collection(db, 'liveSessions');
        const q = query(ref, orderBy('lastPing', 'desc'), limit(50));
        return onSnapshot(
            q,
            (snapshot) => {
                const now = Date.now();
                const list: PublicLiveCabinSession[] = [];
                snapshot.forEach((docSnap) => {
                    const data = docSnap.data() as PublicLiveCabinSession;
                    if (now - (data.lastPing || 0) < 600_000) {
                        list.push(data);
                    }
                });
                onUpdate(list.sort((a, b) => b.startedAt - a.startedAt));
            },
            (err) => onError?.(err)
        );
    }

    async joinPublicCabin(db: Firestore, session: PublicLiveCabinSession): Promise<void> {
        await setDoc(doc(db, 'liveSessions', session.id), session);
    }

    async pingPublicCabin(db: Firestore, uid: string): Promise<void> {
        await setDoc(doc(db, 'liveSessions', uid), { lastPing: Date.now() }, { merge: true });
    }

    async leavePublicCabin(db: Firestore, uid: string): Promise<void> {
        await deleteDoc(doc(db, 'liveSessions', uid));
    }

    // --- YPT-STYLE STUDY ROOMS (study_rooms/{roomCode}) ---
    async createGroupRoom(
        db: Firestore,
        creatorIdOrInput: string | CreateRoomInput,
        creatorNameArg?: string,
        roomNameArg?: string
    ): Promise<LiveRoomInfo> {
        const input: CreateRoomInput =
            typeof creatorIdOrInput === 'string'
                ? {
                      creatorId: creatorIdOrInput,
                      creatorName: creatorNameArg || 'کاربر',
                      name: roomNameArg || `اتاق تمرکز ${creatorNameArg || 'هم‌پا'}`,
                      category: 'عمومی و زندگی',
                      targetHours: 4,
                      maxMembers: 25,
                      isPublic: true,
                  }
                : creatorIdOrInput;

        const code = generateRoomCode();
        const safeName = (input.name || `اتاق تمرکز ${input.creatorName || 'هم‌پا'}`).trim().slice(0, 80);
        const info: LiveRoomInfo = {
            id: code,
            code,
            name: safeName,
            creatorId: input.creatorId,
            creatorName: (input.creatorName || 'کاربر').trim().slice(0, 40),
            category: input.category || 'عمومی و زندگی',
            description: (input.description || '').trim().slice(0, 160),
            targetHours: Math.min(16, Math.max(1, Number(input.targetHours) || 4)),
            maxMembers: Math.min(200, Math.max(2, Math.round(Number(input.maxMembers) || 25))),
            isPublic: input.isPublic ?? true,
            chatEnabled: true,
            dailyMessageQuota: 20,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        await setDoc(doc(db, 'study_rooms', code), info);
        backendCache.invalidate('ypt_rooms_');
        return info;
    }

    async createRoomSafe(db: Firestore, input: CreateRoomInput): Promise<ApiResponse<LiveRoomInfo>> {
        if (!backendCache.canProceed(`create_room_${input.creatorId}`, 3000)) {
            return {
                ok: false,
                error: { code: 'rate-limited', message: 'لطفاً چند ثانیه صبر کنید', retryable: true },
            };
        }
        return withApiEnvelope(() => this.createGroupRoom(db, input));
    }

    /**
     * Lists public YPT study rooms with SWR caching and graceful fallback if composite index isn't deployed yet.
     */
    async listPublicRooms(
        db: Firestore,
        category?: string,
        forceRefresh = false
    ): Promise<ApiResponse<LiveRoomInfo[]>> {
        return withApiEnvelope(async () => {
            const { data } = await backendCache.getOrFetch(
                'ypt_rooms_public_list',
                30_000,
                async () => {
                    const roomsRef = collection(db, 'study_rooms');
                    let rooms: LiveRoomInfo[] = [];
                    try {
                        const q = query(
                            roomsRef,
                            where('isPublic', '==', true),
                            orderBy('createdAt', 'desc'),
                            limit(24)
                        );
                        const snap = await getDocs(q);
                        snap.forEach((d) => rooms.push(this.normalizeRoom(d.id, d.data())));
                    } catch {
                        // Graceful fallback if composite index hasn't been created yet on custom Firebase project
                        const fallbackQ = query(roomsRef, orderBy('createdAt', 'desc'), limit(35));
                        const snap = await getDocs(fallbackQ);
                        snap.forEach((d) => {
                            const r = this.normalizeRoom(d.id, d.data());
                            if (r.isPublic) rooms.push(r);
                        });
                    }
                    return rooms;
                },
                forceRefresh
            );

            if (category && category !== 'همه') {
                return data.filter((r) => r.category === category);
            }
            return data;
        });
    }

    private normalizeRoom(docId: string, raw: Record<string, unknown>): LiveRoomInfo {
        return {
            id: String(raw.id || docId),
            code: String(raw.code || docId).toUpperCase(),
            name: String(raw.name || 'اتاق مطالعه'),
            creatorId: String(raw.creatorId || ''),
            creatorName: raw.creatorName ? String(raw.creatorName) : undefined,
            category: String(raw.category || 'عمومی و زندگی'),
            description: raw.description ? String(raw.description) : undefined,
            targetHours: Number(raw.targetHours || 4),
            maxMembers: Number(raw.maxMembers || 25),
            isPublic: raw.isPublic !== false,
            chatEnabled: raw.chatEnabled !== false,
            dailyMessageQuota: Number(raw.dailyMessageQuota || 20),
            createdAt: Number(raw.createdAt || Date.now()),
            updatedAt: Number(raw.updatedAt || raw.createdAt || Date.now()),
        };
    }

    async getGroupRoom(db: Firestore, rawCode: string): Promise<LiveRoomInfo | null> {
        const code = rawCode.trim().toUpperCase();
        if (!code) return null;
        const snap = await getDoc(doc(db, 'study_rooms', code));
        if (!snap.exists()) return null;
        return this.normalizeRoom(snap.id, snap.data());
    }

    async deleteGroupRoom(db: Firestore, roomCode: string): Promise<ApiResponse<void>> {
        const code = roomCode.trim().toUpperCase();
        return withApiEnvelope(async () => {
            await deleteDoc(doc(db, 'study_rooms', code));
            backendCache.invalidate('ypt_rooms_');
        });
    }

    async upsertMemberPresence(
        db: Firestore,
        roomCode: string,
        peer: LiveRoomPeer
    ): Promise<void> {
        const code = roomCode.trim().toUpperCase();
        await setDoc(
            doc(db, 'study_rooms', code, 'members', peer.uid),
            peer,
            { merge: true }
        );
    }

    async updateMemberStatus(
        db: Firestore,
        roomCode: string,
        uid: string,
        status: LiveRoomPresenceStatus,
        activeSubject?: string,
        activeTopic?: string,
        elapsedSeconds?: number
    ): Promise<void> {
        const code = roomCode.trim().toUpperCase();
        await setDoc(
            doc(db, 'study_rooms', code, 'members', uid),
            {
                uid,
                status,
                activeSubject: activeSubject || 'تمرکز آزاد',
                activeTopic: activeTopic || '',
                elapsedSeconds: elapsedSeconds ?? 0,
                lastPing: Date.now(),
            },
            { merge: true }
        );
    }

    async leaveGroupRoom(db: Firestore, roomCode: string, uid: string): Promise<void> {
        const code = roomCode.trim().toUpperCase();
        await deleteDoc(doc(db, 'study_rooms', code, 'members', uid));
    }

    async sendCheer(db: Firestore, roomCode: string, targetUid: string): Promise<void> {
        const code = roomCode.trim().toUpperCase();
        if (!backendCache.canProceed(`cheer_${code}_${targetUid}`, 1200)) return;
        await updateDoc(doc(db, 'study_rooms', code, 'members', targetUid), {
            cheersReceived: increment(1),
        });
    }

    subscribeRoomMembers(
        db: Firestore,
        roomCode: string,
        onUpdate: (peers: LiveRoomPeer[]) => void,
        onError?: (err: unknown) => void
    ): () => void {
        const code = roomCode.trim().toUpperCase();
        const q = query(
            collection(db, 'study_rooms', code, 'members'),
            orderBy('dailyStudySeconds', 'desc'),
            limit(100)
        );
        return onSnapshot(
            q,
            (snap) => {
                const now = Date.now();
                const peers: LiveRoomPeer[] = [];
                snap.forEach((d) => {
                    const p = d.data() as LiveRoomPeer;
                    if (now - (p.lastPing || 0) > 720_000) {
                        peers.push({ ...p, status: 'OFFLINE' });
                    } else {
                        peers.push(p);
                    }
                });
                peers.sort((a, b) => b.dailyStudySeconds - a.dailyStudySeconds);
                onUpdate(peers);
            },
            (err) => {
                console.warn('[LiveRoomService] Room members listener:', normalizeBackendError(err).message);
                onError?.(err);
            }
        );
    }

    subscribeRoomMessages(
        db: Firestore,
        roomCode: string,
        onUpdate: (msgs: LiveRoomMessage[]) => void,
        onError?: (err: unknown) => void
    ): () => void {
        const code = roomCode.trim().toUpperCase();
        const q = query(
            collection(db, 'study_rooms', code, 'messages'),
            orderBy('createdAt', 'asc'),
            limit(50)
        );
        return onSnapshot(
            q,
            (snap) => {
                const msgs: LiveRoomMessage[] = [];
                snap.forEach((d) => msgs.push({ ...(d.data() as LiveRoomMessage), id: d.id }));
                onUpdate(msgs);
            },
            (err) => onError?.(err)
        );
    }

    async sendRoomMessage(
        db: Firestore,
        roomCode: string,
        senderId: string,
        senderName: string,
        text: string
    ): Promise<void> {
        const cleaned = text.trim().slice(0, 300);
        if (!cleaned) return;
        const code = roomCode.trim().toUpperCase();
        if (!backendCache.canProceed(`msg_${code}_${senderId}`, 800)) return;
        await addDoc(collection(db, 'study_rooms', code, 'messages'), {
            senderId,
            senderName: (senderName || 'کاربر').trim().slice(0, 40),
            text: cleaned,
            createdAt: Date.now(),
        });
    }
}

export const liveRoomService = new LiveRoomService();
