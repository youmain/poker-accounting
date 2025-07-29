import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  getDocs,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  getFirestore
} from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { initializeApp } from 'firebase/app'
import type { ServerData, Player, Receipt, GameSession, DailySales, HistoryEntry, SystemSettings } from '@/types'

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyBsFkSoRebKJyc0k3HWIU5lV1pt1euIdQg",
  authDomain: "pokersystem-b90d7.firebaseapp.com",
  projectId: "pokersystem-b90d7",
  storageBucket: "pokersystem-b90d7.appspot.com",
  messagingSenderId: "807893409604",
  appId: "1:807893409604:web:pokersystem-web"
}

// Firebase初期化
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// 接続ユーザー情報
export interface ConnectedUser {
  uid: string
  name: string
  isHost: boolean
  joinedAt: Timestamp
  deviceId: string
  sessionId: string
}

// セッションデータの型
export interface SessionData {
  sessionId: string
  hostName: string
  createdAt: Timestamp
  isActive: boolean
  connectedUsers: ConnectedUser[]
}

// 新しいFirebase同期クラス
export class NewFirebaseSync {
  private currentSessionId: string | null = null
  private currentUser: ConnectedUser | null = null
  private listeners: Map<string, () => void> = new Map()

  // 匿名認証
  async signInAnonymously(): Promise<string> {
    try {
      const result = await signInAnonymously(auth)
      return result.user.uid
    } catch (error) {
      console.error('匿名認証エラー:', error)
      throw error
    }
  }

  // 新しいセッションを作成
  async createSession(hostName: string): Promise<string> {
    console.log('=== 新しいセッション作成 ===')
    
    const uid = await this.signInAnonymously()
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const sessionData: SessionData = {
      sessionId,
      hostName,
      createdAt: serverTimestamp() as Timestamp,
      isActive: true,
      connectedUsers: []
    }

    // セッション情報を保存
    await setDoc(doc(db, 'sessions', sessionId), sessionData)
    
    // ホストとして接続ユーザーを追加
    const hostUser: ConnectedUser = {
      uid,
      name: hostName,
      isHost: true,
      joinedAt: serverTimestamp() as Timestamp,
      deviceId: navigator.userAgent,
      sessionId
    }
    
    await setDoc(doc(db, 'connectedUsers', uid), hostUser)
    
    this.currentSessionId = sessionId
    this.currentUser = hostUser
    
    console.log('セッション作成完了:', sessionId)
    return sessionId
  }

  // セッションに参加
  async joinSession(sessionId: string, participantName: string): Promise<boolean> {
    console.log('=== セッション参加 ===')
    console.log('SessionId:', sessionId)
    console.log('ParticipantName:', participantName)
    
    try {
      const uid = await this.signInAnonymously()
      
      // セッションの存在確認
      const sessionDoc = await getDoc(doc(db, 'sessions', sessionId))
      if (!sessionDoc.exists()) {
        console.error('セッションが見つかりません:', sessionId)
        return false
      }
      
      // 参加者として接続ユーザーを追加
      const participantUser: ConnectedUser = {
        uid,
        name: participantName,
        isHost: false,
        joinedAt: serverTimestamp() as Timestamp,
        deviceId: navigator.userAgent,
        sessionId
      }
      
      await setDoc(doc(db, 'connectedUsers', uid), participantUser)
      
      this.currentSessionId = sessionId
      this.currentUser = participantUser
      
      console.log('セッション参加完了')
      return true
    } catch (error) {
      console.error('セッション参加エラー:', error)
      return false
    }
  }

  // セッションから退出
  async leaveSession(): Promise<void> {
    console.log('=== セッション退出 ===')
    
    if (!this.currentUser) {
      console.log('現在のユーザーがありません')
      return
    }
    
    try {
      // 接続ユーザーを削除
      await deleteDoc(doc(db, 'connectedUsers', this.currentUser.uid))
      
      // リスナーをクリーンアップ
      this.cleanupListeners()
      
      this.currentSessionId = null
      this.currentUser = null
      
      console.log('セッション退出完了')
    } catch (error) {
      console.error('セッション退出エラー:', error)
    }
  }

  // データを保存
  async saveData(type: keyof ServerData, data: any): Promise<boolean> {
    console.log('=== データ保存 ===')
    console.log('Type:', type)
    console.log('Data:', data)
    
    if (!this.currentSessionId) {
      console.error('セッションIDがありません')
      return false
    }
    
    try {
      const docId = `${this.currentSessionId}-${type}`
      const docData = {
        sessionId: this.currentSessionId,
        type,
        data: JSON.stringify(data),
        updatedAt: serverTimestamp(),
        updatedBy: this.currentUser?.uid
      }
      
      // 確実に保存するため、setDocを使用
      await setDoc(doc(db, type.toString(), docId), docData, { merge: true })
      console.log('データ保存完了:', docId)
      
      // 保存確認のため、即座に読み取り
      const savedDoc = await getDoc(doc(db, type.toString(), docId))
      if (savedDoc.exists()) {
        console.log('保存確認完了')
        return true
      } else {
        console.error('保存確認失敗')
        return false
      }
    } catch (error) {
      console.error('データ保存エラー:', error)
      return false
    }
  }

