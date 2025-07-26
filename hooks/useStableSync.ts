"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { stableSyncManager } from "@/lib/stableSync"
import { localStorageUtils } from "@/lib/utils"
import type { StableSyncResult, ServerData, SyncParticipant } from "@/types"

export function useStableSync(): StableSyncResult {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [serverData, setServerData] = useState<ServerData | null>(null)
  const [connectedDevices, setConnectedDevices] = useState<SyncParticipant[]>([])
  const [syncVersion, setSyncVersion] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    console.log("useStableSync hook initialized")

    // stableSyncManagerが利用可能でない場合は早期リターン
    if (!stableSyncManager) {
      console.log("StableSyncManager not available")
      return
    }

    const handleDataUpdate = async (data: ServerData) => {
      if (!mountedRef.current || !stableSyncManager) return

      console.log("Data update received:", data)
      setServerData(data)
      setSyncVersion(stableSyncManager.getCurrentVersion())
      setLastError(null)

      // デバッグ情報を更新
      if (process.env.NODE_ENV === "development") {
        const debug = await stableSyncManager.getDebugInfo()
        setDebugInfo(debug)
      }
    }

    const handleParticipantsUpdate = (participants: SyncParticipant[]) => {
      if (!mountedRef.current) return

      console.log("Participants update received:", participants)
      setConnectedDevices(participants)
    }

    if (stableSyncManager) {
      stableSyncManager.on("data_update", handleDataUpdate)
      stableSyncManager.on("participants_update", handleParticipantsUpdate)
    }

    return () => {
      mountedRef.current = false
    }
  }, [])

  const saveToServer = useCallback(async (dataType: keyof ServerData, data: any) => {
    console.log(`Saving to server: ${dataType}`, data)

    if (!stableSyncManager || !stableSyncManager.isConnected()) {
      console.log("Not connected - cannot save to server")
      return false
    }

    try {
      const success = await stableSyncManager.updateData(dataType, data)
      if (success && mountedRef.current) {
        // 保存後に最新データを取得して状態を更新
        const latestData = await stableSyncManager.getData()
        if (latestData) {
          setServerData(latestData)
          setSyncVersion(stableSyncManager.getCurrentVersion())
        }
        setLastError(null)

        // デバッグ情報を更新
        if (process.env.NODE_ENV === "development") {
          const debug = await stableSyncManager.getDebugInfo()
          setDebugInfo(debug)
        }
      } else if (mountedRef.current) {
        setLastError("データの保存に失敗しました")
      }
      return success
    } catch (error) {
      console.error("Failed to save to server:", error)
      if (mountedRef.current) {
        setLastError("サーバーへの保存中にエラーが発生しました")
      }
      return false
    }
  }, [])

  const refreshData = useCallback(async () => {
    console.log("Refreshing data...")
    setIsLoading(true)
    setLastError(null)

    try {
      if (stableSyncManager && stableSyncManager.isConnected()) {
        const data = await stableSyncManager.getData()
        console.log("Refreshed data:", data)
        if (data && mountedRef.current) {
          setServerData(data)
          setSyncVersion(stableSyncManager.getCurrentVersion())
        }

        // デバッグ情報を更新
        if (process.env.NODE_ENV === "development") {
          const debug = await stableSyncManager.getDebugInfo()
          setDebugInfo(debug)
        }
      }
    } catch (error) {
      console.error("Failed to refresh data:", error)
      if (mountedRef.current) {
        setLastError("データの更新に失敗しました")
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
    return true
  }, [])

  const startHost = useCallback(async (roomId: string) => {
    console.log("Starting host for room:", roomId)
    setIsLoading(true)
    setLastError(null)

    if (!stableSyncManager) {
      setLastError("StableSyncManager not available")
      setIsLoading(false)
      return false
    }

    try {
      const newRoomId = await stableSyncManager.startHost("ホスト")
      if (newRoomId && mountedRef.current) {
        setIsConnected(true)
        setRoomId(newRoomId)
        setIsHost(true)
        setLastError(null)

        // 初期データを設定
        const initialData = localStorageUtils.initializeServerData()
        if (initialData) {
          setServerData(initialData)
          await stableSyncManager.updateData("players", initialData.players)
          await stableSyncManager.updateData("sessions", initialData.sessions)
          await stableSyncManager.updateData("receipts", initialData.receipts)
          await stableSyncManager.updateData("dailySales", initialData.dailySales)
          await stableSyncManager.updateData("history", initialData.history)
          await stableSyncManager.updateData("settings", initialData.settings)
        }

        // デバッグ情報を更新
        if (process.env.NODE_ENV === "development") {
          const debug = await stableSyncManager.getDebugInfo()
          setDebugInfo(debug)
        }
      } else if (mountedRef.current) {
        setLastError("ルームの作成に失敗しました")
      }
      return !!newRoomId
    } catch (error) {
      console.error("Failed to start host:", error)
      if (mountedRef.current) {
        setLastError("ホスト開始中にエラーが発生しました")
      }
      return false
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  const joinRoom = useCallback(async (roomId: string, participantName?: string) => {
    console.log("Joining room:", roomId, "as:", participantName || "匿名ユーザー")
    setIsLoading(true)
    setLastError(null)

    if (!stableSyncManager) {
      setLastError("StableSyncManager not available")
      setIsLoading(false)
      return false
    }

    try {
      const success = await stableSyncManager.joinRoom(roomId, participantName)
      if (success && mountedRef.current) {
        setIsConnected(true)
        setRoomId(roomId)
        setIsHost(false)
        setLastError(null)

        // ルームのデータを取得
        const data = await stableSyncManager.getData()
        if (data) {
          setServerData(data)
          setSyncVersion(stableSyncManager.getCurrentVersion())
        }

        // デバッグ情報を更新
        if (process.env.NODE_ENV === "development") {
          const debug = await stableSyncManager.getDebugInfo()
          setDebugInfo(debug)
        }
      } else if (mountedRef.current) {
        setLastError("ルームへの参加に失敗しました")
      }
      return success
    } catch (error) {
      console.error("Failed to join room:", error)
      if (mountedRef.current) {
        setLastError("ルーム参加中にエラーが発生しました")
      }
      return false
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  const leaveRoom = useCallback(async () => {
    console.log("Leaving room...")
    setIsLoading(true)

    if (!stableSyncManager) {
      setIsLoading(false)
      return
    }

    try {
      await stableSyncManager.leaveRoom()
      if (mountedRef.current) {
        setIsConnected(false)
        setRoomId(null)
        setIsHost(false)
        setServerData(null)
        setConnectedDevices([])
        setSyncVersion(0)
        setLastError(null)
        setDebugInfo(null)
      }
    } catch (error) {
      console.error("Failed to leave room:", error)
      if (mountedRef.current) {
        setLastError("ルームからの退出中にエラーが発生しました")
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  const updateConnectedDevices = useCallback((devices: SyncParticipant[]) => {
    console.log("Updating connected devices:", devices)
    if (mountedRef.current) {
      setConnectedDevices(devices)
    }
  }, [])

  // データの整合性チェック
  const checkDataIntegrity = useCallback(async () => {
    if (!stableSyncManager || !stableSyncManager.isConnected()) return false

    try {
      const serverVersion = stableSyncManager.getCurrentVersion()
      const isUpToDate = syncVersion === serverVersion

      if (!isUpToDate && mountedRef.current) {
        console.log("Data out of sync, refreshing...")
        await refreshData()
      }

      return isUpToDate
    } catch (error) {
      console.error("Failed to check data integrity:", error)
      if (mountedRef.current) {
        setLastError("データ整合性チェックに失敗しました")
      }
      return false
    }
  }, [syncVersion, refreshData])

  // エラーをクリア
  const clearError = useCallback(() => {
    setLastError(null)
  }, [])

  // デバッグ情報を手動更新
  const updateDebugInfo = useCallback(async () => {
    if (process.env.NODE_ENV === "development" && stableSyncManager) {
      try {
        const debug = await stableSyncManager.getDebugInfo()
        setDebugInfo(debug)
      } catch (error) {
        console.error("Failed to update debug info:", error)
      }
    }
  }, [])

  return {
    isConnected,
    isLoading,
    serverData,
    connectedDevices,
    syncVersion,
    lastError,
    roomId,
    isHost,
    debugInfo,
    saveToServer,
    refreshData,
    startHost,
    joinRoom,
    leaveRoom,
    updateConnectedDevices,
    checkDataIntegrity,
    clearError,
    updateDebugInfo,
  }
}
