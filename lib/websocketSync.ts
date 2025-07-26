// WebSocketを使用したデータ同期ライブラリ
class WebSocketSyncManager {
  private socket: WebSocket | null = null
  private deviceId: string
  private isHost = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeout: NodeJS.Timeout | null = null
  private listeners: Record<string, Function[]> = {}
  private connectedClients: string[] = []
  private hostUrl = ""

  constructor() {
    this.deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    this.setupBeforeUnloadHandler()
  }

  // ホストとして開始
  async startAsHost(): Promise<boolean> {
    try {
      // WebSocketサーバーに接続
      const wsUrl = `wss://websocket-server.example.com/host?deviceId=${this.deviceId}`
      this.socket = new WebSocket(wsUrl)

      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error("WebSocketの初期化に失敗しました"))
          return
        }

        this.socket.onopen = () => {
          console.log("WebSocketサーバーに接続しました (ホスト)")
          this.isHost = true
          this.setupSocketListeners()

          // ホスト登録メッセージを送信
          this.sendMessage({
            type: "HOST_REGISTER",
            deviceId: this.deviceId,
            timestamp: Date.now(),
          })

          resolve(true)
        }

        this.socket.onerror = (error) => {
          console.error("WebSocket接続エラー:", error)
          reject(error)
        }
      })
    } catch (error) {
      console.error("ホスト開始エラー:", error)
      return false
    }
  }

  // クライアントとして接続
  async connectAsClient(hostId: string): Promise<boolean> {
    try {
      // WebSocketサーバーに接続
      const wsUrl = `wss://websocket-server.example.com/client?deviceId=${this.deviceId}&hostId=${hostId}`
      this.socket = new WebSocket(wsUrl)
      this.hostUrl = hostId

      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error("WebSocketの初期化に失敗しました"))
          return
        }

        this.socket.onopen = () => {
          console.log("WebSocketサーバーに接続しました (クライアント)")
          this.isHost = false
          this.setupSocketListeners()

          // クライアント登録メッセージを送信
          this.sendMessage({
            type: "CLIENT_REGISTER",
            deviceId: this.deviceId,
            hostId: hostId,
            timestamp: Date.now(),
          })

          resolve(true)
        }

        this.socket.onerror = (error) => {
          console.error("WebSocket接続エラー:", error)
          reject(error)
        }
      })
    } catch (error) {
      console.error("クライアント接続エラー:", error)
      return false
    }
  }

  // WebSocketリスナーを設定
  private setupSocketListeners() {
    if (!this.socket) return

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        this.handleMessage(message)
      } catch (error) {
        console.error("メッセージ解析エラー:", error)
      }
    }

    this.socket.onclose = (event) => {
      console.log("WebSocket接続が閉じられました:", event.code, event.reason)
      this.handleDisconnect()
    }

    this.socket.onerror = (error) => {
      console.error("WebSocketエラー:", error)
    }
  }

  // メッセージ処理
  private handleMessage(message: any) {
    console.log("メッセージ受信:", message.type)

    switch (message.type) {
      case "HOST_REGISTERED":
        this.hostUrl = message.hostUrl
        this.emit("host_registered", { hostUrl: message.hostUrl })
        break

      case "CLIENT_CONNECTED":
        if (this.isHost) {
          this.connectedClients.push(message.clientId)
          this.emit("client_connected", {
            clientId: message.clientId,
            deviceName: message.deviceName,
          })

          // 初期データを送信
          this.sendInitialData(message.clientId)
        }
        break

      case "CLIENT_DISCONNECTED":
        if (this.isHost) {
          this.connectedClients = this.connectedClients.filter((id) => id !== message.clientId)
          this.emit("client_disconnected", { clientId: message.clientId })
        }
        break

      case "INITIAL_DATA_REQUEST":
        if (this.isHost) {
          this.sendInitialData(message.clientId)
        }
        break

      case "INITIAL_DATA":
        if (!this.isHost) {
          this.emit("initial_data", message.data)
        }
        break

      case "DATA_UPDATE":
        this.emit("data_update", {
          type: message.dataType,
          data: message.data,
          senderId: message.senderId,
        })
        break

      case "PING":
        this.sendMessage({
          type: "PONG",
          deviceId: this.deviceId,
          timestamp: Date.now(),
        })
        break
    }
  }

  // 初期データを送信
  private sendInitialData(clientId: string) {
    if (!this.isHost) return

    // ローカルストレージからデータを取得
    const data = {
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

    this.sendMessage({
      type: "INITIAL_DATA",
      data,
      clientId,
      senderId: this.deviceId,
      timestamp: Date.now(),
    })
  }

  // データを更新
  async updateData(dataType: string, data: any): Promise<boolean> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false
    }

    this.sendMessage({
      type: "DATA_UPDATE",
      dataType,
      data,
      senderId: this.deviceId,
      timestamp: Date.now(),
    })

    return true
  }

  // メッセージを送信
  private sendMessage(message: any): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false
    }

    try {
      this.socket.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error("メッセージ送信エラー:", error)
      return false
    }
  }

  // 切断処理
  private handleDisconnect() {
    // 再接続を試みる
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++

      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
      console.log(`${delay}ms後に再接続を試みます (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

      this.reconnectTimeout = setTimeout(() => {
        if (this.isHost) {
          this.startAsHost().catch(console.error)
        } else if (this.hostUrl) {
          this.connectAsClient(this.hostUrl).catch(console.error)
        }
      }, delay)
    } else {
      console.log("最大再接続試行回数に達しました")
      this.emit("disconnected", { permanent: true })
    }
  }

  // 接続を閉じる
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.socket) {
      // 切断メッセージを送信
      this.sendMessage({
        type: this.isHost ? "HOST_DISCONNECT" : "CLIENT_DISCONNECT",
        deviceId: this.deviceId,
        timestamp: Date.now(),
      })

      // ソケットを閉じる
      this.socket.close()
      this.socket = null
    }

    this.isHost = false
    this.reconnectAttempts = 0
    this.connectedClients = []
  }

  // ページ離脱時の処理
  private setupBeforeUnloadHandler() {
    window.addEventListener("beforeunload", () => {
      this.disconnect()
    })
  }

  // イベントリスナーを登録
  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
  }

  // イベントを発火
  private emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => {
        callback(data)
      })
    }
  }

  // 接続状態を取得
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN
  }

  // ホスト状態を取得
  isHostMode(): boolean {
    return this.isHost
  }

  // 接続デバイス数を取得
  getConnectedDeviceCount(): number {
    return this.connectedClients.length
  }

  // ホストURLを取得
  getHostUrl(): string {
    return this.hostUrl
  }
}

export const websocketSync = new WebSocketSyncManager()
