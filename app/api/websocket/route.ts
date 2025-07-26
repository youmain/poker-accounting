import { type NextRequest, NextResponse } from "next/server"

// WebSocket接続を管理するためのMap
const connections = new Map<string, any>()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const deviceId = searchParams.get("deviceId")
  const role = searchParams.get("role")

  if (!deviceId) {
    return NextResponse.json({ error: "Device ID required" }, { status: 400 })
  }

  // WebSocket接続のシミュレーション（実際の実装では適切なWebSocketライブラリを使用）
  return NextResponse.json({
    success: true,
    message: "WebSocket connection established",
    deviceId,
    role,
    activeConnections: connections.size,
  })
}

export async function POST(request: NextRequest) {
  try {
    const { action, deviceId, data } = await request.json()

    switch (action) {
      case "broadcast":
        // 全ての接続されたクライアントにデータをブロードキャスト
        const broadcastData = {
          type: "data_update",
          data: data,
          from: deviceId,
          timestamp: Date.now(),
        }

        // 実際の実装では、WebSocketを通じて全クライアントに送信
        connections.forEach((connection, id) => {
          if (id !== deviceId) {
            // WebSocket送信のシミュレーション
            console.log(`Broadcasting to ${id}:`, broadcastData)
          }
        })

        return NextResponse.json({
          success: true,
          message: "Data broadcasted",
          recipients: connections.size - 1,
        })

      case "ping":
        return NextResponse.json({
          success: true,
          timestamp: Date.now(),
          message: "pong",
        })

      case "register":
        connections.set(deviceId, {
          id: deviceId,
          connectedAt: Date.now(),
          lastSeen: Date.now(),
        })

        return NextResponse.json({
          success: true,
          message: "Device registered",
          deviceId,
        })

      case "unregister":
        connections.delete(deviceId)

        return NextResponse.json({
          success: true,
          message: "Device unregistered",
          deviceId,
        })

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    console.error("WebSocket API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
