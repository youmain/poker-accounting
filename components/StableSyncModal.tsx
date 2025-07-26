"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStableSync } from "@/hooks/useStableSync"
import {
  Copy,
  Users,
  Wifi,
  WifiOff,
  Database,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Bug,
  Crown,
  User,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface StableSyncModalProps {
  isOpen: boolean
  onCloseAction: () => void
  connectedDevices?: string[]
  onUpdateConnectedDevices?: (devices: string[]) => void
}

export function StableSyncModal({
  isOpen,
  onCloseAction,
  connectedDevices = [],
  onUpdateConnectedDevices,
}: StableSyncModalProps) {
  const [roomIdInput, setRoomIdInput] = useState("")
  const [inviteeName, setInviteeName] = useState("")
  const [hostName, setHostName] = useState("ホスト")
  const [welcomeMessage, setWelcomeMessage] = useState("")
  const [urlChecked, setUrlChecked] = useState(false)
  const { toast } = useToast()

  const {
    isConnected,
    isLoading,
    roomId,
    isHost,
    startHost,
    joinRoom,
    leaveRoom,
    refreshData,
    syncVersion,
    checkDataIntegrity,
    debugInfo,
    updateDebugInfo,
    connectedDevices: syncConnectedDevices,
  } = useStableSync()

  // URLパラメータから招待情報を取得して自動接続
  useEffect(() => {
    if (typeof window !== "undefined" && !urlChecked) {
      console.log("Checking URL parameters...")
      const urlParams = new URLSearchParams(window.location.search)
      const nameParam = urlParams.get("name")
      const roomParam = urlParams.get("room")

      console.log("Raw URL params:", {
        nameParam,
        roomParam,
        isConnected,
        fullUrl: window.location.href,
        search: window.location.search,
      })

      if (nameParam && roomParam && !isConnected) {
        try {
          const decodedName = decodeURIComponent(nameParam)
          console.log("Decoded name:", decodedName)
          console.log("Setting welcome message and auto-connecting for:", decodedName)

          setWelcomeMessage(`${decodedName}さん、こんにちは！自動接続中...`)
          setRoomIdInput(roomParam.toUpperCase())

          // 自動接続を実行
          const autoConnect = async () => {
            console.log("Starting auto-connection to room:", roomParam.toUpperCase())
            const success = await joinRoom(roomParam.toUpperCase(), decodedName)

            if (success) {
              console.log("Auto-connection successful")
              setWelcomeMessage(`${decodedName}さん、接続完了！データが共有されています。`)
              toast({
                title: "自動接続成功",
                description: `${decodedName}さんとしてルーム ${roomParam.toUpperCase()} に接続しました。`,
              })

              // URLパラメータをクリア（履歴を汚さないため）
              const newUrl = window.location.origin + window.location.pathname
              window.history.replaceState({}, document.title, newUrl)

              // 10秒後にウェルカムメッセージを消す
              setTimeout(() => {
                console.log("Clearing welcome message after auto-connection")
                setWelcomeMessage("")
              }, 10000)
            } else {
              console.log("Auto-connection failed")
              setWelcomeMessage(`${decodedName}さん、接続に失敗しました。手動で接続してください。`)
              toast({
                title: "自動接続失敗",
                description: "ルームが見つからないか、接続に失敗しました。手動で接続してください。",
                variant: "destructive",
              })

              // 失敗時は7秒後にメッセージを消す
              setTimeout(() => {
                console.log("Clearing welcome message after failed auto-connection")
                setWelcomeMessage("")
              }, 7000)
            }
          }

          // 少し遅延してから自動接続（UIの準備を待つ）
          setTimeout(autoConnect, 1000)
        } catch (error) {
          console.error("Error during auto-connection:", error)
          setWelcomeMessage("接続エラーが発生しました。手動で接続してください。")
          setTimeout(() => {
            setWelcomeMessage("")
          }, 5000)
        }
      } else {
        console.log("URL parameters not found or already connected:", { nameParam, roomParam, isConnected })
      }

      setUrlChecked(true)
    }
  }, [isConnected, isOpen, urlChecked, joinRoom, toast])

  const handleStartHost = async () => {
    console.log("Starting host from modal as:", hostName)
    const newRoomId = await startHost(hostName)
    if (newRoomId) {
      console.log("Host started successfully")
      toast({
        title: "ホスト開始成功",
        description: `${hostName}としてルームID: ${newRoomId} を作成しました。`,
      })
    } else {
      toast({
        title: "ホスト開始失敗",
        description: "ホストの開始に失敗しました。",
        variant: "destructive",
      })
    }
  }

  const handleJoinRoom = async () => {
    console.log("Joining room from modal:", roomIdInput)
    if (roomIdInput.trim().length === 6) {
      const participantName = inviteeName.trim() || "匿名ユーザー"
      const success = await joinRoom(roomIdInput.trim().toUpperCase(), participantName)
      if (success) {
        setRoomIdInput("")
        setInviteeName("")
        setWelcomeMessage("")
        console.log("Successfully joined room")
        toast({
          title: "接続成功",
          description: `${participantName}としてルーム ${roomIdInput.trim().toUpperCase()} に接続しました。`,
        })
      } else {
        toast({
          title: "接続失敗",
          description: "ルームが見つからないか、接続に失敗しました。",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "入力エラー",
        description: "6文字のルームIDを入力してください。",
        variant: "destructive",
      })
    }
  }

  const handleLeaveRoom = async () => {
    if (confirm("データ共有を終了しますか？")) {
      await leaveRoom()
      toast({
        title: "切断完了",
        description: "ルームから切断しました。",
      })
    }
  }

  const handleCopyRoomId = async () => {
    if (roomId) {
      try {
        if (typeof window !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(roomId)
          toast({
            title: "コピー完了",
            description: "ルームIDをクリップボードにコピーしました。",
          })
        } else {
          // フォールバック: テキストエリアを使用
          const textArea = document.createElement('textarea')
          textArea.value = roomId
          textArea.style.position = 'fixed'
          textArea.style.left = '-999999px'
          textArea.style.top = '-999999px'
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
          toast({
            title: "コピー完了",
            description: "ルームIDをクリップボードにコピーしました。",
          })
        }
      } catch (error) {
        console.error("Copy failed:", error)
        toast({
          title: "コピー失敗",
          description: "クリップボードへのコピーに失敗しました。",
          variant: "destructive",
        })
      }
    }
  }

  const generateInviteUrl = () => {
    if (roomId && typeof window !== "undefined") {
      // 本番URLが設定されている場合はそれを使用、そうでなければローカルURLを使用
      const baseUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL || window.location.origin
      
      const params = new URLSearchParams()
      params.set("room", roomId)

      if (inviteeName.trim()) {
        params.set("name", inviteeName.trim())
      }

      const fullUrl = `${baseUrl}?${params.toString()}`
      console.log("Generated invitation URL:", fullUrl)
      return fullUrl
    }
    return ""
  }

  const generateQRCodeUrl = () => {
    const inviteUrl = generateInviteUrl()
    if (inviteUrl) {
      return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}`
    }
    return ""
  }

  const handleCopyInviteUrl = async () => {
    const fullUrl = generateInviteUrl()
    if (fullUrl) {
      try {
        if (typeof window !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(fullUrl)
          toast({
            title: "URLコピー完了",
            description: "招待URLをクリップボードにコピーしました。",
          })
          console.log("Copied invitation URL:", fullUrl)
        } else {
          // フォールバック: テキストエリアを使用
          const textArea = document.createElement('textarea')
          textArea.value = fullUrl
          textArea.style.position = 'fixed'
          textArea.style.left = '-999999px'
          textArea.style.top = '-999999px'
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
          toast({
            title: "URLコピー完了",
            description: "招待URLをクリップボードにコピーしました。",
          })
          console.log("Copied invitation URL:", fullUrl)
        }
      } catch (error) {
        console.error("Failed to copy invite URL:", error)
        toast({
          title: "コピー失敗",
          description: "URLのコピーに失敗しました。",
          variant: "destructive",
        })
      }
    }
  }

  const handleManualSync = async () => {
    try {
      await refreshData()
      const isUpToDate = await checkDataIntegrity()
      toast({
        title: "同期完了",
        description: isUpToDate ? "データは最新です。" : "データを更新しました。",
      })
    } catch (error) {
      console.error("Manual sync error:", error)
      toast({
        title: "同期エラー",
        description: "データの同期に失敗しました。",
        variant: "destructive",
      })
    }
  }

  const getStatusIcon = () => {
    if (isLoading) {
      return <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />
    } else if (isConnected) {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    } else {
      return <AlertCircle className="h-4 w-4 text-red-600" />
    }
  }

  const getStatusText = () => {
    if (isLoading) {
      return "接続中..."
    } else if (isConnected) {
      return "接続中"
    } else {
      return "未接続"
    }
  }

  const getStatusColor = () => {
    if (isLoading) {
      return "text-yellow-600"
    } else if (isConnected) {
      return "text-green-600"
    } else {
      return "text-red-600"
    }
  }

  const formatJoinTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
          <Dialog open={isOpen} onOpenChange={onCloseAction}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            データ共有設定
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="status" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="status">状況</TabsTrigger>
            <TabsTrigger value="connect">接続</TabsTrigger>
            {process.env.NODE_ENV === "development" && <TabsTrigger value="debug">デバッグ</TabsTrigger>}
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            {welcomeMessage && (
              <Alert className={`${isConnected ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}`}>
                <CheckCircle className={`h-4 w-4 ${isConnected ? "text-green-600" : "text-blue-600"}`} />
                <AlertDescription className={`${isConnected ? "text-green-800" : "text-blue-800"}`}>
                  <div className="font-medium">{welcomeMessage}</div>
                  {!isConnected && !welcomeMessage.includes("自動接続中") && (
                    <div className="text-sm mt-1">下のボタンでルームに参加してデータを共有しましょう。</div>
                  )}
                  {welcomeMessage.includes("自動接続中") && (
                    <div className="text-sm mt-1 flex items-center gap-2">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      しばらくお待ちください...
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* 接続状況 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  {getStatusIcon()}
                  接続状況
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">ステータス:</span>
                  <Badge variant="outline" className={getStatusColor()}>
                    {getStatusText()}
                  </Badge>
                </div>

                {isConnected && roomId && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">ルームID:</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {roomId}
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={handleCopyRoomId} className="h-6 w-6 p-0">
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">役割:</span>
                      <Badge variant={isHost ? "default" : "secondary"}>{isHost ? "ホスト" : "参加者"}</Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">データバージョン:</span>
                      <span className="text-sm font-mono">v{syncVersion}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">接続デバイス:</span>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span className="text-sm">{syncConnectedDevices.length}台</span>
                      </div>
                    </div>

                    {/* 参加者一覧 */}
                    {syncConnectedDevices.length > 0 && (
                      <div className="pt-2 border-t">
                        <div className="text-sm text-gray-600 mb-2">参加者一覧:</div>
                        <div className="space-y-2">
                          {syncConnectedDevices.map((participant) => (
                            <div
                              key={participant.id}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                            >
                              <div className="flex items-center gap-2">
                                {participant.isHost ? (
                                  <Crown className="h-4 w-4 text-yellow-600" />
                                ) : (
                                  <User className="h-4 w-4 text-gray-500" />
                                )}
                                <div>
                                  <div className="font-medium text-sm">{participant.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {formatJoinTime(participant.joinedAt)}に参加
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {participant.isHost && (
                                  <Badge variant="default" className="text-xs">
                                    ホスト
                                  </Badge>
                                )}
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isHost && (
                      <div className="pt-2 border-t">
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm text-gray-600 block mb-1">招待する人の名前:</Label>
                            <Input
                              placeholder="田中さん"
                              value={inviteeName}
                              onChange={(e) => setInviteeName(e.target.value)}
                              className="text-sm"
                            />
                          </div>

                          <div>
                            <div className="text-sm text-gray-600 mb-2">招待用QRコード:</div>
                            <div className="flex justify-center">
                              <img
                                src={generateQRCodeUrl() || "/placeholder.svg?height=128&width=128"}
                                alt="QR Code"
                                className="w-32 h-32 border rounded"
                              />
                            </div>
                            <p className="text-xs text-gray-500 text-center mt-2">
                              {inviteeName.trim() ? `${inviteeName}さん` : "他のデバイス"}がこのQRコードを読み取って参加
                            </p>
                            {process.env.NEXT_PUBLIC_PRODUCTION_URL && (
                              <p className="text-xs text-blue-600 text-center mt-1">
                                🌐 インターネット経由でアクセス可能
                              </p>
                            )}
                            
                            {/* 招待URLの表示 */}
                            <div className="mt-3 space-y-2">
                              <p className="text-xs text-gray-600 text-center">招待URL:</p>
                              <div className="flex items-center gap-2">
                                <code className="flex-1 p-2 bg-gray-100 rounded text-xs font-mono break-all">
                                  {generateInviteUrl() || "URL生成中..."}
                                </code>
                                <Button
                                  onClick={handleCopyInviteUrl}
                                  variant="outline"
                                  size="sm"
                                  className="bg-transparent"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleManualSync}
                        disabled={isLoading}
                        className="flex-1 bg-transparent"
                      >
                        <RefreshCw className={`h-3 w-3 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                        手動同期
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleLeaveRoom}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        <WifiOff className="h-3 w-3 mr-2" />
                        切断
                      </Button>
                    </div>
                  </>
                )}

                {!isConnected && (
                  <div className="text-center py-4">
                    <WifiOff className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">データ共有が開始されていません</p>
                    <p className="text-xs text-gray-500 mt-1">「接続」タブから開始してください</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="connect" className="space-y-4">
            {!isConnected && (
              <div className="space-y-4">
                {/* ホスト開始 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">新しいルームを作成</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="hostName" className="text-sm">
                        あなたの名前
                      </Label>
                      <Input
                        id="hostName"
                        placeholder="ホスト"
                        value={hostName}
                        onChange={(e) => setHostName(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <Button onClick={handleStartHost} disabled={isLoading} className="w-full">
                      <Wifi className="h-4 w-4 mr-2" />
                      ホストとして開始
                    </Button>
                  </CardContent>
                </Card>

                <div className="flex items-center gap-4">
                  <Separator className="flex-1" />
                  <span className="text-xs text-gray-500">または</span>
                  <Separator className="flex-1" />
                </div>

                {/* ルーム参加 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">既存のルームに参加</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="participantName" className="text-sm">
                        あなたの名前
                      </Label>
                      <Input
                        id="participantName"
                        placeholder="田中さん"
                        value={inviteeName}
                        onChange={(e) => setInviteeName(e.target.value)}
                        className="text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="roomId" className="text-sm">
                        ルームID
                      </Label>
                      <Input
                        id="roomId"
                        placeholder="例: ABC123"
                        value={roomIdInput}
                        onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !isLoading) {
                            handleJoinRoom()
                          }
                        }}
                        className="font-mono"
                        maxLength={6}
                      />
                    </div>

                    <Button onClick={handleJoinRoom} disabled={isLoading || !roomIdInput.trim()} className="w-full">
                      <Users className="h-4 w-4 mr-2" />
                      ルームに参加
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {isConnected && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>ルーム {roomId} に接続中です。「状況」タブで詳細を確認できます。</AlertDescription>
              </Alert>
            )}

            {/* 注意事項 */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <div className="font-medium mb-1">データ共有について</div>
                <ul className="space-y-1">
                  <li>• 完全無料で使用できます</li>
                  <li>• オフラインでも動作します</li>
                  <li>• データは自動的に同期されます</li>
                  <li>• QRコードで簡単に接続できます</li>
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>

          {process.env.NODE_ENV === "development" && (
            <TabsContent value="debug" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    デバッグ情報
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button onClick={updateDebugInfo} variant="outline" size="sm" className="w-full bg-transparent">
                    <RefreshCw className="h-3 w-3 mr-2" />
                    デバッグ情報更新
                  </Button>

                  {debugInfo && (
                    <div className="space-y-2">
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">ルームID:</span>
                          <span className="font-mono">{debugInfo.roomId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">参加者ID:</span>
                          <span className="font-mono text-xs">{debugInfo.participantId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">参加者名:</span>
                          <span>{debugInfo.participantName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ホスト:</span>
                          <span>{debugInfo.isHost ? "はい" : "いいえ"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">参加者数:</span>
                          <span>{debugInfo.participants?.length || 0}人</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">データバージョン:</span>
                          <span>v{debugInfo.currentVersion}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">データキー:</span>
                          <span className="text-xs">{debugInfo.dataKeys?.join(", ") || "なし"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">最終更新:</span>
                          <span className="text-xs">{debugInfo.lastUpdated || "不明"}</span>
                        </div>
                      </div>

                      <Separator />

                      <div className="text-xs">
                        <div className="text-gray-600 mb-1">参加者一覧:</div>
                        <div className="space-y-1">
                          {debugInfo.participants?.map((participant: any, index: number) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="font-medium text-xs">{participant.name}</span>
                              <span className="font-mono text-xs text-gray-500">({participant.id})</span>
                              {participant.id === debugInfo.participantId && (
                                <Badge variant="secondary" className="text-xs">
                                  自分
                                </Badge>
                              )}
                              {participant.isHost && (
                                <Badge variant="default" className="text-xs">
                                  ホスト
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {!debugInfo && (
                    <div className="text-center py-4">
                      <AlertCircle className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">デバッグ情報を取得するには上のボタンを押してください</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  このデバッグ情報は開発環境でのみ表示されます。 同期の問題を特定する際に使用してください。
                </AlertDescription>
              </Alert>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
