"use client"

import { useState, useEffect, useCallback } from "react"
import * as IndexedDB from "@/lib/indexedDb"
import { localStorageUtils } from "@/lib/utils"
import type { ServerData, Player, GameSession, Receipt, DailySales, HistoryEntry } from "@/types"

export function useIndexedDb() {
  const [isLoading, setIsLoading] = useState(true)
  const [serverData, setServerData] = useState<ServerData | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  // データを初期化
  const initializeData = useCallback(async () => {
    setIsLoading(true)
    try {
      // IndexedDBからデータを取得
      const players = await IndexedDB.getData<Player>("players")
      const sessions = await IndexedDB.getData<GameSession>("sessions")
      const receipts = await IndexedDB.getData<Receipt>("receipts")
      const dailySales = await IndexedDB.getData<DailySales>("dailySales")
      const history = await IndexedDB.getData<HistoryEntry>("history")
      const settings = await IndexedDB.getSettings()

      // データが存在しない場合はローカルストレージから初期化
      const data: ServerData = {
        players: players.length > 0 ? players : JSON.parse(localStorage.getItem("poker-players") || "[]"),
        sessions: sessions.length > 0 ? sessions : JSON.parse(localStorage.getItem("poker-sessions") || "[]"),
        receipts: receipts.length > 0 ? receipts : JSON.parse(localStorage.getItem("poker-receipts") || "[]"),
        dailySales: dailySales.length > 0 ? dailySales : JSON.parse(localStorage.getItem("poker-daily-sales") || "[]"),
        history: history.length > 0 ? history : JSON.parse(localStorage.getItem("poker-history") || "[]"),
        settings:
          settings ||
          JSON.parse(
            localStorage.getItem("poker-settings") ||
              JSON.stringify({
                confirmedRake: 0,
                rakeConfirmed: false,
                ownerMode: true,
                currentBusinessDate: new Date().toISOString().split("T")[0],
              }),
          ),
      }

      setServerData(data)
      setLastSyncTime(new Date())
      return data
    } catch (error) {
      console.error("IndexedDB初期化エラー:", error)
      // エラーの場合はローカルストレージから初期化
      const fallbackData = localStorageUtils.initializeServerData()
      setServerData(fallbackData)
      return fallbackData
    } finally {
      setIsLoading(false)
    }
  }, [])

  // データを保存
  const saveToServer = useCallback(async (type: keyof ServerData, data: any) => {
    try {
      // IndexedDBに保存
      switch (type) {
        case "players":
          await IndexedDB.saveData("players", data)
          break
        case "sessions":
          await IndexedDB.saveData("sessions", data)
          break
        case "receipts":
          await IndexedDB.saveData("receipts", data)
          break
        case "dailySales":
          await IndexedDB.saveData("dailySales", data)
          break
        case "history":
          await IndexedDB.saveData("history", data)
          break
        case "settings":
        await IndexedDB.saveSettings(data)
          break
      }

      // ローカルストレージにも保存
      localStorageUtils.saveDataType(type, data)

      // ステートを更新
      setServerData((prev: ServerData | null) => {
        if (!prev) return prev
        return {
          ...prev,
          [type]: data,
        }
      })

      setLastSyncTime(new Date())
      return true
    } catch (error) {
      console.error(`データ保存エラー (${type}):`, error)
      return false
    }
  }, [])

  // データを更新
  const refreshData = useCallback(async () => {
    return await initializeData()
  }, [initializeData])

  // 初期化
  useEffect(() => {
    initializeData()
  }, [initializeData])

  return {
    isLoading,
    serverData,
    lastSyncTime,
    saveToServer,
    refreshData,
  }
}
