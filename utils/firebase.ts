import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, get, update, Database } from 'firebase/database';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, Auth, User } from 'firebase/auth';
import { Expense, SettledBill, Member } from '../types';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

// Default configuration loaded from Vite environment variables
const defaultFirebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const hasDefaultConfig =
  !!defaultFirebaseConfig.apiKey &&
  !!defaultFirebaseConfig.databaseURL &&
  !!defaultFirebaseConfig.projectId;

class FirebaseService {
  private app: FirebaseApp | null = null;
  private db: Database | null = null;
  private auth: Auth | null = null;
  private isInitialized = false;

  constructor() {
    // If default config exists, initialize immediately
    if (hasDefaultConfig) {
      this.init(defaultFirebaseConfig);
    }
  }

  /**
   * Initializes Firebase with the provided configuration.
   */
  public init(config: FirebaseConfig): boolean {
    try {
      if (!config.apiKey || !config.databaseURL || !config.projectId) {
        throw new Error('Cấu hình Firebase thiếu các trường bắt buộc (apiKey, databaseURL, projectId).');
      }

      const apps = getApps();
      if (apps.length > 0) {
        this.app = apps[0];
      } else {
        this.app = initializeApp(config);
      }

      this.db = getDatabase(this.app);
      this.auth = getAuth(this.app);
      this.isInitialized = true;
      console.log('Firebase Services initialized successfully.');
      return true;
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      this.isInitialized = false;
      this.app = null;
      this.db = null;
      this.auth = null;
      return false;
    }
  }

  public getIsInitialized(): boolean {
    return this.isInitialized;
  }

  public getAuthInstance(): Auth | null {
    return this.auth;
  }

  /* ================= Auth Services ================= */

  public async loginWithGoogle(): Promise<User> {
    if (!this.auth) throw new Error('Auth chưa được khởi tạo. Vui lòng cấu hình Firebase.');
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(this.auth, provider);
    await this.saveUserProfile(result.user);
    return result.user;
  }

  public async logout(): Promise<void> {
    if (!this.auth) return;
    await signOut(this.auth);
  }

  public onAuthChanged(callback: (user: User | null) => void): () => void {
    if (!this.auth) return () => {};
    return onAuthStateChanged(this.auth, callback);
  }

  /* ================= User Profiles ================= */

  public async getUserProfile(uid: string): Promise<any> {
    if (!this.db) return null;
    const snap = await get(ref(this.db, `users/${uid}`));
    return snap.val();
  }

  public async saveUserProfile(user: User): Promise<any> {
    if (!this.db) return null;
    const existing = await this.getUserProfile(user.uid);
    const newProfile = {
      displayName: user.displayName || 'Anonymous',
      email: user.email || '',
      photoURL: user.photoURL || '',
      bankInfo: existing?.bankInfo || { bankId: '', accountNumber: '' },
    };
    await set(ref(this.db, `users/${user.uid}`), newProfile);
    return newProfile;
  }

  public async updateUserBankInfo(uid: string, bankId: string, accountNumber: string): Promise<void> {
    if (!this.db) throw new Error('Database chưa được khởi tạo.');
    await update(ref(this.db, `users/${uid}/bankInfo`), { bankId, accountNumber });
  }

  /* ================= Room Management ================= */