  // データを取得
  async getData(type: keyof ServerData): Promise<any[]> {
    console.log('=== データ取得 ===')
    console.log('Type:', type)
    
    if (!this.currentSessionId) {
      console.error('セッションIDがありません')
      return []
    }
    
    try {
      const docId = `${this.currentSessionId}-${type}`
      const docRef = doc(db, type.toString(), docId)
      const docSnap = await getDoc(docRef)
      
      if (!docSnap.exists()) {
        console.log('データが見つかりません:', docId)
        return []
      }
      
      const docData = docSnap.data()
      const jsonData = docData.data || "[]"
      
      let data: any[]
      try {
        data = JSON.parse(jsonData)
      } catch (error) {
        console.error('JSON解析エラー:', error)
        data = []
      }
      
      console.log('データ取得完了:', data.length, '件')
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('データ取得エラー:', error)
      return []
    }
  }

  // リアルタイムリスナーを設定
  onDataChange(type: keyof ServerData, callback: (data: any[]) => void): () => void {
    console.log('=== リアルタイムリスナー設定 ===')
    console.log('Type:', type)
    
    if (!this.currentSessionId) {
      console.error('セッションIDがありません')
      return () => {}
    }
    
    const docId = `${this.currentSessionId}-${type}`
    const docRef = doc(db, type.toString(), docId)
    
    console.log('リスナー設定:', `${type.toString()}/${docId}`)
    
    // 即座に現在のデータを取得してコールバックを実行
    getDoc(docRef).then((docSnapshot) => {
      if (docSnapshot.exists()) {
        const docData = docSnapshot.data()
        const jsonData = docData.data || "[]"
        
        let data: any[]
        try {
          data = JSON.parse(jsonData)
        } catch (error) {
          console.error('JSON解析エラー:', error)
          data = []
        }
        
        console.log('初期データ取得:', data.length, '件')
        callback(Array.isArray(data) ? data : [])
      } else {
        console.log('初期データなし')
        callback([])
      }
    }).catch((error) => {
      console.error('初期データ取得エラー:', error)
      callback([])
    })
    
    const unsubscribe = onSnapshot(docRef, (docSnapshot) => {
      console.log(`=== ${type} データ更新 ===`)
      console.log('Document exists:', docSnapshot.exists())
      console.log('Timestamp:', new Date().toLocaleTimeString())
      
      if (!docSnapshot.exists()) {
        console.log('ドキュメントが存在しません')
        callback([])
        return
      }
      
      const docData = docSnapshot.data()
      const jsonData = docData.data || "[]"
      
      let data: any[]
      try {
        data = JSON.parse(jsonData)
      } catch (error) {
        console.error('JSON解析エラー:', error)
        data = []
      }
      
      console.log('受信データ:', data.length, '件')
      callback(Array.isArray(data) ? data : [])
    }, (error) => {
      console.error('リスナーエラー:', error)
      // エラー時も空配列をコールバック
      callback([])
    })
    
    this.listeners.set(type, unsubscribe)
    console.log('リスナー設定完了')
    
    return unsubscribe
  }

  // 接続ユーザーの監視
  onConnectedUsersChange(callback: (users: ConnectedUser[]) => void): () => void {
    console.log('=== 接続ユーザー監視設定 ===')
    
    if (!this.currentSessionId) {
      console.error('セッションIDがありません')
      return () => {}
    }
    
    const q = query(
      collection(db, 'connectedUsers'),
      where('sessionId', '==', this.currentSessionId)
    )
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('=== 接続ユーザー更新 ===')
      const users = snapshot.docs.map(doc => doc.data() as ConnectedUser)
      console.log('接続ユーザー数:', users.length)
      callback(users)
    }, (error) => {
      console.error('接続ユーザー監視エラー:', error)
    })
    
    this.listeners.set('connectedUsers', unsubscribe)
    return unsubscribe
  }

  // 他のユーザーを切断（ホストのみ）
  async disconnectUser(targetUid: string): Promise<boolean> {
    console.log('=== ユーザー切断 ===')
    console.log('Target UID:', targetUid)
    
    if (!this.currentUser?.isHost) {
      console.error('ホストのみが切断できます')
      return false
    }
    
    try {
      await deleteDoc(doc(db, 'connectedUsers', targetUid))
      console.log('ユーザー切断完了')
      return true
    } catch (error) {
      console.error('ユーザー切断エラー:', error)
      return false
    }
  }

  // リスナーのクリーンアップ
  private cleanupListeners(): void {
    console.log('=== リスナークリーンアップ ===')
    this.listeners.forEach((unsubscribe, key) => {
      console.log('リスナー停止:', key)
      unsubscribe()
    })
    this.listeners.clear()
  }

  // 現在の状態を取得
  getCurrentState() {
    return {
      sessionId: this.currentSessionId,
      currentUser: this.currentUser,
      isConnected: !!this.currentSessionId
    }
  }
}

// シングルトンインスタンス
export const newFirebaseSync = new NewFirebaseSync() 