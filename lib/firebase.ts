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

  // データを保存（リアルタイム同期対応）
  async saveData(type: keyof ServerData, data: any): Promise<void> {
    if (!auth.currentUser) throw new Error('ユーザーが認証されていません')
    
    console.log(`Saving ${type} data to Firebase:`, data)
    
    // 既存のデータを削除してから新しいデータを保存（単一ドキュメント方式）
    const collectionRef = collection(db, type.toString())
    const querySnapshot = await getDocs(collectionRef)
    
    // 既存のドキュメントを削除
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref))
    await Promise.all(deletePromises)
    
    // 新しいデータを保存
    const docData = {
      data: data,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    await addDoc(collectionRef, docData)
    console.log(`${type} data saved successfully`)
  }

  // セッション固有のデータを保存
  async saveSessionData(type: keyof ServerData, data: any, sessionId: string): Promise<void> {
    if (!auth.currentUser) throw new Error('ユーザーが認証されていません')
    
    console.log(`Saving ${type} data to Firebase for session ${sessionId}:`, data)
    
    // データ全体をJSON文字列として保存（ネスト配列問題を完全回避）
    console.log("=== saveSessionData START ===")
    console.log("Original data type:", typeof data)
    console.log("Original data is array:", Array.isArray(data))
    console.log("Original data length:", Array.isArray(data) ? data.length : "N/A")
    
    // データ全体をJSON文字列に変換
    let jsonData: string
    try {
      jsonData = JSON.stringify(data)
      console.log("Successfully converted data to JSON string, length:", jsonData.length)
    } catch (error) {
      console.error("Failed to stringify data:", error)
      throw new Error(`データのJSON変換に失敗しました: ${error}`)
    }
    
    // セッション固有のドキュメントIDを生成
    const docId = `${sessionId}-${type}`
    
    // 新しいデータを保存（JSON文字列として）
    const docData = {
      data: jsonData,  // JSON文字列として保存
      sessionId: sessionId,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    console.log("Final docData to save:", {
      ...docData,
      data: `[JSON string, length: ${jsonData.length}]`
    })
    console.log("=== saveSessionData END ===")

    // docDataオブジェクト自体もフラット化して保存
    const flattenedDocData = this.flattenDataForFirestore(docData)
    console.log("Flattened docData:", {
      ...flattenedDocData,
      data: `[JSON string, length: ${jsonData.length}]`
    })

    // setDocを使用して直接保存（接続者一覧と同じ方式）
    await setDoc(doc(db, type.toString(), docId), flattenedDocData)
    console.log(`${type} data saved successfully for session ${sessionId}`)
    console.log(`Document ID: ${docId}`)
    console.log(`Collection: ${type.toString()}`)
    console.log(`Data length: ${jsonData.length} characters`)
  }

  // データを取得（リアルタイム同期対応）
  async getData(type: keyof ServerData): Promise<any[]> {
    try {
      console.log(`Fetching ${type} data from Firebase...`)
      const querySnapshot = await getDocs(collection(db, type.toString()))
      const data = querySnapshot.docs.map(doc => {
        const docData = doc.data()
        // 新しい形式（dataフィールド）と古い形式（直接データ）の両方に対応
        return docData.data || docData
      }).filter(item => item && (Array.isArray(item) ? item.length > 0 : true))
      
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
      
      // セッション固有のドキュメントIDを生成
      const docId = `${sessionId}-${type}`
      
      // 直接ドキュメントを取得
      const docRef = doc(db, type.toString(), docId)
      console.log(`Fetching document: ${docId} from collection: ${type.toString()}`)
      const docSnapshot = await getDoc(docRef)
      
      if (!docSnapshot.exists()) {
        console.log(`No ${type} data found for session ${sessionId}`)
        console.log(`Document ID: ${docId} does not exist`)
        return []
      }
      
      console.log(`Document ${docId} exists, data:`, docSnapshot.data())
      
      const rawDocData = docSnapshot.data()
      // フラット化されたdocDataを復元
      const docData = this.restoreDataFromFirestore(rawDocData)
      
      // dataフィールドからJSON文字列を取得して復元
      const jsonData = docData.data || "[]"
      
      let data: any[]
      try {
        if (typeof jsonData === 'string') {
          // JSON文字列から復元
          const parsedData = JSON.parse(jsonData)
          console.log(`Successfully parsed ${type} data from JSON string`)
          data = parsedData
        } else {
          // 古い形式のデータ（配列）の場合
          console.log(`Found old format data for ${type}, using as is`)
          data = jsonData
        }
      } catch (error) {
        console.error(`Failed to parse ${type} data:`, error)
        data = []
      }
      
      // 配列でない場合は配列に変換
      if (!Array.isArray(data)) {
        data = [data]
      }
      
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
    if (!auth.currentUser) throw new Error('ユーザーが認証されていません')
    
    console.log("=== Firebase removeConnectedUser ===")
    console.log("Current user UID:", auth.currentUser.uid)
    
    await deleteDoc(doc(db, 'connectedUsers', auth.currentUser.uid))
    console.log("Connected user removed successfully")
  }

  // 他のユーザーを切断（ホストのみ）
  async disconnectUser(targetUid: string): Promise<void> {
    if (!auth.currentUser) throw new Error('ユーザーが認証されていません')
    
    console.log("=== Firebase disconnectUser ===")
    console.log("Target UID:", targetUid)
    console.log("Current user UID:", auth.currentUser.uid)
    
    // ホストかどうかを確認
    const currentUserDoc = await getDoc(doc(db, 'connectedUsers', auth.currentUser.uid))
    if (!currentUserDoc.exists()) {
      throw new Error('現在のユーザー情報が見つかりません')
    }
    
    const currentUser = currentUserDoc.data() as ConnectedUser
    if (!currentUser.isHost) {
      throw new Error('ホストのみが他のユーザーを切断できます')
    }
    
    // 対象ユーザーを削除
    await deleteDoc(doc(db, 'connectedUsers', targetUid))
    console.log("User disconnected successfully:", targetUid)
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

  // データのリアルタイム監視（改善版）
  onDataChange(type: keyof ServerData, callback: (data: any[]) => void): () => void {
    return onSnapshot(collection(db, type.toString()), (snapshot: QuerySnapshot<DocumentData>) => {
      const data = snapshot.docs.map(doc => {
        const docData = doc.data()
        // 新しい形式（dataフィールド）と古い形式（直接データ）の両方に対応
        return docData.data || docData
      }).filter(item => item && (Array.isArray(item) ? item.length > 0 : true))
      
      console.log(`Real-time ${type} data update:`, data)
      callback(data)
    })
  }

  // セッション固有のデータのリアルタイム監視
  onSessionDataChange(type: keyof ServerData, sessionId: string, callback: (data: any[]) => void): () => void {
    console.log(`=== onSessionDataChange setup ===`)
    console.log(`Type: ${type}`)
    console.log(`SessionId: ${sessionId}`)
    const docId = `${sessionId}-${type}`
    console.log(`Document ID: ${docId}`)
    const docRef = doc(db, type.toString(), docId)
    console.log(`Collection: ${type.toString()}`)
    console.log(`Document path: ${type.toString()}/${docId}`)
    console.log(`Setting up onSnapshot listener...`)
    
    // リスナー設定の確認
    const unsubscribe = onSnapshot(docRef, (docSnapshot) => {
      console.log(`=== onSnapshot callback triggered ===`)
      console.log(`Document exists: ${docSnapshot.exists()}`)
      console.log(`Document ID: ${docSnapshot.id}`)
      console.log(`Timestamp: ${new Date().toLocaleTimeString()}`)
      
      if (!docSnapshot.exists()) {
        console.log(`No ${type} data found for session ${sessionId} in real-time`)
        callback([])
        return
      }
      
      const rawDocData = docSnapshot.data()
      console.log(`Raw document data:`, rawDocData)
      const docData = this.restoreDataFromFirestore(rawDocData)
      console.log(`Restored docData:`, docData)
      const jsonData = docData.data || "[]"
      console.log(`JSON data string:`, jsonData)
      
      let data: any[]
      try {
        if (typeof jsonData === 'string') {
          const parsedData = JSON.parse(jsonData)
          console.log(`Parsed data:`, parsedData)
          data = parsedData
        } else {
          console.log(`Using old format data:`, jsonData)
          data = jsonData
        }
      } catch (error) {
        console.error(`Failed to parse ${type} data in real-time:`, error)
        data = []
      }
      
      if (!Array.isArray(data)) {
        console.log(`Converting non-array data to array`)
        data = [data]
      }
      
      console.log(`Final data to callback:`, data)
      console.log(`Calling callback with ${data.length} items`)
      console.log(`Callback execution time: ${new Date().toLocaleTimeString()}`)
      callback(data)
    }, (error) => {
      console.error(`onSnapshot error for ${type}:`, error)
      console.error(`Error details:`, {
        type,
        sessionId,
        docId,
        error: error.message,
        code: error.code
      })
    })
    
    console.log(`✅ onSessionDataChange listener set up successfully for ${type}`)
    console.log(`Listener will monitor: ${type.toString()}/${docId}`)
    
    return unsubscribe
  }

  // データをFirestore用にフラット化
  private flattenDataForFirestore(data: any): any {
    console.log("=== flattenDataForFirestore START ===")
    console.log("Input data type:", typeof data)
    console.log("Input data is array:", Array.isArray(data))
    
    if (Array.isArray(data)) {
      console.log("Processing array with", data.length, "items")
      const flattenedArray = data.map((item, index) => {
        console.log(`Processing array item ${index}:`, item)
        const flattenedItem = this.flattenDataForFirestore(item)
        console.log(`Flattened array item ${index}:`, flattenedItem)
        return flattenedItem
      })
      console.log("Final flattened array result:", flattenedArray)
      return flattenedArray
    } else if (data && typeof data === 'object' && data !== null) {
      console.log("Processing object with keys:", Object.keys(data))
      const flattened: any = {}
      
      for (const [key, value] of Object.entries(data)) {
        console.log(`Processing key "${key}":`, value)
        console.log(`Key "${key}" type:`, typeof value)
        console.log(`Key "${key}" is array:`, Array.isArray(value))
        
        if (Array.isArray(value)) {
          // 配列は文字列として保存（Firestoreの制限回避）
          console.log(`Converting array "${key}" to JSON string`)
          try {
            flattened[key] = JSON.stringify(value)
            console.log(`Successfully converted "${key}" to:`, flattened[key])
          } catch (error) {
            console.error(`Failed to stringify "${key}":`, error)
            flattened[key] = "[]" // フォールバック
          }
        } else if (value && typeof value === 'object' && value !== null) {
          // オブジェクトも文字列として保存
          console.log(`Converting object "${key}" to JSON string`)
          try {
            flattened[key] = JSON.stringify(value)
            console.log(`Successfully converted "${key}" to:`, flattened[key])
          } catch (error) {
            console.error(`Failed to stringify "${key}":`, error)
            flattened[key] = "{}" // フォールバック
          }
        } else {
          // プリミティブ値はそのまま
          console.log(`Keeping primitive "${key}" as is:`, value)
          flattened[key] = value
        }
      }
      
      console.log("Final flattened object result:", flattened)
      return flattened
    } else {
      console.log("Returning primitive value:", data)
      return data
    }
  }

  // ネストした配列やオブジェクトを検出
  private hasNestedArraysOrObjects(data: any, depth: number = 0): boolean {
    if (depth > 10) return false // 無限ループ防止
    
    if (Array.isArray(data)) {
      return data.some(item => this.hasNestedArraysOrObjects(item, depth + 1))
    } else if (data && typeof data === 'object' && data !== null) {
      return Object.values(data).some(value => 
        Array.isArray(value) || (value && typeof value === 'object' && value !== null)
      )
    }
    return false
  }

  // フラット化されたデータを復元
  private restoreDataFromFirestore(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.restoreDataFromFirestore(item))
    } else if (data && typeof data === 'object') {
      const restored: any = {}
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
          try {
            // JSON文字列を復元
            restored[key] = JSON.parse(value)
          } catch {
            // パースに失敗した場合はそのまま
            restored[key] = value
          }
        } else {
          restored[key] = value
        }
      }
      return restored
    }
    return data
  }

  // ログアウト
  async signOut(): Promise<void> {
    await auth.signOut()
    this.currentUser = null
  }
}

// シングルトンインスタンス
export const firebaseManager = new FirebaseManager()
