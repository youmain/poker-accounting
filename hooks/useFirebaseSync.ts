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

        // Firebaseに保存
        if (isConnected) {
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
    [isConnected],
  )

  // 新しいセッションを作成（ホスト）
  const createNewSession = useCallback(async () => {
    setIsLoading(true)
    try {
      // 新しいセッションIDを生成
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      setSessionId(newSessionId)

      // ローカルデータを初期化してFirebaseに保存
      const initialData = initializeFromLocalStorage()
      if (initialData) {
        await Promise.all([
          firebaseManager.saveData("players", initialData.players),
          firebaseManager.saveData("sessions", initialData.sessions),
          firebaseManager.saveData("receipts", initialData.receipts),
          firebaseManager.saveData("dailySales", initialData.dailySales),
          firebaseManager.saveData("history", initialData.history),
          firebaseManager.saveData("settings", initialData.settings),
        ])
        setServerData(initialData)
      }

      setIsConnected(true)
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
      // セッションIDを設定
      setSessionId(sessionId)

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
      } catch (error) {
        console.error("初期化エラー:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initialize()
  }, [initializeFromLocalStorage])

  return {
    isConnected,
    isLoading,
    serverData,
    sessionId,
    connectedDevices,
    saveToServer,
    createNewSession,
    joinSession,
    refreshData,
  }
}
