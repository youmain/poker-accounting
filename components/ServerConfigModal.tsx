"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Wifi,
  WifiOff,
  Server,
  Copy,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Monitor,
  Smartphone,
  Database,
  RefreshCw,
  Download,
} from "lucide-react"

interface ServerConfigModalProps {
  isOpen: boolean
  onClose: () => void
  isConnected: boolean
  serverData: any
  onRefresh: () => void
  onBackup: () => void
  connectedDevices: number
  isOwnerMode: boolean
}

export function ServerConfigModal({
  isOpen,
  onClose,
  isConnected,
  serverData,
  onRefresh,
  onBackup,
  connectedDevices,
  isOwnerMode,
}: ServerConfigModalProps) {
  const [isHostMode, setIsHostMode] = useState(false)
  const [isStartingHost, setIsStartingHost] = useState(false)
  const [hostUrl, setHostUrl] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [connectedClients, setConnectedClients] = useState(0)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      checkHostStatus()
    }
  }, [isOpen])

  const checkHostStatus = async () => {
    try {
      const response = await fetch("/api/host?action=status")
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.isActive) {
          setIsHostMode(true)
          setConnectedClients(result.connectedClients || 0)
          const baseUrl = window.location.origin
          setHostUrl(baseUrl)
          setQrCodeUrl(`${baseUrl}/client?host=${encodeURIComponent(baseUrl)}`)
        }
      }
    } catch (error) {
      console.error("Host status check failed:", error)
    }
  }

  const handleStartHost = async () => {
    if (!isOwnerMode) {
      alert("オーナーモードでのみ親機として開始できます")
      return
    }

    setIsStartingHost(true)

    try {
      const response = await fetch("/api/host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "START_HOST",
          data: serverData,
        }),
      })

      if (!response.ok) {
        throw new Error("親機の開始に失敗しました")
      }

      const result = await response.json()

      if (result.success) {
        setIsHostMode(true)
        setHostUrl(result.clientUrl)
        setQrCodeUrl(result.qrCode)
        setConnectedClients(0)

        // 定期的にクライアント数を更新
        const interval = setInterval(async () => {
          try {
            const statusResponse = await fetch("/api/host?action=status")
            if (statusResponse.ok) {
              const statusResult = await statusResponse.json()
              setConnectedClients(statusResult.connectedClients || 0)
            }
          } catch (error) {
            console.error("Status update failed:", error)
          }
        }, 5000)

        // クリーンアップ用にintervalを保存
        return () => clearInterval(interval)
      }
    } catch (error) {
      console.error("Host start error:", error)
      alert("親機の開始に失敗しました: " + (error instanceof Error ? error.message : "不明なエラー"))
    } finally {
      setIsStartingHost(false)
    }
  }

  const handleStopHost = async () => {
    try {
      await fetch("/api/host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "STOP_HOST",
        }),
      })

      setIsHostMode(false)
      setHostUrl("")
      setQrCodeUrl("")
      setConnectedClients(0)
    } catch (error) {
      console.error("Host stop error:", error)
    }
  }

  const handleCopyUrl = async () => {
    try {
      if (typeof window !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(qrCodeUrl)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      } else {
        // フォールバック: テキストエリアを使用
        const textArea = document.createElement('textarea')
        textArea.value = qrCodeUrl
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      }
    } catch (error) {
      console.error("Copy failed:", error)
    }
  }

  const generateQRCode = (url: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>サーバー設定・同期状況</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 接続状況 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                {isHostMode ? (
                  <Wifi className="h-4 w-4 text-green-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-gray-400" />
                )}
                <span>接続状況</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">ステータス</span>
                <Badge variant={isHostMode ? "default" : "secondary"}>
                  {isHostMode ? "親機（ホスト）" : "スタンドアロン"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">同期方式</span>
                <span className="text-sm">ローカルストレージ同期</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">接続デバイス数</span>
                <span className="text-sm font-medium">{connectedClients}台</span>
              </div>

              <Separator />

              <div className="flex space-x-2">
                <Button onClick={onRefresh} size="sm" className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  接続テスト
                </Button>
                <Button onClick={onBackup} variant="outline" size="sm" className="flex-1 bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  バックアップ
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 親機設定 */}
          {!isHostMode ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <Monitor className="h-4 w-4" />
                  <span>親機として開始</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    親機として開始すると、他のデバイスがこのシステムに接続できるようになります。
                    オーナーモードでのみ利用可能です。
                  </AlertDescription>
                </Alert>

                <Button onClick={handleStartHost} disabled={isStartingHost || !isOwnerMode} className="w-full">
                  {isStartingHost ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      開始中...
                    </>
                  ) : (
                    <>
                      <Server className="h-4 w-4 mr-2" />
                      親機として開始
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <Smartphone className="h-4 w-4" />
                  <span>子機接続用</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    子機で以下のURLにアクセスするか、QRコードを読み取ってください
                  </p>

                  <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono break-all">{qrCodeUrl}</span>
                      <Button size="sm" variant="outline" onClick={handleCopyUrl} className="bg-transparent">
                        {copySuccess ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {qrCodeUrl && (
                    <div className="flex justify-center mb-4">
                      <img
                        src={generateQRCode(qrCodeUrl) || "/placeholder.svg"}
                        alt="QR Code"
                        className="border rounded-lg"
                        width={150}
                        height={150}
                      />
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">接続中の子機</span>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">{connectedClients}台接続中</span>
                    </div>
                  </div>
                </div>

                <Button onClick={handleStopHost} variant="outline" className="w-full bg-transparent">
                  親機を停止
                </Button>
              </CardContent>
            </Card>
          )}

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

          {/* 同期の仕組み説明 */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>同期の仕組み:</strong>
              <br />• 親機として開始すると他のデバイスが接続可能
              <br />• QRコードまたはURLで子機が接続
              <br />• データは親機で一元管理され自動同期
              <br />• 会計システムの機能は一切変更されません
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
