"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { QrCode, Download, Upload, Wifi, Users, Server } from "lucide-react"
import { useStableSync } from "@/hooks/useStableSync"
import { QRCodeSVG } from "qrcode.react"

interface FreeStableSyncModalProps {
  isOpen: boolean
  onClose: () => void
}

export function FreeStableSyncModal({ isOpen, onClose }: FreeStableSyncModalProps) {
  const [roomIdInput, setRoomIdInput] = useState("")
  const [importedData, setImportedData] = useState("")
  const [exportedData, setExportedData] = useState("")

  const {
    isConnected,
    isHost,
    roomId,
    joinUrl,
    syncStatus,
    startAsHost,
    joinAsClient,
    exportData: exportDataHook,
    importData: importDataHook,
  } = useStableSync()

  const handleStartHost = async () => {
    try {
      await startAsHost()
    } catch (error) {
      console.error("ホスト開始エラー:", error)
    }
  }

  const handleJoinClient = async () => {
    if (!roomIdInput.trim()) return

    try {
      await joinAsClient(roomIdInput.trim())
    } catch (error) {
      console.error("参加エラー:", error)
    }
  }

  const handleExport = async () => {
    try {
      const data = await exportDataHook()
      setExportedData(data)
    } catch (error) {
      console.error("エクスポートエラー:", error)
    }
  }

  const handleImport = async () => {
    if (!importedData.trim()) return

    try {
      await importDataHook(importedData)
      setImportedData("")
      alert("データのインポートが完了しました")
    } catch (error) {
      console.error("インポートエラー:", error)
      alert("インポートに失敗しました")
    }
  }

  const copyToClipboard = (text: string) => {
    try {
      if (typeof window !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(text)
        alert("クリップボードにコピーしました")
      } else {
        // フォールバック: テキストエリアを使用
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        alert("クリップボードにコピーしました")
      }
    } catch (error) {
      console.error("コピーに失敗しました:", error)
      alert("コピーに失敗しました")
    }
  }

  const downloadData = () => {
    const blob = new Blob([exportedData], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `poker-backup-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            完全無料の安定同期システム
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* ステータス表示 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">接続状況</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span>データベース:</span>
                <Badge variant={isConnected ? "default" : "secondary"}>{isConnected ? "接続済み" : "未接続"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>同期状態:</span>
                <Badge
                  variant={syncStatus === "idle" ? "default" : syncStatus === "syncing" ? "secondary" : "destructive"}
                >
                  {syncStatus === "idle" ? "待機中" : syncStatus === "syncing" ? "同期中" : "エラー"}
                </Badge>
              </div>
              {roomId && (
                <div className="flex items-center justify-between">
                  <span>ルームID:</span>
                  <Badge variant="outline">{roomId}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="sync" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sync">同期設定</TabsTrigger>
              <TabsTrigger value="backup">バックアップ</TabsTrigger>
              <TabsTrigger value="help">使い方</TabsTrigger>
            </TabsList>

            <TabsContent value="sync" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ホストとして開始 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Server className="h-4 w-4" />
                      ホスト（親機）として開始
                    </CardTitle>
                    <CardDescription>他のデバイスが接続できるルームを作成</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button onClick={handleStartHost} className="w-full" disabled={isHost}>
                      {isHost ? "ホスト実行中" : "ホストを開始"}
                    </Button>

                    {joinUrl && (
                      <div className="space-y-2">
                        <Label>接続用QRコード</Label>
                        <div className="flex justify-center p-4 bg-white rounded-lg">
                          <QRCodeSVG value={joinUrl} size={120} />
                        </div>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(joinUrl)} className="w-full">
                          <QrCode className="h-4 w-4 mr-2" />
                          URLをコピー
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* クライアントとして参加 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4" />
                      クライアント（子機）として参加
                    </CardTitle>
                    <CardDescription>既存のルームに参加</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="roomId">ルームID</Label>
                      <Input
                        id="roomId"
                        value={roomIdInput}
                        onChange={(e) => setRoomIdInput(e.target.value)}
                        placeholder="6文字のルームID"
                        maxLength={6}
                      />
                    </div>
                    <Button onClick={handleJoinClient} className="w-full" disabled={!roomIdInput.trim() || isHost}>
                      ルームに参加
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="backup" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* データエクスポート */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Download className="h-4 w-4" />
                      データのバックアップ
                    </CardTitle>
                    <CardDescription>全データをJSONファイルとして保存</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button onClick={handleExport} className="w-full">
                      データをエクスポート
                    </Button>

                    {exportedData && (
                      <div className="space-y-2">
                        <Button variant="outline" onClick={downloadData} className="w-full bg-transparent">
                          ファイルとしてダウンロード
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(exportedData)}
                          className="w-full"
                        >
                          クリップボードにコピー
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* データインポート */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Upload className="h-4 w-4" />
                      データの復元
                    </CardTitle>
                    <CardDescription>バックアップファイルからデータを復元</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="importedData">バックアップデータ</Label>
                      <textarea
                        id="importedData"
                        value={importedData}
                        onChange={(e) => setImportedData(e.target.value)}
                        placeholder="JSONデータを貼り付け"
                        className="w-full h-20 p-2 border rounded-md resize-none text-xs"
                      />
                    </div>
                    <Button onClick={handleImport} className="w-full" disabled={!importedData.trim()}>
                      データをインポート
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="help" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">💰 完全無料の仕組み</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="space-y-2">
                    <p>
                      <strong>✅ IndexedDB:</strong> ブラウザ標準機能（無料）
                    </p>
                    <p>
                      <strong>✅ LocalStorage同期:</strong> ブラウザ標準機能（無料）
                    </p>
                    <p>
                      <strong>✅ QRコード:</strong> クライアントサイド生成（無料）
                    </p>
                    <p>
                      <strong>✅ オフライン動作:</strong> サーバー不要（無料）
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <p>
                      <strong>🔧 使い方:</strong>
                    </p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>メインデバイスで「ホストを開始」</li>
                      <li>QRコードを他のデバイスで読み取り</li>
                      <li>ルームIDを入力して参加</li>
                      <li>データは自動で同期されます</li>
                    </ol>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <p>
                      <strong>💾 バックアップ:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>定期的にデータをエクスポート</li>
                      <li>JSONファイルとして保存</li>
                      <li>必要時にインポートで復元</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              閉じる
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
