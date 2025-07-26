import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { action, hostUrl, data, clientId } = await request.json()

    switch (action) {
      case "CONNECT":
        // 親機に接続
        try {
          const connectResponse = await fetch(`${hostUrl}/api/host`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "CLIENT_CONNECT",
              clientId: clientId || "client-" + Date.now(),
            }),
          })

          if (!connectResponse.ok) {
            throw new Error("Failed to connect to host")
          }

          const connectResult = await connectResponse.json()

          if (connectResult.success) {
            return NextResponse.json({
              success: true,
              data: connectResult.data,
              message: "親機に接続しました",
            })
          } else {
            throw new Error(connectResult.error || "接続に失敗しました")
          }
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: error instanceof Error ? error.message : "接続エラー",
            },
            { status: 400 },
          )
        }

      case "GET_DATA":
        // 親機からデータ取得
        try {
          const dataResponse = await fetch(`${hostUrl}/api/host?action=data`)

          if (!dataResponse.ok) {
            throw new Error("Failed to get data from host")
          }

          const dataResult = await dataResponse.json()
          return NextResponse.json({
            success: true,
            data: dataResult.data,
          })
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: error instanceof Error ? error.message : "データ取得エラー",
            },
            { status: 400 },
          )
        }

      case "UPDATE_DATA":
        // 親機にデータ更新
        try {
          const updateResponse = await fetch(`${hostUrl}/api/host`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "UPDATE_DATA",
              data,
              clientId,
            }),
          })

          if (!updateResponse.ok) {
            throw new Error("Failed to update data on host")
          }

          const updateResult = await updateResponse.json()
          return NextResponse.json({
            success: true,
            data: updateResult.data,
          })
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: error instanceof Error ? error.message : "データ更新エラー",
            },
            { status: 400 },
          )
        }

      case "DISCONNECT":
        // 親機から切断
        try {
          await fetch(`${hostUrl}/api/host`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "CLIENT_DISCONNECT",
              clientId,
            }),
          })

          return NextResponse.json({ success: true })
        } catch (error) {
          // 切断エラーは無視（親機が既に停止している可能性）
          return NextResponse.json({ success: true })
        }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Client API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
