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
import { useFirebaseSync } from "@/hooks/useFirebaseSync"
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
  disconnectUser?: (targetUid: string) => Promise<boolean>
}

export function StableSyncModal({
  isOpen,
  onCloseAction,
  connectedDevices = [],
  onUpdateConnectedDevices,
  disconnectUser,
}: StableSyncModalProps) {
  const [roomIdInput, setRoomIdInput] = useState("")
  const [inviteeName, setInviteeName] = useState("")
  const [hostName, setHostName] = useState("ホスト")
  const [welcomeMessage, setWelcomeMessage] = useState("")
  const [urlChecked, setUrlChecked] = useState(false)
  const [syncMode, setSyncMode] = useState<"local" | "internet">("internet")
  const { toast } = useToast()

  const {
    isConnected: stableConnected,
    isLoading: stableLoading,
    roomId,
    isHost: stableIsHost,
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

  const {
    isConnected: firebaseConnected,
    isLoading: firebaseLoading,
    sessionId,
    isHost: firebaseIsHost,
    lastSyncTime,
    syncVersion: firebaseSyncVersion,
    syncProgress: firebaseSyncProgress,
    createNewSession,
    joinSession,
    leaveSession,
    refreshData: firebaseRefreshData,
    connectedDevices: firebaseConnectedDevices,
    connectedUsers,
    serverData,
  } = useFirebaseSync()

  // 統合された状態
  const isConnected = stableConnected || firebaseConnected
  const isLoading = stableLoading || firebaseLoading
  const isHost = syncMode === "internet" ? firebaseIsHost : stableIsHost

  // デバッグ用ログ
  useEffect(() => {
    console.log("=== StableSyncModal State ===")
    console.log("isOpen:", isOpen)
    console.log("syncMode:", syncMode)
    console.log("isConnected:", isConnected)
    console.log("isHost:", isHost)
    console.log("stableConnected:", stableConnected)
    console.log("stableIsHost:", stableIsHost)
    console.log("firebaseConnected:", firebaseConnected)
    console.log("firebaseIsHost:", firebaseIsHost)
    console.log("sessionId:", sessionId)
    console.log("roomId:", roomId)
    console.log("firebaseSyncProgress:", firebaseSyncProgress)
    
    // QRコード表示条件のデバッグ
    const qrCondition1 = isHost
    const qrCondition2 = syncMode === "internet" && firebaseConnected && sessionId
    const shouldShowQR = qrCondition1 || qrCondition2
    
    console.log("=== QR Code Display Conditions ===")
    console.log("qrCondition1 (isHost):", qrCondition1)
    console.log("qrCondition2 (internet && connected && sessionId):", qrCondition2)
    console.log("shouldShowQR:", shouldShowQR)
    console.log("syncMode:", syncMode)
    console.log("firebaseConnected:", firebaseConnected)
    console.log("sessionId:", sessionId)
    
    // 詳細な条件チェック
    console.log("=== Detailed QR Conditions ===")
    console.log("syncMode === 'internet':", syncMode === "internet")
    console.log("firebaseConnected:", firebaseConnected)
    console.log("sessionId exists:", !!sessionId)
    console.log("sessionId value:", sessionId)
    console.log("isHost:", isHost)
    console.log("firebaseIsHost:", firebaseIsHost)
    console.log("================================")
  }, [syncMode, isConnected, isHost, stableConnected, stableIsHost, firebaseConnected, firebaseIsHost, sessionId, roomId])

  // URLパラメータから招待情報を取得して自動接続
  useEffect(() => {
    if (typeof window !== "undefined" && !urlChecked) {
      console.log("Checking URL parameters...")
      const urlParams = new URLSearchParams(window.location.search)
      const nameParam = urlParams.get("name")
      const roomParam = urlParams.get("room")
      const sessionParam = urlParams.get("session")

      console.log("Raw URL params:", {
        nameParam,
        roomParam,
        sessionParam,
        isConnected,
        fullUrl: window.location.href,
        search: window.location.search,
      })

      if (nameParam && !isConnected) {
        try {
          const decodedName = decodeURIComponent(nameParam)
          console.log("Decoded name:", decodedName)
          console.log("Setting welcome message and auto-connecting for:", decodedName)

          setWelcomeMessage(`${decodedName}さん、こんにちは！自動接続中...`)
          
          // デバッグ用のアラートを追加
          console.log("=== URL PARAMETERS DEBUG ===")
          console.log("nameParam:", nameParam)
          console.log("decodedName:", decodedName)
          console.log("isConnected:", isConnected)
          console.log("sessionParam:", sessionParam)
          console.log("roomParam:", roomParam)

          // 自動接続を実行
          const autoConnect = async () => {
            if (sessionParam) {
              // Firebaseセッション接続（インターネット）
              console.log("Starting Firebase auto-connection to session:", sessionParam)
              setSyncMode("internet")
              
              // URLパラメータに参加者名を設定
              const url = new URL(window.location.href)
              url.searchParams.set("name", decodedName)
              window.history.replaceState({}, "", url.toString())
              
              console.log("Calling joinSession with sessionParam:", sessionParam)
              const success = await joinSession(sessionParam)
              console.log("joinSession result:", success)
              
              if (success) {
                console.log("Firebase auto-connection successful")
                setWelcomeMessage(`${decodedName}さん、インターネット経由で接続完了！`)
                toast({
                  title: "自動接続成功",
                  description: `${decodedName}さんとしてFirebaseセッションに接続しました。`,
                })
              } else {
                console.log("Firebase auto-connection failed")
                setWelcomeMessage(`${decodedName}さん、インターネット接続に失敗しました。`)
                toast({
                  title: "自動接続失敗",
                  description: "Firebaseセッションが見つからないか、接続に失敗しました。",
                  variant: "destructive",
                })
              }
            } else if (roomParam) {
              // 自動フォールバック接続（ローカル → インターネット）
              console.log("Starting auto-fallback connection for room:", roomParam.toUpperCase())
              setSyncMode("local")
              setRoomIdInput(roomParam.toUpperCase())
              
              // まずローカル同期を試行
              console.log("Trying local connection first...")
              setWelcomeMessage(`${decodedName}さん、ローカル接続を試行中...`)
              const localSuccess = await joinRoom(roomParam.toUpperCase(), decodedName)

              if (localSuccess) {
                console.log("Local connection successful")
                setWelcomeMessage(`${decodedName}さん、ローカルネットワーク経由で接続完了！`)
                toast({
                  title: "自動接続成功",
                  description: `${decodedName}さんとしてローカルルーム ${roomParam.toUpperCase()} に接続しました。`,
                })
              } else {
                console.log("Local connection failed, trying internet fallback...")
                setWelcomeMessage(`${decodedName}さん、ローカル接続失敗。インターネット接続を試行中...`)
                
                // ローカル失敗時はインターネット同期を試行
                setSyncMode("internet")
                
                // URLパラメータに参加者名を設定
                const url = new URL(window.location.href)
                url.searchParams.set("name", decodedName)
                window.history.replaceState({}, "", url.toString())
                
                const internetSuccess = await joinSession(roomParam.toUpperCase())
                
                if (internetSuccess) {
                  console.log("Internet fallback successful")
                  setWelcomeMessage(`${decodedName}さん、インターネット経由で接続完了！`)
                  toast({
                    title: "自動接続成功",
                    description: `${decodedName}さんとしてインターネット経由で接続しました。`,
                  })
                } else {
                  console.log("Both local and internet connections failed")
                  setWelcomeMessage(`${decodedName}さん、ローカル・インターネット両方の接続に失敗しました。`)
                  toast({
                    title: "自動接続失敗",
                    description: "ローカルネットワークとインターネット両方の接続に失敗しました。手動で接続してください。",
                    variant: "destructive",
                  })
                }
              }
            }

            // URLパラメータをクリア（履歴を汚さないため）
            const newUrl = window.location.origin + window.location.pathname
            window.history.replaceState({}, document.title, newUrl)

            // 10秒後にウェルカムメッセージを消す
            setTimeout(() => {
              console.log("Clearing welcome message after auto-connection")
              setWelcomeMessage("")
            }, 10000)
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
        console.log("URL parameters not found or already connected:", { 
          nameParam, 
          roomParam, 
          sessionParam, 
          isConnected 
        })
      }

      setUrlChecked(true)
    }
  }, [isConnected, isOpen, urlChecked, joinRoom, joinSession, toast])

  const handleStartHost = async () => {
    console.log("Starting host from modal as:", hostName, "with sync mode:", syncMode)
    
    if (syncMode === "internet") {
      // Firebaseセッション作成
      console.log("Creating Firebase session...")
      const newSessionId = await createNewSession()
      console.log("Firebase session creation result:", { newSessionId })
      
      if (newSessionId) {
        console.log("Firebase session created successfully")
        console.log("=== Session Creation Completed ===")
        console.log("firebaseConnected:", firebaseConnected)
        console.log("firebaseIsHost:", firebaseIsHost)
        console.log("sessionId:", sessionId)
        console.log("isHost:", isHost)
        console.log("================================")
        toast({
          title: "インターネットセッション開始成功",
          description: `${hostName}としてセッションID: ${newSessionId} を作成しました。`,
        })
      } else {
        console.log("Firebase session creation failed")
        toast({
          title: "インターネットセッション開始失敗",
          description: "Firebaseセッションの作成に失敗しました。",
          variant: "destructive",
        })
      }
    } else {
      // StableSyncルーム作成
      const newRoomId = await startHost(hostName)
      if (newRoomId) {
        console.log("StableSync host started successfully")
        toast({
          title: "ローカルホスト開始成功",
          description: `${hostName}としてルームID: ${newRoomId} を作成しました。`,
        })
      } else {
        toast({
          title: "ローカルホスト開始失敗",
          description: "ローカルホストの開始に失敗しました。",
          variant: "destructive",
        })
      }
    }
  }

  const handleJoinRoom = async () => {
    console.log("Joining room/session from modal:", roomIdInput, "with sync mode:", syncMode)
    
    if (syncMode === "internet") {
      // Firebaseセッション参加
      // URLパラメータに参加者名を設定
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href)
        url.searchParams.set("name", inviteeName.trim() || "参加者")
        window.history.replaceState({}, "", url.toString())
      }
      
      const success = await joinSession(roomIdInput.trim())
      if (success) {
        setRoomIdInput("")
        setInviteeName("")
        setWelcomeMessage("")
        console.log("Successfully joined Firebase session")
        toast({
          title: "接続成功",
          description: `Firebaseセッション ${roomIdInput.trim()} に接続しました。`,
        })
      } else {
        toast({
          title: "接続失敗",
          description: "Firebaseセッションが見つからないか、接続に失敗しました。",
          variant: "destructive",
        })
      }
    } else {
      // StableSyncルーム参加
      if (roomIdInput.trim().length === 6) {
        const participantName = inviteeName.trim() || "匿名ユーザー"
        const success = await joinRoom(roomIdInput.trim().toUpperCase(), participantName)
        if (success) {
          setRoomIdInput("")
          setInviteeName("")
          setWelcomeMessage("")
          console.log("Successfully joined StableSync room")
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
    const idToCopy = syncMode === "internet" ? sessionId : roomId
    if (idToCopy) {
      try {
        if (typeof window !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(idToCopy)
          toast({
            title: "コピー完了",
            description: `${syncMode === "internet" ? "セッションID" : "ルームID"}をクリップボードにコピーしました。`,
          })
        } else {
          // フォールバック: テキストエリアを使用
          const textArea = document.createElement('textarea')
          textArea.value = idToCopy
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
            description: `${syncMode === "internet" ? "セッションID" : "ルームID"}をクリップボードにコピーしました。`,
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
    console.log("=== generateInviteUrl called ===")
    console.log("syncMode:", syncMode)
    console.log("sessionId:", sessionId)
    console.log("roomId:", roomId)
    console.log("inviteeName:", inviteeName)
    console.log("inviteeName.trim():", inviteeName.trim())
    console.log("inviteeName.length:", inviteeName.length)
    console.log("NEXT_PUBLIC_PRODUCTION_URL:", process.env.NEXT_PUBLIC_PRODUCTION_URL)
    console.log("window.location.origin:", typeof window !== "undefined" ? window.location.origin : "undefined")
    
    if (typeof window !== "undefined") {
      // 同期方式に応じてURLを生成
      if (syncMode === "internet") {
        // インターネット同期用URL（Firebaseセッション）
        if (sessionId) {
          const internetUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL 
            ? `${process.env.NEXT_PUBLIC_PRODUCTION_URL}?session=${sessionId}&name=${encodeURIComponent(inviteeName || "参加者")}`
            : `${window.location.origin}?session=${sessionId}&name=${encodeURIComponent(inviteeName || "参加者")}`
          
          console.log("Generated internet invitation URL:", internetUrl)
          return internetUrl
        } else {
          console.log("No sessionId available for internet sync")
        }
      } else {
        // ローカル同期用URL（StableSync）
        if (roomId) {
          const localUrl = `${window.location.origin}?room=${roomId}&name=${encodeURIComponent(inviteeName || "参加者")}`
          
          // インターネット用URL（Vercel）も生成（フォールバック用）
          const internetUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL 
            ? `${process.env.NEXT_PUBLIC_PRODUCTION_URL}?room=${roomId}&name=${encodeURIComponent(inviteeName || "参加者")}`
            : localUrl
          
          // 自動フォールバック用のURL（ローカルを優先）
          const fallbackUrl = localUrl
          
          console.log("Generated invitation URLs:", { localUrl, internetUrl, fallbackUrl })
          return fallbackUrl
        }
      }
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
      if (syncMode === "internet") {
        await firebaseRefreshData()
        toast({
          title: "同期完了",
          description: "データを更新しました。",
        })
      } else {
        await refreshData()
        const isUpToDate = await checkDataIntegrity()
        toast({
          title: "同期完了",
          description: isUpToDate ? "データは最新です。" : "データを更新しました。",
        })
      }
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
    } else if (isConnected || firebaseConnected) {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    } else {
      return <AlertCircle className="h-4 w-4 text-red-600" />
    }
  }

  const getStatusText = () => {
    if (isLoading) {
      return "接続中..."
    } else if (isConnected || firebaseConnected) {
      return "接続中"
    } else {
      return "未接続"
    }
  }

  const getStatusColor = () => {
    if (isLoading) {
      return "text-yellow-600"
    } else if (isConnected || firebaseConnected) {
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

            {/* 同期進行状況の表示 */}
            {(() => {
              console.log("=== Sync Progress Display Check ===")
              console.log("firebaseSyncProgress:", firebaseSyncProgress)
              console.log("firebaseSyncProgress?.isSyncing:", firebaseSyncProgress?.isSyncing)
              return null
            })()}
            {/* 基本的なデバッグ情報 */}
            <Alert className="bg-yellow-50 border-yellow-200 border-2">
              <AlertDescription className="text-yellow-800">
                <div className="font-bold text-lg">🔍 デバッグ情報</div>
                <div className="text-sm mt-2">
                  <div>isConnected: {isConnected ? "true" : "false"}</div>
                  <div>isHost: {isHost ? "true" : "false"}</div>
                  <div>sessionId: {sessionId || "なし"}</div>
                  <div>firebaseConnected: {firebaseConnected ? "true" : "false"}</div>
                  <div>firebaseIsHost: {firebaseIsHost ? "true" : "false"}</div>
                  <div>firebaseSyncProgress: {firebaseSyncProgress ? "あり" : "なし"}</div>
                  <div>リアルタイムリスナー: {sessionId && isConnected ? "設定済み" : "未設定"}</div>
                  <div>最終同期時刻: {lastSyncTime ? lastSyncTime.toLocaleTimeString() : "なし"}</div>
                </div>
              </AlertDescription>
            </Alert>

            {/* 進行状況表示（デバッグ用） */}
            {firebaseSyncProgress && (
              <Alert className="bg-blue-50 border-blue-200 border-2">
                <RefreshCw className={`h-5 w-5 text-blue-600 ${firebaseSyncProgress.isSyncing ? 'animate-spin' : ''}`} />
                <AlertDescription className="text-blue-800">
                  <div className="font-bold text-lg">
                    {firebaseSyncProgress.isSyncing ? "🔄 データ同期中..." : "✅ データ同期完了"}
                  </div>
                  <div className="text-base mt-2 font-medium">{firebaseSyncProgress.currentStep}</div>
                  <div className="mt-3">
                    <div className="w-full bg-blue-200 rounded-full h-3">
                      <div 
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(firebaseSyncProgress.currentStepIndex / firebaseSyncProgress.totalSteps) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-sm text-blue-600 mt-2 font-medium">
                      進行状況: {firebaseSyncProgress.currentStepIndex} / {firebaseSyncProgress.totalSteps}
                    </div>
                  </div>
                  {firebaseSyncProgress.isSyncing ? (
                    <div className="text-xs text-blue-500 mt-2">
                      🔄 同期中...
                    </div>
                  ) : (
                    <div className="text-xs text-green-500 mt-2">
                      ✅ 同期完了
                    </div>
                  )}
                  <div className="text-xs text-red-500 mt-1">
                    進行状況オブジェクト: {JSON.stringify(firebaseSyncProgress)}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* 同期完了の表示 */}
            {firebaseSyncProgress && !firebaseSyncProgress.isSyncing && firebaseSyncProgress.currentStep === "同期完了" && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="font-medium">データ同期完了</div>
                  <div className="text-sm mt-1">ホストのデータが正常に同期されました</div>
                </AlertDescription>
              </Alert>
            )}

            {/* リアルタイム更新状態の表示 */}
            <Alert className="bg-blue-50 border-blue-200 border-2">
              <AlertDescription className="text-blue-800">
                <div className="font-bold text-lg">🔄 リアルタイム同期状態</div>
                <div className="text-sm mt-2">
                  <div>接続状態: {isConnected ? "✅ 接続中" : "❌ 未接続"}</div>
                  <div>セッションID: {sessionId || "なし"}</div>
                  <div>リスナー設定: {sessionId && isConnected ? "✅ 設定済み" : "❌ 未設定"}</div>
                  <div>最終更新: {lastSyncTime ? lastSyncTime.toLocaleTimeString() : "なし"}</div>
                  <div className="mt-2 text-xs text-blue-600">
                    ※ ホストがデータを更新すると、ここにリアルタイムで反映されます
                  </div>
                  <div className="mt-2 text-xs text-red-600">
                    🔍 デバッグ: リスナーID = {sessionId ? `${sessionId}-players` : "なし"}
                  </div>
                  <div className="text-xs text-red-600">
                    🔍 デバッグ: 現在時刻 = {new Date().toLocaleTimeString()}
                  </div>
                  <div className="text-xs text-red-600">
                    🔍 デバッグ: 最終更新からの経過 = {lastSyncTime ? `${Math.floor((new Date().getTime() - lastSyncTime.getTime()) / 1000)}秒` : "不明"}
                  </div>
                  <div className="text-xs text-red-600">
                    🔍 デバッグ: 受信データ = {serverData ? `プレイヤー${serverData.players?.length || 0}件, 伝票${serverData.receipts?.length || 0}件` : "なし"}
                  </div>
                  <div className="text-xs text-red-600">
                    🔍 デバッグ: リスナー設定 = {sessionId ? "あり" : "なし"}
                  </div>
                  <div className="text-xs text-red-600">
                    🔍 デバッグ: 接続状態 = {isConnected ? "接続中" : "未接続"}
                  </div>
                  <div className="text-xs text-red-600">
                    🔍 デバッグ: ホスト状態 = {isHost ? "ホスト" : "参加者"}
                  </div>
                  <div className="text-xs text-red-600">
                    🔍 デバッグ: セッションID = {sessionId || "なし"}
                  </div>
                </div>
              </AlertDescription>
            </Alert>

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

                {isConnected && (roomId || sessionId) && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {syncMode === "internet" ? "セッションID:" : "ルームID:"}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {syncMode === "internet" ? sessionId : roomId}
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={handleCopyRoomId} className="h-6 w-6 p-0">
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">役割:</span>
                      <Badge variant={(isHost || firebaseIsHost) ? "default" : "secondary"}>
                        {(isHost || firebaseIsHost) ? "オーナー" : "参加者"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">データバージョン:</span>
                      <span className="text-sm font-mono">
                        {syncMode === "internet" ? `v${firebaseSyncVersion || 2.0}` : `v${syncVersion}`}
                      </span>
                    </div>

                    {lastSyncTime && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">最終同期:</span>
                        <span className="text-sm text-gray-500">
                          {lastSyncTime.toLocaleTimeString("ja-JP", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                          })}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">接続デバイス:</span>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span className="text-sm">
                          {syncMode === "internet" 
                            ? firebaseConnectedDevices 
                            : syncConnectedDevices.length
                          }台
                        </span>
                      </div>
                    </div>

                    {/* 接続者一覧 */}
                    {connectedUsers.length > 0 && (
                      <div className="pt-2 border-t">
                        <div className="text-sm text-gray-600 mb-2">接続者一覧:</div>
                        <div className="space-y-2">
                          {connectedUsers.map((user) => (
                            <div
                              key={user.uid}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                            >
                              <div className="flex items-center gap-2">
                                {user.isHost ? (
                                  <Crown className="h-4 w-4 text-yellow-600" />
                                ) : (
                                  <User className="h-4 w-4 text-gray-500" />
                                )}
                                <div>
                                  <div className="font-medium text-sm">{user.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {user.joinedAt ? formatJoinTime(user.joinedAt.toMillis()) : "接続中"}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {user.isHost && (
                                  <Badge variant="default" className="text-xs">
                                    オーナー
                                  </Badge>
                                )}
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                {disconnectUser && (isHost || firebaseIsHost) && !user.isHost && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      if (confirm(`${user.name}さんを切断しますか？`)) {
                                        const success = await disconnectUser(user.uid)
                                        if (success) {
                                          console.log(`${user.name}さんを切断しました`)
                                        } else {
                                          console.error(`${user.name}さんの切断に失敗しました`)
                                        }
                                      }
                                    }}
                                    className="text-red-600 border-red-300 hover:bg-red-50"
                                  >
                                    切断
                                  </Button>
                                )}
                                {/* デバッグ情報 */}
                                {(() => {
                                  console.log("=== Disconnect Button Debug ===")
                                  console.log("disconnectUser:", !!disconnectUser)
                                  console.log("isHost:", isHost)
                                  console.log("firebaseIsHost:", firebaseIsHost)
                                  console.log("user.isHost:", user.isHost)
                                  console.log("user.name:", user.name)
                                  console.log("Should show button:", disconnectUser && (isHost || firebaseIsHost) && !user.isHost)
                                  return null
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                        {connectedUsers.length > 1 && (
                          <div className="mt-2 p-2 bg-blue-50 rounded-md">
                            <div className="text-xs text-blue-700">
                              💡 参加者が接続しました。データが自動的に同期されます。
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {(() => {
                      console.log("=== QR Code Render Condition Check ===")
                      console.log("isHost:", isHost)
                      console.log("firebaseIsHost:", firebaseIsHost)
                      console.log("syncMode:", syncMode)
                      console.log("firebaseConnected:", firebaseConnected)
                      console.log("sessionId:", sessionId)
                      console.log("=====================================")
                      
                      // ホストのみがQRコードを表示可能
                      const isOwner = isHost || firebaseIsHost
                      console.log("isOwner (can show QR):", isOwner)
                      
                      if (!isOwner) {
                        console.log("NOT OWNER - QR code hidden")
                        return false
                      }
                      
                      console.log("IS OWNER - QR code will be shown")
                      return true
                    })() && (
                      <div className="pt-2 border-t">
                        {(() => { console.log("=== QR CODE SECTION RENDERING ==="); return null; })()}
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
                            <div className="text-sm text-gray-600 mb-2">
                              招待用QRコード（オーナー専用）
                            </div>
                            <div className="flex justify-center">
                              {(() => { 
                                const qrUrl = generateQRCodeUrl();
                                console.log("=== QR CODE IMAGE ===");
                                console.log("QR URL:", qrUrl);
                                console.log("Using placeholder:", !qrUrl);
                                return null;
                              })()}
                              <img
                                src={generateQRCodeUrl() || "/placeholder.svg?height=128&width=128"}
                                alt="QR Code"
                                className="w-32 h-32 border rounded"
                              />
                            </div>
                            <p className="text-xs text-gray-500 text-center mt-2">
                              {inviteeName.trim() ? `${inviteeName}さん` : "他のデバイス"}がこのQRコードを読み取って参加
                            </p>
                            <p className="text-xs text-blue-600 text-center mt-1">
                              {syncMode === "internet" 
                                ? "🌐 インターネット同期（Firebase）" 
                                : "🔄 自動フォールバック対応（ローカル → インターネット）"
                              }
                            </p>
                            
                            {/* 招待URLの表示 */}
                            <div className="mt-3 space-y-2">
                              <p className="text-xs text-gray-600 text-center">
                                招待URL（{syncMode === "internet" ? "インターネット同期" : "自動フォールバック"}）:
                              </p>
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
                              <p className="text-xs text-gray-500 text-center">
                                {syncMode === "internet" 
                                  ? "インターネット経由でどこからでも接続可能" 
                                  : "ローカル接続失敗時は自動的にインターネット接続を試行"
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 参加者向けメッセージ */}
                    {isConnected && !isHost && !firebaseIsHost && (
                      <Alert>
                        <User className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <strong>参加者モード</strong>
                          <br />
                          データの閲覧と同期は可能ですが、QRコードの生成や招待はできません。
                          <br />
                          オーナーモードに切り替えるには、新しいセッションを作成してください。
                        </AlertDescription>
                      </Alert>
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
                {/* 同期方式の表示 */}
                <Alert>
                  <Database className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>インターネット同期（Firebase）</strong>を使用しています。
                    <br />
                    インターネット経由でどこからでも接続可能です。
                  </AlertDescription>
                </Alert>

                {/* ホスト開始 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      {syncMode === "local" ? "新しいルームを作成" : "新しいセッションを作成"}
                    </CardTitle>
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
                    <Button 
                      onClick={handleStartHost}
                      disabled={isLoading} 
                      className="w-full"
                    >
                      <Database className="h-4 w-4 mr-2" />
                      セッションとして開始
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
                        {syncMode === "local" ? "ルームID" : "セッションID"}
                      </Label>
                      <Input
                        id="roomId"
                        placeholder={syncMode === "local" ? "例: ABC123" : "例: session123"}
                        value={roomIdInput}
                        onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !isLoading) {
                            handleJoinRoom()
                          }
                        }}
                        className="font-mono"
                        maxLength={syncMode === "local" ? 6 : 20}
                      />
                    </div>

                    <Button onClick={handleJoinRoom} disabled={isLoading || !roomIdInput.trim()} className="w-full">
                      <Users className="h-4 w-4 mr-2" />
                      セッションに参加
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {isConnected && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  {syncMode === "internet" 
                    ? `Firebaseセッション ${sessionId} に接続中です。「状況」タブで詳細を確認できます。`
                    : `ルーム ${roomId} に接続中です。「状況」タブで詳細を確認できます。`
                  }
                </AlertDescription>
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

          {/* 同期方式タブを一時的に無効化 - インターネット同期のみに集中 */}
          {/* <TabsContent value="sync" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  同期方式の選択
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="local"
                      name="syncMode"
                      value="local"
                      checked={syncMode === "local"}
                      onChange={(e) => setSyncMode(e.target.value as "local" | "internet")}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="local" className="flex items-center gap-2 cursor-pointer">
                      <Wifi className="h-4 w-4" />
                      <div>
                        <div className="font-medium">ローカルネットワーク同期</div>
                        <div className="text-xs text-gray-500">同じWi-Fi内のデバイス間で同期</div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="internet"
                      name="syncMode"
                      value="internet"
                      checked={syncMode === "internet"}
                      onChange={(e) => setSyncMode(e.target.value as "local" | "internet")}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="internet" className="flex items-center gap-2 cursor-pointer">
                      <Database className="h-4 w-4" />
                      <div>
                        <div className="font-medium">インターネット同期</div>
                        <div className="text-xs text-gray-500">インターネット経由でどこからでも同期</div>
                      </div>
                    </Label>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm font-medium">現在の接続状況</div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>ローカル同期:</span>
                      <Badge variant={stableConnected ? "default" : "secondary"} className="text-xs">
                        {stableConnected ? "接続中" : "未接続"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>インターネット同期:</span>
                      <Badge variant={firebaseConnected ? "default" : "secondary"} className="text-xs">
                        {firebaseConnected ? "接続中" : "未接続"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <div className="font-medium mb-1">同期方式の特徴</div>
                    <div className="space-y-1">
                      <div><strong>ローカル同期:</strong> 高速・安全・無料、同じWi-Fi内のみ</div>
                      <div><strong>インターネット同期:</strong> どこからでも接続可能、Firebase認証が必要</div>
                    </div>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent> */}

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
