import { type NextRequest, NextResponse } from "next/server"
import type { ServerData } from "@/types"

// 親機のデータストレージ
let hostData: ServerData = {
  players: [],
  sessions: [],
  receipts: [],
  dailySales: [],
  history: [],
  settings: {
    confirmedRake: 0,
    rakeConfirmed: false,
    ownerMode: true,
    currentBusinessDate: new Date().toISOString().split("T")[0],
  },
}

let connectedClients: string[] = []
let isHostActive = false

export async function POST(request: NextRequest) {
  try {
    const { action, data, clientId } = await request.json()

    switch (action) {
      case "START_HOST":
        // 親機として開始
        const hostId = "host-" + Date.now()
        hostData = data || hostData
        connectedClients = []
        isHostActive = true

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        const clientUrl = `${baseUrl}/client?host=${encodeURIComponent(baseUrl)}`

        return NextResponse.json({
          success: true,
          hostId,
          clientUrl: clientUrl,
          qrCode: clientUrl,
          message: "親機として開始しました",
        })

      case "STOP_HOST":
        // 親機を停止
        isHostActive = false
        connectedClients = []

        return NextResponse.json({
          success: true,
          message: "親機を停止しました",
        })

      case "GET_DATA":
        // データ取得
        return NextResponse.json({
          success: true,
          data: hostData,
          connectedClients: connectedClients.length,
        })

      case "UPDATE_DATA":
        // データ更新
        if (data.players) hostData.players = data.players
        if (data.sessions) hostData.sessions = data.sessions
        if (data.receipts) hostData.receipts = data.receipts
        if (data.dailySales) hostData.dailySales = data.dailySales
        if (data.history) hostData.history = data.history
        if (data.settings) hostData.settings = data.settings

        return NextResponse.json({
          success: true,
          message: "データが更新されました",
        })

      case "CLIENT_CONNECT":
        // 子機接続
        if (!isHostActive) {
          return NextResponse.json(
            {
              success: false,
              error: "親機が稼働していません",
            },
            { status: 400 },
          )
        }

        if (clientId && !connectedClients.includes(clientId)) {
          connectedClients.push(clientId)
        }

        return NextResponse.json({
          success: true,
          data: hostData,
          message: "子機が接続しました",
        })

      case "CLIENT_DISCONNECT":
        // 子機切断
        if (clientId) {
          connectedClients = connectedClients.filter((id) => id !== clientId)
        }

        return NextResponse.json({
          success: true,
          message: "子機が切断しました",
        })

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Host API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  if (action === "status") {
    return NextResponse.json({
      success: true,
      isActive: isHostActive,
      connectedClients: connectedClients.length,
      lastUpdate: new Date().toISOString(),
    })
  }

  if (action === "data") {
    return NextResponse.json({
      success: true,
      data: hostData,
    })
  }

  return NextResponse.json({
    success: true,
    data: hostData,
    connectedClients: connectedClients.length,
    isActive: isHostActive,
  })
}
