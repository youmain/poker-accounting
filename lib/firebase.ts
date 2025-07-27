import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth'
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore'
import type { ServerData, Player, GameSession, Receipt, DailySales, HistoryEntry, SystemSettings } from '@/types'

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyBsFkSoRebKJyc0k3HWIU5lV1pt1euIdQg",
  authDomain: "pokersystem-b90d7.firebaseapp.com",
  projectId: "pokersystem-b90d7",
  storageBucket: "pokersystem-b90d7.appspot.com",
  messagingSenderId: "807893409604",
  appId: "1:807893409604:web:pokersystem-web" // 仮のappId
}

// Firebase初期化
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// クライアントサイドでのみ初期化
if (typeof window !== 'undefined') {
  console.log('Firebase initialized on client side')
}

// ユーザー情報の型定義
export interface FirebaseUser {
  uid: string
  name: string
  role: 'owner' | 'staff'
  lastLogin: Timestamp
  deviceId?: string
}

// QRコード情報の型定義
export interface QRCodeInfo {
  code: string
  businessDate: string
  expiresAt: Timestamp
  isActive: boolean
}

// 接続者情報の型定義
export interface ConnectedUser {
  uid: string
  name: string
  isHost: boolean
  joinedAt: Timestamp
  deviceId: string
  sessionId: string
}

// Firebase認証・データ管理クラス
export class FirebaseManager {
  private currentUser: FirebaseUser | null = null

  // 匿名認証でログイン
  async signInAnonymously(): Promise<User> {
    try {
      const result = await signInAnonymously(auth)
      return result.user
    } catch (error) {
      console.error('匿名認証エラー:', error)
      throw error
    }
  }

  // ユーザー情報を保存
  async saveUserInfo(userData: Omit<FirebaseUser, 'lastLogin'>): Promise<void> {
    if (!auth.currentUser) throw new Error('ユーザーが認証されていません')
    
    const userInfo: FirebaseUser = {
      ...userData,
      lastLogin: serverTimestamp() as Timestamp
    }

    await setDoc(doc(db, 'users', auth.currentUser.uid), userInfo)
    this.currentUser = userInfo
  }

