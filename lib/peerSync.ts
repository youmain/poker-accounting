import Peer from "peerjs"

interface DataMessage {
  type: string
  dataType?: string
  data?: any
  senderId: string
  timestamp: number
}

class PeerSyncManager {
  private peer: Peer | null = null
  private connections: Record<string, Peer.DataConnection> = {}
  private peerId = ""
  private isHost = false
  private listeners: Record<string, Function[]> = {}
  private deviceName = ""

  constructor() {
    this.deviceName = this.generateDeviceName()
  }

  // ホストとして開始
  async startAsHost(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // ランダムなPeerIDを生成
        const hostId = `host-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

        this.peer = new Peer(hostId, {
          debug: 2,
        })

        this.peer.on("open", (id) => {
          console.log("ホストとして開始:", id)
          this.peerId = id
          this.isHost = true

          // 接続リクエストを処理
          this.peer?.on("connection", (conn) => {
            this.handleConnection(conn)
          })

          resolve(id)
        })

        this.peer.on("error", (err) => {
          console.error("Peer接続エラー:", err)
          reject(err)
        })
      } catch (error) {
        console.error("ホスト開始エラー:", error)
        reject(error)
      }
    })
  }

  // クライアントとして接続
  async connectAsClient(hostId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // ランダムなPeerIDを生成
        const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

        this.peer = new Peer(clientId, {
          debug: 2,
        })

        this.peer.on("open", (id) => {
          console.log("クライアントとして開始:", id)
          this.peerId = id
          this.isHost = false

          // ホストに接続
          const conn = this.peer?.connect(hostId, {
            reliable: true,
            metadata: {
              deviceName: this.deviceName,
              clientId: id,
            },
          })

          if (conn) {
            conn.on("open", () => {
              console.log("ホストに接続しました:", hostId)
              this.connections[hostId] = conn

              // 初期データをリクエスト
              this.sendMessage(conn, {
                type: "REQUEST_INITIAL_DATA",
                senderId: this.peerId,
                timestamp: Date.now(),
              })

              resolve(true)
            })

            conn.on("data", (data) => {
              this.handleMessage(data as DataMessage)
            })

            conn.on("error", (err) => {
              console.error("接続エラー:", err)
              reject(err)
            })

            conn.on("close", () => {
              console.log("ホスト接続が閉じられました")
              delete this.connections[hostId]
              this.emit("disconnected", { hostId })
            })
          } else {
            reject(new Error("接続の作成に失敗しました"))
          }
        })

        this.peer.on("error", (err) => {
          console.error("Peer接続エラー:", err)
          reject(err)
        })
      } catch (error) {
        console.error("クライアント接続エラー:", error)
        reject(error)
      }
    })
  }

  // 接続処理
  private handleConnection(conn: Peer.DataConnection) {
    const clientId = conn.peer
    const metadata = conn.metadata || {}

    console.log("新しいクライアント接続:", clientId, metadata)
    this.connections[clientId] = conn

    conn.on("data", (data) => {
      this.handleMessage(data as DataMessage, conn)
    })

    conn.on("close", () => {
      console.log("クライアント接続が閉じられました:", clientId)
      delete this.connections[clientId]
      this.emit("client_disconnected", { clientId })
    })

    conn.on("error", (err) => {
      console.error("接続エラー:", err, clientId)
    })

    // 接続通知
    this.emit("client_connected", {
      clientId,
      deviceName: metadata.deviceName || "Unknown Device",
    })
  }

  // メッセージ処理
  private handleMessage(message: DataMessage, conn?: Peer.DataConnection) {
    console.log("メッセージ受信:", message.type)

    switch (message.type) {
      case "REQUEST_INITIAL_DATA":
        if (this.isHost && conn) {
          this.sendInitialData(conn)
        }
        break

      case "INITIAL_DATA":
        if (!this.isHost) {
          this.emit("initial_data", message.data)
        }
        break

      case "DATA_UPDATE":
        if (message.dataType && message.data) {
          this.emit("data_update", {
            type: message.dataType,
            data: message.data,
            senderId: message.senderId,
          })
        }
        break

      case "PING":
        if (conn) {
          this.sendMessage(conn, {
            type: "PONG",
            senderId: this.peerId,
            timestamp: Date.now(),
          })
        }
        break
    }
  }

  // 初期データを送信
  private sendInitialData(conn: Peer.DataConnection) {
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

    this.sendMessage(conn, {
      type: "INITIAL_DATA",
      data,
      senderId: this.peerId,
      timestamp: Date.now(),
    })
  }

  // データを更新
  async updateData(dataType: string, data: any): Promise<boolean> {
    if (!this.peer || Object.keys(this.connections).length === 0) {
      return false
    }

    const message: DataMessage = {
      type: "DATA_UPDATE",
      dataType,
      data,
      senderId: this.peerId,
      timestamp: Date.now(),
    }

    // すべての接続に送信
    Object.values(this.connections).forEach((conn) => {
      this.sendMessage(conn, message)
    })

    return true
  }

  // メッセージを送信
  private sendMessage(conn: Peer.DataConnection, message: DataMessage) {
    try {
      conn.send(message)
      return true
    } catch (error) {
      console.error("メッセージ送信エラー:", error)
      return false
    }
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

  // 接続を閉じる
  disconnect() {
    // すべての接続を閉じる
    Object.values(this.connections).forEach((conn) => {
      conn.close()
    })

    // Peerを閉じる
    if (this.peer) {
      this.peer.destroy()
      this.peer = null
    }

    this.connections = {}
    this.isHost = false
  }

  // 接続状態を取得
  isConnected(): boolean {
    return this.peer !== null && Object.keys(this.connections).length > 0
  }

  // ホスト状態を取得
  isHostMode(): boolean {
    return this.isHost
  }

  // 接続デバイス数を取得
  getConnectedDeviceCount(): number {
    return Object.keys(this.connections).length
  }

  // デバイス名を生成
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
}

export const peerSync = new PeerSyncManager()
