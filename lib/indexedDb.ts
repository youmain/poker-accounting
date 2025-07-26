import type { Player, GameSession, Receipt, DailySales, HistoryEntry, SystemSettings } from "@/types"

// データベース名とバージョン
const DB_NAME = "PokerSystemDB"
const DB_VERSION = 1

// ストア（テーブル）名
const STORES = {
  PLAYERS: "players",
  SESSIONS: "sessions",
  RECEIPTS: "receipts",
  DAILY_SALES: "dailySales",
  HISTORY: "history",
  SETTINGS: "settings",
  SYNC_LOG: "syncLog",
}

// IndexedDBの初期化
export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = (event) => {
      console.error("IndexedDB初期化エラー:", event)
      reject("データベースを開けませんでした")
    }

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      console.log("IndexedDB接続成功")
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // プレイヤーストア
      if (!db.objectStoreNames.contains(STORES.PLAYERS)) {
        const playerStore = db.createObjectStore(STORES.PLAYERS, { keyPath: "id" })
        playerStore.createIndex("name", "name", { unique: false })
      }

      // セッションストア
      if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
        const sessionStore = db.createObjectStore(STORES.SESSIONS, { keyPath: "id" })
        sessionStore.createIndex("playerId", "playerId", { unique: false })
        sessionStore.createIndex("status", "status", { unique: false })
      }

      // 伝票ストア
      if (!db.objectStoreNames.contains(STORES.RECEIPTS)) {
        const receiptStore = db.createObjectStore(STORES.RECEIPTS, { keyPath: "id" })
        receiptStore.createIndex("playerId", "playerId", { unique: false })
        receiptStore.createIndex("date", "date", { unique: false })
      }

      // 日次売上ストア
      if (!db.objectStoreNames.contains(STORES.DAILY_SALES)) {
        const salesStore = db.createObjectStore(STORES.DAILY_SALES, { keyPath: "id" })
        salesStore.createIndex("date", "date", { unique: false })
      }

      // 履歴ストア
      if (!db.objectStoreNames.contains(STORES.HISTORY)) {
        const historyStore = db.createObjectStore(STORES.HISTORY, { keyPath: "id" })
        historyStore.createIndex("type", "type", { unique: false })
        historyStore.createIndex("timestamp", "timestamp", { unique: false })
      }

      // 設定ストア
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: "id" })
      }

      // 同期ログストア
      if (!db.objectStoreNames.contains(STORES.SYNC_LOG)) {
        const syncStore = db.createObjectStore(STORES.SYNC_LOG, { keyPath: "id", autoIncrement: true })
        syncStore.createIndex("timestamp", "timestamp", { unique: false })
        syncStore.createIndex("type", "type", { unique: false })
      }
    }
  })
}

// データを保存
export async function saveData<T>(storeName: string, data: T[]): Promise<boolean> {
  try {
    const db = await initDB()
    const transaction = db.transaction(storeName, "readwrite")
    const store = transaction.objectStore(storeName)

    // 既存のデータをクリア
    await clearStore(store)

    // 新しいデータを保存
    for (const item of data) {
      store.add(item)
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`${storeName}データを保存しました`)
        resolve(true)
      }

      transaction.onerror = (event) => {
        console.error(`${storeName}データの保存に失敗しました:`, event)
        reject(false)
      }
    })
  } catch (error) {
    console.error(`${storeName}データの保存中にエラーが発生しました:`, error)
    return false
  }
}

// 設定を保存（単一オブジェクト）
export async function saveSettings(settings: SystemSettings): Promise<boolean> {
  try {
    const db = await initDB()
    const transaction = db.transaction(STORES.SETTINGS, "readwrite")
    const store = transaction.objectStore(STORES.SETTINGS)

    // 既存の設定をクリア
    await clearStore(store)

    // 設定にIDを追加して保存
    const settingsWithId = { ...settings, id: "system-settings" }
    store.add(settingsWithId)

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log("設定を保存しました")
        resolve(true)
      }

      transaction.onerror = (event) => {
        console.error("設定の保存に失敗しました:", event)
        reject(false)
      }
    })
  } catch (error) {
    console.error("設定の保存中にエラーが発生しました:", error)
    return false
  }
}

