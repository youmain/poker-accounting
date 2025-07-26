"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Server, Smartphone, AlertCircle } from "lucide-react"

interface FirebaseSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateSession: () => Promise<string | null>
  onJoinSession: (sessionId: string) => Promise<boolean>
  currentSessionId: string
}

export function FirebaseSessionModal({
  isOpen,
  onClose,
  onCreateSession,
  onJoinSession,
  currentSessionId,
}: FirebaseSessionModalProps) {
  const [activeTab, setActiveTab] = useState("create")
  const [sessionId, setSessionId] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")

  const handleCreateSession = async () => {
    setIsCreating(true)
    setError("")
    try {
      const newSessionId = await onCreateSession()
      if (newSessionId) {
        setQrCodeUrl(
          `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(newSessionId)}`,
        )
        return true
      } else {
        setError("セッションの作成に失敗しました")
        return false
      }
    } catch (err) {
      setError("エラーが発生しました")
      return false
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinSession = async () => {
    if (!sessionId.trim()) {
      setError("セッションIDを入力してください")
      return
    }

    setIsJoining(true)
    setError("")
    try {
      const success = await onJoinSession(sessionId)
      if (success) {
        onClose()
        return true
      } else {
        setError("セッションへの参加に失敗しました")
        return false
      }
    } catch (err) {
      setError("エラーが発生しました")
      return false
    } finally {
      setIsJoining(false)
    }
  }

  const copySessionId = () => {
    if (currentSessionId) {
      try {
        if (typeof window !== "undefined" && navigator.clipboard) {
          navigator.clipboard.writeText(currentSessionId)
          alert("セッションIDをコピーしました")
        } else {
          // フォールバック: テキストエリアを使用
          const textArea = document.createElement('textarea')
          textArea.value = currentSessionId
          textArea.style.position = 'fixed'
          textArea.style.left = '-999999px'
          textArea.style.top = '-999999px'
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
          alert("セッションIDをコピーしました")
        }
      } catch (error) {
        console.error("コピーに失敗しました:", error)
        alert("コピーに失敗しました")
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>データ同期セッション</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">ホスト（作成）</TabsTrigger>
            <TabsTrigger value="join">クライアント（参加）</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Server className="h-4 w-4" />
                新しいセッションを作成
              </h3>
              <p className="text-xs text-gray-500">
                このデバイスをホストとして、新しいデータ同期セッションを作成します。
                他のデバイスはこのセッションに参加できます。
              </p>
            </div>

            {currentSessionId ? (
              <div className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <h4 className="text-sm font-medium text-green-800 mb-1">セッション作成済み</h4>
                  <p className="text-xs text-green-700 mb-2">以下のセッションIDを他のデバイスと共有してください：</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-white p-2 rounded text-xs flex-1 overflow-x-auto">{currentSessionId}</code>
                    <Button size="sm" variant="outline" onClick={copySessionId}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {qrCodeUrl && (
                  <div className="flex justify-center">
                    <div className="text-center">
                      <img
                        src={qrCodeUrl || "/placeholder.svg"}
                        alt="Session QR Code"
                        className="border rounded-lg"
                        width={150}
                        height={150}
                      />
                      <p className="text-xs text-gray-500 mt-2">QRコードをスキャンして参加</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button onClick={handleCreateSession} disabled={isCreating} className="w-full">
                {isCreating ? "作成中..." : "セッションを作成"}
              </Button>
            )}
          </TabsContent>

          <TabsContent value="join" className="space-y-4 mt-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                既存のセッションに参加
              </h3>
              <p className="text-xs text-gray-500">
                ホストデバイスから共有されたセッションIDを入力して、データ同期セッションに参加します。
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="session-id">セッションID</Label>
              <Input
                id="session-id"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="session-xxxxxxxxx"
              />
            </div>

            <Button onClick={handleJoinSession} disabled={isJoining || !sessionId.trim()} className="w-full">
              {isJoining ? "参加中..." : "セッションに参加"}
            </Button>
          </TabsContent>
        </Tabs>

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
