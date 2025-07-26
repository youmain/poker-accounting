"use client"

import { useState, useEffect, useCallback } from "react"
import { networkSync } from "@/lib/networkSync"
import { localStorageUtils } from "@/lib/utils"
import type { NetworkSyncResult, ServerData, NetworkDevice } from "@/types"

export function useNetworkSync(): NetworkSyncResult {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isHost, setIsHost] = useState(false)
  const [serverData, setServerData] = useState<ServerData | null>(null)
  const [connectedDevices, setConnectedDevices] = useState<NetworkDevice[]>([])
  const [networkUrl, setNetworkUrl] = useState("")

  // ローカルストレージからデータを取得（共通ユーティリティ使用）
  const fetchServerData = useCallback(async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      const data = localStorageUtils.initializeServerData()
      setServerData(data)
      return data
    } catch (error) {
      console.error("データ取得エラー:", error)
      return null
    }
  }, [])

  // データを保存
  const saveToServer = useCallback(async (type: keyof ServerData, data: any) => {
    try {
      localStorageUtils.saveDataType(type, data)
      console.log(`ネットワークデータ保存: ${type}`, data)
      return true
    } catch (error) {
      console.error("データ保存エラー:", error)
      return false
    }
  }, [])

  // ホストとして開始
  const startAsHost = useCallback(async () => {
    setIsLoading(true)
    try {
      const success = await networkSync.startAsHost()
      if (success) {
        setIsHost(true)
        setIsConnected(true)
        setNetworkUrl(window.location.origin)

        // ローカルデータを初期化
        const initialData = localStorageUtils.initializeServerData()
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
  }, [])

  // クライアントとして接続
  const connectAsClient = useCallback(async () => {
      setIsLoading(true)
      try {
      const success = await networkSync.connectAsClient()
        if (success) {
          setIsHost(false)
          setIsConnected(true)
        setNetworkUrl(window.location.origin)

        // ローカルデータを初期化
        const initialData = localStorageUtils.initializeServerData()
        if (initialData) {
          setServerData(initialData)
        }

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

  // 接続状態を更新
  const updateConnectionStatus = useCallback(async () => {
    try {
    const connected = networkSync.isConnected()
    const hostMode = networkSync.isHostMode()
    setIsConnected(connected)
    setIsHost(hostMode)
      setNetworkUrl(window.location.origin)
      setConnectedDevices(networkSync.getDevices())
    } catch (error) {
      console.error("接続状態更新エラー:", error)
    }
  }, [])

  // データを更新
  const refreshData = useCallback(async () => {
    setIsLoading(true)
    try {
      await updateConnectionStatus()
    await fetchServerData()
      return true
    } catch (error) {
      console.error("データ更新エラー:", error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [updateConnectionStatus, fetchServerData])

  // 初期化
  useEffect(() => {
    let mounted = true

    // ネットワークデータ同期イベント
    const handleNetworkDataSync = (event: CustomEvent) => {
      if (!mounted) return

      const { type, data, sourceDevice } = event.detail
      console.log("ネットワーク同期受信:", type, data)

      setServerData((prev: ServerData | null) => {
        if (!prev) return prev
        return {
          ...prev,
          [type]: data,
        }
      })
    }

    // ネットワークデバイス更新イベント
    const handleNetworkDeviceUpdate = (event: CustomEvent) => {
      if (!mounted) return

      const { devices } = event.detail
      console.log("ネットワークデバイス更新:", devices)
      setConnectedDevices(devices)
    }

    // イベントリスナー追加
    window.addEventListener("network-data-sync", handleNetworkDataSync as EventListener)
    window.addEventListener("network-device-update", handleNetworkDeviceUpdate as EventListener)

    // 定期的に接続状態をチェック
    const statusInterval = setInterval(() => {
      if (!mounted) return
      updateConnectionStatus()
    }, 5000)

    // 初期接続試行
    const initializeConnection = async () => {
      try {
        // まずホストとして開始を試行
        const hostSuccess = await startAsHost()
        if (!hostSuccess) {
          // ホスト開始に失敗した場合、クライアントとして接続を試行
          await connectAsClient()
        }
      } catch (error) {
        console.error("初期接続エラー:", error)
        setIsLoading(false)
      }
    }

    initializeConnection()

    // クリーンアップ
    return () => {
      mounted = false
      window.removeEventListener("network-data-sync", handleNetworkDataSync as EventListener)
      window.removeEventListener("network-device-update", handleNetworkDeviceUpdate as EventListener)
      clearInterval(statusInterval)
      networkSync.disconnect()
    }
  }, [startAsHost, connectAsClient, updateConnectionStatus])

  return {
    isConnected,
    isLoading,
    isHost,
    serverData,
    connectedDevices,
    networkUrl,
    saveToServer,
    fetchServerData,
    refreshData,
    startAsHost,
    connectAsClient,
  }
}
