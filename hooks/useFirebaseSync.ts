"use client"

import { useState, useEffect, useCallback } from "react"
import { firebaseManager } from "@/lib/firebase"
import { localStorageUtils } from "@/lib/utils"
import type { FirebaseSyncResult, ServerData } from "@/types"

export function useFirebaseSync(): FirebaseSyncResult {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [serverData, setServerData] = useState<ServerData | null>(null)
  const [sessionId, setSessionId] = useState<string>("")
  const [connectedDevices, setConnectedDevices] = useState<number>(0)
  const [isHost, setIsHost] = useState(false)

  // ローカルストレージからデータを初期化（共通ユーティリティ使用）
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
        // ローカルストレージにも保存
        localStorageUtils.saveDataType(type, data)

        // Firebaseに保存（ホストのみが書き込み可能）
        if (isConnected && isHost) {
          await firebaseManager.saveData(type, data)
        }

        // ローカルのステートも更新
        setServerData((prev: ServerData | null) => {
          if (!prev) return prev
          return {
            ...prev,
            [type]: data,
          }
        })

        return true
      } catch (error) {
        console.error(`データ保存エラー (${type}):`, error)
        return false
      }
    },
    [isConnected, isHost],
  )

  // 新しいセッションを作成（ホスト）
  const createNewSession = useCallback(async () => {
    console.log("=== createNewSession START ===")
    setIsLoading(true)
    try {
      // Firebase認証を実行
      await firebaseManager.signInAnonymously()
      console.log("Firebase authentication completed")
      
      // 新しいセッションIDを生成
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      console.log("Generated sessionId:", newSessionId)
      
      setSessionId(newSessionId)
      setIsHost(true) // ホストとして設定
      console.log("Set sessionId and isHost")

      // ローカルデータを初期化してFirebaseに保存
      const initialData = initializeFromLocalStorage()
      if (initialData) {
        console.log("Saving initial data to Firebase")
        await Promise.all([
          firebaseManager.saveData("players", initialData.players),
          firebaseManager.saveData("sessions", initialData.sessions),
          firebaseManager.saveData("receipts", initialData.receipts),
          firebaseManager.saveData("dailySales", initialData.dailySales),
          firebaseManager.saveData("history", initialData.history),
          firebaseManager.saveData("settings", initialData.settings),
        ])
        setServerData(initialData)
        console.log("Initial data saved and set")
      }

      setIsConnected(true)
      setConnectedDevices(1) // ホスト1台
      console.log("=== createNewSession COMPLETED ===")
      console.log("Final state - sessionId:", newSessionId, "isHost: true, isConnected: true")
      return newSessionId
    } catch (error) {
      console.error("セッション作成エラー:", error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [initializeFromLocalStorage])

  // 既存のセッションに参加（クライアント）
  const joinSession = useCallback(async (sessionId: string) => {
    setIsLoading(true)
    try {
      // Firebase認証を実行
      await firebaseManager.signInAnonymously()
      
      // セッションIDを設定
      setSessionId(sessionId)
      setIsHost(false) // 参加者として設定

      // Firebaseからデータを取得
      const players = await firebaseManager.getData("players")
      const sessions = await firebaseManager.getData("sessions")
      const receipts = await firebaseManager.getData("receipts")
      const dailySales = await firebaseManager.getData("dailySales")
      const history = await firebaseManager.getData("history")
      const settings = await firebaseManager.getData("settings")

      const firebaseData: ServerData = {
        players: players || [],
        sessions: sessions || [],
        receipts: receipts || [],
        dailySales: dailySales || [],
        history: history || [],
        settings: settings[0] || localStorageUtils.initializeServerData().settings,
      }

      setServerData(firebaseData)
      setIsConnected(true)
      // 参加者の場合は、既存の接続数に1を加算
      setConnectedDevices(prev => prev + 1)
      return true
    } catch (error) {
      console.error("セッション参加エラー:", error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // データをリフレッシュ
  const refreshData = useCallback(async () => {
    if (!isConnected) return false

    try {
      const players = await firebaseManager.getData("players")
      const sessions = await firebaseManager.getData("sessions")
      const receipts = await firebaseManager.getData("receipts")
      const dailySales = await firebaseManager.getData("dailySales")
      const history = await firebaseManager.getData("history")
      const settings = await firebaseManager.getData("settings")

      const firebaseData: ServerData = {
        players: players || [],
        sessions: sessions || [],
        receipts: receipts || [],
        dailySales: dailySales || [],
        history: history || [],
        settings: settings[0] || localStorageUtils.initializeServerData().settings,
      }

      setServerData(firebaseData)
      return true
    } catch (error) {
      console.error("データリフレッシュエラー:", error)
      return false
    }
  }, [isConnected])

  // セッションから退出
  const leaveSession = useCallback(async () => {
    try {
      setIsConnected(false)
      setIsHost(false) // ホスト状態もリセット
      setSessionId("")
      setConnectedDevices(0)
      // ローカルデータで初期化
      const localData = initializeFromLocalStorage()
      setServerData(localData)
    } catch (error) {
      console.error("セッション退出エラー:", error)
    }
  }, [initializeFromLocalStorage])

  // 接続状態を更新
  const updateConnectedDevices = useCallback((count: number) => {
    setConnectedDevices(count)
  }, [])

  // 初期化
  useEffect(() => {
    const initialize = async () => {
      try {
        // ローカルデータで初期化
        const localData = initializeFromLocalStorage()
        setServerData(localData)
        setIsConnected(false) // 初期状態はオフライン
        setIsHost(false) // 初期状態は参加者
        setConnectedDevices(0) // 初期状態は0台
      } catch (error) {
        console.error("初期化エラー:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initialize()
  }, [initializeFromLocalStorage])

  // Firebaseリアルタイム同期の設定
  useEffect(() => {
    if (!sessionId || !isConnected) return

    console.log("Setting up Firebase real-time listeners for session:", sessionId)
    
    // 接続デバイス数の監視
    const updateConnectedDevicesCount = async () => {
      try {
        // 実際の接続数を取得（簡易版）
        const connectedCount = isHost ? 1 : 2 // ホスト1台 + 参加者1台
        setConnectedDevices(connectedCount)
        console.log("Updated connected devices count:", connectedCount)
      } catch (error) {
        console.error("接続デバイス数更新エラー:", error)
      }
    }

    // 初期接続数設定
    updateConnectedDevicesCount()

    // 定期的に接続数を更新（簡易版）
    const interval = setInterval(updateConnectedDevicesCount, 5000)

    return () => {
      clearInterval(interval)
      console.log("Cleaned up Firebase real-time listeners")
    }
  }, [sessionId, isConnected, isHost])

  // 接続状態の監視（一時的に無効化）
  // useEffect(() => {
  //   if (!isConnected && sessionId) {
  //     // 接続が切れた場合、セッション状態をリセット
  //     setSessionId("")
  //     setIsHost(false)
  //     setConnectedDevices(0)
  //   }
  // }, [isConnected, sessionId])

  return {
    isConnected,
    isLoading,
    serverData,
    sessionId,
    connectedDevices,
    isHost,
    saveToServer,
    createNewSession,
    joinSession,
    leaveSession,
    refreshData,
  }
}
