"use client"

import type React from "react"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DollarSign,
  Plus,
  QrCode,
  Users,
  Calculator,
  Download,
  CheckCircle,
  Menu,
  Shield,
  Trash2,
  Edit,
  Save,
  X,
  Upload,
  FileText,
  Play,
  HelpCircle,
  StopCircle,
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react"
import { AddPlayerModal } from "@/components/AddPlayerModal"
import { SalesCalendar } from "@/components/SalesCalendar"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { useFirebaseSync } from "@/hooks/useFirebaseSync"
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth"
import type {
  Player,
  GameSession,
  Receipt,
  Stats,
  SystemSettings,
  DailySales,
  StackTransaction,
  HistoryEntry,
} from "@/types"
import { StartGameModal } from "@/components/StartGameModal"
import { EndGameModal } from "@/components/EndGameModal"
import { ReceiptModal } from "@/components/ReceiptModal"
import { AddOrderModal } from "@/components/AddOrderModal"
import { PlayerDetailModal } from "@/components/PlayerDetailModal"
import { QRCodeModal } from "@/components/QRCodeModal"
import { ConfirmRakeModal } from "@/components/ConfirmRakeModal"
import { SalesPrintModal } from "@/components/SalesPrintModal"
import { EndOfDayModal } from "@/components/EndOfDayModal"
import { OwnerModeModal } from "@/components/OwnerModeModal"
import { IndividualDataModal } from "@/components/IndividualDataModal"
import { HistoryModal } from "@/components/HistoryModal"
import { SetupGuideModal } from "@/components/SetupGuideModal"
import { StableSyncModal } from "@/components/StableSyncModal"
import { FirebaseTestModal } from "@/components/FirebaseTestModal"

import { formatCurrency } from "@/utils/receiptCalculations"

