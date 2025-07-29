"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wifi, WifiOff, Loader2, CheckCircle, AlertTriangle, Monitor, Home, RefreshCw } from "lucide-react"

export default function ClientPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [hostUrl, setHostUrl] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState("")
  const [clientId] = useState("client-" + Date.now())
  const [serverData, setServerData] = useState<any>(null)
  const [showManualInput, setShowManualInput] = useState(false)

  useEffect(() => {
    // URLパラメータから親機URLを取得
    const hostParam = searchParams.get("host")
    if (hostParam) {
      const decodedUrl = decodeURIComponent(hostParam)
      setHostUrl(decodedUrl)
      // 自動接続を試行
      handleConnect(decodedUrl)
    } else {
      setShowManualInput(true)
    }
  }, [searchParams])

  const handleConnect = async (url?: string) => {
    const targetUrl = url || hostUrl
    if (!targetUrl) {
      setConnectionError("親機URLを入力してください")
      return
    }

    setIsConnecting(true)
    setConnectionError("")

    try {
      const response = await fetch("/api/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CONNECT",
          hostUrl: targetUrl,
          clientId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setIsConnected(true)
        setServerData(result.data)

        // 子機モードを設定
        localStorage.setItem("poker-client-mode", "true")
        localStorage.setItem("poker-host-url", targetUrl)
        localStorage.setItem("poker-client-id", clientId)

        // 2秒後にメインシステムにリダイレクト
        setTimeout(() => {
          router.push("/")
        }, 2000)
      } else {
        setConnectionError(result.error || "接続に失敗しました")
        setShowManualInput(true)
      }
    } catch (error) {
      console.error("Connection error:", error)
      setConnectionError("ネットワークエラーが発生しました")
      setShowManualInput(true)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await fetch("/api/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DISCONNECT",
          hostUrl,
          clientId,
        }),
      })
    } catch (error) {
      console.error("Disconnect error:", error)
    }

    setIsConnected(false)
    setHostUrl("")
    localStorage.removeItem("poker-client-mode")
    localStorage.removeItem("poker-host-url")
    localStorage.removeItem("poker-client-id")
  }

  const handleGoHome = () => {
    localStorage.removeItem("poker-client-mode")
    localStorage.removeItem("poker-host-url")
    localStorage.removeItem("poker-client-id")
    router.push("/")
  }

  const handleAccessMainSystem = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2">
            {isConnected ? <Wifi className="h-5 w-5 text-green-600" /> : <WifiOff className="h-5 w-5 text-gray-400" />}
            <span>子機接続</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 接続中の表示 */}
          {isConnecting && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">親機に接続中...</h3>
                <p className="text-sm text-gray-600 mt-1">しばらくお待ちください</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-800 break-all">接続先: {hostUrl}</p>
              </div>
            </div>
          )}

          {/* 接続成功 */}
          {isConnected && !isConnecting && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <div>
                <h3 className="font-medium text-green-900">接続成功！</h3>
                <p className="text-sm text-green-700 mt-1">親機に正常に接続されました</p>
              </div>

              <div className="bg-green-50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">接続先:</span>
                  <span className="font-mono text-xs break-all">{hostUrl}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">状態:</span>
                  <Badge variant="default">
                    <Wifi className="h-3 w-3 mr-1" />
                    接続中
                  </Badge>
                </div>
                {serverData && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">データ:</span>
                    <span>同期済み</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">まもなくメインシステムに移動します...</p>
                <Button onClick={handleAccessMainSystem} className="w-full">
                  <Monitor className="h-4 w-4 mr-2" />
                  今すぐアクセス
                </Button>
                <Button onClick={handleDisconnect} variant="outline" className="w-full bg-transparent">
                  切断
                </Button>
              </div>
            </div>
          )}

          {/* 手動入力または接続エラー */}
          {(showManualInput || connectionError) && !isConnecting && !isConnected && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">親機に接続</h3>
                <p className="text-sm text-gray-600 mb-4">親機で表示されたURLを入力してください</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">親機URL</label>
                <Input
                  type="url"
                  placeholder="http://192.168.1.100:3000"
                  value={hostUrl}
                  onChange={(e) => setHostUrl(e.target.value)}
                  disabled={isConnecting}
                />
                <p className="text-xs text-gray-500">例: http://192.168.1.100:3000</p>
              </div>

              {connectionError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>接続エラー:</strong> {connectionError}
                    <br />
                    <br />
                    <strong>考えられる原因:</strong>
                    <br />• 親機が開始されていない
                    <br />• ネットワークが異なる
                    <br />• URLが正しくない
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Button onClick={() => handleConnect()} disabled={isConnecting || !hostUrl.trim()} className="w-full">
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      接続中...
                    </>
                  ) : (
                    <>
                      <Wifi className="h-4 w-4 mr-2" />
                      接続
                    </>
                  )}
                </Button>

                {connectionError && (
                  <Button onClick={() => handleConnect()} variant="outline" className="w-full bg-transparent">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    再試行
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ホームに戻る */}
          <div className="pt-4 border-t">
            <Button onClick={handleGoHome} variant="outline" className="w-full bg-transparent">
              <Home className="h-4 w-4 mr-2" />
              メインページに戻る
            </Button>
          </div>

          {/* 説明 */}
          <div className="text-center pt-2">
            <p className="text-xs text-gray-500">King High Poker System ver.2 - Client Mode</p>
            {hostUrl && <p className="text-xs text-gray-400 mt-1 font-mono break-all">{hostUrl}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
