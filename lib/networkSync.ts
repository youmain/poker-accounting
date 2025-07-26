"use client"

interface NetworkDevice {
  id: string
  name: string
  type: "host" | "client"
  lastSeen: number
  userAgent: string
  url: string // 必須に
  ipAddress?: string
}

interface NetworkData {
  players: any[]
  sessions: any[]
  receipts: any[]
  dailySales: any[]
  history: any[]
  settings: any
}

class NetworkSyncManager {
  private deviceId: string
  private isHost = false
  private connectedDevices: NetworkDevice[] = []
  private eventSource: EventSource | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor() {
    this.deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // ホストモードで開始（親機）
  async startAsHost(): Promise<boolean> {
    try {
      this.isHost = true

      // ホスト情報をローカルストレージに保存
      const hostInfo = {
        deviceId: this.deviceId,
        startTime: Date.now(),
        ipAddress: await this.getLocalIP(),
        port: 3001, // 仮想ポート
      }

      localStorage.setItem("poker-host-info", JSON.stringify(hostInfo))

      // ホストとしてデバイス登録
      this.registerDevice("host")

      // 定期的にホスト情報を更新
      this.heartbeatInterval = setInterval(() => {
        this.updateHostHeartbeat()
      }, 5000)

      console.log("ホストモードで開始:", hostInfo)
      return true
    } catch (error) {
      console.error("ホスト開始エラー:", error)
      return false
    }
  }

  // クライアントモードで接続（子機）
  async connectAsClient(hostUrl?: string): Promise<boolean> {
    try {
      this.isHost = false

      // ホスト情報を検索
      const hostInfo = this.findHost()
      if (!hostInfo && !hostUrl) {
        throw new Error("ホストが見つかりません")
      }

      // クライアントとしてデバイス登録
      this.registerDevice("client")

      // ホストからのデータ同期を開始
      this.startDataSync()

      console.log("クライアントモードで接続")
      return true
    } catch (error) {
      console.error("クライアント接続エラー:", error)
      return false
    }
  }

  // デバイス登録
  private registerDevice(type: "host" | "client") {
    const device: NetworkDevice = {
      id: this.deviceId,
      name: this.generateDeviceName(),
      type,
      lastSeen: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.origin, // ここで必ずセット
    }

    // 既存のデバイス一覧を取得
    const devices = this.getConnectedDevices()
    const existingIndex = devices.findIndex((d) => d.id === this.deviceId)

    if (existingIndex >= 0) {
      devices[existingIndex] = device
    } else {
      devices.push(device)
    }

    this.connectedDevices = devices
    this.saveConnectedDevices(devices)

    // 他のデバイスに通知
    this.broadcastDeviceUpdate()
  }

  // ホスト検索
  private findHost(): any | null {
    try {
      const hostInfo = localStorage.getItem("poker-host-info")
      if (!hostInfo) return null

      const host = JSON.parse(hostInfo)
      const now = Date.now()

      // 30秒以内にハートビートがあるかチェック
      if (now - host.lastHeartbeat < 30000) {
        return host
      }

      return null
    } catch {
      return null
    }
  }

  // ローカルIP取得（簡易版）
  private async getLocalIP(): Promise<string> {
    return new Promise((resolve) => {
      // WebRTCを使用してローカルIPを取得
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      })

      pc.createDataChannel("")
      pc.createOffer().then((offer) => pc.setLocalDescription(offer))

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate
          const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/)
          if (ipMatch) {
            resolve(ipMatch[1])
            pc.close()
          }
        }
      }

      // フォールバック
      setTimeout(() => {
        resolve("192.168.1.100") // デフォルトIP
        pc.close()
      }, 3000)
    })
  }

  // デバイス名生成
  private generateDeviceName(): string {
    const userAgent = navigator.userAgent
    let deviceType = "パソコン"

    if (userAgent.includes("Mobile") || userAgent.includes("Android") || userAgent.includes("iPhone")) {
      deviceType = "スマートフォン"
    } else if (userAgent.includes("Tablet") || userAgent.includes("iPad")) {
      deviceType = "タブレット"
    }

    const time = new Date().toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    })

    return `${deviceType} - ${time}`
  }

  // ホストハートビート更新
  private updateHostHeartbeat() {
    if (!this.isHost) return

    try {
      const hostInfo = JSON.parse(localStorage.getItem("poker-host-info") || "{}")
      hostInfo.lastHeartbeat = Date.now()
      localStorage.setItem("poker-host-info", JSON.stringify(hostInfo))

      // 接続デバイスをクリーンアップ
      this.cleanupInactiveDevices()
    } catch (error) {
      console.error("ハートビート更新エラー:", error)
    }
  }

  // 非アクティブデバイスのクリーンアップ
  private cleanupInactiveDevices() {
    const now = Date.now()
    const activeDevices = this.connectedDevices.filter(
      (device) => now - device.lastSeen < 60000, // 1分以内
    )

    if (activeDevices.length !== this.connectedDevices.length) {
      this.connectedDevices = activeDevices
      this.saveConnectedDevices(activeDevices)
      this.broadcastDeviceUpdate()
    }
  }

  // データ同期開始
  private startDataSync() {
    // ストレージ変更を監視
    window.addEventListener("storage", (event) => {
      if (event.key?.startsWith("poker-")) {
        this.handleDataChange(event.key, event.newValue)
      }
    })

    // カスタムイベントを監視
    window.addEventListener("network-data-sync", (event: any) => {
      this.handleNetworkSync(event.detail)
    })
  }

  // データ変更処理
  private handleDataChange(key: string, newValue: string | null) {
    if (!newValue) return

    try {
      const data = JSON.parse(newValue)
      console.log("ネットワークデータ同期:", key, data)

      // 他のデバイスに変更を通知
      this.broadcastDataChange(key, data)
    } catch (error) {
      console.error("データ変更処理エラー:", error)
    }
  }

  // ネットワーク同期処理
  private handleNetworkSync(detail: any) {
    const { type, data, sourceDevice } = detail

    // 自分が送信したデータは無視
    if (sourceDevice === this.deviceId) return

    console.log("他のデバイスからの同期:", type, data)

    // ローカルストレージを更新
    localStorage.setItem(`poker-${type}`, JSON.stringify(data))
  }

  // データ変更をブロードキャスト
  private broadcastDataChange(key: string, data: any) {
    const event = new CustomEvent("network-data-sync", {
      detail: {
        type: key.replace("poker-", ""),
        data,
        sourceDevice: this.deviceId,
        timestamp: Date.now(),
      },
    })

    window.dispatchEvent(event)
  }

  // デバイス更新をブロードキャスト
  private broadcastDeviceUpdate() {
    const event = new CustomEvent("network-device-update", {
      detail: {
        devices: this.connectedDevices,
        sourceDevice: this.deviceId,
        timestamp: Date.now(),
      },
    })

    window.dispatchEvent(event)
  }

  // 接続デバイス一覧取得
  private getConnectedDevices(): NetworkDevice[] {
    try {
      const devices = localStorage.getItem("poker-network-devices")
      return devices ? JSON.parse(devices) : []
    } catch {
      return []
    }
  }

  // 接続デバイス一覧保存
  private saveConnectedDevices(devices: NetworkDevice[]) {
    localStorage.setItem("poker-network-devices", JSON.stringify(devices))
  }

  // 現在の接続デバイス一覧を取得
  getDevices(): NetworkDevice[] {
    // 既存のデバイス一覧を取得
    const devices = this.getConnectedDevices()
    return devices.map((d) => ({
      ...d,
      url: d.url || window.location.origin, // urlがなければwindow.location.originをセット
    }))
  }

  // ホスト状態確認
  isHostMode(): boolean {
    return this.isHost
  }

  // 接続状態確認
  isConnected(): boolean {
    if (this.isHost) {
      return true // ホストは常に接続状態
    } else {
      // クライアントはホストが生きているかチェック
      return this.findHost() !== null
    }
  }

  // 切断
  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    // デバイス一覧から自分を削除
    const devices = this.getConnectedDevices().filter((d) => d.id !== this.deviceId)
    this.saveConnectedDevices(devices)

    if (this.isHost) {
      // ホスト情報を削除
      localStorage.removeItem("poker-host-info")
    }
  }
}

export const networkSync = new NetworkSyncManager()
