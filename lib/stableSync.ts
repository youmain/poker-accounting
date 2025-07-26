// 真の共有同期システム - 参加者名前管理対応版
export interface SyncParticipant {
  id: string
  name: string
  joinedAt: number
  isHost: boolean
}

export interface SyncRoom {
  id: string
  hostId: string
  participants: SyncParticipant[]
  data: {
    players: any[]
    sessions: any[]
    receipts: any[]
    dailySales: any[]
    history: any[]
    settings: any
  }
  lastUpdated: number
  version: number
  createdAt: number
}

export interface SyncMessage {
  type: "join" | "leave" | "data_update" | "heartbeat" | "version_check" | "room_sync" | "participant_update"
  roomId: string
  participantId: string
  participantName?: string
  data?: any
  version?: number
  timestamp: number
  dataType?: string
}

class StableSyncManager {
  private roomId: string | null = null
  private participantId: string
  private participantName = "匿名ユーザー"
  private isHost = false
  private participants: Map<string, SyncParticipant> = new Map()
  private eventListeners: Map<string, Function[]> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private syncInterval: NodeJS.Timeout | null = null
  private currentVersion = 0
  private db: IDBDatabase | null = null
  private isInitialized = false
  private initPromise: Promise<void> | null = null
  private broadcastChannel: BroadcastChannel | null = null
  private roomBroadcastChannel: BroadcastChannel | null = null

  constructor() {
    this.participantId = this.generateId()
    // クライアントサイドでのみ初期化
    if (typeof window !== "undefined") {
      this.initialize()
      console.log("StableSyncManager initialized with participant ID:", this.participantId)
    }
  }

  private async initialize() {
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = this.doInitialize()
    return this.initPromise
  }

  private async doInitialize() {
    try {
      await this.initIndexedDB()
      this.setupGlobalBroadcastChannel()
      this.setupStorageListener()
      this.isInitialized = true
      console.log("StableSyncManager fully initialized")
    } catch (error) {
      console.error("Failed to initialize StableSyncManager:", error)
      this.setupFallbackSync()
    }
  }

