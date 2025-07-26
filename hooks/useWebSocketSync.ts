"use client"

import { useState, useEffect, useCallback } from "react"
import { websocketSync } from "@/lib/websocketSync"
import { localStorageUtils } from "@/lib/utils"
import type { WebSocketSyncResult, ServerData } from "@/types"

export function useWebSocketSync(): WebSocketSyncResult {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isHost, setIsHost] = useState(false)
  const [serverData, setServerData] = useState<ServerData | null>(null)
  const [hostUrl, setHostUrl] = useState("")
  const [connectedDevices, setConnectedDevices] = useState(0)

  // ローカルストレージからデータを初期化（共通ユーティリティ使用）
  const initializeFromLocalStorage = useCallback(() => {
    try {
      return localStorageUtils.initializeServerData()
    } catch (error) {
      console.error("ローカルストレージからの初期化エラー:", error)
      return null
    }
  }, [])

  // データを保存
  const saveToServer = useCallback(
    async (type: keyof ServerData, data: any) => {
      try {
        // ローカルストレージに保存
        localStorageUtils.saveDataType(type, data)

        // ローカルのステートを更新
        setServerData((prev: ServerData | null) => {
          if (!prev) return prev
          return {
            ...prev,
            [type]: data,
          }
        })

        // 接続されている場合、他のデバイスに更新を送信
        if (isConnected) {
          await websocketSync.updateData(type, data)
        }

        return true
      } catch (error) {
        console.error(`データ保存エラー (${type}):`, error)
        return false
      }
    },
    [isConnected],
  )

  // ホストとして開始
  const startAsHost = useCallback(async () => {
    setIsLoading(true)
    try {
      const success = await websocketSync.startAsHost()
      if (success) {
        setIsHost(true)
        setIsConnected(true)

        // ローカルデータを初期化
        const initialData = initializeFromLocalStorage()
        if (initialData) {
          setServerData(initialData)
        }

        return true
      }
      return false
    } catch (error) {
      console.error("ホスト開始エラー:", error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [initializeFromLocalStorage])

  // クライアントとして接続
  const connectAsClient = useCallback(async (hostId: string) => {
    setIsLoading(true)
    try {
      const success = await websocketSync.connectAsClient(hostId)
      if (success) {
        setIsHost(false)
        setIsConnected(true)
        setHostUrl(hostId)
        return true
      }
      return false
    } catch (error) {
      console.error("クライアント接続エラー:", error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 接続を切断
  const disconnect = useCallback(() => {
    websocketSync.disconnect()
    setIsConnected(false)
    setIsHost(false)
    setHostUrl("")
    setConnectedDevices(0)
  }, [])

  // データを更新
  const refreshData = useCallback(async () => {
    setIsLoading(true)
    try {
      // 接続状態を更新
      const connected = websocketSync.isConnected()
      const hostMode = websocketSync.isHostMode()
      setIsConnected(connected)
      setIsHost(hostMode)
      setConnectedDevices(websocketSync.getConnectedDeviceCount())

      // ローカルデータを更新
      const data = initializeFromLocalStorage()
      if (data) {
        setServerData(data)
      }

      return true
    } catch (error) {
      console.error("データ更新エラー:", error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [initializeFromLocalStorage])

  // 初期化
  useEffect(() => {
    let mounted = true

    // イベントリスナーを設定
    websocketSync.on("host_registered", ({ hostUrl }: { hostUrl: string }) => {
      if (!mounted) return
      setHostUrl(hostUrl)
    })

    websocketSync.on("initial_data", (data: ServerData) => {
      if (!mounted) return

      console.log("初期データを受信:", data)

      // 受信したデータをローカルストレージとステートに保存
      localStorageUtils.saveReceivedData(data, setServerData)
    })

    websocketSync.on("data_update", ({ type, data }: { type: keyof ServerData; data: any }) => {
      if (!mounted) return

      console.log(`データ更新を受信: ${type}`, data)

      // 受信したデータをローカルストレージとステートに保存
      localStorageUtils.saveReceivedData({ [type]: data }, setServerData)
    })

    websocketSync.on("client_connected", () => {
      if (!mounted) return
      setConnectedDevices(websocketSync.getConnectedDeviceCount())
    })

    websocketSync.on("client_disconnected", () => {
      if (!mounted) return
      setConnectedDevices(websocketSync.getConnectedDeviceCount())
    })

    websocketSync.on("disconnected", () => {
      if (!mounted) return
      setIsConnected(false)
      setConnectedDevices(0)
    })

    // 初期データを設定
    const initialData = initializeFromLocalStorage()
    if (initialData && mounted) {
      setServerData(initialData)
    }

    setIsLoading(false)

    // クリーンアップ
    return () => {
      mounted = false
      websocketSync.disconnect()
    }
  }, [initializeFromLocalStorage])

  return {
    isConnected,
    isLoading,
    isHost,
    serverData,
    hostUrl,
    connectedDevices,
    saveToServer,
    startAsHost,
    connectAsClient,
    disconnect,
    refreshData,
  }
}
