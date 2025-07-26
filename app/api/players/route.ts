import { type NextRequest, NextResponse } from "next/server"
import { dataManager } from "@/lib/dataManager"

export async function GET() {
  try {
    const players = await dataManager.getPlayers()
    return NextResponse.json(players)
  } catch (error) {
    return NextResponse.json({ error: "プレイヤーデータの取得に失敗しました" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const players = await request.json()
    await dataManager.savePlayers(players)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "プレイヤーデータの保存に失敗しました" }, { status: 500 })
  }
}
