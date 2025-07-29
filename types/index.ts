export interface StackTransaction {
  id: string
  date: string
  time: string
  type: "buy-in" | "cash-out" | "adjustment"
  amount: number
  balance: number
  note: string
  sessionId?: string
  receiptInfo?: {
    startStack: number
    buyIn: number
    stackPurchase: number
    stackAdditions: Array<{
      amount: number
      time?: string
    }>
    finalChips: number
  }
}

export interface Player {
  id: string
  name: string
  currentChips: number
  totalBuyIn: number
  totalCashOut: number
  totalProfit: number
  gameCount: number
  status: "active" | "inactive"
  dailyHistory: DailyHistory[]
  stackHistory: StackTransaction[]
  initialAmount?: number
  lastGameDetails?: {
    date: string
    startStack: number
    buyIn: number
    stackAdditions: Array<{
      name: string
      amount: number
      stackDetails?: any
      time: string
    }>
    finalChips: number
    dailyChange: number
  }
}

export interface GameSession {
  id: string
  playerId: string
  playerName: string
  buyIn?: number
  startTime: Date
  endTime?: Date
  status: "playing" | "completed"
  finalChips?: number
}

export interface ReceiptItem {
  name: string
  amount: number
  quantity?: number
  type: "positive" | "negative" | "neutral"
  stackDetails?: {
    requestedAmount: number
    currentSystemBalance: number
    actualCost: number
    newSystemBalance: number
    timestamp: string
  }
}

export interface Receipt {
  id: string
  playerId: string
  playerName: string
  date: string
  items: ReceiptItem[]
  total: number
  status: "pending" | "completed"
}

export interface DailyHistory {
  date: string
  profit: number
  buyIn: number
  cashOut: number
}

export interface Stats {
  expectedRake: number
  cashRevenue: number
  currentPlayers: number
}

export interface SystemSettings {
  confirmedRake: number
  rakeConfirmed: boolean
  ownerMode: boolean
  currentBusinessDate: string
}

export interface DailySales {
  id: string
  date: string
  confirmedRake: number
  cashRevenue: number
  totalRevenue: number
  completedReceipts: number
  pendingReceipts: number
  rakeConfirmed: boolean
}

export interface HistoryEntry {
  id: string
  timestamp: Date
  type: string
  description: string
  details: any
}

// 全同期方式で共通利用するデータ型
export interface ServerData {
  players: Player[]
  sessions: GameSession[]
  receipts: Receipt[]
  dailySales: DailySales[]
  history: HistoryEntry[]
  settings: SystemSettings
}

// 同期フックの共通返り値インターフェース
export interface BaseSyncResult {
  isConnected: boolean
  isLoading: boolean
  serverData: ServerData | null
  saveToServer: (type: keyof ServerData, data: any) => Promise<boolean>
  refreshData: () => Promise<boolean>
}

// 各同期方式固有の拡張型
export interface HybridSyncResult extends BaseSyncResult {
  isSyncing: boolean
  lastSyncTime: Date | null
  pendingChanges: number
  syncNow: () => Promise<boolean>
}

export interface PeerSyncResult extends BaseSyncResult {
  isHost: boolean
  peerId: string
  connectedDevices: number
  startAsHost: () => Promise<string | null>
  connectAsClient: (hostId: string) => Promise<boolean>
  disconnect: () => void
}

export interface ServerSyncResult extends BaseSyncResult {
  isHost: boolean
  connectedDevices: ConnectedDevice[]
  startAsHost: () => Promise<boolean>
  connectAsClient: () => Promise<boolean>
  updateConnectedDevices: () => Promise<void>
}

export interface StableSyncResult extends BaseSyncResult {
  connectedDevices: SyncParticipant[]
  syncVersion: number
  lastError: string | null
  roomId: string | null
  isHost: boolean
  debugInfo: any
  startHost: (roomId: string) => Promise<boolean>
  joinRoom: (roomId: string, participantName?: string) => Promise<boolean>
  leaveRoom: () => Promise<void>
  updateConnectedDevices: (devices: SyncParticipant[]) => void
  checkDataIntegrity: () => Promise<boolean>
  clearError: () => void
  updateDebugInfo: () => Promise<void>
}

export interface NetworkSyncResult extends BaseSyncResult {
  isHost: boolean
  connectedDevices: NetworkDevice[]
  networkUrl: string
  fetchServerData: () => Promise<ServerData | null>
  startAsHost: () => Promise<boolean>
  connectAsClient: () => Promise<boolean>
}

export interface FirebaseSyncResult extends BaseSyncResult {
  sessionId: string | null
  connectedDevices: number
  isHost: boolean
  connectedUsers: any[]
  lastSyncTime: Date | null
  firebaseConnected: boolean
  firebaseIsHost: boolean
  syncVersion?: number
  syncProgress?: {
    isSyncing: boolean
    currentStep: string
    totalSteps: number
    currentStepIndex: number
  } | null
  createNewSession: (hostName?: string) => Promise<string | null>
  joinSession: (sessionId: string) => Promise<boolean>
  leaveSession: () => Promise<void>
  disconnectUser: (targetUid: string) => Promise<boolean>
}

export interface WebSocketSyncResult extends BaseSyncResult {
  isHost: boolean
  hostUrl: string
  connectedDevices: number
  startAsHost: () => Promise<boolean>
  connectAsClient: (hostId: string) => Promise<boolean>
  disconnect: () => void
}

// 接続デバイス関連の型
export interface ConnectedDevice {
  id: string
  name: string
  type: "host" | "client"
  lastSeen: number
  userAgent: string
}

export interface NetworkDevice {
  id: string
  name: string
  url: string
  lastSeen: number
}

export interface SyncParticipant {
  id: string
  name: string
  isHost: boolean
  joinedAt: number
  lastSeen: number
  version: number
}
