import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    Firestore,
    getDoc,
    increment,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    updateDoc,
    limit,
} from 'firebase/firestore';
import { LiveRoomInfo, LiveRoomMessage, LiveRoomPeer, LiveRoomPresenceStatus } from '../types';

export interface PublicLiveCabinSession {
    id: string;
    userName: string;
    subject: string;
    topic: string;
    startedAt: number;
    lastPing: number;
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
    // --- PUBLIC CABINS (Leaderboard liveSessions) ---
    subscribePublicCabins(
        db: Firestore,
        onUpdate: (sessions: PublicLiveCabinSession[]) => void,
        onError?: (err: unknown) => void
    ): () => void {
        const ref = collection(db, 'liveSessions');
        return onSnapshot(
            ref,
            (snapshot) => {
                const now = Date.now();
                const list: PublicLiveCabinSession[] = [];
                snapshot.forEach((docSnap) => {
                    const data = docSnap.data() as PublicLiveCabinSession;
                    if (now - (data.lastPing || 0) < 600000) {
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

    // --- PRIVATE / GROUP STUDY ROOMS (study_rooms/{roomCode}) ---
    async createGroupRoom(
        db: Firestore,
        creatorId: string,
        creatorName: string,
        roomName?: string
    ): Promise<LiveRoomInfo> {
        const code = generateRoomCode();
        const info: LiveRoomInfo = {
            id: code,
            code,
            name: roomName?.trim() || `اتاق مطالعه ${creatorName || 'هم‌پا'}`,
            creatorId,
            chatEnabled: true,
            dailyMessageQuota: 15,
            createdAt: Date.now(),
        };
        await setDoc(doc(db, 'study_rooms', code), info);
        return info;
    }

    async getGroupRoom(db: Firestore, rawCode: string): Promise<LiveRoomInfo | null> {
        const code = rawCode.trim().toUpperCase();
        if (!code) return null;
        const snap = await getDoc(doc(db, 'study_rooms', code));
        if (!snap.exists()) return null;
        return snap.data() as LiveRoomInfo;
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
                activeSubject: activeSubject || 'مطالعه آزاد',
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
        return onSnapshot(
            collection(db, 'study_rooms', code, 'members'),
            (snap) => {
                const now = Date.now();
                const peers: LiveRoomPeer[] = [];
                snap.forEach((d) => {
                    const p = d.data() as LiveRoomPeer;
                    // Mark peers stale > 12 min as OFFLINE visually
                    if (now - (p.lastPing || 0) > 720000) {
                        peers.push({ ...p, status: 'OFFLINE' });
                    } else {
                        peers.push(p);
                    }
                });
                peers.sort((a, b) => b.dailyStudySeconds - a.dailyStudySeconds);
                onUpdate(peers);
            },
            (err) => onError?.(err)
        );
    }

    subscribeRoomMessages(
        db: Firestore,
        roomCode: string,
        onUpdate: (msgs: LiveRoomMessage[]) => void
    ): () => void {
        const code = roomCode.trim().toUpperCase();
        const q = query(
            collection(db, 'study_rooms', code, 'messages'),
            orderBy('createdAt', 'asc'),
            limit(50)
        );
        return onSnapshot(q, (snap) => {
            const msgs: LiveRoomMessage[] = [];
            snap.forEach((d) => msgs.push({ ...(d.data() as LiveRoomMessage), id: d.id }));
            onUpdate(msgs);
        });
    }

    async sendRoomMessage(
        db: Firestore,
        roomCode: string,
        senderId: string,
        senderName: string,
        text: string
    ): Promise<void> {
        const code = roomCode.trim().toUpperCase();
        await addDoc(collection(db, 'study_rooms', code, 'messages'), {
            senderId,
            senderName,
            text: text.trim().slice(0, 300),
            createdAt: Date.now(),
        });
    }
}

export const liveRoomService = new LiveRoomService();
