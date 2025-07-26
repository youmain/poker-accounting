"use client"

import { useState, useEffect, useCallback } from "react"
import { localStorageUtils } from "@/lib/utils"
import type { ServerSyncResult, ServerData, ConnectedDevice } from "@/types"

export function useServerSync(): ServerSyncResult {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isHost, setIsHost] = useState(false)
  const [serverData, setServerData] = useState<ServerData | null>(null)
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([])
  const [deviceId] = useState(() => `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  // デバイス名を生成
  const generateDeviceName = useCallback(() => {
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
  }, [])

  // サーバーからデータを取得
  const fetchServerData = useCallback(async () => {
    try {
      const response = await fetch("/api/server?action=data")
      if (response.ok) {
        const data = await response.json()
        setServerData(data)
        return data
      }
    } catch (error) {
      console.error("データ取得エラー:", error)
    }
    return null
  }, [])

  // サーバーにデータを保存
  const saveToServer = useCallback(
    async (type: keyof ServerData, data: any) => {
      try {
        const response = await fetch("/api/server", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "sync_data",
            deviceId,
            type,
            data,
          }),
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setServerData(result.data)
            return true
          }
        }
      } catch (error) {
        console.error("データ保存エラー:", error)
      }
      return false
    },
    [deviceId],
  )

  // ホストとしてサーバーを開始
  const startAsHost = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/server", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "start_server",
          deviceId,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setIsHost(true)
          setIsConnected(true)
          await fetchServerData()

          // デバイス情報を更新
          const device: ConnectedDevice = {
            id: deviceId,
            name: generateDeviceName(),
            type: "host",
            lastSeen: Date.now(),
            userAgent: navigator.userAgent,
          }
          setConnectedDevices([device])

          return true
        }
      }
    } catch (error) {
      console.error("ホスト開始エラー:", error)
    } finally {
      setIsLoading(false)
    }
    return false
  }, [deviceId, generateDeviceName, fetchServerData])

  // クライアントとして接続
  const connectAsClient = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/server", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "connect_client",
          deviceId,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setIsHost(false)
          setIsConnected(true)
          setServerData(result.data)

          // デバイス情報を更新
          const device: ConnectedDevice = {
            id: deviceId,
            name: generateDeviceName(),
            type: "client",
            lastSeen: Date.now(),
            userAgent: navigator.userAgent,
          }
          setConnectedDevices([device])

          return true
        }
      }
    } catch (error) {
      console.error("クライアント接続エラー:", error)
    } finally {
      setIsLoading(false)
    }
    return false
  }, [deviceId, generateDeviceName])

  // 接続されたデバイスを更新
  const updateConnectedDevices = useCallback(async () => {
    try {
      const response = await fetch("/api/server?action=get_clients")
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // デバイス情報を更新（実際の実装ではより詳細な情報を取得）
          const devices: ConnectedDevice[] = result.clients.map((clientId: string) => ({
            id: clientId,
            name: clientId === deviceId ? generateDeviceName() : `デバイス ${clientId}`,
            type: clientId === deviceId ? (isHost ? "host" : "client") : "client",
            lastSeen: Date.now(),
            userAgent: navigator.userAgent,
          }))
          setConnectedDevices(devices)
        }
      }
    } catch (error) {
      console.error("デバイス更新エラー:", error)
    }
  }, [deviceId, isHost, generateDeviceName])

  // データ更新を強制実行
  const refreshData = useCallback(async () => {
    console.log("サーバーデータ更新開始...")
    await fetchServerData()
    await updateConnectedDevices()
    return true
  }, [fetchServerData, updateConnectedDevices])

  // 初期化
  useEffect(() => {
    let mounted = true

    const initializeConnection = async () => {
      if (!mounted) return

      try {
        // サーバー状態をチェック
        const response = await fetch("/api/server?action=status")
        if (response.ok) {
          const status = await response.json()
          if (status.isActive) {
            // 既存のサーバーにクライアントとして接続
            await connectAsClient()
          } else {
            // サーバーが開始されていない場合はローカルデータを使用
            setIsConnected(false)
            setIsHost(false)
          }
        }
      } catch (error) {
        console.error("初期接続エラー:", error)
        setIsConnected(false)
        setIsHost(false)
      } finally {
        setIsLoading(false)
      }
    }

    initializeConnection()

    // 定期的に接続状態をチェック
    const statusInterval = setInterval(() => {
      if (!mounted) return
      updateConnectedDevices()
    }, 10000) // 10秒ごと

    return () => {
      mounted = false
      clearInterval(statusInterval)
    }
  }, [connectAsClient, updateConnectedDevices])

  return {
    isConnected,
    isLoading,
    isHost,
    serverData,
    connectedDevices,
    saveToServer,
    refreshData,
    startAsHost,
    connectAsClient,
    updateConnectedDevices,
  }
}