  // ユーザー情報を取得
  async getUserInfo(uid: string): Promise<FirebaseUser | null> {
    try {
      const docRef = doc(db, 'users', uid)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        return docSnap.data() as FirebaseUser
      }
      return null
    } catch (error) {
      console.error('ユーザー情報取得エラー:', error)
      return null
    }
  }

  // 本日のQRコードを取得
  async getTodayQRCode(): Promise<QRCodeInfo | null> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const qrQuery = query(
        collection(db, 'qrCodes'),
        where('businessDate', '==', today),
        where('isActive', '==', true)
      )
      
      const querySnapshot = await getDocs(qrQuery)
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as QRCodeInfo
      }
      return null
    } catch (error) {
      console.error('QRコード取得エラー:', error)
      return null
    }
  }

  // 本日のQRコードを作成
  async createTodayQRCode(): Promise<string> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const expiresAt = new Date()
      expiresAt.setHours(23, 59, 59, 999) // 今日の23:59:59まで

      const qrCode: QRCodeInfo = {
        code: `poker_${today}_${Date.now()}`,
        businessDate: today,
        expiresAt: Timestamp.fromDate(expiresAt),
        isActive: true
      }

      await addDoc(collection(db, 'qrCodes'), qrCode)
      return qrCode.code
    } catch (error) {
      console.error('QRコード作成エラー:', error)
      throw error
    }
  }

  // データを保存
  async saveData(type: keyof ServerData, data: any): Promise<void> {
    if (!auth.currentUser) throw new Error('ユーザーが認証されていません')
    
    console.log(`Saving ${type} data to Firebase:`, data)
    
    const docData = {
      ...data,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    await addDoc(collection(db, type.toString()), docData)
    console.log(`${type} data saved successfully`)
  }

  // セッション固有のデータを保存
  async saveSessionData(type: keyof ServerData, data: any, sessionId: string): Promise<void> {
    if (!auth.currentUser) throw new Error('ユーザーが認証されていません')
    
    console.log(`Saving ${type} data to Firebase for session ${sessionId}:`, data)
    
    const docData = {
      ...data,
      sessionId: sessionId,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    await addDoc(collection(db, type.toString()), docData)
    console.log(`${type} data saved successfully for session ${sessionId}`)
  }

  // データを取得
  async getData(type: keyof ServerData): Promise<any[]> {
    try {
      console.log(`Fetching ${type} data from Firebase...`)
      const querySnapshot = await getDocs(collection(db, type.toString()))
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      console.log(`Fetched ${data.length} ${type} items:`, data)
      return data
    } catch (error) {
      console.error(`${type}データ取得エラー:`, error)
      return []
    }
  }

  // セッション固有のデータを取得
  async getSessionData(type: keyof ServerData, sessionId: string): Promise<any[]> {
    try {
      console.log(`Fetching ${type} data from Firebase for session ${sessionId}...`)
      const q = query(
        collection(db, type.toString()),
        where('sessionId', '==', sessionId)
      )
      const querySnapshot = await getDocs(q)
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      console.log(`Fetched ${data.length} ${type} items for session ${sessionId}:`, data)
      return data
    } catch (error) {
      console.error(`${type}セッションデータ取得エラー:`, error)
      return []
    }
  }

  // 認証状態の監視
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback)
  }

  // 現在のユーザーを取得
  getCurrentUser(): User | null {
    return auth.currentUser
  }

  // 接続者を追加
  async addConnectedUser(userData: Omit<ConnectedUser, 'uid' | 'joinedAt'>): Promise<void> {
    console.log("=== Firebase addConnectedUser ===")
    console.log("auth.currentUser:", auth.currentUser)
    console.log("userData:", userData)
    
    if (!auth.currentUser) throw new Error('ユーザーが認証されていません')
    
    const connectedUser: ConnectedUser = {
      uid: auth.currentUser.uid,
      ...userData,
      joinedAt: serverTimestamp() as Timestamp
    }
    
    console.log("Connected user object:", connectedUser)
    console.log("Saving to Firebase...")

    await setDoc(doc(db, 'connectedUsers', auth.currentUser.uid), connectedUser)
    console.log("Connected user saved to Firebase successfully")
  }

  // 接続者を削除
  async removeConnectedUser(): Promise<void> {
    if (!auth.currentUser) return
    
    await deleteDoc(doc(db, 'connectedUsers', auth.currentUser.uid))
  }

  // セッションの接続者一覧を取得
  async getConnectedUsers(sessionId: string): Promise<ConnectedUser[]> {
    try {
      const q = query(
        collection(db, 'connectedUsers'),
        where('sessionId', '==', sessionId)
      )
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => doc.data() as ConnectedUser)
    } catch (error) {
      console.error('接続者一覧取得エラー:', error)
      return []
    }
  }

  // 接続者一覧のリアルタイム監視
  onConnectedUsersChange(sessionId: string, callback: (users: ConnectedUser[]) => void): () => void {
    const q = query(
      collection(db, 'connectedUsers'),
      where('sessionId', '==', sessionId)
    )
    
    return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const users = snapshot.docs.map(doc => doc.data() as ConnectedUser)
      callback(users)
    })
  }

  // データのリアルタイム監視
  onDataChange(type: keyof ServerData, callback: (data: any[]) => void): () => void {
    return onSnapshot(collection(db, type.toString()), (snapshot: QuerySnapshot<DocumentData>) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      callback(data)
    })
  }

  // ログアウト
  async signOut(): Promise<void> {
    await auth.signOut()
    this.currentUser = null
  }
}

// シングルトンインスタンス
export const firebaseManager = new FirebaseManager()
