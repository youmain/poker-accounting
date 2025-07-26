import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import type { ServerData } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ローカルストレージ関連の共通ユーティリティ
export const localStorageUtils = {
  // ServerDataの初期化（デフォルト値付き）
  initializeServerData(): ServerData {
    return {
      players: JSON.parse(localStorage.getItem("poker-players") || "[]"),
      sessions: JSON.parse(localStorage.getItem("poker-sessions") || "[]"),
      receipts: JSON.parse(localStorage.getItem("poker-receipts") || "[]"),
      dailySales: JSON.parse(localStorage.getItem("poker-daily-sales") || "[]"),
      history: JSON.parse(localStorage.getItem("poker-history") || "[]"),
      settings: JSON.parse(
        localStorage.getItem("poker-settings") ||
          JSON.stringify({
            confirmedRake: 0,
            rakeConfirmed: false,
            ownerMode: true,
            currentBusinessDate: new Date().toISOString().split("T")[0],
          }),
      ),
    }
  },

  // 特定のデータ型を保存
  saveDataType<T>(type: keyof ServerData, data: T): void {
    try {
      localStorage.setItem(`poker-${type}`, JSON.stringify(data))
    } catch (error) {
      console.error(`ローカルストレージ保存エラー (${type}):`, error)
    }
  },

  // 特定のデータ型を取得
  getDataType<T>(type: keyof ServerData, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(`poker-${type}`)
      return stored ? JSON.parse(stored) : defaultValue
    } catch (error) {
      console.error(`ローカルストレージ取得エラー (${type}):`, error)
      return defaultValue
    }
  },

  // ServerData全体を保存
  saveServerData(data: ServerData): void {
    try {
      Object.entries(data).forEach(([type, value]) => {
        localStorage.setItem(`poker-${type}`, JSON.stringify(value))
      })
    } catch (error) {
      console.error("ローカルストレージ保存エラー:", error)
    }
  },

  // 受信したデータをローカルストレージとステートに保存（共通処理）
  saveReceivedData<T extends Partial<ServerData>>(
    data: T,
    setServerData: React.Dispatch<React.SetStateAction<ServerData | null>>,
  ): void {
    try {
      // ローカルストレージに保存
      Object.entries(data).forEach(([type, value]) => {
        if (value !== undefined) {
          localStorage.setItem(`poker-${type}`, JSON.stringify(value))
        }
      })

      // ステートを更新
      setServerData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          ...data,
        }
      })
    } catch (error) {
      console.error("受信データ保存エラー:", error)
    }
  },
}