  private async initIndexedDB(): Promise<void> {
    if (typeof window === "undefined" || !window.indexedDB) {
      throw new Error("IndexedDB not supported")
    }

    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("StableSyncDB", 3)

      request.onerror = () => {
        console.error("IndexedDB initialization failed:", request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log("IndexedDB initialized successfully")
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        try {
          // ルームデータストア（ルーム単位で管理）
          if (!db.objectStoreNames.contains("rooms")) {
            const roomStore = db.createObjectStore("rooms", { keyPath: "id" })
            roomStore.createIndex("hostId", "hostId", { unique: false })
            roomStore.createIndex("lastUpdated", "lastUpdated", { unique: false })
            roomStore.createIndex("createdAt", "createdAt", { unique: false })
          }

          // ルーム別データストア（各ルームのデータを分離）
          if (!db.objectStoreNames.contains("roomData")) {
            const dataStore = db.createObjectStore("roomData", { keyPath: ["roomId", "dataType"] })
            dataStore.createIndex("roomId", "roomId", { unique: false })
            dataStore.createIndex("dataType", "dataType", { unique: false })
            dataStore.createIndex("version", "version", { unique: false })
            dataStore.createIndex("lastUpdated", "lastUpdated", { unique: false })
          }

          // 同期ログストア
          if (!db.objectStoreNames.contains("syncLog")) {
            const logStore = db.createObjectStore("syncLog", { keyPath: "id", autoIncrement: true })
            logStore.createIndex("timestamp", "timestamp", { unique: false })
            logStore.createIndex("roomId", "roomId", { unique: false })
            logStore.createIndex("participantId", "participantId", { unique: false })
          }
        } catch (error) {
          console.error("Failed to create object stores:", error)
          reject(error)
        }
      }

      request.onblocked = () => {
        console.warn("IndexedDB upgrade blocked")
        reject(new Error("IndexedDB upgrade blocked"))
      }
    })
  }

  private setupGlobalBroadcastChannel() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        // グローバルチャンネル（ルーム発見用）
        this.broadcastChannel = new BroadcastChannel("stable-sync-global")

        this.broadcastChannel.onmessage = (event) => {
          try {
            const message: SyncMessage = event.data
            console.log("Global broadcast message received:", message)
            this.handleGlobalBroadcastMessage(message)
          } catch (error) {
            console.error("Error handling global broadcast message:", error)
          }
        }

        // BroadcastChannelにはonerrorプロパティがないため、エラーハンドリングを削除
        // エラーはonmessage内でキャッチされる

        console.log("Global BroadcastChannel initialized successfully")
      } catch (error) {
        console.error("Failed to initialize global BroadcastChannel:", error)
        this.broadcastChannel = null
      }
    }
  }

  private setupRoomBroadcastChannel(roomId: string) {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        // 既存のルームチャンネルをクローズ
        if (this.roomBroadcastChannel) {
          this.roomBroadcastChannel.close()
        }

        // ルーム専用チャンネル
        this.roomBroadcastChannel = new BroadcastChannel(`stable-sync-room-${roomId}`)

        this.roomBroadcastChannel.onmessage = (event) => {
          try {
            const message: SyncMessage = event.data
            console.log(`Room ${roomId} broadcast message received:`, message)

            if (message.participantId !== this.participantId) {
              this.handleRoomBroadcastMessage(message)
            }
          } catch (error) {
            console.error("Error handling room broadcast message:", error)
          }
        }

        // BroadcastChannelにはonerrorプロパティがないため、エラーハンドリングを削除
        // エラーはonmessage内でキャッチされる

        console.log(`Room BroadcastChannel initialized for room: ${roomId}`)
      } catch (error) {
        console.error("Failed to initialize room BroadcastChannel:", error)
        this.roomBroadcastChannel = null
      }
    }
  }

  private handleGlobalBroadcastMessage(message: SyncMessage) {
    // グローバルメッセージの処理（ルーム発見など）
    console.log("Processing global message:", message.type)
  }

  private handleRoomBroadcastMessage(message: SyncMessage) {
    switch (message.type) {
      case "data_update":
        if (message.version && message.version > this.currentVersion) {
          console.log(`Newer version detected for ${message.dataType}: ${message.version} > ${this.currentVersion}`)
          this.currentVersion = message.version
          this.loadRoomDataFromDB(message.dataType)
        }
        break
      case "join":
        if (message.participantName) {
          const participant: SyncParticipant = {
            id: message.participantId,
            name: message.participantName,
            joinedAt: message.timestamp,
            isHost: false,
          }
          this.participants.set(message.participantId, participant)
          this.emit("participants_update", Array.from(this.participants.values()))
          console.log(`Participant joined: ${message.participantName} (${message.participantId})`)
        }
        break
      case "leave":
        this.participants.delete(message.participantId)
        this.emit("participants_update", Array.from(this.participants.values()))
        console.log(`Participant left: ${message.participantId}`)
        break
      case "participant_update":
        // 参加者情報の更新
        this.loadParticipantsFromDB()
        break
      case "room_sync":
        // 全データの同期要求
        this.loadAllRoomDataFromDB()
        break
    }
  }

  private setupFallbackSync() {
    console.log("Setting up fallback sync mechanism")
    this.setupStorageListener()
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  private setupStorageListener() {
    if (typeof window !== "undefined") {
      this.checkExistingRoom()

      // 定期的な同期チェック
      this.syncInterval = setInterval(() => {
        this.checkForUpdates()
      }, 3000) // 3秒ごと
    }
  }

  private async checkExistingRoom() {
    try {
      await this.initialize()

      if (!this.db) {
        console.warn("Database not available for existing room check")
        return
      }

      const transaction = this.db.transaction(["rooms"], "readonly")
      const store = transaction.objectStore("rooms")
      const request = store.getAll()

      request.onsuccess = () => {
        try {
          const rooms = request.result as SyncRoom[]
          const myRoom = rooms.find((room) => room.participants.some((p) => p.id === this.participantId))

          if (myRoom) {
            console.log("Existing room found:", myRoom)
            this.rejoinRoom(myRoom)
          }
        } catch (error) {
          console.error("Error processing existing rooms:", error)
        }
      }

      request.onerror = () => {
        console.error("Failed to check existing rooms:", request.error)
      }
    } catch (error) {
      console.error("Failed to check existing room:", error)
    }
  }

  private async rejoinRoom(room: SyncRoom) {
    this.roomId = room.id
    this.isHost = room.hostId === this.participantId
    this.participants = new Map(room.participants.map((p) => [p.id, p]))
    this.currentVersion = room.version

    // 自分の参加者情報を取得
    const myParticipant = room.participants.find((p) => p.id === this.participantId)
    if (myParticipant) {
      this.participantName = myParticipant.name
    }

    // ルーム専用BroadcastChannelを設定
    this.setupRoomBroadcastChannel(room.id)

    // 全データを読み込み
    await this.loadAllRoomDataFromDB()

    this.emit("participants_update", Array.from(this.participants.values()))
    console.log("Rejoined existing room:", this.roomId)
  }

  private async checkForUpdates() {
    if (!this.roomId || !this.db) return

    try {
      const room = await this.getRoomFromDB(this.roomId)
      if (room && room.version > this.currentVersion) {
        console.log("Room metadata updated externally, syncing...")
        this.currentVersion = room.version
        this.participants = new Map(room.participants.map((p) => [p.id, p]))
        await this.loadAllRoomDataFromDB()
        this.emit("participants_update", Array.from(this.participants.values()))
      }
    } catch (error) {
      console.error("Failed to check for updates:", error)
    }
  }

  private async getRoomFromDB(roomId: string): Promise<SyncRoom | null> {
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(["rooms"], "readonly")
        const store = transaction.objectStore("rooms")
        const request = store.get(roomId)

        request.onsuccess = () => {
          resolve(request.result || null)
        }

        request.onerror = () => {
          reject(request.error)
        }

        transaction.onerror = () => {
          reject(transaction.error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private async saveRoomToDB(room: SyncRoom): Promise<void> {
    if (!this.db) {
      throw new Error("Database not available")
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(["rooms"], "readwrite")
        const store = transaction.objectStore("rooms")
        const request = store.put(room)

        request.onsuccess = () => {
          console.log("Room metadata saved to IndexedDB:", room.id, "version:", room.version)
          resolve()
        }

        request.onerror = () => {
          reject(request.error)
        }

        transaction.onerror = () => {
          reject(transaction.error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private async saveRoomDataToDB(roomId: string, dataType: string, data: any, version: number): Promise<void> {
    if (!this.db) {
      throw new Error("Database not available")
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(["roomData"], "readwrite")
        const store = transaction.objectStore("roomData")

        const roomData = {
          roomId: roomId,
          dataType: dataType,
          data: data,
          version: version,
          lastUpdated: Date.now(),
          participantId: this.participantId,
        }

        const request = store.put(roomData)

        request.onsuccess = () => {
          console.log(`Room data saved: ${roomId}/${dataType} version ${version}`)
          resolve()
        }

        request.onerror = () => {
          reject(request.error)
        }

        transaction.onerror = () => {
          reject(transaction.error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private async getRoomDataFromDB(roomId: string, dataType: string): Promise<any> {
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(["roomData"], "readonly")
        const store = transaction.objectStore("roomData")
        const request = store.get([roomId, dataType])

        request.onsuccess = () => {
          const result = request.result
          resolve(result ? result.data : null)
        }

        request.onerror = () => {
          reject(request.error)
        }

        transaction.onerror = () => {
          reject(transaction.error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private async getAllRoomDataFromDB(roomId: string): Promise<any> {
    if (!this.db) return {}

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(["roomData"], "readonly")
        const store = transaction.objectStore("roomData")
        const index = store.index("roomId")
        const request = index.getAll(roomId)

        request.onsuccess = () => {
          const results = request.result
          const data: any = {
            players: [],
            sessions: [],
            receipts: [],
            dailySales: [],
            history: [],
            settings: {},
          }

          results.forEach((item) => {
            if (item.dataType && item.data !== undefined) {
              data[item.dataType] = item.data
            }
          })

          resolve(data)
        }

        request.onerror = () => {
          reject(request.error)
        }

        transaction.onerror = () => {
          reject(transaction.error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private async loadRoomDataFromDB(dataType?: string) {
    if (!this.roomId) return

    try {
      if (dataType) {
        // 特定のデータタイプのみ読み込み
        const data = await this.getRoomDataFromDB(this.roomId, dataType)
        if (data !== null) {
          this.emit("data_update", { [dataType]: data })
        }
      } else {
        // 全データを読み込み
        await this.loadAllRoomDataFromDB()
      }
    } catch (error) {
      console.error("Failed to load room data from DB:", error)
    }
  }

  private async loadAllRoomDataFromDB() {
    if (!this.roomId) return

    try {
      const allData = await this.getAllRoomDataFromDB(this.roomId)
      this.emit("data_update", allData)
      console.log(`All room data loaded for room ${this.roomId}:`, Object.keys(allData))
    } catch (error) {
      console.error("Failed to load all room data from DB:", error)
    }
  }

  private async loadParticipantsFromDB() {
    if (!this.roomId) return

    try {
      const room = await this.getRoomFromDB(this.roomId)
      if (room) {
        this.participants = new Map(room.participants.map((p) => [p.id, p]))
        this.emit("participants_update", Array.from(this.participants.values()))
      }
    } catch (error) {
      console.error("Failed to load participants from DB:", error)
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event) || []
    console.log(`Emitting event: ${event}, listeners: ${listeners.length}`)
    listeners.forEach((listener) => {
      try {
        listener(data)
      } catch (error) {
        console.error("Error in event listener:", error)
      }
    })
  }

  private broadcastToRoom(message: Omit<SyncMessage, "timestamp">) {
    if (this.roomBroadcastChannel && this.roomId) {
      try {
        this.roomBroadcastChannel.postMessage({
          ...message,
          timestamp: Date.now(),
        })
        console.log(`Broadcast to room ${this.roomId}:`, message.type)
      } catch (error) {
        console.error("Failed to broadcast to room:", error)
      }
    }
  }

  private logSyncOperation(operation: string, details: any) {
    if (!this.db || !this.roomId) return

    try {
      const transaction = this.db.transaction(["syncLog"], "readwrite")
      const store = transaction.objectStore("syncLog")

      const logEntry = {
        timestamp: Date.now(),
        roomId: this.roomId,
        participantId: this.participantId,
        operation: operation,
        details: details,
      }

      store.add(logEntry)
    } catch (error) {
      console.error("Failed to log sync operation:", error)
    }
  }

  public on(event: string, listener: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(listener)
    console.log(`Event listener added for: ${event}`)
  }

  public off(event: string, listener: Function) {
    const listeners = this.eventListeners.get(event) || []
    const index = listeners.indexOf(listener)
    if (index > -1) {
      listeners.splice(index, 1)
      console.log(`Event listener removed for: ${event}`)
    }
  }

  public async startHost(hostName = "ホスト"): Promise<string> {
    await this.initialize()

    this.roomId = this.generateId()
    this.isHost = true
    this.participantName = hostName
    this.participants.clear()

    const hostParticipant: SyncParticipant = {
      id: this.participantId,
      name: hostName,
      joinedAt: Date.now(),
      isHost: true,
    }
    this.participants.set(this.participantId, hostParticipant)
    this.currentVersion = 1

    const room: SyncRoom = {
      id: this.roomId,
      hostId: this.participantId,
      participants: Array.from(this.participants.values()),
      data: {
        players: [],
        sessions: [],
        receipts: [],
        dailySales: [],
        history: [],
        settings: {},
      },
      lastUpdated: Date.now(),
      version: this.currentVersion,
      createdAt: Date.now(),
    }

    try {
      await this.saveRoomToDB(room)

      // 初期データを保存
      const dataTypes = ["players", "sessions", "receipts", "dailySales", "history", "settings"] as const
      for (const dataType of dataTypes) {
        await this.saveRoomDataToDB(this.roomId, dataType, room.data[dataType], this.currentVersion)
      }

      // ルーム専用BroadcastChannelを設定
      this.setupRoomBroadcastChannel(this.roomId)

      this.startHeartbeat()
      this.logSyncOperation("host_start", { roomId: this.roomId, hostName })

      console.log("Host started with room ID:", this.roomId, "Host name:", hostName)
      return this.roomId
    } catch (error) {
      console.error("Failed to start host:", error)
      this.roomId = null
      this.isHost = false
      this.participants.clear()
      this.currentVersion = 0
      throw error
    }
  }

  public async joinRoom(roomId: string, participantName = "匿名ユーザー"): Promise<boolean> {
    await this.initialize()

    try {
      const room = await this.getRoomFromDB(roomId)
      if (!room) {
        console.log("Room not found:", roomId)
        return false
      }

      this.roomId = roomId
      this.isHost = false
      this.participantName = participantName
      this.participants = new Map(room.participants.map((p) => [p.id, p]))
      this.currentVersion = room.version

      // 自分を参加者に追加
      const newParticipant: SyncParticipant = {
        id: this.participantId,
        name: participantName,
        joinedAt: Date.now(),
        isHost: false,
      }

      if (!this.participants.has(this.participantId)) {
        this.participants.set(this.participantId, newParticipant)
      }

      const updatedRoom: SyncRoom = {
        ...room,
        participants: Array.from(this.participants.values()),
        lastUpdated: Date.now(),
        version: room.version + 1,
      }

      this.currentVersion = updatedRoom.version
      await this.saveRoomToDB(updatedRoom)

      // ルーム専用BroadcastChannelを設定
      this.setupRoomBroadcastChannel(roomId)

      this.startHeartbeat()

      // 他の参加者に通知
      this.broadcastToRoom({
        type: "join",
        roomId: this.roomId,
        participantId: this.participantId,
        participantName: participantName,
      })

      // 全データを読み込み
      await this.loadAllRoomDataFromDB()
      this.emit("participants_update", Array.from(this.participants.values()))

      this.logSyncOperation("room_join", {
        roomId: roomId,
        participantName,
        participantCount: this.participants.size,
      })
      console.log(
        "Successfully joined room:",
        roomId,
        "as:",
        participantName,
        "participants:",
        Array.from(this.participants.values()),
      )

      return true
    } catch (error) {
      console.error("Failed to join room:", error)
      return false
    }
  }

  public async leaveRoom() {
    if (!this.roomId) return

    try {
      const room = await this.getRoomFromDB(this.roomId)
      if (room) {
        this.participants.delete(this.participantId)

        // 他の参加者に通知
        this.broadcastToRoom({
          type: "leave",
          roomId: this.roomId,
          participantId: this.participantId,
        })

        if (this.participants.size === 0) {
          // 最後の参加者が退出した場合、ルームを削除
          if (this.db) {
            const transaction = this.db.transaction(["rooms", "roomData"], "readwrite")
            const roomStore = transaction.objectStore("rooms")
            const dataStore = transaction.objectStore("roomData")

            roomStore.delete(this.roomId)

            // ルームデータも削除
            const index = dataStore.index("roomId")
            const request = index.openCursor(this.roomId)
            request.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest).result
              if (cursor) {
                cursor.delete()
                cursor.continue()
              }
            }
          }
          console.log("Room deleted - no participants left")
        } else {
          const updatedRoom: SyncRoom = {
            ...room,
            participants: Array.from(this.participants.values()),
            lastUpdated: Date.now(),
            version: room.version + 1,
          }
          await this.saveRoomToDB(updatedRoom)
          console.log("Left room, remaining participants:", Array.from(this.participants.values()))
        }
      }

      this.logSyncOperation("room_leave", { roomId: this.roomId, participantName: this.participantName })
    } catch (error) {
      console.error("Failed to leave room:", error)
    }

    this.stopHeartbeat()

    // ルーム専用BroadcastChannelをクローズ
    if (this.roomBroadcastChannel) {
      this.roomBroadcastChannel.close()
      this.roomBroadcastChannel = null
    }

    this.roomId = null
    this.isHost = false
    this.participantName = "匿名ユーザー"
    this.participants.clear()
    this.currentVersion = 0
    console.log("Left room successfully")
  }

  public async updateData(dataType: string, data: any): Promise<boolean> {
    if (!this.roomId || !this.db) {
      console.log("Cannot update data - not connected to room or DB not ready")
      return false
    }

    try {
      // データバージョンを更新
      this.currentVersion += 1

      // ルームデータを保存
      await this.saveRoomDataToDB(this.roomId, dataType, data, this.currentVersion)

      // ルームメタデータも更新
      const room = await this.getRoomFromDB(this.roomId)
      if (room) {
        const updatedRoom: SyncRoom = {
          ...room,
          data: {
            ...room.data,
            [dataType]: data,
          },
          lastUpdated: Date.now(),
          version: this.currentVersion,
        }
        await this.saveRoomToDB(updatedRoom)
      }

      // 他の参加者に更新を通知
      this.broadcastToRoom({
        type: "data_update",
        roomId: this.roomId,
        participantId: this.participantId,
        version: this.currentVersion,
        dataType: dataType,
        data: data,
      })

      this.logSyncOperation("data_update", {
        dataType,
        version: this.currentVersion,
        dataSize: JSON.stringify(data).length,
      })
      console.log(`Data updated for ${dataType}, new version:`, this.currentVersion)
      return true
    } catch (error) {
      console.error("Failed to update data:", error)
      return false
    }
  }

  public async getData(): Promise<any> {
    if (!this.roomId) return null

    try {
      const allData = await this.getAllRoomDataFromDB(this.roomId)
      return allData
    } catch (error) {
      console.error("Failed to get data:", error)
      return null
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      if (this.roomId && this.db) {
        try {
          const room = await this.getRoomFromDB(this.roomId)
          if (room) {
            const updatedRoom: SyncRoom = {
              ...room,
              lastUpdated: Date.now(),
            }
            await this.saveRoomToDB(updatedRoom)
          }
        } catch (error) {
          console.error("Heartbeat failed:", error)
        }
      }
    }, 10000) // 10秒ごとにハートビート
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  public getRoomId(): string | null {
    return this.roomId
  }

  public getParticipants(): SyncParticipant[] {
    return Array.from(this.participants.values())
  }

  public getParticipantNames(): string[] {
    return Array.from(this.participants.values()).map((p) => p.name)
  }

  public isConnected(): boolean {
    return this.roomId !== null && this.isInitialized
  }

  public isHosting(): boolean {
    return this.isHost
  }

  public getCurrentVersion(): number {
    return this.currentVersion
  }

  public getParticipantName(): string {
    return this.participantName
  }

  public async cleanup() {
    try {
      await this.leaveRoom()
      this.stopHeartbeat()

      if (this.broadcastChannel) {
        this.broadcastChannel.close()
        this.broadcastChannel = null
      }

      if (this.roomBroadcastChannel) {
        this.roomBroadcastChannel.close()
        this.roomBroadcastChannel = null
      }

      if (this.db) {
        this.db.close()
        this.db = null
      }

      this.eventListeners.clear()
      this.isInitialized = false
      this.initPromise = null

      console.log("StableSyncManager cleanup completed")
    } catch (error) {
      console.error("Error during cleanup:", error)
    }
  }

  // デバッグ用メソッド
  public async getDebugInfo(): Promise<any> {
    if (!this.roomId || !this.db) return null

    try {
      const room = await this.getRoomFromDB(this.roomId)
      const allData = await this.getAllRoomDataFromDB(this.roomId)

      return {
        roomId: this.roomId,
        participantId: this.participantId,
        participantName: this.participantName,
        isHost: this.isHost,
        participants: Array.from(this.participants.values()),
        currentVersion: this.currentVersion,
        isConnected: this.isConnected(),
        roomMetadata: room,
        dataKeys: Object.keys(allData),
        lastUpdated: room?.lastUpdated ? new Date(room.lastUpdated).toLocaleString() : null,
      }
    } catch (error) {
      console.error("Failed to get debug info:", error)
      return null
    }
  }
}

// クライアントサイドでのみStableSyncManagerを初期化
let stableSyncManager: StableSyncManager | null = null

if (typeof window !== "undefined") {
  stableSyncManager = new StableSyncManager()
  
  // ページ終了時のクリーンアップ
  window.addEventListener("beforeunload", () => {
    stableSyncManager?.cleanup()
  })
}

export { stableSyncManager }
