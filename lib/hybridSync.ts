import type { ServerData } from "@/types"

// 同期状態
interface SyncState {
  lastSyncTime: number | null
  pendingChanges: {
    type: keyof ServerData
    data: any
    timestamp: number
  }[]
  deviceId: string
  syncVersion: number
}

// ハイブリッド同期マネージャー
class HybridSyncManager {
  private deviceId: string
  private syncState: SyncState
  private syncInterval: NodeJS.Timeout | null = null
  private listeners: Record<string, Function[]> = {}
  private isOnline: boolean = navigator.onLine
  private syncInProgress = false
  private apiUrl = "/api/sync"

  constructor() {
    this.deviceId = this.getOrCreateDeviceId()
    this.syncState = this.loadSyncState()
    this.setupEventListeners()
  }

  // デバイスIDを取得または生成
  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem("poker-device-id")
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      localStorage.setItem("poker-device-id", deviceId)
    }
    return deviceId
  }

  // 同期状態を読み込み
  private loadSyncState(): SyncState {
    try {
      const savedState = localStorage.getItem("poker-sync-state")
      if (savedState) {
        return JSON.parse(savedState)
      }
    } catch (error) {
      console.error("同期状態の読み込みエラー:", error)
    }

    return {
      lastSyncTime: null,
      pendingChanges: [],
      deviceId: this.deviceId,
      syncVersion: 1,
    }
  }

  // 同期状態を保存
  private saveSyncState(): void {
    try {
      localStorage.setItem("poker-sync-state", JSON.stringify(this.syncState))
    } catch (error) {
      console.error("同期状態の保存エラー:", error)
    }
  }

  // イベントリスナーを設定
  private setupEventListeners(): void {
    window.addEventListener("online", this.handleOnlineStatus)
    window.addEventListener("offline", this.handleOnlineStatus)
  }

  // オンライン状態の変更を処理
  private handleOnlineStatus = (): void => {
    const wasOnline = this.isOnline
    this.isOnline = navigator.onLine

    if (!wasOnline && this.isOnline) {
      console.log("オンラインになりました。同期を開始します...")
      this.syncWithServer()
    } else if (wasOnline && !this.isOnline) {
      console.log("オフラインになりました。ローカルモードで動作します。")
      this.emit("connection_status", { online: false })
    }
  }

  // 定期同期を開始
  startPeriodicSync(intervalMs = 30000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncWithServer()
      }
    }, intervalMs)

    // 初回同期を実行
    if (this.isOnline) {
      this.syncWithServer()
    }
  }

  // 定期同期を停止
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  // サーバーと同期
  async syncWithServer(): Promise<boolean> {
    if (!this.isOnline || this.syncInProgress) {
      return false
    }

    this.syncInProgress = true
    this.emit("sync_status", { syncing: true })

    try {
      // 現在のデータを取得
      const currentData = this.getCurrentData()

      // サーバーに送信するデータを準備
      const syncRequest = {
        deviceId: this.deviceId,
        lastSyncTime: this.syncState.lastSyncTime,
        pendingChanges: this.syncState.pendingChanges,
        currentData,
      }

      // サーバーと同期
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(syncRequest),
      })

      if (!response.ok) {
        throw new Error(`サーバー同期エラー: ${response.status}`)
      }

      const syncResponse = await response.json()

      // サーバーからのデータを適用
      if (syncResponse.success) {
        this.applyServerChanges(syncResponse.data)

        // 同期状態を更新
        this.syncState.lastSyncTime = Date.now()
        this.syncState.pendingChanges = []
        this.saveSyncState()

        this.emit("sync_complete", { success: true, timestamp: this.syncState.lastSyncTime })
        return true
      } else {
        throw new Error(syncResponse.error || "サーバー同期に失敗しました")
      }
    } catch (error) {
      console.error("同期エラー:", error)
      this.emit("sync_error", { error })
      return false
    } finally {
      this.syncInProgress = false
      this.emit("sync_status", { syncing: false })
    }
  }

  // 現在のデータを取得
  private getCurrentData(): ServerData {
    return {
      players: JSON.parse(localStorage.getItem("poker-players") || "[]"),
      sessions: JSON.parse(localStorage.getItem("poker-sessions") || "[]"),
      receipts: JSON.parse(localStorage.getItem("poker-receipts") || "[]"),
      dailySales: JSON.parse(localStorage.getItem("poker-daily-sales") || "[]"),
      history: JSON.parse(localStorage.getItem("poker-history") || "[]"),
      settings: JSON.parse(
        localStorage.getItem("poker-settings") ||
          JSON.stringify({
            confirmedRake: 0,
            rakeConfirmed: false,
            ownerMode: true,
            currentBusinessDate: new Date().toISOString().split("T")[0],
          }),
      ),
    }
  }

  // サーバーからの変更を適用
  private applyServerChanges(serverData: ServerData): void {
    // 各データ型を更新
    Object.keys(serverData).forEach((key) => {
      const dataType = key as keyof ServerData
      const data = serverData[dataType]

      if (data) {
        localStorage.setItem(`poker-${dataType}`, JSON.stringify(data))
        this.emit("data_updated", { type: dataType, data })
      }
    })
  }

  // データを保存
  async saveData(type: keyof ServerData, data: any): Promise<boolean> {
    try {
      // ローカルストレージに保存
      localStorage.setItem(`poker-${type}`, JSON.stringify(data))

      // 変更を記録
      this.syncState.pendingChanges.push({
        type,
        data,
        timestamp: Date.now(),
      })

      this.saveSyncState()

      // オンラインの場合は即時同期を試みる
      if (this.isOnline && !this.syncInProgress) {
        setTimeout(() => this.syncWithServer(), 100)
      }

      return true
    } catch (error) {
      console.error(`データ保存エラー (${type}):`, error)
      return false
    }
  }

  // 手動同期を実行
  async forceSyncWithServer(): Promise<boolean> {
    return this.syncWithServer()
  }

  // 接続状態を取得
  isConnected(): boolean {
    return this.isOnline
  }

  // 最終同期時刻を取得
  getLastSyncTime(): Date | null {
    return this.syncState.lastSyncTime ? new Date(this.syncState.lastSyncTime) : null
  }

  // 保留中の変更数を取得
  getPendingChangesCount(): number {
    return this.syncState.pendingChanges.length
  }

  // イベントリスナーを登録
  on(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
  }

  // イベントを発火
  private emit(event: string, data: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => {
        callback(data)
      })
    }
  }

  // クリーンアップ
  cleanup(): void {
    this.stopPeriodicSync()
    window.removeEventListener("online", this.handleOnlineStatus)
    window.removeEventListener("offline", this.handleOnlineStatus)
  }
}

export const hybridSync = new HybridSyncManager()
