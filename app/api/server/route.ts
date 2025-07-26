import { type NextRequest, NextResponse } from "next/server"
import type { ServerData } from "@/types"

// サーバーデータストレージ（実際の実装では外部データベースを使用）
const serverData: ServerData = {
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

// 接続されたクライアント管理
const connectedClients = new Set<string>()
const serverInfo = {
  isActive: false,
  startTime: null as Date | null,
  hostDeviceId: null as string | null,
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  switch (action) {
    case "status":
      return NextResponse.json({
        isActive: serverInfo.isActive,
        startTime: serverInfo.startTime,
        connectedClients: connectedClients.size,
        data: serverData,
      })

    case "data":
      return NextResponse.json(serverData)

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, deviceId, data, type } = body

    switch (action) {
      case "start_server":
        serverInfo.isActive = true
        serverInfo.startTime = new Date()
        serverInfo.hostDeviceId = deviceId
        connectedClients.add(deviceId)

        return NextResponse.json({
          success: true,
          serverInfo,
          message: "サーバーが開始されました",
        })

      case "connect_client":
        if (!serverInfo.isActive) {
          return NextResponse.json({ success: false, message: "サーバーが開始されていません" }, { status: 400 })
        }

        connectedClients.add(deviceId)
        return NextResponse.json({
          success: true,
          serverInfo,
          data: serverData,
          message: "クライアントが接続されました",
        })

      case "disconnect":
        connectedClients.delete(deviceId)
        if (deviceId === serverInfo.hostDeviceId) {
          serverInfo.isActive = false
          serverInfo.hostDeviceId = null
          connectedClients.clear()
        }

        return NextResponse.json({
          success: true,
          message: "切断されました",
        })

      case "sync_data":
        if (!serverInfo.isActive) {
          return NextResponse.json({ success: false, message: "サーバーが開始されていません" }, { status: 400 })
        }

        // データを更新（型安全性を向上）
        if (type && data && type in serverData) {
          ;(serverData as any)[type] = data
        }

        return NextResponse.json({
          success: true,
          data: serverData,
          message: "データが同期されました",
        })

      case "get_clients":
        return NextResponse.json({
          success: true,
          clients: Array.from(connectedClients),
          connectedCount: connectedClients.size,
        })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Server API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
