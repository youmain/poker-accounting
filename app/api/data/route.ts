import { type NextRequest, NextResponse } from "next/server"
import { dataManager } from "@/lib/dataManager"
import type { ServerData } from "@/types"

// 全データを取得
export async function GET() {
  try {
    const data = await dataManager.getAllData()
    return NextResponse.json(data)
  } catch (error) {
    console.error("データ取得エラー:", error)
    return NextResponse.json({ error: "データの取得に失敗しました" }, { status: 500 })
  }
}

// データを更新
export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json()

    // 型安全性を向上：ServerDataのキーかどうかチェック
    const validTypes: (keyof ServerData)[] = ["players", "sessions", "receipts", "dailySales", "history", "settings"]
    if (!type || !validTypes.includes(type as keyof ServerData)) {
      return NextResponse.json({ error: "無効なデータタイプです" }, { status: 400 })
    }

    switch (type) {
      case "players":
        await dataManager.savePlayers(data)
        break
      case "sessions":
        await dataManager.saveSessions(data)
        break
      case "receipts":
        await dataManager.saveReceipts(data)
        break
      case "dailySales":
        await dataManager.saveDailySales(data)
        break
      case "history":
        await dataManager.saveHistory(data)
        break
      case "settings":
        await dataManager.saveSettings(data)
        break
      default:
        return NextResponse.json({ error: "無効なデータタイプです" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("データ保存エラー:", error)
    return NextResponse.json({ error: "データの保存に失敗しました" }, { status: 500 })
  }
}
