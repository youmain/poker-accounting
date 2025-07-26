"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Download,
  Monitor,
  Smartphone,
  Laptop,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Copy,
  Server,
  SmartphoneIcon,
  QrCode,
  Network,
} from "lucide-react"

interface NetworkDevice {
  id: string
  name: string
  type: "host" | "client"
  lastSeen: number
  userAgent: string
  isCurrentDevice?: boolean
}

interface NetworkConfigModalProps {
  isOpen: boolean
  onClose: () => void
  isConnected: boolean
  isHost: boolean
  serverData: any
  onRefresh: () => void
  onBackup: () => void
  connectedDevices?: NetworkDevice[]
  networkUrl: string
  onStartAsHost: () => Promise<boolean>
  onConnectAsClient: (url?: string) => Promise<boolean>
  isOwnerMode?: boolean
}

export function NetworkConfigModal({
  isOpen,
  onClose,
  isConnected,
  isHost,
  serverData,
  onRefresh,
  onBackup,
  connectedDevices = [],
  networkUrl,
  onStartAsHost,
  onConnectAsClient,
  isOwnerMode = false,
}: NetworkConfigModalProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isStartingHost, setIsStartingHost] = useState(false)
  const [isConnectingClient, setIsConnectingClient] = useState(false)
  const [clientUrl, setClientUrl] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")

  useEffect(() => {
    if (networkUrl) {
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(networkUrl)}`)
    }
  }, [networkUrl])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000)
    }
  }

  const handleStartAsHost = async () => {
    setIsStartingHost(true)
    try {
      const success = await onStartAsHost()
      if (success) {
        alert("ホストモードで開始しました！")
      } else {
        alert("ホスト開始に失敗しました")
      }
    } finally {
      setIsStartingHost(false)
    }
  }

  const handleConnectAsClient = async () => {
    setIsConnectingClient(true)
    try {
      const success = await onConnectAsClient(clientUrl || undefined)
      if (success) {
        alert("クライアントとして接続しました！")
      } else {
        alert("接続に失敗しました")
      }
    } finally {
      setIsConnectingClient(false)
    }
  }

  const copyNetworkUrl = () => {
    if (networkUrl) {
      try {
        if (typeof window !== "undefined" && navigator.clipboard) {
          navigator.clipboard.writeText(networkUrl)
          alert("ネットワークURLをコピーしました")
        } else {
          // フォールバック: テキストエリアを使用
          const textArea = document.createElement('textarea')
          textArea.value = networkUrl
          textArea.style.position = 'fixed'
          textArea.style.left = '-999999px'
          textArea.style.top = '-999999px'
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
          alert("ネットワークURLをコピーしました")
        }
      } catch (error) {
        console.error("コピーに失敗しました:", error)
        alert("コピーに失敗しました")
      }
    }
  }

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.includes("Mobile") || userAgent.includes("Android") || userAgent.includes("iPhone")) {
      return <Smartphone className="h-4 w-4" />
    } else if (userAgent.includes("Tablet") || userAgent.includes("iPad")) {
      return <Monitor className="h-4 w-4" />
    } else {
      return <Laptop className="h-4 w-4" />
    }
  }

  const getDeviceType = (userAgent: string) => {
    if (userAgent.includes("Mobile") || userAgent.includes("Android") || userAgent.includes("iPhone")) {
      return "スマートフォン"
    } else if (userAgent.includes("Tablet") || userAgent.includes("iPad")) {
      return "タブレット"
    } else {
      return "パソコン"
    }
  }

  const formatLastSeen = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp

    if (diff < 60000) {
      return "今"
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分前`
    } else {
      return new Date(timestamp).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      })
    }
  }

  const hostDevices = connectedDevices.filter((d) => d.type === "host")
  const clientDevices = connectedDevices.filter((d) => d.type === "client")

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Network className="h-5 w-5" />
            <span>ネットワーク設定・同期状況</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 接続状況 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-600" />
                )}
                <span>ネットワーク状況</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">接続状態</span>
                <Badge variant={isConnected ? "default" : "destructive"}>{isConnected ? "接続中" : "未接続"}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">デバイス種別</span>
                <Badge variant={isHost ? "default" : "secondary"}>
                  {isHost ? "ホスト（親機）" : "クライアント（子機）"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">接続デバイス数</span>
                <span className="text-sm font-medium">{connectedDevices.length}台</span>
              </div>

              <Separator />

              <div className="flex space-x-2">
                <Button onClick={handleRefresh} disabled={isRefreshing} size="sm" className="flex-1">
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                  {isRefreshing ? "更新中..." : "状態更新"}
                </Button>
                <Button onClick={onBackup} variant="outline" size="sm" className="flex-1 bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  バックアップ
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ネットワーク設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <Server className="h-4 w-4" />
                <span>ネットワーク設定</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isConnected && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center space-x-2">
                        <Server className="h-4 w-4" />
                        <span>ホストとして開始</span>
                      </h4>
                      <p className="text-sm text-gray-600">
                        このデバイスを親機として、他のデバイスからの接続を受け入れます
                      </p>
                      <Button onClick={handleStartAsHost} disabled={isStartingHost} className="w-full">
                        {isStartingHost ? "開始中..." : "ホスト開始"}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center space-x-2">
                        <SmartphoneIcon className="h-4 w-4" />
                        <span>クライアントとして接続</span>
                      </h4>
                      <p className="text-sm text-gray-600">他のデバイス（親機）に子機として接続します</p>
                      <div className="space-y-2">
                        <Label htmlFor="client-url">ホストURL（オプション）</Label>
                        <Input
                          id="client-url"
                          placeholder="http://192.168.1.100:3000"
                          value={clientUrl}
                          onChange={(e) => setClientUrl(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={handleConnectAsClient}
                        disabled={isConnectingClient}
                        variant="outline"
                        className="w-full bg-transparent"
                      >
                        {isConnectingClient ? "接続中..." : "クライアント接続"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {isConnected && isHost && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>ネットワークアクセスURL</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 p-2 bg-gray-100 rounded border text-sm font-mono break-all">
                        {networkUrl || "生成中..."}
                      </div>
                      <Button size="sm" variant="outline" onClick={copyNetworkUrl} className="bg-transparent">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">同じWi-Fiネットワーク内の他のデバイスからこのURLでアクセス</p>
                  </div>

                  {/* QRコード */}
                  <div className="text-center space-y-3">
                    <div className="flex justify-center">
                      {qrCodeUrl ? (
                        <img
                          src={qrCodeUrl || "/placeholder.svg"}
                          alt="Network QR Code"
                          className="border rounded-lg"
                          width={150}
                          height={150}
                        />
                      ) : (
                        <div className="w-[150px] h-[150px] border rounded-lg flex items-center justify-center bg-gray-100">
                          <QrCode className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">スマホでQRコードを読み取って接続</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* データ統計 */}
          {serverData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">データ統計</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">プレイヤー</span>
                    <span className="font-medium">{serverData.players?.length || 0}人</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">セッション</span>
                    <span className="font-medium">{serverData.sessions?.length || 0}件</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">伝票</span>
                    <span className="font-medium">{serverData.receipts?.length || 0}件</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">売上データ</span>
                    <span className="font-medium">{serverData.dailySales?.length || 0}件</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 接続デバイス一覧 */}
          {isOwnerMode && connectedDevices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>ネットワーク接続デバイス</span>
                  <Badge variant="outline" className="ml-auto">
                    {connectedDevices.length}台
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* ホストデバイス */}
                {hostDevices.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center space-x-2">
                      <Server className="h-4 w-4" />
                      <span>ホスト（親機）</span>
                    </h4>
                    <div className="space-y-2">
                      {hostDevices.map((device) => (
                        <div
                          key={device.id}
                          className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                        >
                          <div className="flex-shrink-0">{getDeviceIcon(device.userAgent)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="text-sm font-medium">{device.name}</p>
                              {device.isCurrentDevice && (
                                <Badge variant="default" className="text-xs">
                                  現在のデバイス
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>{getDeviceType(device.userAgent)}</span>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatLastSeen(device.lastSeen)}</span>
                              </div>
                            </div>
                          </div>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* クライアントデバイス */}
                {clientDevices.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center space-x-2">
                      <SmartphoneIcon className="h-4 w-4" />
                      <span>クライアント（子機）</span>
                    </h4>
                    <div className="space-y-2">
                      {clientDevices.map((device) => (
                        <div key={device.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0">{getDeviceIcon(device.userAgent)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="text-sm font-medium">{device.name}</p>
                              {device.isCurrentDevice && (
                                <Badge variant="default" className="text-xs">
                                  現在のデバイス
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>{getDeviceType(device.userAgent)}</span>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatLastSeen(device.lastSeen)}</span>
                              </div>
                            </div>
                          </div>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ネットワーク説明 */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>ネットワーク同期の仕組み:</strong>
              <br />• <strong>ホスト（親機）</strong>: インターネット接続必要、他デバイスの接続を受け入れ
              <br />• <strong>クライアント（子機）</strong>: Wi-Fi接続のみ、ホストにアクセス
              <br />• 同一Wi-Fiネットワーク内でリアルタイム同期
              <br />• データはホストで一元管理、全デバイスで共有
            </AlertDescription>
          </Alert>

          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              閉じる
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