export default function PokerManagementSystem() {
  const [activeTab, setActiveTab] = useState("players")
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false)
  const [showStartGameModal, setShowStartGameModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showAddOrderModal, setShowAddOrderModal] = useState(false)
  const [showPlayerDetailModal, setShowPlayerDetailModal] = useState(false)
  const [showIndividualDataModal, setShowIndividualDataModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [selectedReceiptForOrder, setSelectedReceiptForOrder] = useState<Receipt | null>(null)
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<HistoryEntry | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [showRakeModal, setShowRakeModal] = useState(false)
  const [showEndGameModal, setShowEndGameModal] = useState(false)
  const [showSalesPrintModal, setShowSalesPrintModal] = useState(false)
  const [showEndOfDayModal, setShowEndOfDayModal] = useState(false)
  const [showStableSyncModal, setShowStableSyncModal] = useState(false)
  const [showFirebaseTestModal, setShowFirebaseTestModal] = useState(false)

  const [selectedDailySales, setSelectedDailySales] = useState<DailySales | null>(null)
  const [playerSearchQuery, setPlayerSearchQuery] = useState("")
  const [historySearchQuery, setHistorySearchQuery] = useState("")
  const [selectedSessionStartTime, setSelectedSessionStartTime] = useState<Date | undefined>(undefined)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showOwnerModeModal, setShowOwnerModeModal] = useState(false)
  const [isOwnerMode, setIsOwnerMode] = useState(true)
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null)
  const [editPlayerData, setEditPlayerData] = useState<Partial<Player>>({})
  const [preselectedPlayerId, setPreselectedPlayerId] = useState<string | null>(null)
  const [showSetupGuideModal, setShowSetupGuideModal] = useState(false)
  const [selectedReceiptIndex, setSelectedReceiptIndex] = useState(0)
  const [allReceiptsForModal, setAllReceiptsForModal] = useState<Receipt[]>([])
  const [lastSyncCheck, setLastSyncCheck] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(false)

  // URLパラメータの自動処理
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const roomParam = urlParams.get("room")
      const nameParam = urlParams.get("name")

      if (roomParam && nameParam) {
        console.log("URL parameters detected:", { room: roomParam, name: nameParam })
        
        // 自動的にStableSyncModalを開く
        setShowStableSyncModal(true)
        
        // 少し遅延してからURLパラメータをクリア（StableSyncModalが処理するため）
        setTimeout(() => {
          const newUrl = window.location.pathname
          window.history.replaceState({}, "", newUrl)
        }, 2000)
      }
    }
  }, [])

  // File input ref for CSV import
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dataImportInputRef = useRef<HTMLInputElement>(null)

  // Firebase認証
  const {
    user,
    firebaseUser,
    isAuthenticated,
    isLoading: authLoading,
    todayQRCode,
    qrCodeLoading,
    signInWithQRCode,
    signInAsOwner,
    signOut,
    createTodayQRCode,
    refreshQRCode
  } = useFirebaseAuth()

  // Firebase同期システム
  const {
    isConnected,
    serverData,
    saveToServer,
    refreshData,
    connectedDevices,
    sessionId,
    isHost,
    connectedUsers,
    lastSyncTime,
  } = useFirebaseSync()

  // ローカルストレージ（完全オフライン時のみ使用）
  const [localPlayers, setLocalPlayers] = useLocalStorage<Player[]>("poker-players-fallback", [])
  const [localGameSessions, setLocalGameSessions] = useLocalStorage<GameSession[]>("poker-sessions-fallback", [])
  const [localReceipts, setLocalReceipts] = useLocalStorage<Receipt[]>("poker-receipts-fallback", [])
  const [localDailySales, setLocalDailySales] = useLocalStorage<DailySales[]>("poker-daily-sales-fallback", [])
  const [localHistory, setLocalHistory] = useLocalStorage<HistoryEntry[]>("poker-history-fallback", [])
  const [localSystemSettings, setLocalSystemSettings] = useLocalStorage<SystemSettings>("poker-settings-fallback", {
    confirmedRake: 0,
    rakeConfirmed: false,
    ownerMode: true,
    currentBusinessDate: new Date().toISOString().split("T")[0],
  })

  // データの取得（共有データを最優先、オフライン時のみローカル）
  const players = isConnected && serverData ? serverData.players : localPlayers
  const gameSessions = isConnected && serverData ? serverData.sessions : localGameSessions
  const receipts = isConnected && serverData ? serverData.receipts : localReceipts
  const dailySales = isConnected && serverData ? serverData.dailySales : localDailySales
  const history = isConnected && serverData ? serverData.history : localHistory
  const systemSettings = isConnected && serverData ? serverData.settings : localSystemSettings

  // データ更新関数（共有データを最優先）
  const setPlayers = async (newPlayers: Player[] | ((prev: Player[]) => Player[])) => {
    const updatedPlayers = typeof newPlayers === "function" ? newPlayers(players || []) : newPlayers
    console.log("=== setPlayers called ===")
    console.log("isConnected:", isConnected)
    console.log("sessionId:", sessionId)
    console.log("updatedPlayers count:", updatedPlayers.length)
    console.log("updatedPlayers:", updatedPlayers)
    console.log("Timestamp:", new Date().toLocaleTimeString())
    
    if (isConnected) {
      console.log("Saving to Firebase via saveToServer...")
      console.log("Document ID will be:", sessionId ? `${sessionId}-players` : "none")
      const success = await saveToServer("players", updatedPlayers)
      console.log("saveToServer result:", success)
      console.log("saveToServer completed at:", new Date().toLocaleTimeString())
      
      if (!success) {
        console.warn("Failed to save to server, falling back to local storage")
        setLocalPlayers(updatedPlayers)
      }
    } else {
      console.log("Not connected, saving to local storage only")
      setLocalPlayers(updatedPlayers)
    }
  }

  const setGameSessions = async (newSessions: GameSession[] | ((prev: GameSession[]) => GameSession[])) => {
    const updatedSessions = typeof newSessions === "function" ? newSessions(gameSessions || []) : newSessions

    if (isConnected) {
      const success = await saveToServer("sessions", updatedSessions)
      if (!success) {
        console.warn("Failed to save to server, falling back to local storage")
        setLocalGameSessions(updatedSessions)
      }
    } else {
      setLocalGameSessions(updatedSessions)
    }
  }

  const setReceipts = async (newReceipts: Receipt[] | ((prev: Receipt[]) => Receipt[])) => {
    const updatedReceipts = typeof newReceipts === "function" ? newReceipts(receipts || []) : newReceipts

    if (isConnected) {
      const success = await saveToServer("receipts", updatedReceipts)
      if (!success) {
        console.warn("Failed to save to server, falling back to local storage")
        setLocalReceipts(updatedReceipts)
      }
    } else {
      setLocalReceipts(updatedReceipts)
    }
  }

  const setDailySales = async (newDailySales: DailySales[] | ((prev: DailySales[]) => DailySales[])) => {
    const updatedDailySales = typeof newDailySales === "function" ? newDailySales(dailySales || []) : newDailySales

    if (isConnected) {
      const success = await saveToServer("dailySales", updatedDailySales)
      if (!success) {
        console.warn("Failed to save to server, falling back to local storage")
        setLocalDailySales(updatedDailySales)
      }
    } else {
      setLocalDailySales(updatedDailySales)
    }
  }

  const setHistory = async (newHistory: HistoryEntry[] | ((prev: HistoryEntry[]) => HistoryEntry[])) => {
    const updatedHistory = typeof newHistory === "function" ? newHistory(history || []) : newHistory

    if (isConnected) {
      const success = await saveToServer("history", updatedHistory)
      if (!success) {
        console.warn("Failed to save to server, falling back to local storage")
        setLocalHistory(updatedHistory)
      }
    } else {
      setLocalHistory(updatedHistory)
    }
  }

  const setSystemSettings = async (newSettings: SystemSettings | ((prev: SystemSettings) => SystemSettings)) => {
    const updatedSettings = typeof newSettings === "function" ? newSettings(systemSettings) : newSettings

    if (isConnected) {
      const success = await saveToServer("settings", updatedSettings)
      if (!success) {
        console.warn("Failed to save to server, falling back to local storage")
        setLocalSystemSettings(updatedSettings)
      }
    } else {
      setLocalSystemSettings(updatedSettings)
    }
  }

  // 定期的なデータ同期チェック
  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(async () => {
        const success = await refreshData()
        if (success) {
          console.log("Data sync detected, refreshing...")
          setLastSyncCheck(new Date())
        }
      }, 3000) // 3秒ごとにチェック

      return () => clearInterval(interval)
    }
  }, [isConnected, refreshData])

  // 履歴追加関数
  const addHistoryEntry = async (entry: Omit<HistoryEntry, "id" | "timestamp">) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: new Date(),
    }
    await setHistory((prev) => [newEntry, ...prev])
  }

  // オーナーモードの状態をsystemSettingsから初期化
  useEffect(() => {
    setIsOwnerMode(systemSettings.ownerMode !== false)
  }, [systemSettings])

  // オーナーモードでない場合、売上タブが選択されていたらプレイヤータブに切り替え
  useEffect(() => {
    if (!isOwnerMode && (activeTab === "sales" || activeTab === "history")) {
      setActiveTab("players")
    }
  }, [isOwnerMode, activeTab])

  // 修正された期待レーキ計算: (バイイン + 追加スタック) - 最終チップ の全プレイヤー合計（マイナス値も含む）
  const expectedRake = useMemo(() => {
    let totalRake = 0

    // 完了したセッションのプレイヤーのみを対象とする
    const completedSessions = (gameSessions || []).filter((session) => session.status === "completed")

    completedSessions.forEach((session) => {
      const receipt = (receipts || []).find((r) => r.playerId === session.playerId)
      if (receipt) {
        // バイイン額（ゲーム参加時の設定チップ）
        const buyIn = receipt.items?.find((item) => item.name === "バイイン")?.amount || 0

        // 追加スタックの合計（スタック追加項目から）
        const stackAdditions = (receipt.items || [])
          .filter((item) => item.name.includes("スタック追加"))
          .reduce((sum, item) => {
            // スタック追加の詳細情報から実際の希望額を取得
            if (item.stackDetails?.requestedAmount) {
              return sum + item.stackDetails.requestedAmount
            }
            // 詳細情報がない場合は購入金額を使用（概算）
            return sum + (item.amount || 0)
          }, 0)

        // ©増減から実際の最終チップ数をを取得
        const dailyChangeItem = receipt.items?.find((item) => item.name === "©増減")
        const dailyChange = dailyChangeItem?.amount || 0
        const startStack = receipt.items?.find((item) => item.name === "開始時スタック")?.amount || 0
        const actualFinalChips = startStack - dailyChange

        // プレイヤーの損益 = (バイイン + 追加スタック) - 実際の最終チップ数
        // マイナスの場合はプレイヤーの利益（店側の損失）
        const totalGameInput = buyIn + stackAdditions
        const playerResult = totalGameInput - actualFinalChips

        console.log(`=== 期待レーキ計算: ${session.playerName} ===`)
        console.log(`バイイン: ${buyIn}©`)
        console.log(`追加スタック: ${stackAdditions}©`)
        console.log(`ゲーム参加合計: ${totalGameInput}©`)
        console.log(`開始時スタック: ${startStack}©`)
        console.log(`©増減: ${dailyChange}©`)
        console.log(`実際の最終チップ: ${actualFinalChips}©`)
        console.log(`プレイヤー結果: ${playerResult}© (${playerResult > 0 ? "損失" : "利益"})`)

        // マイナス値も含めて合計に加算（プレイヤーの利益は店側の損失として計算）
        totalRake += playerResult
      }
    })

    console.log(`=== 期待レーキ合計: ${totalRake}© ===`)
    return totalRake
  }, [gameSessions, receipts])

  // Current day stats - リアルタイム計算（修正版）
  const today = new Date().toISOString().split("T")[0]

  // 今日の伝票を正確にフィルタリング
  const todayReceipts = useMemo(() => {
    return (receipts || []).filter((receipt) => {
      if (!receipt.date) return false

      // 日付文字列を正規化
      let receiptDateStr = receipt.date

      // "2025/1/12" 形式を "2025-01-12" 形式に変換
      if (receiptDateStr.includes("/")) {
        const parts = receiptDateStr.split("/")
        if (parts.length === 3) {
          const year = parts[0]
          const month = parts[1].padStart(2, "0")
          const day = parts[2].padStart(2, "0")
          receiptDateStr = `${year}-${month}-${day}`
        }
      }

      return receiptDateStr === today
    })
  }, [receipts, today])

  const todaySales = (dailySales || []).find((s) => s.date === today)
  const confirmedRake = todaySales?.confirmedRake || systemSettings.confirmedRake || 0

  // 現金売上を正確に計算
  const completedTodayReceipts = todayReceipts.filter((r) => r.status === "completed")
  const cashRevenue = completedTodayReceipts.reduce((sum, receipt) => sum + (receipt.total || 0), 0)

  const dailyStats = {
    cashRevenue: cashRevenue,
    totalRevenue: confirmedRake + cashRevenue,
    completedReceipts: completedTodayReceipts.length,
    pendingReceipts: todayReceipts.filter((r) => r.status === "pending").length,
  }

  const [clientStats, setClientStats] = useState<Stats>({
    expectedRake: 0,
    cashRevenue: 0,
    currentPlayers: 0,
  })

  const [clientPlayerCount, setClientPlayerCount] = useState(0)
  const [clientDeviceCount, setClientDeviceCount] = useState(0)
  const [clientIsConnected, setClientIsConnected] = useState(false)
  const [clientFilteredPlayers, setClientFilteredPlayers] = useState<Player[]>([])
  const [clientFilteredHistory, setClientFilteredHistory] = useState<HistoryEntry[]>([])

  // クライアントサイドでのみstatsを更新
  useEffect(() => {
    setClientStats({
      expectedRake: expectedRake || 0,
      cashRevenue: dailyStats.cashRevenue || 0,
      currentPlayers: (gameSessions || []).filter((s) => s.status === "playing").length,
    })
    setClientPlayerCount((players || []).length)
    setClientDeviceCount(typeof connectedDevices === 'number' ? connectedDevices : 0)
    setClientIsConnected(isConnected)
    
    // フィルタリングされたプレイヤーリストも更新
    const filtered = (players || []).filter((player) =>
      player.name.toLowerCase().includes(playerSearchQuery.toLowerCase()),
    )
    setClientFilteredPlayers(filtered)
    
    // フィルタリングされた履歴も更新
    const filteredHistory = (history || []).filter(
      (entry) =>
        entry.description.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
        entry.details?.playerName?.toLowerCase().includes(historySearchQuery.toLowerCase()),
    )
    setClientFilteredHistory(filteredHistory)
  }, [expectedRake, dailyStats.cashRevenue, gameSessions, players, connectedDevices, isConnected, playerSearchQuery, history, historySearchQuery])

  const stats = clientStats

  // Filter players based on search query
  const filteredPlayers = (players || []).filter((player) =>
    player.name.toLowerCase().includes(playerSearchQuery.toLowerCase()),
  )

  // Filter history based on search query
  const filteredHistory = (history || []).filter(
    (entry) =>
      entry.description.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
      entry.details?.playerName?.toLowerCase().includes(historySearchQuery.toLowerCase()),
  )

  // プレイヤーの状態を判定する関数
  const getPlayerStatus = (player: Player) => {
    const currentSession = (gameSessions || []).find((s) => s.playerId === player.id && s.status === "playing")
    const completedSession = (gameSessions || []).find((s) => s.playerId === player.id && s.status === "completed")
    const playerReceipt = (receipts || []).find((r) => r.playerId === player.id)

    if (currentSession) {
      return "playing" // ゲーム中
    } else if (completedSession && playerReceipt?.status === "pending") {
      return "game_ended" // ゲーム終了（未精算）
    } else if (completedSession && playerReceipt?.status === "completed") {
      return "completed" // 精算済み
    } else {
      return "inactive" // 未来店
    }
  }

  // プレイヤーの表示情報を取得する関数（修正版）
  const getPlayerDisplayInfo = (player: Player) => {
    const status = getPlayerStatus(player)
    const currentSession = (gameSessions || []).find((s) => s.playerId === player.id && s.status === "playing")
    const completedSession = (gameSessions || []).find((s) => s.playerId === player.id && s.status === "completed")
    const playerReceipt = (receipts || []).find((r) => r.playerId === player.id)

    switch (status) {
      case "playing":
        return {
          statusText: "ゲーム中",
          statusVariant: "destructive" as const,
          displayText: `システム残高: ${formatCurrency(player.currentChips || 0)}©`,
        }
      case "game_ended":
        if (playerReceipt) {
          const dailyChangeItem = playerReceipt.items?.find((item) => item.name === "©増減")
          const dailyChange = dailyChangeItem?.amount || 0
          const startStack = playerReceipt.items?.find((item) => item.name === "開始時スタック")?.amount || 0
          const finalChips = startStack - dailyChange

          return {
            statusText: "ゲーム終了",
            statusVariant: "secondary" as const,
            displayText: `最終チップ: ${formatCurrency(finalChips)}©`,
          }
        }
        return {
          statusText: "ゲーム終了",
          statusVariant: "secondary" as const,
          displayText: `最終チップ: ${formatCurrency(player.currentChips || 0)}©`,
        }
      case "completed":
        if (playerReceipt) {
          const dailyChangeItem = playerReceipt.items?.find((item) => item.name === "©増減")
          const dailyChange = dailyChangeItem?.amount || 0
          const startStack = playerReceipt.items?.find((item) => item.name === "開始時スタック")?.amount || 0
          const finalChips = startStack - dailyChange

          return {
            statusText: "精算済み",
            statusVariant: "default" as const,
            displayText: `最終チップ: ${formatCurrency(finalChips)}©`,
          }
        }
        return {
          statusText: "精算済み",
          statusVariant: "default" as const,
          displayText: `最終チップ: ${formatCurrency(player.currentChips || 0)}©`,
        }
      default:
        return {
          statusText: "未来店",
          statusVariant: "secondary" as const,
          displayText: `システム残高: ${formatCurrency(player.currentChips || 0)}©`,
        }
    }
  }

  const handleAddPlayer = async (newPlayer: Omit<Player, "id">) => {
    console.log("=== handleAddPlayer called ===")
    console.log("newPlayer:", newPlayer)
    console.log("isConnected:", isConnected)
    console.log("sessionId:", sessionId)
    
    const player: Player = {
      ...newPlayer,
      id: Date.now().toString(),
      currentChips: newPlayer.initialAmount || 0,
      totalBuyIn: 0,
      totalCashOut: 0,
      totalProfit: 0,
      gameCount: 0,
      status: "inactive",
      dailyHistory: [],
      stackHistory: newPlayer.initialAmount
        ? [
            {
              id: Date.now().toString(),
              date: new Date().toLocaleDateString("ja-JP"),
              time: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
              type: "adjustment",
              amount: newPlayer.initialAmount,
              balance: newPlayer.initialAmount,
              note: "初期チップ設定",
            },
          ]
        : [],
    }
    console.log("Created player object:", player)
    console.log("Calling setPlayers...")
    await setPlayers([...(players || []), player])
    console.log("setPlayers completed")

    // 履歴に追加
    console.log("Adding history entry...")
    await addHistoryEntry({
      type: "player_add",
      description: `新規プレイヤー「${player.name}」を追加${newPlayer.initialAmount ? ` (初期チップ: ${formatCurrency(newPlayer.initialAmount)}©)` : ""}`,
      details: {
        playerId: player.id,
        playerName: player.name,
        amount: newPlayer.initialAmount,
      },
    })
    console.log("=== handleAddPlayer completed ===")
  }

  const handleDeletePlayer = async (playerId: string) => {
    console.log("Delete player called:", playerId, "Owner mode:", isOwnerMode)

    const player = (players || []).find((p) => p.id === playerId)
    if (!player) {
      console.log("Player not found:", playerId)
      return
    }

    console.log("Deleting player:", player.name)

    // 関連するセッションと伝票も削除
    const relatedSessions = (gameSessions || []).filter((s) => s.playerId === playerId)
    const relatedReceipts = (receipts || []).filter((r) => r.playerId === playerId)
    const updatedSessions = (gameSessions || []).filter((s) => s.playerId !== playerId)
    const updatedReceipts = (receipts || []).filter((r) => r.playerId !== playerId)

    await setGameSessions(updatedSessions)
    await setReceipts(updatedReceipts)
    await setPlayers((players || []).filter((p) => p.id !== playerId))

    // 履歴に追加
    await addHistoryEntry({
      type: "player_delete",
      description: `プレイヤー「${player.name}」を削除 (関連セッション: ${relatedSessions.length}件, 関連伝票: ${relatedReceipts.length}件も削除)`,
      details: {
        playerId: player.id,
        playerName: player.name,
        relatedIds: [...relatedSessions.map((s) => s.id), ...relatedReceipts.map((r) => r.id)],
      },
    })

    console.log("Player deleted successfully")
  }

  const handleEditPlayer = (playerId: string) => {
    const player = (players || []).find((p) => p.id === playerId)
    if (player) {
      setEditingPlayer(playerId)
      setEditPlayerData({
        name: player.name,
        currentChips: player.currentChips,
        totalBuyIn: player.totalBuyIn,
        totalCashOut: player.totalCashOut,
        totalProfit: player.totalProfit,
        gameCount: player.gameCount,
      })
    }
  }

  const handleSavePlayer = async (playerId: string) => {
    if (!isOwnerMode) {
      alert("オーナーモードでのみ実行可能です。")
      return
    }

    const originalPlayer = (players || []).find((p) => p.id === playerId)
    if (!originalPlayer) return

    const updatedPlayers = (players || []).map((p) => (p.id === playerId ? { ...p, ...editPlayerData } : p))
    await setPlayers(updatedPlayers)

    // 変更内容を記録
    const changes: string[] = []
    if (originalPlayer.name !== editPlayerData.name) {
      changes.push(`名前: ${originalPlayer.name} → ${editPlayerData.name}`)
    }
    if (originalPlayer.currentChips !== editPlayerData.currentChips) {
      changes.push(
        `現在チップ: ${formatCurrency(originalPlayer.currentChips || 0)} → ${formatCurrency(editPlayerData.currentChips || 0)}©`,
      )
    }
    if (originalPlayer.totalBuyIn !== editPlayerData.totalBuyIn) {
      changes.push(
        `総バイイン: ${formatCurrency(originalPlayer.totalBuyIn || 0)} → ${formatCurrency(editPlayerData.totalBuyIn || 0)}©`,
      )
    }

    // 履歴に追加
    await addHistoryEntry({
      type: "player_edit",
      description: `プレイヤー「${originalPlayer.name}」を編集 (${changes.join(", ")})`,
      details: {
        playerId: playerId,
        playerName: editPlayerData.name || originalPlayer.name,
        originalData: originalPlayer,
      },
    })

    setEditingPlayer(null)
    setEditPlayerData({})
  }

  const handleCancelEdit = () => {
    setEditingPlayer(null)
    setEditPlayerData({})
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!isOwnerMode) {
      alert("オーナーモードでのみ実行可能です。")
      return
    }

    const session = (gameSessions || []).find((s) => s.id === sessionId)
    if (!session) return

    await setGameSessions((gameSessions || []).filter((s) => s.id !== sessionId))

    // 履歴に追加
    await addHistoryEntry({
      type: "session_delete",
      description: `セッション削除: ${session.playerName} (バイイン: ${formatCurrency(session.buyIn || 0)}©)`,
      details: {
        playerId: session.playerId,
        playerName: session.playerName,
        sessionId: sessionId,
        amount: session.buyIn,
      },
    })
  }

  const handleDeleteReceipt = async (receiptId: string) => {
    if (!isOwnerMode) {
      alert("オーナーモードでのみ実行可能です。")
      return
    }

    const receipt = (receipts || []).find((r) => r.id === receiptId)
    if (!receipt) return

    await setReceipts((receipts || []).filter((r) => r.id !== receiptId))

    // 履歴に追加
    await addHistoryEntry({
      type: "receipt_delete",
      description: `伝票削除: ${receipt.playerName} (${formatCurrency(receipt.total || 0)}円)`,
      details: {
        playerId: receipt.playerId,
        playerName: receipt.playerName,
        receiptId: receiptId,
        amount: receipt.total,
      },
    })
  }

  // プレイヤー名クリックでゲーム開始
  const handlePlayerNameClick = (player: Player) => {
    // プレイヤーが既にプレイ中かチェック
    const existingSession = (gameSessions || []).find((s) => s.playerId === player.id && s.status === "playing")

    if (existingSession) {
      // 既にプレイ中の場合は詳細表示
      handleShowPlayerDetail(player)
    } else if (player.status === "inactive") {
      // 未来店の場合はゲーム開始モーダルを開く
      setPreselectedPlayerId(player.id)
      setShowStartGameModal(true)
    } else {
      // その他の場合は詳細表示
      handleShowPlayerDetail(player)
    }
  }

  const handleStartGame = async (playerId: string, buyIn: number) => {
    const player = (players || []).find((p) => p.id === playerId)
    if (!player) return

    const sessionId = Date.now().toString()

    // 修正された計算ロジック: スタック残高 - バイイン額
    const currentChips = player.currentChips || 0
    const difference = currentChips - buyIn
    const systemBalance = Math.max(0, difference) // システム残高（マイナスにはならない）

    let actualPurchase = 0

    if (difference < 0) {
      // マイナスの場合：そのマイナス分が会計に入る
      actualPurchase = Math.abs(difference)
    } else {
      // プラスの場合：スタックが残っている、会計は0
      actualPurchase = 0
    }

    const session: GameSession = {
      id: sessionId,
      playerId,
      playerName: player.name,
      buyIn: actualPurchase, // 実際の購入金額を記録
      startTime: new Date(),
      status: "playing",
    }

    // セッションを追加
    await setGameSessions((prevSessions) => [...(prevSessions || []), session])

    const stackTransaction: StackTransaction = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("ja-JP"),
      time: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
      type: "buy-in",
      amount: actualPurchase, // 実際の購入金額
      balance: systemBalance, // システム残高を設定
      sessionId: sessionId,
      note: "ゲーム開始",
    }

    // 伝票を作成（日付フォーマットを統一）
    const newReceipt: Receipt = {
      id: `receipt-${sessionId}`,
      playerId,
      playerName: player.name,
      date: new Date().toISOString().split("T")[0], // YYYY-MM-DD形式で統一
      items: [
        { name: "開始時スタック", amount: currentChips, type: "neutral" }, // 開始時のスタック残高
        { name: "バイイン", amount: buyIn, type: "neutral" }, // 元のバイイン額
        { name: "©増減", amount: 0, type: "neutral" },
        { name: "最終©残高", amount: systemBalance, type: "neutral" }, // システム残高
        { name: "チャージ", amount: 0, type: "neutral" },
        { name: "ソフトドリンク", amount: 0, type: "neutral" },
        { name: "スタック購入", amount: actualPurchase, type: "negative" }, // 実際の購入金額を設定
        { name: "小計", amount: 0, type: "neutral" },
        { name: "消費税", amount: 0, type: "neutral" },
      ],
      total: actualPurchase, // 実際の購入金額を合計に設定
      status: "pending",
    }

    // 伝票を追加
    await setReceipts((prevReceipts) => [...(prevReceipts || []), newReceipt])

    // プレイヤー情報を更新
    const updatedPlayers = (players || []).map((p) =>
      p.id === playerId
        ? {
            ...p,
            status: "active" as const,
            totalBuyIn: (p.totalBuyIn || 0) + actualPurchase, // 実際の購入金額のみ加算
            gameCount: (p.gameCount || 0) + 1,
            currentChips: systemBalance, // システム残高を設定
            stackHistory: [...(p.stackHistory || []), stackTransaction],
          }
        : p,
    )
    await setPlayers(updatedPlayers)

    // 履歴に追加
    await addHistoryEntry({
      type: "game_start",
      description: `ゲーム開始: ${player.name} (バイイン: ${formatCurrency(buyIn)}©, 実際購入: ${formatCurrency(actualPurchase)}円, システム残高: ${formatCurrency(systemBalance)}©)`,
      details: {
        playerId: playerId,
        playerName: player.name,
        sessionId: sessionId,
        amount: actualPurchase,
      },
    })

    // プリセレクトをクリア
    setPreselectedPlayerId(null)
  }

  const handleCompleteReceipt = async (receiptId: string) => {
    const receipt = (receipts || []).find((r) => r.id === receiptId)
    if (!receipt) return

    // ゲーム終了チェック
    const relatedSession = (gameSessions || []).find((s) => s.playerId === receipt.playerId)
    if (relatedSession && relatedSession.status === "playing") {
      alert("先にゲーム終了を行ってください。\nゲーム終了せずに精算すると期待レーキの計算がずれる可能性があります。")
      return
    }

    // チップ詳細データをプレイヤーに保存
    const startStack = receipt.items?.find((item) => item.name === "開始時スタック")?.amount || 0
    const buyIn = receipt.items?.find((item) => item.name === "バイイン")?.amount || 0
    const dailyChange = receipt.items?.find((item) => item.name === "©増減")?.amount || 0
    const finalChips = startStack - dailyChange

    // スタック追加の詳細を取得
    const stackAdditions = (receipt.items || [])
      .filter((item) => item.name.includes("スタック追加"))
      .map((item) => ({
        name: item.name,
        amount: item.amount || 0,
        stackDetails: item.stackDetails,
        time: item.name.match(/(\d{2}:\d{2})/)?.[1] || "不明",
      }))

    // プレイヤーデータを更新（チップ詳細を保存）
    const updatedPlayers = (players || []).map((p) => {
      if (p.id === receipt.playerId) {
        return {
          ...p,
          currentChips: finalChips, // 最終チップ数を保存
          // チップ詳細をプレイヤーデータに追加
          lastGameDetails: {
            date: receipt.date,
            startStack: startStack,
            buyIn: buyIn,
            stackAdditions: stackAdditions,
            finalChips: finalChips,
            dailyChange: dailyChange,
          },
        }
      }
      return p
    })
    await setPlayers(updatedPlayers)

    // 伝票を完了状態に更新
    const updatedReceipts = (receipts || []).map((r) =>
      r.id === receiptId ? { ...r, status: "completed" as const } : r,
    )
    await setReceipts(updatedReceipts)

    // 履歴に追加
    await addHistoryEntry({
      type: "receipt_complete",
      description: `伝票精算完了: ${receipt.playerName} (${formatCurrency(receipt.total || 0)}円, 最終チップ: ${formatCurrency(finalChips)}©)`,
      details: {
        playerId: receipt.playerId,
        playerName: receipt.playerName,
        receiptId: receiptId,
        amount: receipt.total,
        finalChips: finalChips,
      },
    })
  }

  const handleShowReceipt = (receipt: Receipt) => {
    const relatedSession = (gameSessions || []).find(
      (s) => s.playerId === receipt.playerId && (s.status === "playing" || s.status === "completed"),
    )

    // 伝票を日付順でソート
    const sortedReceipts = (receipts || []).sort(
      (a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime(),
    )

    const receiptIndex = sortedReceipts.findIndex((r) => r.id === receipt.id)

    setSelectedReceipt(receipt)
    setSelectedReceiptIndex(receiptIndex)
    setAllReceiptsForModal(sortedReceipts)
    setSelectedSessionStartTime(relatedSession?.startTime ? new Date(relatedSession.startTime) : undefined)
    setShowReceiptModal(true)
  }

  const handleShowPlayerDetail = (player: Player) => {
    setSelectedPlayer(player)
    setShowPlayerDetailModal(true)
  }

  const handleUpdatePlayer = async (playerId: string, updates: Partial<Player>) => {
    const updatedPlayers = (players || []).map((p) => (p.id === playerId ? { ...p, ...updates } : p))
    await setPlayers(updatedPlayers)
  }

  const handleAddStackTransaction = async (playerId: string, transaction: Omit<StackTransaction, "id">) => {
    const transactionWithId: StackTransaction = {
      ...transaction,
      id: Date.now().toString(),
    }

    const updatedPlayers = (players || []).map((p) =>
      p.id === playerId
        ? {
            ...p,
            stackHistory: [...(p.stackHistory || []), transactionWithId],
          }
        : p,
    )
    await setPlayers(updatedPlayers)
  }

  // 修正されたhandleAddOrder関数 - スタック履歴も同時に更新
  const handleAddOrder = async (
    receiptId: string,
    items: { name: string; price: number; quantity: number; checked: boolean; stackAddDetails?: any }[],
  ) => {
    console.log("=== handleAddOrder START ===")
    console.log("Receipt ID:", receiptId)
    console.log("Items:", items)

    const receipt = (receipts || []).find((r) => r.id === receiptId)
    if (!receipt) {
      console.log("Receipt not found:", receiptId)
      return
    }

    const addedItems: string[] = []

    // 選択された項目のみを処理
    const checkedItems = items.filter((item) => item.checked && (item.price > 0 || item.name === "スタック追加"))
    console.log("Checked items:", checkedItems)

    if (checkedItems.length === 0) {
      console.log("No items to add")
      return
    }

    const updatedReceipts = (receipts || []).map((r) => {
      if (r.id === receiptId) {
        const updatedItems = [...(r.items || [])]

        checkedItems.forEach((item) => {
          console.log("Processing item:", item)

          if (item.name === "スタック追加") {
            // スタック追加の場合
            const timeStamp = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })

            let stackAddItem

            if (item.stackAddDetails) {
              // 詳細情報がある場合、それを使用してより詳細な名前を作成
              const { requestedAmount, currentSystemBalance, actualCost, newSystemBalance } = item.stackAddDetails

              stackAddItem = {
                name: `スタック追加 ${timeStamp} [希望:${formatCurrency(requestedAmount)}© 残高:${formatCurrency(currentSystemBalance)}© → ${formatCurrency(newSystemBalance)}©]`,
                amount: actualCost,
                quantity: 1,
                type: "negative" as const,
                // 詳細情報も保存
                stackDetails: {
                  requestedAmount,
                  currentSystemBalance,
                  actualCost,
                  newSystemBalance,
                  timestamp: timeStamp,
                },
              }

              addedItems.push(
                `スタック追加 ${formatCurrency(requestedAmount)}© (購入: ${formatCurrency(actualCost)}円, 残高: ${formatCurrency(currentSystemBalance)}© → ${formatCurrency(newSystemBalance)}©)`,
              )
            } else {
              // 従来の処理
              stackAddItem = {
                name: `スタック追加 ${timeStamp}`,
                amount: item.price,
                quantity: 1,
                type: "negative" as const,
              }

              addedItems.push(`スタック追加 ${formatCurrency(item.price)}円`)
            }

            updatedItems.push(stackAddItem)
            console.log("Added stack item:", stackAddItem)
          } else {
            // 通常の項目処理
            const existingItemIndex = updatedItems.findIndex(
              (existing) => existing.name === item.name && existing.amount === item.price,
            )

            if (existingItemIndex >= 0) {
              // 既存項目の数量を増加
              const existingItem = updatedItems[existingItemIndex]
              updatedItems[existingItemIndex] = {
                ...existingItem,
                quantity: (existingItem.quantity || 1) + item.quantity,
              }
              addedItems.push(`${item.name} ${formatCurrency(item.price)}円 ×${item.quantity}`)
            } else {
              // 新規項目を追加
              updatedItems.push({
                name: item.name,
                amount: item.price,
                quantity: item.quantity,
                type: "neutral" as const,
              })
              addedItems.push(`${item.name} ${formatCurrency(item.price)}円 ×${item.quantity}`)
            }
          }
        })

        // 消費税対象商品の計算（スタック関連項目は除外）
        const taxableAmount = updatedItems
          .filter(
            (item) =>
              !item.name.includes("スタック") &&
              item.name !== "バイイン" &&
              item.name !== "©増減" &&
              item.name !== "最終©残高" &&
              item.name !== "開始時スタック" &&
              item.name !== "小計" &&
              item.name !== "消費税",
          )
          .reduce((sum, item) => sum + (item.amount || 0) * (item.quantity || 1), 0)

        // スタック関連の金額を取得
        const stackPurchaseAmountTotal = updatedItems
          .filter((item) => item.name.includes("スタック") && item.type === "negative")
          .reduce((sum, item) => sum + (item.amount || 0) * (item.quantity || 1), 0)

        // 消費税を計算
        const newTax = Math.floor(taxableAmount * 0.1)

        // 小計と消費税の項目を更新
        const finalItems = updatedItems.map((item) => {
          if (item.name === "小計") {
            return { ...item, amount: taxableAmount }
          }
          if (item.name === "消費税") {
            return { ...item, amount: newTax }
          }
          return item
        })

        const newTotal = stackPurchaseAmountTotal + taxableAmount + newTax

        console.log("Updated receipt calculation:", {
          stackPurchaseAmountTotal,
          taxableAmount,
          newTax,
          newTotal,
          finalItems: finalItems.length,
        })

        return {
          ...r,
          items: finalItems,
          total: newTotal,
        }
      }
      return r
    })

    await setReceipts(updatedReceipts)
    console.log("Receipts updated")

    // スタック追加があった場合はプレイヤーのシステム残高とスタック履歴を更新
    const stackAddItem = checkedItems.find((item) => item.name === "スタック追加")
    if (stackAddItem && stackAddItem.stackAddDetails) {
      console.log("=== Updating Player System Balance and Stack History ===")
      console.log("Stack add item:", stackAddItem)
      console.log("Stack add details:", stackAddItem.stackAddDetails)

      const { requestedAmount, currentSystemBalance, actualCost, newSystemBalance } = stackAddItem.stackAddDetails

      // スタック履歴に追加するトランザクション
      const stackTransaction: StackTransaction = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString("ja-JP"),
        time: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
        type: "buy-in",
        amount: requestedAmount, // 希望額をamountに設定
        balance: newSystemBalance, // 新しいシステム残高
        note: `スタック追加 (購入: ${formatCurrency(actualCost)}円)`,
        receiptInfo: {
          startStack: currentSystemBalance,
          buyIn: 0, // スタック追加なのでバイインは0
          stackPurchase: actualCost,
          stackAdditions: [
            {
              amount: actualCost,
              time: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
            },
          ],
          finalChips: newSystemBalance,
        },
      }

      // プレイヤーのcurrentChipsとstackHistoryを更新
      const updatedPlayers = (players || []).map((p) => {
        if (p.id === receipt.playerId) {
          console.log(`Updating player ${p.name} chips from ${p.currentChips} to ${newSystemBalance}`)
          return {
            ...p,
            currentChips: newSystemBalance,
            stackHistory: [...(p.stackHistory || []), stackTransaction],
          }
        }
        return p
      })

      await setPlayers(updatedPlayers)
      console.log("Player system balance and stack history updated")

      // 伝票の「最終©残高」も同時に更新
      const updatedReceiptsWithBalance = updatedReceipts.map((r) => {
        if (r.id === receiptId) {
          const updatedItems = (r.items || []).map((item) => {
            if (item.name === "最終©残高") {
              return { ...item, amount: newSystemBalance }
            }
            return item
          })
          return { ...r, items: updatedItems }
        }
        return r
      })

      await setReceipts(updatedReceiptsWithBalance)
      console.log("Receipt final chips balance updated to:", newSystemBalance)
    }

    // 履歴に追加
    await addHistoryEntry({
      type: "order_add",
      description: `追加注文: ${receipt.playerName} (${addedItems.join(", ")})`,
      details: {
        playerId: receipt.playerId,
        playerName: receipt.playerName,
        receiptId: receiptId,
        items: addedItems,
      },
    })

    console.log("=== handleAddOrder END ===")
  }

  const handleShowAddOrder = (receipt: Receipt) => {
    const relatedSession = (gameSessions || []).find(
      (s) => s.playerId === receipt.playerId && (s.status === "playing" || s.status === "completed"),
    )

    setSelectedReceiptForOrder(receipt)
    setSelectedSessionStartTime(relatedSession?.startTime ? new Date(relatedSession.startTime) : undefined)
    setShowAddOrderModal(true)
  }

  // 修正されたhandleEndGame関数 - システム残高を伝票から正確に取得
  const handleEndGame = async (sessionId: string, finalChips: number) => {
    console.log("=== handleEndGame START ===")
    console.log("Session ID:", sessionId)
    console.log("Final Chips:", finalChips)

    const session = (gameSessions || []).find((s) => s.id === sessionId)
    if (!session) {
      console.log("Session not found:", sessionId)
      return
    }

    const player = (players || []).find((p) => p.id === session.playerId)
    if (!player) {
      console.log("Player not found:", session.playerId)
      return
    }

    console.log("Player found:", player.name)

    // セッションを完了状態に更新
    const updatedSessions = (gameSessions || []).map((s) =>
      s.id === sessionId ? { ...s, status: "completed" as const, endTime: new Date(), finalChips: finalChips } : s,
    )
    await setGameSessions(updatedSessions)
    console.log("Session updated to completed")

    // 伝票の©増減と最終©残高を計算して更新
    const receipt = (receipts || []).find((r) => r.playerId === session.playerId)
    if (receipt) {
      console.log("Receipt found:", receipt.id)

      // 開始時スタックを取得
      const startStackItem = receipt.items?.find((item) => item.name === "開始時スタック")
      const startStack = startStackItem?.amount || 0

      // ©増減を計算（開始時スタック - 最終チップ）
      const dailyChange = startStack - finalChips

      console.log("Calculation:", {
        startStack,
        finalChips,
        dailyChange,
      })

      // 現在のシステム残高を取得（プレイヤーのcurrentChips）
      const currentSystemBalance = player.currentChips || 0

      // 最終©残高 = 実際の最終チップ + システム残高
      const finalBalance = finalChips + currentSystemBalance

      console.log("Final balance calculation:", {
        finalChips,
        currentSystemBalance,
        finalBalance,
      })

      // 伝票を更新
      const updatedReceipts = (receipts || []).map((r) => {
        if (r.id === receipt.id) {
          const updatedItems = (r.items || []).map((item) => {
            if (item.name === "©増減") {
              return { ...item, amount: dailyChange }
            }
            if (item.name === "最終©残高") {
              return { ...item, amount: finalBalance }
            }
            return item
          })
          return { ...r, items: updatedItems }
        }
        return r
      })

      await setReceipts(updatedReceipts)
      console.log("Receipt updated with daily change and final balance")
    }

    // プレイヤーのステータスを更新（currentChipsは変更しない）
    const updatedPlayers = (players || []).map((p) =>
      p.id === session.playerId
        ? {
            ...p,
            status: "inactive" as const,
          }
        : p,
    )
    await setPlayers(updatedPlayers)
    console.log("Player status updated")

    // 履歴に追加
    await addHistoryEntry({
      type: "game_end",
      description: `ゲーム終了: ${session.playerName} (最終チップ: ${formatCurrency(finalChips)}©)`,
      details: {
        playerId: session.playerId,
        playerName: session.playerName,
        sessionId: sessionId,
        amount: finalChips,
      },
    })

    console.log("=== handleEndGame END ===")
  }

  const handleUpdateReceipt = async (receiptId: string, updates: Partial<Receipt>) => {
    console.log("=== handleUpdateReceipt START ===")
    console.log("Receipt ID:", receiptId)
    console.log("Updates:", updates)

    const updatedReceipts = (receipts || []).map((r) => {
      if (r.id === receiptId) {
        const updatedReceipt = { ...r, ...updates }

        // 伝票の項目が更新された場合、合計金額を再計算
        if (updates.items) {
          console.log("Items updated, recalculating total")

          // 消費税対象商品の計算（スタック関連項目は除外）
          const taxableAmount = updates.items
            .filter(
              (item) =>
                !item.name.includes("スタック") &&
                item.name !== "バイイン" &&
                item.name !== "©増減" &&
                item.name !== "最終©残高" &&
                item.name !== "開始時スタック" &&
                item.name !== "小計" &&
                item.name !== "消費税",
            )
            .reduce((sum, item) => sum + (item.amount || 0) * (item.quantity || 1), 0)

          // スタック関連の金額を取得
          const stackPurchaseAmountTotal = updates.items
            .filter((item) => item.name.includes("スタック") && item.type === "negative")
            .reduce((sum, item) => sum + (item.amount || 0) * (item.quantity || 1), 0)

          // 消費税を計算
          const newTax = Math.floor(taxableAmount * 0.1)

          // 小計と消費税の項目を更新
          const finalItems = updates.items.map((item) => {
            if (item.name === "小計") {
              return { ...item, amount: taxableAmount }
            }
            if (item.name === "消費税") {
              return { ...item, amount: newTax }
            }
            return item
          })

          const newTotal = stackPurchaseAmountTotal + taxableAmount + newTax

          console.log("Recalculated totals:", {
            stackPurchaseAmountTotal,
            taxableAmount,
            newTax,
            newTotal,
          })

          updatedReceipt.items = finalItems
          updatedReceipt.total = newTotal
        }

        return updatedReceipt
      }
      return r
    })

    await setReceipts(updatedReceipts)
    console.log("Receipt updated successfully")
    console.log("=== handleUpdateReceipt END ===")
  }

  const handleNavigateReceipt = (direction: "prev" | "next") => {
    const currentIndex = selectedReceiptIndex
    let newIndex: number

    if (direction === "prev") {
      newIndex = Math.max(0, currentIndex - 1)
    } else {
      newIndex = Math.min(allReceiptsForModal.length - 1, currentIndex + 1)
    }

    if (newIndex !== currentIndex) {
      const newReceipt = allReceiptsForModal[newIndex]
      const relatedSession = (gameSessions || []).find(
        (s) => s.playerId === newReceipt.playerId && (s.status === "playing" || s.status === "completed"),
      )

      setSelectedReceipt(newReceipt)
      setSelectedReceiptIndex(newIndex)
      setSelectedSessionStartTime(relatedSession?.startTime ? new Date(relatedSession.startTime) : undefined)
    }
  }

  const handleConfirmRake = async (amount: number) => {
    const today = new Date().toISOString().split("T")[0]

    // 既存の日次売上データを更新または新規作成
    const existingSales = (dailySales || []).find((s) => s.date === today)
    if (existingSales) {
      const updatedSales = (dailySales || []).map((s) => (s.date === today ? { ...s, confirmedRake: amount } : s))
      await setDailySales(updatedSales)
    } else {
      const newSales: DailySales = {
        id: Date.now().toString(),
        date: today,
        confirmedRake: amount,
        cashRevenue: dailyStats.cashRevenue,
        totalRevenue: amount + dailyStats.cashRevenue,
        completedReceipts: dailyStats.completedReceipts,
        pendingReceipts: dailyStats.pendingReceipts,
        rakeConfirmed: true,
      }
      await setDailySales([...(dailySales || []), newSales])
    }

    // システム設定も更新
    await setSystemSettings((prev) => ({
      ...prev,
      confirmedRake: amount,
      rakeConfirmed: true,
    }))

    // 履歴に追加
    await addHistoryEntry({
      type: "rake_confirm",
      description: `レーキ確定: ${formatCurrency(amount)}円 (期待レーキ: ${formatCurrency(expectedRake)}円)`,
      details: {
        amount: amount,
        expectedRake: expectedRake,
      },
    })
  }

  const handleShowSalesPrint = (sales: DailySales) => {
    setSelectedDailySales(sales)
    setShowSalesPrintModal(true)
  }

  const handleShowEndOfDay = () => {
    setShowEndOfDayModal(true)
  }

  const handleEndOfDay = async (data: {
    confirmedRake: number
    cashRevenue: number
    totalRevenue: number
    completedReceipts: number
    pendingReceipts: number
  }) => {
    const today = new Date().toISOString().split("T")[0]

    // 日次売上データを保存
    const newSales: DailySales = {
      id: Date.now().toString(),
      date: today,
      confirmedRake: data.confirmedRake,
      cashRevenue: data.cashRevenue,
      totalRevenue: data.totalRevenue,
      completedReceipts: data.completedReceipts,
      pendingReceipts: data.pendingReceipts,
      rakeConfirmed: true,
    }

    const existingSalesIndex = (dailySales || []).findIndex((s) => s.date === today)
    if (existingSalesIndex >= 0) {
      const updatedSales = [...(dailySales || [])]
      updatedSales[existingSalesIndex] = newSales
      await setDailySales(updatedSales)
    } else {
      await setDailySales([...(dailySales || []), newSales])
    }

    // システム設定をリセット（翌日用）
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await setSystemSettings((prev) => ({
      ...prev,
      confirmedRake: 0,
      rakeConfirmed: false,
      currentBusinessDate: tomorrow.toISOString().split("T")[0],
    }))

    // 履歴に追加
    await addHistoryEntry({
      type: "day_end",
      description: `日締め完了: ${today} (確定レーキ: ${formatCurrency(data.confirmedRake)}円, 現金売上: ${formatCurrency(data.cashRevenue)}円, 総売上: ${formatCurrency(data.totalRevenue)}円)`,
      details: {
        date: today,
        confirmedRake: data.confirmedRake,
        cashRevenue: data.cashRevenue,
        totalRevenue: data.totalRevenue,
        completedReceipts: data.completedReceipts,
        pendingReceipts: data.pendingReceipts,
      },
    })
  }

  const handleOwnerModeToggle = async (enabled: boolean) => {
    setIsOwnerMode(enabled)
    await setSystemSettings((prev) => ({
      ...prev,
      ownerMode: enabled,
    }))

    // 履歴に追加
    await addHistoryEntry({
      type: "system_setting",
      description: `オーナーモード${enabled ? "有効" : "無効"}化`,
      details: {
        ownerMode: enabled,
      },
    })
  }

  const handleShowIndividualData = (player: Player) => {
    setSelectedPlayer(player)
    setShowIndividualDataModal(true)
  }

  const handleShowHistory = (entry: HistoryEntry) => {
    setSelectedHistoryEntry(entry)
    setShowHistoryModal(true)
  }

  const handleExportCSV = async () => {
    if (!isOwnerMode) {
      alert("オーナーモードでのみ実行可能です。")
      return
    }

    const csvData = [
      ["プレイヤー名", "現在チップ", "総バイイン", "総キャッシュアウト", "総利益", "ゲーム回数", "ステータス"],
      ...(players || []).map((player) => [
        player.name,
        player.currentChips || 0,
        player.totalBuyIn || 0,
        player.totalCashOut || 0,
        player.totalProfit || 0,
        player.gameCount || 0,
        getPlayerStatus(player),
      ]),
    ]

    const csvContent = csvData.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `poker-players-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // 履歴に追加
    await addHistoryEntry({
      type: "data_export",
      description: `プレイヤーデータをCSVエクスポート (${(players || []).length}件)`,
      details: {
        exportType: "csv",
        recordCount: (players || []).length,
      },
    })
  }

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOwnerMode) {
      alert("オーナーモードでのみ実行可能です。")
      return
    }

    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target?.result as string
      const lines = text.split("\n")
      const headers = lines[0].split(",")

      if (headers[0] !== "プレイヤー名") {
        alert("CSVファイルの形式が正しくありません。")
        return
      }

      const importedPlayers: Player[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",")
        if (values.length >= 6 && values[0].trim()) {
          const player: Player = {
            id: Date.now().toString() + i,
            name: values[0].trim(),
            currentChips: Number(values[1]) || 0,
            totalBuyIn: Number(values[2]) || 0,
            totalCashOut: Number(values[3]) || 0,
            totalProfit: Number(values[4]) || 0,
            gameCount: Number(values[5]) || 0,
            status: "inactive",
            dailyHistory: [],
            stackHistory: [],
          }
          importedPlayers.push(player)
        }
      }

      if (importedPlayers.length > 0) {
        await setPlayers([...(players || []), ...importedPlayers])

        // 履歴に追加
        await addHistoryEntry({
          type: "data_import",
          description: `CSVからプレイヤーデータをインポート (${importedPlayers.length}件追加)`,
          details: {
            importType: "csv",
            recordCount: importedPlayers.length,
            playerNames: importedPlayers.map((p) => p.name),
          },
        })

        alert(`${importedPlayers.length}件のプレイヤーデータをインポートしました。`)
      } else {
        alert("インポート可能なデータが見つかりませんでした。")
      }
    }
    reader.readAsText(file)

    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleImportAllData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOwnerMode) {
      alert("オーナーモードでのみ実行可能です。")
      return
    }

    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string
        const importedData = JSON.parse(text)

        // データの整合性チェック
        if (!importedData.players || !importedData.gameSessions || !importedData.receipts) {
          alert("無効なデータファイルです。")
          return
        }

        // 確認ダイアログ
        const confirmMessage =
          `以下のデータをインポートしますか？\n\n` +
          `プレイヤー: ${importedData.players.length}件\n` +
          `セッション: ${importedData.gameSessions.length}件\n` +
          `伝票: ${importedData.receipts.length}件\n` +
          `売上データ: ${(importedData.dailySales || []).length}件\n` +
          `履歴: ${(importedData.history || []).length}件\n\n` +
          `※現在のデータは上書きされます。`

        if (confirm(confirmMessage)) {
          // データをインポート
          await setPlayers(importedData.players || [])
          await setGameSessions(importedData.gameSessions || [])
          await setReceipts(importedData.receipts || [])
          await setDailySales(importedData.dailySales || [])
          await setHistory(importedData.history || [])
          if (importedData.systemSettings) {
            await setSystemSettings(importedData.systemSettings)
          }

          // 履歴に追加
          await addHistoryEntry({
            type: "data_import",
            description: `全データをインポート (${importedData.exportDate || "不明な日付"}のバックアップ)`,
            details: {
              importType: "full_backup",
              playerCount: importedData.players.length,
              sessionCount: importedData.gameSessions.length,
              receiptCount: importedData.receipts.length,
              exportDate: importedData.exportDate,
            },
          })

          alert("データのインポートが完了しました。")
        }
      } catch (error) {
        console.error("Import error:", error)
        alert("データファイルの読み込みに失敗しました。")
      }
    }
    reader.readAsText(file)

    // ファイル入力をリセット
    if (dataImportInputRef.current) {
      dataImportInputRef.current.value = ""
    }
  }

  const handleClearAllData = async () => {
    if (!isOwnerMode) {
      alert("オーナーモードでのみ実行可能です。")
      return
    }

    if (confirm("すべてのデータを削除しますか？この操作は元に戻せません。")) {
      await setPlayers([])
      await setGameSessions([])
      await setReceipts([])
      await setDailySales([])
      await setHistory([])
      await setSystemSettings({
        confirmedRake: 0,
        rakeConfirmed: false,
        ownerMode: true,
        currentBusinessDate: new Date().toISOString().split("T")[0],
      })

      alert("すべてのデータを削除しました。")
    }
  }

  const handleBackupData = async () => {
    if (!isOwnerMode) {
      alert("オーナーモードでのみ実行可能です。")
      return
    }

    try {
      const backupData = {
        exportDate: new Date().toISOString(),
        players: players || [],
        gameSessions: gameSessions || [],
        receipts: receipts || [],
        dailySales: dailySales || [],
        history: history || [],
        systemSettings: systemSettings,
      }

      const jsonContent = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0]
      link.setAttribute("href", url)
      link.setAttribute("download", `poker-backup-${timestamp}.json`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // 履歴に追加
      await addHistoryEntry({
        type: "data_backup",
        description: `データバックアップ作成 (プレイヤー: ${(players || []).length}件, 伝票: ${(receipts || []).length}件)`,
        details: {
          backupDate: new Date().toISOString(),
          playerCount: (players || []).length,
          receiptCount: (receipts || []).length,
          sessionCount: (gameSessions || []).length,
        },
      })

      alert("データのバックアップが完了しました。")
    } catch (error) {
      console.error("Backup error:", error)
      alert("バックアップの作成に失敗しました。")
    }
  }

  // 手動データ同期ボタン
  const handleManualSync = async () => {
    if (isConnected) {
      setIsLoading(true)
      try {
        await refreshData()
        alert("データを最新に同期しました。")
      } catch (error) {
        console.error("Manual sync failed:", error)
        alert("同期に失敗しました。")
      } finally {
        setIsLoading(false)
      }
    } else {
      alert("データ共有に接続されていません。")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center">
                              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">King High Poker System ver.2</h1>
              {!isOwnerMode && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  制限モード
                </Badge>
              )}
              {/* 接続状況インジケーター */}
              <div className="ml-3 flex items-center">
                {isLoading ? (
                  <div className="flex items-center text-yellow-600">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-1"></div>
                    <span className="text-xs">同期中...</span>
                  </div>
                ) : isConnected ? (
                  <div className="flex items-center text-green-600">
                    <Wifi className="h-3 w-3 mr-1" />
                    <span className="text-xs">同期中</span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {isConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualSync}
                  disabled={isLoading}
                  className="hidden sm:flex bg-transparent"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  同期
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSetupGuideModal(true)}
                className="hidden sm:flex"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                ヘルプ
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStableSyncModal(true)}
                className="hidden sm:flex"
              >
                <Database className="h-4 w-4 mr-2" />
                データ共有
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOwnerModeModal(true)}
                className="hidden sm:flex"
              >
                <Shield className="h-4 w-4 mr-2" />
                設定
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="sm:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="sm:hidden bg-white border-b shadow-sm">
          <div className="px-4 py-3 space-y-2">
            {isConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleManualSync()
                  setShowMobileMenu(false)
                }}
                disabled={isLoading}
                className="w-full justify-start h-10"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                データ同期
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowSetupGuideModal(true)
                setShowMobileMenu(false)
              }}
              className="w-full justify-start h-10"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              ヘルプ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowStableSyncModal(true)
                setShowMobileMenu(false)
              }}
              className="w-full justify-start h-10"
            >
              <Database className="h-4 w-4 mr-2" />
              データ共有設定
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowFirebaseTestModal(true)
                setShowMobileMenu(false)
              }}
              className="w-full justify-start h-10"
            >
              <Database className="h-4 w-4 mr-2" />
              Firebase接続テスト
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowOwnerModeModal(true)
                setShowMobileMenu(false)
              }}
              className="w-full justify-start h-10"
            >
              <Shield className="h-4 w-4 mr-2" />
              設定
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">期待レーキ</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{formatCurrency(stats.expectedRake)}円</div>
              <p className="text-xs text-muted-foreground">
                完了セッション: {(gameSessions || []).filter((s) => s.status === "completed").length}件
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">現金売上</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{formatCurrency(stats.cashRevenue)}円</div>
              <p className="text-xs text-muted-foreground">
                精算済み: {dailyStats.completedReceipts}件 / 未精算: {dailyStats.pendingReceipts}件
              </p>
            </CardContent>
          </Card>
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">現在のプレイヤー</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.currentPlayers}人</div>
              <p className="text-xs text-muted-foreground">
                総プレイヤー: {clientPlayerCount}人{clientIsConnected && ` | 接続デバイス: ${clientDeviceCount}台`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4 mb-6 sm:mb-8">
          <Button
            onClick={() => setShowStartGameModal(true)}
            className="flex items-center justify-center gap-2 h-10 sm:h-9"
          >
            <Play className="h-4 w-4" />
            <span className="text-sm sm:text-base">ゲーム開始</span>
          </Button>
          <Button
            onClick={() => setShowAddPlayerModal(true)}
            variant="outline"
            className="flex items-center justify-center gap-2 h-10 sm:h-9"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm sm:text-base">プレイヤー追加</span>
          </Button>
          <Button
            onClick={() => setShowQRModal(true)}
            variant="outline"
            className="flex items-center justify-center gap-2 h-10 sm:h-9"
          >
            <QrCode className="h-4 w-4" />
            <span className="text-sm sm:text-base">QRコード</span>
          </Button>
          <Button
            onClick={() => setShowRakeModal(true)}
            variant="outline"
            className="flex items-center justify-center gap-2 h-10 sm:h-9"
          >
            <Calculator className="h-4 w-4" />
            <span className="text-sm sm:text-base">レーキ確定</span>
          </Button>

          {isOwnerMode && (
            <>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="flex items-center justify-center gap-2 h-10 sm:h-9 bg-transparent"
              >
                <Download className="h-4 w-4" />
                <span className="text-sm sm:text-base">CSV出力</span>
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex items-center justify-center gap-2 h-10 sm:h-9"
              >
                <Upload className="h-4 w-4" />
                <span className="text-sm sm:text-base">CSV取込</span>
              </Button>
              <Button
                onClick={handleBackupData}
                variant="outline"
                className="flex items-center justify-center gap-2 h-10 sm:h-9 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              >
                <Database className="h-4 w-4" />
                <span className="text-sm sm:text-base">データ保存</span>
              </Button>
              <Button
                onClick={() => dataImportInputRef.current?.click()}
                variant="outline"
                className="flex items-center justify-center gap-2 h-10 sm:h-9 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                <Database className="h-4 w-4" />
                <span className="text-sm sm:text-base">データ復元</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                style={{ display: "none" }}
              />
              <input
                ref={dataImportInputRef}
                type="file"
                accept=".json"
                onChange={handleImportAllData}
                style={{ display: "none" }}
              />
              <Button
                onClick={handleShowEndOfDay}
                variant="outline"
                className="flex items-center justify-center gap-2 h-10 sm:h-9 bg-transparent col-span-2 sm:col-span-1"
              >
                <StopCircle className="h-4 w-4" />
                <span className="text-sm sm:text-base">日締め</span>
              </Button>
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-10 sm:h-9">
            <TabsTrigger value="players" className="text-sm">
              プレイヤー
            </TabsTrigger>
            <TabsTrigger value="receipts" className="text-sm">
              伝票
            </TabsTrigger>
            {isOwnerMode && (
              <TabsTrigger value="sales" className="text-sm">
                売上
              </TabsTrigger>
            )}
            {isOwnerMode && (
              <TabsTrigger value="history" className="text-sm">
                履歴
              </TabsTrigger>
            )}
          </TabsList>

          {/* Players Tab */}
          <TabsContent value="players" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <h2 className="text-lg font-semibold">プレイヤー管理</h2>
              <Input
                placeholder="プレイヤー名で検索..."
                value={playerSearchQuery}
                onChange={(e) => setPlayerSearchQuery(e.target.value)}
                className="w-full sm:max-w-sm"
              />
            </div>
            <div className="grid gap-4">
              {clientFilteredPlayers.map((player) => {
                const displayInfo = getPlayerDisplayInfo(player)
                const currentSession = (gameSessions || []).find(
                  (s) => s.playerId === player.id && s.status === "playing",
                )

                return (
                  <Card key={player.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                            <button
                              onClick={() => handlePlayerNameClick(player)}
                              className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left truncate"
                            >
                              {editingPlayer === player.id ? (
                                <Input
                                  value={editPlayerData.name || ""}
                                  onChange={(e) => setEditPlayerData({ ...editPlayerData, name: e.target.value })}
                                  className="text-lg font-semibold"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                player.name
                              )}
                            </button>
                            <Badge variant={displayInfo.statusVariant} className="self-start sm:self-center">
                              {displayInfo.statusText}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2 break-words">{displayInfo.displayText}</p>
                          <div className="flex flex-wrap gap-2 sm:gap-4 text-sm text-gray-500">
                            <span className="whitespace-nowrap">
                              総バイイン:{" "}
                              {editingPlayer === player.id ? (
                                <Input
                                  type="number"
                                  value={editPlayerData.totalBuyIn || 0}
                                  onChange={(e) =>
                                    setEditPlayerData({ ...editPlayerData, totalBuyIn: Number(e.target.value) })
                                  }
                                  className="w-20 h-6 text-xs inline-block"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                formatCurrency(player.totalBuyIn || 0)
                              )}
                              円
                            </span>
                            <span className="whitespace-nowrap">
                              ゲーム回数:{" "}
                              {editingPlayer === player.id ? (
                                <Input
                                  type="number"
                                  value={editPlayerData.gameCount || 0}
                                  onChange={(e) =>
                                    setEditPlayerData({ ...editPlayerData, gameCount: Number(e.target.value) })
                                  }
                                  className="w-16 h-6 text-xs inline-block"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                player.gameCount || 0
                              )}
                              回
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {currentSession && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setShowEndGameModal(true)}
                              className="flex items-center gap-1 h-8 px-3"
                            >
                              <StopCircle className="h-3 w-3" />
                              <span className="hidden sm:inline">終了</span>
                            </Button>
                          )}
                          {isOwnerMode && (
                            <>
                              {editingPlayer === player.id ? (
                                <div className="flex gap-1">
                                  <Button size="sm" onClick={() => handleSavePlayer(player.id)} className="h-8 w-8 p-0">
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                    className="h-8 w-8 p-0 bg-transparent"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditPlayer(player.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-transparent">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="max-w-sm sm:max-w-md">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-base">
                                      プレイヤーを削除しますか？
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-sm">
                                      プレイヤー「{player.name}
                                      」とその関連データ（セッション、伝票）がすべて削除されます。この操作は元に戻せません。
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                    <AlertDialogCancel className="w-full sm:w-auto">キャンセル</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeletePlayer(player.id)}
                                      className="w-full sm:w-auto"
                                    >
                                      削除
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* Receipts Tab */}
          <TabsContent value="receipts" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <h2 className="text-lg font-semibold">伝票管理</h2>
            </div>
            <div className="grid gap-4">
              {(receipts || [])
                .sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime())
                .map((receipt) => (
                  <Card key={receipt.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                            <button
                              onClick={() => handleShowReceipt(receipt)}
                              className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left truncate"
                            >
                              {receipt.playerName}
                            </button>
                            <Badge
                              variant={receipt.status === "completed" ? "default" : "secondary"}
                              className="self-start sm:self-center"
                            >
                              {receipt.status === "completed" ? "精算済み" : "未精算"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 sm:gap-4 text-sm text-gray-500">
                            <span className="whitespace-nowrap">日付: {receipt.date}</span>
                            <span className="whitespace-nowrap">合計: {formatCurrency(receipt.total || 0)}円</span>
                            <span className="whitespace-nowrap">項目数: {(receipt.items || []).length}件</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShowAddOrder(receipt)}
                            className="flex items-center gap-1 h-8 px-3"
                          >
                            <Plus className="h-3 w-3" />
                            <span className="hidden sm:inline">追加</span>
                          </Button>
                          {receipt.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => handleCompleteReceipt(receipt.id)}
                              className="flex items-center gap-1 h-8 px-3"
                            >
                              <CheckCircle className="h-3 w-3" />
                              <span className="hidden sm:inline">精算</span>
                            </Button>
                          )}
                          {isOwnerMode && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-transparent">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-sm sm:max-w-md">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-base">伝票を削除しますか？</AlertDialogTitle>
                                  <AlertDialogDescription className="text-sm">
                                    伝票「{receipt.playerName}」({formatCurrency(receipt.total || 0)}
                                    円)を削除します。この操作は元に戻せません。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                  <AlertDialogCancel className="w-full sm:w-auto">キャンセル</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteReceipt(receipt.id)}
                                    className="w-full sm:w-auto"
                                  >
                                    削除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          {/* Sales Tab */}
          {isOwnerMode && (
            <TabsContent value="sales" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h2 className="text-lg font-semibold">売上管理</h2>
              </div>
              <SalesCalendar
                dailySales={dailySales || []}
                onPrintSales={handleShowSalesPrint}
                selectedDate={selectedCalendarDate}
                onDateSelect={setSelectedCalendarDate}
              />
            </TabsContent>
          )}

          {/* History Tab */}
          {isOwnerMode && (
            <TabsContent value="history" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h2 className="text-lg font-semibold">操作履歴</h2>
                <Input
                  placeholder="履歴を検索..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full sm:max-w-sm"
                />
              </div>
              <div className="grid gap-4">
                {clientFilteredHistory.map((entry) => (
                  <Card key={entry.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => handleShowHistory(entry)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left break-words"
                          >
                            {entry.description}
                          </button>
                          <div className="flex flex-wrap gap-2 sm:gap-4 text-xs text-gray-500 mt-1">
                            <span className="whitespace-nowrap">
                              {entry.timestamp.toLocaleString("ja-JP", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="whitespace-nowrap">種別: {entry.type}</span>
                            {entry.details?.playerName && (
                              <span className="whitespace-nowrap">プレイヤー: {entry.details.playerName}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShowHistory(entry)}
                            className="flex items-center gap-1 h-8 px-3"
                          >
                            <FileText className="h-3 w-3" />
                            <span className="hidden sm:inline">詳細</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Modals */}
              <AddPlayerModal
          isOpen={showAddPlayerModal}
          onCloseAction={() => setShowAddPlayerModal(false)}
          onAddPlayerAction={handleAddPlayer}
        />

      <StartGameModal
        isOpen={showStartGameModal}
        onClose={() => {
          setShowStartGameModal(false)
          setPreselectedPlayerId(null)
        }}
        onStartGame={handleStartGame}
        players={players || []}
        preselectedPlayerId={preselectedPlayerId}
      />

      <EndGameModal
        isOpen={showEndGameModal}
        onClose={() => setShowEndGameModal(false)}
        activeSessions={gameSessions || []}
        receipts={receipts || []}
        players={players || []}
        onEndGame={handleEndGame}
      />

      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        receipt={selectedReceipt}
        onUpdateReceipt={handleUpdateReceipt}
        onCompleteReceipt={handleCompleteReceipt}
        sessionStartTime={selectedSessionStartTime}
        onNavigate={handleNavigateReceipt}
        currentIndex={selectedReceiptIndex}
        totalReceipts={allReceiptsForModal.length}
        isOwnerMode={isOwnerMode}
      />

      <AddOrderModal
        isOpen={showAddOrderModal}
        onClose={() => setShowAddOrderModal(false)}
        receipt={selectedReceiptForOrder}
        onAddOrder={handleAddOrder}
        sessionStartTime={selectedSessionStartTime}
        players={players || []}
      />

      <PlayerDetailModal
        isOpen={showPlayerDetailModal}
        onClose={() => setShowPlayerDetailModal(false)}
        player={selectedPlayer}
        gameSessions={gameSessions || []}
        receipts={receipts || []}
        onUpdatePlayer={handleUpdatePlayer}
        onAddStackTransaction={handleAddStackTransaction}
        onEndGame={handleEndGame}
        isOwnerMode={isOwnerMode}
      />

      <QRCodeModal isOpen={showQRModal} onCloseAction={() => setShowQRModal(false)} mode="display" />

      <ConfirmRakeModal
        isOpen={showRakeModal}
        onClose={() => setShowRakeModal(false)}
        expectedRake={expectedRake}
        onConfirmRake={handleConfirmRake}
        currentRake={confirmedRake}
      />

      <SalesPrintModal
        isOpen={showSalesPrintModal}
        onClose={() => setShowSalesPrintModal(false)}
        dailySales={selectedDailySales ? [selectedDailySales] : []}
        players={players || []}
        receipts={receipts || []}
        gameSessions={gameSessions || []}
        playerRankings={[]}
        expectedRake={expectedRake}
        cashRevenue={dailyStats.cashRevenue}
      />

      <EndOfDayModal
        isOpen={showEndOfDayModal}
        onClose={() => setShowEndOfDayModal(false)}
        onEndOfDay={handleEndOfDay}
        expectedRake={expectedRake}
        cashRevenue={dailyStats.cashRevenue}
        completedReceipts={dailyStats.completedReceipts}
        pendingReceipts={dailyStats.pendingReceipts}
        receipts={receipts || []}
        players={players || []}
        gameSessions={gameSessions || []}
        dailySales={dailySales || []}
        history={history || []}
        systemSettings={systemSettings}
      />

      <OwnerModeModal
        isOpen={showOwnerModeModal}
        onClose={() => setShowOwnerModeModal(false)}
        isOwnerMode={isOwnerMode}
        onToggleOwnerMode={handleOwnerModeToggle}
      />

      <IndividualDataModal
        isOpen={showIndividualDataModal}
        onClose={() => setShowIndividualDataModal(false)}
        players={selectedPlayer ? [selectedPlayer] : []}
        receipts={receipts || []}
        sessions={gameSessions || []}
      />

      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        entry={selectedHistoryEntry}
        onEdit={() => {}}
      />

      <SetupGuideModal isOpen={showSetupGuideModal} onClose={() => setShowSetupGuideModal(false)} />

      <StableSyncModal
        isOpen={showStableSyncModal}
        onCloseAction={() => setShowStableSyncModal(false)}
        connectedDevices={Array.isArray(connectedDevices) ? connectedDevices.map(d => typeof d === 'string' ? d : d.id) : []}
        onUpdateConnectedDevices={ids => {
          // Firebase同期では接続者管理は自動で行われるため、ここでは何もしない
          console.log("Connected devices updated:", ids)
        }}
      />

      <FirebaseTestModal
        isOpen={showFirebaseTestModal}
        onCloseAction={() => setShowFirebaseTestModal(false)}
      />


    </div>
  )
}
