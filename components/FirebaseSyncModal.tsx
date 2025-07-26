"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"
import { useFirebaseSync } from "@/hooks/useFirebaseSync"
import { firebaseManager } from "@/lib/firebase"
import { 
  QrCode, 
  Copy, 
  Users, 
  Wifi, 
  WifiOff, 
  Database, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Globe,
  Smartphone
} from "lucide-react"
import QRCode from "qrcode"

interface FirebaseSyncModalProps {
  isOpen: boolean
  onCloseAction: () => void
}

export function FirebaseSyncModal({ isOpen, onCloseAction }: FirebaseSyncModalProps) {
  const [activeTab, setActiveTab] = useState("host")
  const [hostName, setHostName] = useState("ホスト")
  const [participantName, setParticipantName] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected")
  const [error, setError] = useState("")

  const {
    isConnected,
    isLoading,
    serverData,
    connectedDevices,
    saveToServer,
    createNewSession,
    joinSession,
    leaveSession,
    refreshData
  } = useFirebaseSync()

  // URLパラメータの自動処理
  useEffect(() => {
    if (typeof window !== "undefined" && isOpen) {
      const urlParams = new URLSearchParams(window.location.search)
      const sessionParam = urlParams.get("session")
      const nameParam = urlParams.get("name")

      if (sessionParam && nameParam) {
        console.log("Firebase URL parameters detected:", { session: sessionParam, name: nameParam })
        setSessionId(sessionParam)
        setParticipantName(nameParam)
        setActiveTab("join")
        
        // 自動的にセッションに参加
        handleJoinSession(sessionParam, nameParam)
      }
    }
  }, [isOpen])

  // 接続状態の監視
  useEffect(() => {
    if (isConnected) {
      setConnectionStatus("connected")
      setError("")
    } else if (isLoading) {
      setConnectionStatus("connecting")
    } else {
      setConnectionStatus("disconnected")
    }
  }, [isConnected, isLoading])

  // ホスト開始
  const handleStartHost = useCallback(async () => {
    if (!hostName.trim()) {
      setError("ホスト名を入力してください")
      return
    }

    setIsGeneratingQR(true)
    setError("")

    try {
      // 新しいセッションを作成
      const newSessionId = await createNewSession()
      if (!newSessionId) {
        throw new Error("セッションの作成に失敗しました")
      }

      setSessionId(newSessionId)

      // QRコード用のURLを生成
      const baseUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL || window.location.origin
      const inviteUrl = `${baseUrl}?session=${newSessionId}&name=${encodeURIComponent(hostName)}`

      // QRコードを生成
      const qrCodeDataUrl = await QRCode.toDataURL(inviteUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF"
        }
      })

      setQrCodeUrl(qrCodeDataUrl)
      toast({
        title: "ホスト開始完了",
        description: "QRコードが生成されました。参加者に共有してください。",
      })

    } catch (error) {
      console.error("ホスト開始エラー:", error)
      setError("ホスト開始に失敗しました")
    } finally {
      setIsGeneratingQR(false)
    }
  }, [hostName, createNewSession])

  // セッション参加
  const handleJoinSession = useCallback(async (sessionIdToJoin: string, participantNameToJoin: string) => {
    if (!participantNameToJoin.trim()) {
      setError("参加者名を入力してください")
      return
    }

    setIsConnecting(true)
    setError("")

    try {
      const success = await joinSession(sessionIdToJoin)
      if (success) {
        toast({
          title: "接続完了",
          description: "Firebaseセッションに接続しました。",
        })
        
        // URLパラメータをクリア
        setTimeout(() => {
          if (typeof window !== "undefined") {
            const newUrl = window.location.pathname
            window.history.replaceState({}, "", newUrl)
          }
        }, 2000)
      } else {
        throw new Error("セッションへの参加に失敗しました")
      }
    } catch (error) {
      console.error("セッション参加エラー:", error)
      setError("セッションへの参加に失敗しました")
    } finally {
      setIsConnecting(false)
    }
  }, [joinSession])

  // 招待URLをコピー
  const handleCopyInviteUrl = useCallback(async () => {
    if (!qrCodeUrl) return

    const baseUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL || window.location.origin
    const inviteUrl = `${baseUrl}?session=${sessionId}&name=${encodeURIComponent(hostName)}`

    try {
      if (typeof window !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(inviteUrl)
      } else if (typeof window !== "undefined" && document.execCommand) {
        const textArea = document.createElement("textarea")
        textArea.value = inviteUrl
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
      } else {
        throw new Error("Clipboard not supported")
      }

      toast({
        title: "URLコピー完了",
        description: "招待URLをクリップボードにコピーしました。",
      })
    } catch (error) {
      console.error("URLコピーエラー:", error)
      toast({
        title: "コピー失敗",
        description: "URLのコピーに失敗しました。",
        variant: "destructive",
      })
    }
  }, [sessionId, hostName, qrCodeUrl])

  // 接続終了
  const handleLeaveSession = useCallback(async () => {
    try {
      await leaveSession()
      setQrCodeUrl("")
      setSessionId("")
      setConnectionStatus("disconnected")
      toast({
        title: "接続終了",
        description: "Firebaseセッションから切断しました。",
      })
    } catch (error) {
      console.error("接続終了エラー:", error)
      setError("接続終了に失敗しました")
    }
  }, [leaveSession])

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "connecting":
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
      default:
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "接続済み"
      case "connecting":
        return "接続中"
      default:
        return "未接続"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onCloseAction}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Firebase同期設定
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="host">ホスト</TabsTrigger>
            <TabsTrigger value="join">参加</TabsTrigger>
          </TabsList>

          <TabsContent value="host" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  ホスト開始
                </CardTitle>
                <CardDescription>
                  新しいFirebaseセッションを作成してQRコードを生成します
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hostName">あなたの名前</Label>
                  <Input
                    id="hostName"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="ホスト"
                  />
                </div>

                <Button 
                  onClick={handleStartHost} 
                  disabled={isGeneratingQR || isConnected}
                  className="w-full"
                >
                  {isGeneratingQR ? "QRコード生成中..." : "ホスト開始"}
                </Button>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {qrCodeUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    招待用QRコード
                  </CardTitle>
                  <CardDescription>
                    参加者にこのQRコードを読み取ってもらってください
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    <img src={qrCodeUrl} alt="QR Code" className="border rounded-lg" />
                  </div>
                  
                  <div className="text-center">
                    <Badge variant="outline" className="mb-2">
                      <Globe className="h-3 w-3 mr-1" />
                      インターネット経由でアクセス可能
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label>招待URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={`${process.env.NEXT_PUBLIC_PRODUCTION_URL || window.location.origin}?session=${sessionId}&name=${encodeURIComponent(hostName)}`}
                        readOnly
                        className="text-sm"
                      />
                      <Button onClick={handleCopyInviteUrl} size="sm" variant="outline">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="join" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  セッション参加
                </CardTitle>
                <CardDescription>
                  既存のFirebaseセッションに参加します
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="participantName">あなたの名前</Label>
                  <Input
                    id="participantName"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    placeholder="参加者"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionId">セッションID</Label>
                  <Input
                    id="sessionId"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    placeholder="セッションIDを入力"
                  />
                </div>

                <Button 
                  onClick={() => handleJoinSession(sessionId, participantName)}
                  disabled={isConnecting || isConnected || !sessionId || !participantName}
                  className="w-full"
                >
                  {isConnecting ? "接続中..." : "セッション参加"}
                </Button>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 接続状態表示 */}
        {isConnected && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                接続状況
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <span>ステータス: {getStatusText()}</span>
                </div>
                <Badge variant="outline">
                  <Users className="h-3 w-3 mr-1" />
                  {connectedDevices}台
                </Badge>
              </div>

              {sessionId && (
                <div className="text-sm text-muted-foreground">
                  セッションID: {sessionId}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={refreshData} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  手動同期
                </Button>
                <Button onClick={handleLeaveSession} variant="destructive" size="sm">
                  切断
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          <Button onClick={onCloseAction} variant="outline" className="flex-1">
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 