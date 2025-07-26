"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Server, Smartphone, AlertCircle, Wifi, WifiOff } from "lucide-react"

interface PeerSyncModalProps {
  isOpen: boolean
  onClose: () => void
  onStartAsHost: () => Promise<string | null>
  onConnectAsClient: (hostId: string) => Promise<boolean>
  onDisconnect: () => void
  isConnected: boolean
  isHost: boolean
  peerId: string
  connectedDevices: number
}

export function PeerSyncModal({
  isOpen,
  onClose,
  onStartAsHost,
  onConnectAsClient,
  onDisconnect,
  isConnected,
  isHost,
  peerId,
  connectedDevices,
}: PeerSyncModalProps) {
  const [activeTab, setActiveTab] = useState("create")
  const [hostId, setHostId] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")

  useEffect(() => {
    if (peerId) {
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(peerId)}`)
    }
  }, [peerId])

  const handleStartAsHost = async () => {
    setIsCreating(true)
    setError("")
    try {
      const newHostId = await onStartAsHost()
      if (newHostId) {
        setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(newHostId)}`)
        return true
      } else {
        setError("ホストの開始に失敗しました")
        return false
      }
    } catch (err) {
      setError("エラーが発生しました")
      return false
    } finally {
      setIsCreating(false)
    }
  }

  const handleConnectAsClient = async () => {
    if (!hostId.trim()) {
      setError("ホストIDを入力してください")
      return
    }

    setIsConnecting(true)
    setError("")
    try {
      const success = await onConnectAsClient(hostId)
      if (success) {
        return true
      } else {
        setError("ホストへの接続に失敗しました")
        return false
      }
    } catch (err) {
      setError("エラーが発生しました")
      return false
    } finally {
      setIsConnecting(false)
    }
  }

  const copyHostId = () => {
    if (peerId) {
      try {
        if (typeof window !== "undefined" && navigator.clipboard) {
          navigator.clipboard.writeText(peerId)
          alert("ホストIDをコピーしました")
        } else {
          // フォールバック: テキストエリアを使用
          const textArea = document.createElement('textarea')
          textArea.value = peerId
          textArea.style.position = 'fixed'
          textArea.style.left = '-999999px'
          textArea.style.top = '-999999px'
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
          alert("ホストIDをコピーしました")
        }
      } catch (error) {
        console.error("コピーに失敗しました:", error)
        alert("コピーに失敗しました")
      }
    }
  }

  const handleDisconnect = () => {
    onDisconnect()
    setHostId("")
    setQrCodeUrl("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            P2P同期設定
          </DialogTitle>
        </DialogHeader>

        {isConnected ? (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <h4 className="text-sm font-medium text-green-800 mb-1">
                {isHost ? "ホストとして接続中" : "クライアントとして接続中"}
              </h4>
              <div className="flex justify-between items-center text-xs text-green-700">
                <span>接続デバイス数:</span>
                <span className="font-medium">{connectedDevices}台</span>
              </div>
            </div>

            {isHost && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>ホストID</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 p-2 bg-gray-100 rounded border text-sm font-mono break-all">{peerId}</div>
                    <Button size="sm" variant="outline" onClick={copyHostId}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">このIDを他のデバイスと共有してください</p>
                </div>

                {qrCodeUrl && (
                  <div className="flex justify-center">
                    <div className="text-center">
                      <img
                        src={qrCodeUrl || "/placeholder.svg"}
                        alt="Host QR Code"
                        className="border rounded-lg"
                        width={150}
                        height={150}
                      />
                      <p className="text-xs text-gray-500 mt-2">QRコードをスキャンして接続</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button onClick={handleDisconnect} variant="destructive" className="w-full">
              切断
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">ホスト（作成）</TabsTrigger>
              <TabsTrigger value="join">クライアント（参加）</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4 mt-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  ホストとして開始
                </h3>
                <p className="text-xs text-gray-500">
                  このデバイスをホストとして、他のデバイスからの接続を受け入れます
                </p>
              </div>

              <Button onClick={handleStartAsHost} disabled={isCreating} className="w-full">
                {isCreating ? "開始中..." : "ホスト開始"}
              </Button>
            </TabsContent>

            <TabsContent value="join" className="space-y-4 mt-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  クライアントとして接続
                </h3>
                <p className="text-xs text-gray-500">ホストデバイスから共有されたIDを入力して接続します</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="host-id">ホストID</Label>
                <Input
                  id="host-id"
                  value={hostId}
                  onChange={(e) => setHostId(e.target.value)}
                  placeholder="host-xxxxxxxxx"
                />
              </div>

              <Button onClick={handleConnectAsClient} disabled={isConnecting || !hostId.trim()} className="w-full">
                {isConnecting ? "接続中..." : "接続"}
              </Button>
            </TabsContent>
          </Tabs>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  )
}
