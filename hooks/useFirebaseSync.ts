"use client"

import { useState, useEffect, useCallback } from "react"
import { firebaseManager } from "@/lib/firebase"
import { localStorageUtils } from "@/lib/utils"
import type { FirebaseSyncResult, ServerData } from "@/types"
import type { ConnectedUser } from "@/lib/firebase"

export function useFirebaseSync(): FirebaseSyncResult {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [serverData, setServerData] = useState<ServerData | null>(null)
  const [sessionId, setSessionId] = useState<string>("")
  const [connectedDevices, setConnectedDevices] = useState<number>(0)
  const [isHost, setIsHost] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([])
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [syncProgress, setSyncProgress] = useState<{
    isSyncing: boolean
    currentStep: string
    totalSteps: number
    currentStepIndex: number
  } | null>(null)

  // ローカルストレージからデータを初期化
  const initializeFromLocalStorage = useCallback(() => {
    try {
      return localStorageUtils.initializeServerData()
    } catch (error) {
      console.error("ローカルストレージからの初期化エラー:", error)
      return null
    }
  }, [])

  // Firebaseにデータを保存
  const saveToServer = useCallback(
    async (type: keyof ServerData, data: any) => {
      try {
        console.log(`=== saveToServer called ===`)
        console.log(`Type: ${type}`)
        console.log(`Data:`, data)
        console.log(`isConnected: ${isConnected}`)
        console.log(`sessionId: ${sessionId}`)
        console.log(`Timestamp: ${new Date().toLocaleTimeString()}`)
        
        localStorageUtils.saveDataType(type, data)
        console.log(`Data saved to local storage`)

        if (isConnected && sessionId) {
          console.log(`Calling firebaseManager.saveSessionData...`)
          console.log(`Saving to session: ${sessionId}`)
          console.log(`Document ID will be: ${sessionId}-${type}`)
          
          await firebaseManager.saveSessionData(type, data, sessionId)
          console.log(`${type} data saved to Firebase session ${sessionId} successfully`)
          console.log(`Firebase save completed at: ${new Date().toLocaleTimeString()}`)
          
          setLastSyncTime(new Date())
          console.log(`Last sync time updated to: ${new Date().toLocaleTimeString()}`)
        } else {
          console.log(`Not connected to Firebase or no sessionId, skipping ${type} save`)
          console.log(`isConnected: ${isConnected}, sessionId: ${sessionId}`)
        }
        
        setServerData((prev: ServerData | null) => {
          if (!prev) return prev
          const newData = {
            ...prev,
            [type]: data,
          }
          console.log(`Local serverData updated for ${type}`)
          console.log(`New serverData:`, newData)
          return newData
        })
        console.log(`Local serverData updated`)
        return true
      } catch (error) {
        console.error(`データ保存エラー (${type}):`, error)
        console.error(`Error details:`, {
          type,
          sessionId,
          isConnected,
          error: error instanceof Error ? error.message : String(error)
        })
        return false
      }
    },
    [isConnected, isHost, sessionId],
  )

  // オーナーの全データを取得して同期
  const fetchAndSyncOwnerData = useCallback(async (targetSessionId: string) => {
    console.log("=== fetchAndSyncOwnerData START ===")
    console.log("Fetching owner data for session:", targetSessionId)
    
    // 進行状況表示を開始
    setSyncProgress({
      isSyncing: true,
      currentStep: "ホストのデータを受信中...",
      totalSteps: 1,
      currentStepIndex: 0
    })
    
    try {
      // 全データを一度に取得
      const [players, receipts, sessions, dailySales, history, settings] = await Promise.all([
        firebaseManager.getSessionData('players', targetSessionId),
        firebaseManager.getSessionData('receipts', targetSessionId),
        firebaseManager.getSessionData('sessions', targetSessionId),
        firebaseManager.getSessionData('dailySales', targetSessionId),
        firebaseManager.getSessionData('history', targetSessionId),
        firebaseManager.getSessionData('settings', targetSessionId)
      ])

      // ローカルストレージに保存
      const ownerData = { 
        players, 
        receipts, 
        sessions, 
        dailySales, 
        history, 
        settings: settings && settings.length > 0 ? settings[0] : null 
      }
      
      console.log("=== 受信したデータ ===")
      console.log("players:", players?.length || 0, "件")
      console.log("receipts:", receipts?.length || 0, "件")
      console.log("sessions:", sessions?.length || 0, "件")
      console.log("dailySales:", dailySales?.length || 0, "件")
      console.log("history:", history?.length || 0, "件")
      console.log("settings:", settings ? "あり" : "なし")
      
      // 直接setServerDataを呼び出してUIを更新
      console.log("=== setServerDataを直接呼び出し ===")
      setServerData(ownerData)
      console.log("serverData updated with owner data")
      console.log("Owner data details:", {
        players: ownerData.players?.length || 0,
        receipts: ownerData.receipts?.length || 0,
        sessions: ownerData.sessions?.length || 0,
        dailySales: ownerData.dailySales?.length || 0,
        history: ownerData.history?.length || 0
      })
      
      // 即座にserverDataの状態を確認
      setTimeout(() => {
        console.log("=== serverData state check after setServerData ===")
        console.log("serverData should now be loaded with owner data")
      }, 100)
      
      // ローカルストレージにも保存
      localStorageUtils.saveReceivedData(ownerData, setServerData)
      console.log("Data saved to localStorage")

      // 最終同期時刻を更新
      setLastSyncTime(new Date())
      console.log("Last sync time updated")

      // 進行状況表示を完了
      setSyncProgress({
        isSyncing: false,
        currentStep: "データ受信完了",
        totalSteps: 1,
        currentStepIndex: 1
      })

      console.log("All owner data synchronized successfully")
      console.log("=== fetchAndSyncOwnerData COMPLETED ===")
      return true
    } catch (error) {
      console.error("Owner data sync error:", error)
      setSyncProgress(null)
      return false
    }
  }, [])

  // 新しいセッションを作成（ホスト用）
  const createNewSession = useCallback(async (hostName?: string) => {
    console.log("=== createNewSession START ===")
    console.log("Host name:", hostName)
    
    try {
      // Firebase認証
      await firebaseManager.signInAnonymously()
      
      // セッションID生成
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      console.log("Generated session ID:", newSessionId)
      
      // 初期データをFirebaseに保存
      const initialData = initializeFromLocalStorage()
      if (initialData) {
        await firebaseManager.saveSessionData('players', initialData.players || [], newSessionId)
        await firebaseManager.saveSessionData('receipts', initialData.receipts || [], newSessionId)
        await firebaseManager.saveSessionData('sessions', initialData.sessions || [], newSessionId)
        await firebaseManager.saveSessionData('dailySales', initialData.dailySales || [], newSessionId)
        await firebaseManager.saveSessionData('history', initialData.history || [], newSessionId)
        await firebaseManager.saveSessionData('settings', [initialData.settings], newSessionId)
      }

      // 接続者として追加
      await firebaseManager.addConnectedUser({
        name: hostName || "ホスト",
        isHost: true,
        deviceId: `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sessionId: newSessionId
      })

      setSessionId(newSessionId)
      setIsHost(true)
      setIsConnected(true)
      setServerData(initialData)

      console.log("=== createNewSession COMPLETED ===")
      return newSessionId
    } catch (error) {
      console.error("セッション作成エラー:", error)
      return null
    }
  }, [initializeFromLocalStorage])

  // 既存のセッションに参加（クライアント）
  const joinSession = useCallback(async (targetSessionId: string) => {
    console.log("=== joinSession CALLED ===")
    console.log("Session ID:", targetSessionId)
    
    setIsLoading(true)
    
    // URLパラメータから名前を取得
    const urlParams = new URLSearchParams(window.location.search)
    const participantName = urlParams.get('name') || "参加者"
    console.log("Participant name from URL:", participantName)
    
    try {
      console.log("=== joinSession START ===")
      console.log("Joining session:", targetSessionId)
      console.log("Participant name:", participantName)
      
      // 参加者向けの進行状況表示を開始
      setSyncProgress({
        isSyncing: true,
        currentStep: `${participantName}さんこんにちは、ホストのデータを受信します。`,
        totalSteps: 3,
        currentStepIndex: 0
      })
      
      // Firebase認証を実行
      await firebaseManager.signInAnonymously()
      console.log("Firebase authentication completed")
      
      // 進行状況を更新
      setSyncProgress({
        isSyncing: true,
        currentStep: "セッションに接続中...",
        totalSteps: 3,
        currentStepIndex: 1
      })
      
      // セッションIDを設定
      setSessionId(targetSessionId)
      setIsHost(false) // 参加者として設定
      console.log("Set sessionId and isHost: false")

      // 進行状況を更新
      setSyncProgress({
        isSyncing: true,
        currentStep: "ホストのデータを受信中...",
        totalSteps: 3,
        currentStepIndex: 2
      })
      
      // オーナーのデータを取得して同期
      console.log("=== 参加者としてセッションに参加 ===")
      console.log("Participant name:", participantName)
      console.log("Session ID:", targetSessionId)
      
      const syncSuccess = await fetchAndSyncOwnerData(targetSessionId)
      console.log("fetchAndSyncOwnerData result:", syncSuccess)
      
      if (syncSuccess) {
        console.log("✅ Owner data sync completed successfully")
        console.log("serverData should now contain owner's data")
      } else {
        console.log("❌ Owner data sync failed")
      }

      setIsConnected(true)
      setConnectedDevices(1) // 初期は1台（自分だけ）
      
      console.log("Initial data synced and set")
      
      // 進行状況を完了
      setSyncProgress({
        isSyncing: false,
        currentStep: "接続完了",
        totalSteps: 3,
        currentStepIndex: 3
      })
      
      // 接続者として追加
      await firebaseManager.addConnectedUser({
        name: participantName,
        isHost: false,
        deviceId: `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sessionId: targetSessionId
      })
      console.log("Connected user added successfully")

      console.log("=== joinSession COMPLETED ===")
      console.log("Final state - sessionId:", targetSessionId, "isHost: false, isConnected: true")
      return true
    } catch (error) {
      console.error("セッション参加エラー:", error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [fetchAndSyncOwnerData])

  // セッションを離脱
  const leaveSession = useCallback(async () => {
    console.log("=== leaveSession ===")
    if (sessionId) {
      try {
        // 接続者リストから削除
        await firebaseManager.removeConnectedUser()
        console.log("Removed from connected users")
      } catch (error) {
        console.error("接続者削除エラー:", error)
      }
    }
    
    setSessionId("")
    setIsConnected(false)
    setIsHost(false)
    setConnectedDevices(0)
    setConnectedUsers([])
    setServerData(null) // serverDataをリセット
    setLastSyncTime(null) // lastSyncTimeをリセット
    setSyncProgress(null)
    console.log("Session left successfully")
  }, [sessionId])

  // データを再読み込み
  const refreshData = useCallback(async () => {
    console.log("=== refreshData ===")
    const localData = initializeFromLocalStorage()
    if (localData) {
      setServerData(localData)
      console.log("Data refreshed from local storage")
      return true
    }
    return false
  }, [initializeFromLocalStorage])

  // 他のユーザーを切断（ホストのみ）
  const disconnectUser = useCallback(async (targetUid: string): Promise<boolean> => {
    console.log("=== disconnectUser called ===")
    console.log("Target UID:", targetUid)
    console.log("isHost:", isHost)
    
    if (!isHost) {
      console.error("Only host can disconnect users")
      return false
    }
    
    try {
      await firebaseManager.disconnectUser(targetUid)
      console.log("User disconnected successfully")
      return true
    } catch (error) {
      console.error("Failed to disconnect user:", error)
      return false
    }
  }, [isHost])

  // 初期化
  useEffect(() => {
    const initialize = async () => {
      console.log("=== useFirebaseSync initialize ===")
      
      try {
        // ローカルストレージから初期データを読み込み
        const localData = initializeFromLocalStorage()
        if (localData) {
          setServerData(localData)
          console.log("Initial data loaded from local storage")
          console.log("Initial data:", {
            players: localData.players?.length || 0,
            receipts: localData.receipts?.length || 0,
            sessions: localData.sessions?.length || 0,
            dailySales: localData.dailySales?.length || 0,
            history: localData.history?.length || 0
          })
        } else {
          console.log("No local data found")
        }
      } catch (error) {
        console.error("初期化エラー:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initialize()
  }, [initializeFromLocalStorage])

  // 接続状態の監視
  useEffect(() => {
    console.log("=== Connection state check ===")
    console.log("isConnected:", isConnected)
    console.log("sessionId:", sessionId)
    console.log("isHost:", isHost)
    console.log("serverData:", serverData ? "loaded" : "null")
  }, [isConnected, sessionId, isHost, serverData])

  // リアルタイムリスナー設定
  useEffect(() => {
    console.log("=== Real-time listener setup check ===")
    console.log("sessionId:", sessionId)
    console.log("isConnected:", isConnected)
    console.log("isHost:", isHost)
    
    if (!sessionId || !isConnected) {
      console.log("❌ Firebase real-time listeners not set up - sessionId:", sessionId, "isConnected:", isConnected)
      return
    }

    console.log("✅ Setting up Firebase real-time listeners for session:", sessionId, "isHost:", isHost)

    // 接続者一覧の監視
    const unsubscribeUsers = firebaseManager.onConnectedUsersChange(sessionId, (users) => {
      console.log("=== Connected users updated ===")
      console.log("Users count:", users.length)
      console.log("Users:", users)
      setConnectedUsers(users)
      setConnectedDevices(users.length)
    })

    // プレイヤーデータの監視
    const unsubscribePlayers = firebaseManager.onSessionDataChange('players', sessionId, (data) => {
      console.log("=== Players session data updated ===")
      console.log("Data received:", data)
      console.log("Data length:", data.length)
      console.log("Previous serverData players:", serverData?.players?.length || 0)
      console.log("Timestamp:", new Date().toLocaleTimeString())
      setServerData(prev => {
        const newData = prev ? { ...prev, players: data } : { 
          players: data, 
          sessions: [], 
          receipts: [], 
          dailySales: [], 
          history: [], 
          settings: {
            confirmedRake: 0,
            rakeConfirmed: false,
            ownerMode: true,
            currentBusinessDate: new Date().toISOString().split("T")[0]
          }
        }
        console.log("New serverData players count:", newData.players.length)
        return newData
      })
      localStorageUtils.saveDataType('players', data)
      setLastSyncTime(new Date())
      console.log("Last sync time updated to:", new Date().toLocaleTimeString())
    })

    // セッションデータの監視
    const unsubscribeSessions = firebaseManager.onSessionDataChange('sessions', sessionId, (data) => {
      console.log("=== Sessions session data updated ===")
      console.log("Sessions:", data)
      setServerData(prev => prev ? { ...prev, sessions: data } : { 
        players: [], 
        sessions: data, 
        receipts: [], 
        dailySales: [], 
        history: [], 
        settings: {
          confirmedRake: 0,
          rakeConfirmed: false,
          ownerMode: true,
          currentBusinessDate: new Date().toISOString().split("T")[0]
        }
      })
      localStorageUtils.saveDataType('sessions', data)
      setLastSyncTime(new Date())
    })

    // 伝票データの監視
    const unsubscribeReceipts = firebaseManager.onSessionDataChange('receipts', sessionId, (data) => {
      console.log("=== Receipts session data updated ===")
      console.log("Receipts:", data)
      setServerData(prev => prev ? { ...prev, receipts: data } : { 
        players: [], 
        sessions: [], 
        receipts: data, 
        dailySales: [], 
        history: [], 
        settings: {
          confirmedRake: 0,
          rakeConfirmed: false,
          ownerMode: true,
          currentBusinessDate: new Date().toISOString().split("T")[0]
        }
      })
      localStorageUtils.saveDataType('receipts', data)
      setLastSyncTime(new Date())
    })

    // 売上データの監視
    const unsubscribeDailySales = firebaseManager.onSessionDataChange('dailySales', sessionId, (data) => {
      console.log("=== DailySales session data updated ===")
      console.log("DailySales:", data)
      setServerData(prev => prev ? { ...prev, dailySales: data } : { 
        players: [], 
        sessions: [], 
        receipts: [], 
        dailySales: data, 
        history: [], 
        settings: {
          confirmedRake: 0,
          rakeConfirmed: false,
          ownerMode: true,
          currentBusinessDate: new Date().toISOString().split("T")[0]
        }
      })
      localStorageUtils.saveDataType('dailySales', data)
      setLastSyncTime(new Date())
    })

    // 履歴データの監視
    const unsubscribeHistory = firebaseManager.onSessionDataChange('history', sessionId, (data) => {
      console.log("=== History session data updated ===")
      console.log("History:", data)
      setServerData(prev => prev ? { ...prev, history: data } : { 
        players: [], 
        sessions: [], 
        receipts: [], 
        dailySales: [], 
        history: data, 
        settings: {
          confirmedRake: 0,
          rakeConfirmed: false,
          ownerMode: true,
          currentBusinessDate: new Date().toISOString().split("T")[0]
        }
      })
      localStorageUtils.saveDataType('history', data)
      setLastSyncTime(new Date())
    })

    // 設定データの監視
    const unsubscribeSettings = firebaseManager.onSessionDataChange('settings', sessionId, (data) => {
      console.log("=== Settings session data updated ===")
      console.log("Settings:", data)
      const settingsData = data && data.length > 0 ? data[0] : {
        confirmedRake: 0,
        rakeConfirmed: false,
        ownerMode: true,
        currentBusinessDate: new Date().toISOString().split("T")[0]
      }
      setServerData(prev => prev ? { ...prev, settings: settingsData } : { 
        players: [], 
        sessions: [], 
        receipts: [], 
        dailySales: [], 
        history: [], 
        settings: settingsData
      })
      localStorageUtils.saveDataType('settings', settingsData)
      setLastSyncTime(new Date())
    })

    console.log("✅ All real-time listeners set up successfully")

    return () => {
      console.log("🧹 Cleaning up Firebase real-time listeners")
      unsubscribeUsers()
      unsubscribePlayers()
      unsubscribeSessions()
      unsubscribeReceipts()
      unsubscribeDailySales()
      unsubscribeHistory()
      unsubscribeSettings()
      console.log("✅ Cleaned up Firebase real-time listeners")
    }
  }, [sessionId, isConnected]) // isHostを依存配列から削除

  return {
    // 基本状態
    isConnected,
    isLoading,
    serverData,
    lastSyncTime,
    syncProgress,
    connectedUsers,
    connectedDevices,
    isHost,
    sessionId,
    firebaseConnected: isConnected,
    firebaseIsHost: isHost,

    // 基本機能
    saveToServer,
    refreshData,

    // セッション管理
    createNewSession,
    joinSession,
    leaveSession,
    disconnectUser,
  }
}
