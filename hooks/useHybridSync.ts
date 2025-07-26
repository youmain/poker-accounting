"use client"

import { useState, useEffect, useCallback } from "react"
import { hybridSync } from "@/lib/hybridSync"
import { localStorageUtils } from "@/lib/utils"
import type { HybridSyncResult, ServerData } from "@/types"

export function useHybridSync(): HybridSyncResult {
  const [isConnected, setIsConnected] = useState(hybridSync.isConnected())
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [serverData, setServerData] = useState<ServerData | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(hybridSync.getLastSyncTime())
  const [pendingChanges, setPendingChanges] = useState(hybridSync.getPendingChangesCount())

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
  const saveToServer = useCallback(async (type: keyof ServerData, data: any) => {
    try {
      // ハイブリッド同期マネージャーを使用して保存
      const success = await hybridSync.saveData(type, data)

      // ローカルのステートを更新
      if (success) {
        setServerData((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            [type]: data,
          }
        })

        setPendingChanges(hybridSync.getPendingChangesCount())
      }

      return success
    } catch (error) {
      console.error(`データ保存エラー (${type}):`, error)
      return false
    }
  }, [])

  // 手動同期を実行
  const syncNow = useCallback(async () => {
    setIsSyncing(true)
    try {
      const success = await hybridSync.forceSyncWithServer()
      if (success) {
        setLastSyncTime(hybridSync.getLastSyncTime())
        setPendingChanges(hybridSync.getPendingChangesCount())
      }
      return success
    } catch (error) {
      console.error("手動同期エラー:", error)
      return false
    } finally {
      setIsSyncing(false)
    }
  }, [])

  // データを更新
  const refreshData = useCallback(async () => {
    setIsLoading(true)
    try {
      // ローカルデータを更新
      const data = initializeFromLocalStorage()
      if (data) {
        setServerData(data)
      }

      // 接続状態を更新
      setIsConnected(hybridSync.isConnected())
      setLastSyncTime(hybridSync.getLastSyncTime())
      setPendingChanges(hybridSync.getPendingChangesCount())

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
    hybridSync.on("connection_status", ({ online }: { online: boolean }) => {
      if (!mounted) return
      setIsConnected(online)
    })

    hybridSync.on("sync_status", ({ syncing }: { syncing: boolean }) => {
      if (!mounted) return
      setIsSyncing(syncing)
    })

    hybridSync.on("sync_complete", () => {
      if (!mounted) return
      setLastSyncTime(hybridSync.getLastSyncTime())
      setPendingChanges(hybridSync.getPendingChangesCount())
      refreshData()
    })

    hybridSync.on("data_updated", ({ type, data }: { type: keyof ServerData; data: any }) => {
      if (!mounted) return

      setServerData((prev: ServerData | null) => {
        if (!prev) return prev
        return {
          ...prev,
          [type]: data,
        }
      })
    })

    // 初期データを設定
    const initialData = initializeFromLocalStorage()
    if (initialData && mounted) {
      setServerData(initialData)
    }

    // 定期同期を開始
    hybridSync.startPeriodicSync(30000) // 30秒ごとに同期

    setIsLoading(false)

    // クリーンアップ
    return () => {
      mounted = false
      hybridSync.cleanup()
    }
  }, [initializeFromLocalStorage, refreshData])

  return {
    isConnected,
    isLoading,
    isSyncing,
    serverData,
    lastSyncTime,
    pendingChanges,
    saveToServer,
    syncNow,
    refreshData,
  }
}