  private generateRoomId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `UNO-${result}`;
  }

  public async createRoom(roomName: string, ownerUid: string): Promise<string> {
    if (!this.db) throw new Error('Database chưa được khởi tạo.');
    let roomId = this.generateRoomId();
    let exists = true;
    let attempts = 0;

    // Check collision
    while (exists && attempts < 10) {
      const snap = await get(ref(this.db, `rooms/${roomId}`));
      if (!snap.exists()) {
        exists = false;
      } else {
        roomId = this.generateRoomId();
        attempts++;
      }
    }

    await update(ref(this.db), {
      [`rooms/${roomId}/metadata`]: { name: roomName, ownerId: ownerUid, createdAt: Date.now() },
      [`rooms/${roomId}/members/${ownerUid}`]: true,
      [`userRooms/${ownerUid}/${roomId}`]: true,
    });

    return roomId;
  }

  public async requestToJoinRoom(roomId: string, user: User): Promise<void> {
    if (!this.db) throw new Error('Database chưa được khởi tạo.');
    const targetRoomId = roomId.trim().toUpperCase();

    const roomSnap = await get(ref(this.db, `rooms/${targetRoomId}`));
    if (!roomSnap.exists()) {
      throw new Error('Không tìm thấy phòng với mã ID này.');
    }

    // Check if already a member
    const memberSnap = await get(ref(this.db, `rooms/${targetRoomId}/members/${user.uid}`));
    if (memberSnap.exists()) {
      throw new Error('Bạn đã là thành viên của phòng này rồi.');
    }

    await update(ref(this.db), {
      [`rooms/${targetRoomId}/requests/${user.uid}`]: {
        displayName: user.displayName || 'Anonymous',
        email: user.email || '',
        photoURL: user.photoURL || '',
        requestedAt: Date.now(),
      },
      [`joinRequests/${user.uid}/${targetRoomId}`]: true,
    });
  }

  public async cancelJoinRequest(roomId: string, uid: string): Promise<void> {
    if (!this.db) throw new Error('Database chưa được khởi tạo.');
    const targetRoomId = roomId.trim().toUpperCase();
    await update(ref(this.db), {
      [`rooms/${targetRoomId}/requests/${uid}`]: null,
      [`joinRequests/${uid}/${targetRoomId}`]: null,
    });
  }

  public async approveJoinRequest(roomId: string, joinerUid: string): Promise<void> {
    if (!this.db) throw new Error('Database chưa được khởi tạo.');
    await update(ref(this.db), {
      [`rooms/${roomId}/members/${joinerUid}`]: true,
      [`userRooms/${joinerUid}/${roomId}`]: true,
      [`rooms/${roomId}/requests/${joinerUid}`]: null,
      [`joinRequests/${joinerUid}/${roomId}`]: null,
    });
  }

  public async rejectJoinRequest(roomId: string, joinerUid: string): Promise<void> {
    if (!this.db) throw new Error('Database chưa được khởi tạo.');
    await update(ref(this.db), {
      [`rooms/${roomId}/requests/${joinerUid}`]: null,
      [`joinRequests/${joinerUid}/${roomId}`]: null,
    });
  }

  public async leaveRoom(roomId: string, uid: string): Promise<void> {
    if (!this.db) throw new Error('Database chưa được khởi tạo.');

    const updates: any = {
      [`rooms/${roomId}/members/${uid}`]: null,
      [`userRooms/${uid}/${roomId}`]: null,
    };

    const metaSnap = await get(ref(this.db, `rooms/${roomId}/metadata`));
    if (metaSnap.exists() && metaSnap.val().ownerId === uid) {
      const membersSnap = await get(ref(this.db, `rooms/${roomId}/members`));
      const members = membersSnap.val() ? Object.keys(membersSnap.val()).filter((m) => m !== uid) : [];
      if (members.length > 0) {
        updates[`rooms/${roomId}/metadata/ownerId`] = members[0];
      } else {
        updates[`rooms/${roomId}`] = null;
      }
    }

    await update(ref(this.db), updates);
  }

  /* ================= Subscriptions ================= */

  public subscribeToUserRooms(uid: string, onUpdate: (rooms: any[]) => void): () => void {
    if (!this.db) return () => {};
    const userRoomsRef = ref(this.db, `userRooms/${uid}`);

    return onValue(userRoomsRef, async (snapshot) => {
      const roomIdsObj = snapshot.val();
      if (!roomIdsObj) {
        onUpdate([]);
        return;
      }
      const roomIds = Object.keys(roomIdsObj);
      const roomsPromises = roomIds.map(async (roomId) => {
        const metaSnap = await get(ref(this.db!, `rooms/${roomId}/metadata`));
        const membersSnap = await get(ref(this.db!, `rooms/${roomId}/members`));
        const members = membersSnap.val() ? Object.keys(membersSnap.val()) : [];
        return {
          id: roomId,
          name: metaSnap.exists() ? metaSnap.val().name : 'Phòng không tên',
          ownerId: metaSnap.exists() ? metaSnap.val().ownerId : '',
          memberCount: members.length,
        };
      });
      const rooms = await Promise.all(roomsPromises);
      onUpdate(rooms);
    });
  }

  public subscribeToJoinRequests(uid: string, onUpdate: (rooms: any[]) => void): () => void {
    if (!this.db) return () => {};
    const joinRequestsRef = ref(this.db, `joinRequests/${uid}`);

    return onValue(joinRequestsRef, async (snapshot) => {
      const reqIdsObj = snapshot.val();
      if (!reqIdsObj) {
        onUpdate([]);
        return;
      }
      const roomIds = Object.keys(reqIdsObj);
      const roomsPromises = roomIds.map(async (roomId) => {
        const metaSnap = await get(ref(this.db!, `rooms/${roomId}/metadata`));
        return {
          id: roomId,
          name: metaSnap.exists() ? metaSnap.val().name : 'Phòng không tên',
          status: 'pending',
        };
      });
      const rooms = await Promise.all(roomsPromises);
      onUpdate(rooms);
    });
  }

  public subscribeToRoomDetails(
    roomId: string,
    onUpdate: (data: {
      metadata: any;
      members: { [uid: string]: any };
      requests: { [uid: string]: any };
      expenses: Expense[];
      settledBills: SettledBill[];
      customMembers: string[];
      nicknames: { [uid: string]: string };
      plans: any[];
    }) => void,
    onError?: (error: any) => void
  ): () => void {
    if (!this.db) return () => {};
    const roomRef = ref(this.db, `rooms/${roomId}`);

    return onValue(
      roomRef,
      async (snapshot) => {
        const val = snapshot.val();
        if (!val) {
          if (onError) onError(new Error('Phòng không tồn tại hoặc đã bị xóa.'));
          return;
        }

        const metadata = val.metadata || {};
        const memberUids = val.members ? Object.keys(val.members) : [];
        const requests = val.requests || {};
        const expenses = val.expenses || [];
        const settledBills = val.settledBills || [];
        const customMembers = val.customMembers || [];
        const nicknames = val.nicknames || {};
        const plans = val.plans || [];

        // Fetch user profiles for all approved members
        const memberProfiles: { [uid: string]: any } = {};
        await Promise.all(
          memberUids.map(async (uid) => {
            const profileSnap = await get(ref(this.db!, `users/${uid}`));
            if (profileSnap.exists()) {
              memberProfiles[uid] = profileSnap.val();
            } else {
              memberProfiles[uid] = { displayName: 'Thành viên mới', email: '', photoURL: '' };
            }
          })
        );

        onUpdate({
          metadata,
          members: memberProfiles,
          requests,
          expenses,
          settledBills,
          customMembers,
          nicknames,
          plans,
        });
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  }

  /* ================= Chat & Activity Logs Services ================= */

  public async writeChatMessage(
    roomId: string,
    user: { uid: string; displayName?: string | null; photoURL?: string | null },
    text: string,
    type: 'chat' | 'system' | 'settlement' = 'chat'
  ): Promise<void> {
    if (!this.db) throw new Error('Database chưa được khởi tạo.');
    const newMsgKey = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await set(ref(this.db, `rooms/${roomId}/messages/${newMsgKey}`), {
      senderId: user.uid,
      senderName: user.displayName || 'Anonymous',
      senderPhoto: user.photoURL || '',
      text,
      type,
      timestamp: Date.now(),
    });
  }

  public subscribeToChatMessages(roomId: string, onUpdate: (messages: any[]) => void): () => void {
    if (!this.db) return () => {};
    const chatRef = ref(this.db, `rooms/${roomId}/messages`);

    return onValue(chatRef, (snapshot) => {
      const val = snapshot.val();
      if (!val) {
        onUpdate([]);
        return;
      }
      const messagesList = Object.entries(val).map(([id, data]) => ({
        id,
        ...(data as any),
      }));
      // Sắp xếp tin nhắn theo thời gian tăng dần
      messagesList.sort((a, b) => a.timestamp - b.timestamp);
      onUpdate(messagesList);
    });
  }

  /* ================= Data Writing Helpers ================= */

  public async writeExpenses(roomId: string, expenses: Expense[]): Promise<void> {
    await this.writeToPath(`rooms/${roomId}/expenses`, expenses);
  }

  public async writeSettledBills(roomId: string, settledBills: SettledBill[]): Promise<void> {
    await this.writeToPath(`rooms/${roomId}/settledBills`, settledBills);
  }

  public async writeCustomMembers(roomId: string, customMembers: string[]): Promise<void> {
    await this.writeToPath(`rooms/${roomId}/customMembers`, customMembers);
  }

  public async clearRoomData(roomId: string): Promise<void> {
    await update(ref(this.db!), {
      [`rooms/${roomId}/expenses`]: null,
      [`rooms/${roomId}/settledBills`]: null,
      [`rooms/${roomId}/customMembers`]: null,
    });
  }

  public async updateUserProfile(uid: string, displayName: string, photoURL: string): Promise<void> {
    if (!this.db) throw new Error('Database chưa được khởi tạo.');
    await update(ref(this.db, `users/${uid}`), { displayName, photoURL });
  }

  public async writeRoomNickname(roomId: string, uid: string, nickname: string): Promise<void> {
    if (!this.db) throw new Error('Database chưa được khởi tạo.');
    await set(ref(this.db, `rooms/${roomId}/nicknames/${uid}`), nickname);
  }

  public async writeRoomPlans(roomId: string, plans: any[]): Promise<void> {
    if (!this.db) throw new Error('Database chưa được khởi tạo.');
    await set(ref(this.db, `rooms/${roomId}/plans`), plans);
  }

  private async writeToPath(path: string, data: any): Promise<void> {
    if (!this.db) throw new Error('Database chưa được khởi tạo.');
    await set(ref(this.db, path), data);
  }
}

export const firebaseService = new FirebaseService();
export { hasDefaultConfig };
export type { User };