// データを取得
export async function getData<T>(storeName: string): Promise<T[]> {
  try {
    const db = await initDB()
    const transaction = db.transaction(storeName, "readonly")
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result as T[])
      }

      request.onerror = (event) => {
        console.error(`${storeName}データの取得に失敗しました:`, event)
        reject([])
      }
    })
  } catch (error) {
    console.error(`${storeName}データの取得中にエラーが発生しました:`, error)
    return []
  }
}

// 設定を取得
export async function getSettings(): Promise<SystemSettings | null> {
  try {
    const db = await initDB()
    const transaction = db.transaction(STORES.SETTINGS, "readonly")
    const store = transaction.objectStore(STORES.SETTINGS)
    const request = store.get("system-settings")

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        if (request.result) {
          // idプロパティを削除
          const { id, ...settings } = request.result
          resolve(settings as SystemSettings)
        } else {
          resolve(null)
        }
      }

      request.onerror = (event) => {
        console.error("設定の取得に失敗しました:", event)
        reject(null)
      }
    })
  } catch (error) {
    console.error("設定の取得中にエラーが発生しました:", error)
    return null
  }
}

// ストアをクリア
async function clearStore(store: IDBObjectStore): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.clear()

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = (event) => {
      console.error("ストアのクリアに失敗しました:", event)
      reject()
    }
  })
}

// 同期ログを記録
export async function logSync(type: string, details: any): Promise<void> {
  try {
    const db = await initDB()
    const transaction = db.transaction(STORES.SYNC_LOG, "readwrite")
    const store = transaction.objectStore(STORES.SYNC_LOG)

    const logEntry = {
      type,
      details,
      timestamp: new Date(),
      deviceId: getDeviceId(),
    }

    store.add(logEntry)
  } catch (error) {
    console.error("同期ログの記録に失敗しました:", error)
  }
}

// デバイスIDを取得または生成
function getDeviceId(): string {
  let deviceId = localStorage.getItem("poker-device-id")
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    localStorage.setItem("poker-device-id", deviceId)
  }
  return deviceId
}

// データをエクスポート
export async function exportAllData(): Promise<any> {
  try {
    const players = await getData<Player>(STORES.PLAYERS)
    const sessions = await getData<GameSession>(STORES.SESSIONS)
    const receipts = await getData<Receipt>(STORES.RECEIPTS)
    const dailySales = await getData<DailySales>(STORES.DAILY_SALES)
    const history = await getData<HistoryEntry>(STORES.HISTORY)
    const settings = await getSettings()

    return {
      exportDate: new Date().toISOString(),
      players,
      sessions,
      receipts,
      dailySales,
      history,
      settings,
    }
  } catch (error) {
    console.error("データのエクスポートに失敗しました:", error)
    return null
  }
}

// データをインポート
export async function importAllData(data: any): Promise<boolean> {
  try {
    if (!data) return false

    // 各データを保存
    if (data.players) await saveData(STORES.PLAYERS, data.players)
    if (data.sessions) await saveData(STORES.SESSIONS, data.sessions)
    if (data.receipts) await saveData(STORES.RECEIPTS, data.receipts)
    if (data.dailySales) await saveData(STORES.DAILY_SALES, data.dailySales)
    if (data.history) await saveData(STORES.HISTORY, data.history)
    if (data.settings) await saveSettings(data.settings)

    // インポートログを記録
    await logSync("import", { importDate: new Date().toISOString(), source: "manual" })

    return true
  } catch (error) {
    console.error("データのインポートに失敗しました:", error)
    return false
  }
}
