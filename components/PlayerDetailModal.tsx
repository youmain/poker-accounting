"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, Clock, CheckCircle, XCircle, Plus, Minus } from "lucide-react"
import type { Player, GameSession, Receipt, StackTransaction } from "@/types"

interface PlayerDetailModalProps {
  isOpen: boolean
  onClose: () => void
  player: Player | null
  gameSessions: GameSession[]
  receipts: Receipt[]
  onUpdatePlayer: (playerId: string, updates: Partial<Player>) => void
  onAddStackTransaction: (playerId: string, transaction: Omit<StackTransaction, "id">) => void
  onEndGame: (sessionId: string, finalChips: number) => void
  isOwnerMode: boolean
}

export function PlayerDetailModal({
  isOpen,
  onClose,
  player,
  gameSessions,
  receipts,
  onUpdatePlayer,
  onAddStackTransaction,
  onEndGame,
  isOwnerMode,
}: PlayerDetailModalProps) {
  const [finalChips, setFinalChips] = useState<number>(0)
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0)
  const [adjustmentNote, setAdjustmentNote] = useState<string>("")

  if (!player) return null

  // プレイヤーの現在のセッション
  const currentSession = gameSessions.find((s) => s.playerId === player.id && s.status === "playing")
  const completedSessions = gameSessions.filter((s) => s.playerId === player.id && s.status === "completed")
  const playerReceipt = receipts.find((r) => r.playerId === player.id)

  // プレイヤーの状態を判定
  const getPlayerStatus = () => {
    if (currentSession) return "playing"
    if (completedSessions.length > 0 && playerReceipt?.status === "pending") return "game_ended"
    if (completedSessions.length > 0 && playerReceipt?.status === "completed") return "completed"
    return "inactive"
  }

  const playerStatus = getPlayerStatus()

  // 開始時残高を取得
  const getStartingBalance = () => {
    if (playerReceipt) {
      const startStack = playerReceipt.items.find((item) => item.name === "開始時スタック")?.amount || 0
      return startStack
    }
    return 0
  }

  // 現在の残高を取得
  const getCurrentBalance = () => {
    if (currentSession) {
      return currentSession.finalChips || 0
    }
    if (playerReceipt) {
      const finalStack = playerReceipt.items.find((item) => item.name === "終了時スタック")?.amount || 0
      return finalStack
    }
    return 0
  }

  // 損益を計算
  const calculateProfitLoss = () => {
    const starting = getStartingBalance()
    const current = getCurrentBalance()
    return current - starting
  }

  // ゲーム終了処理
  const handleEndGame = () => {
    if (currentSession && finalChips >= 0) {
      onEndGame(currentSession.id, finalChips)
      setFinalChips(0)
    }
  }

  // スタック調整処理
  const handleStackAdjustment = (type: "add" | "subtract") => {
    if (adjustmentAmount > 0 && adjustmentNote.trim()) {
      const transaction: Omit<StackTransaction, "id"> = {
        playerId: player.id,
        type: type === "add" ? "buy-in" : "cash-out",
        amount: adjustmentAmount,
        note: adjustmentNote,
        timestamp: new Date().toISOString(),
      }
      onAddStackTransaction(player.id, transaction)
      setAdjustmentAmount(0)
      setAdjustmentNote("")
    }
  }

  // ステータスバッジの色とアイコン
  const getStatusBadge = () => {
    switch (playerStatus) {
      case "playing":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <Clock className="w-3 h-3 mr-1" />
            プレイ中
          </Badge>
        )
      case "game_ended":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            ゲーム終了
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            完了
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            <XCircle className="w-3 h-3 mr-1" />
            未参加
          </Badge>
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{player.name} の詳細</span>
            {getStatusBadge()}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="sessions">セッション履歴</TabsTrigger>
            <TabsTrigger value="receipt">伝票</TabsTrigger>
            <TabsTrigger value="actions">操作</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">基本情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">プレイヤー名:</span>
                    <span className="font-medium">{player.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">ID:</span>
                    <span className="font-mono text-sm">{player.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">ステータス:</span>
                    {getStatusBadge()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">残高情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">開始時残高:</span>
                    <span className="font-medium">¥{getStartingBalance().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">現在残高:</span>
                    <span className="font-medium">¥{getCurrentBalance().toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">損益:</span>
                    <span className={`font-bold ${calculateProfitLoss() >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {calculateProfitLoss() >= 0 ? "+" : ""}¥{calculateProfitLoss().toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ゲームセッション履歴</CardTitle>
              </CardHeader>
              <CardContent>
                {currentSession && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">現在のセッション</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>開始時間: {currentSession.startTime.toLocaleString()}</div>
                      <div>終了時間: {currentSession.endTime?.toLocaleString() || "進行中"}</div>
                      <div>買い込み: ¥{(currentSession.buyIn || 0).toLocaleString()}</div>
                      <div>最終チップ: ¥{(currentSession.finalChips || 0).toLocaleString()}</div>
                    </div>
                  </div>
                )}

                {completedSessions.length > 0 ? (
                  <div className="space-y-2">
                    {completedSessions.map((session) => (
                      <div key={session.id} className="p-3 border rounded-lg">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>開始: {new Date(session.startTime).toLocaleString()}</div>
                          <div>終了: {session.endTime ? new Date(session.endTime).toLocaleString() : "-"}</div>
                          <div>開始チップ: ¥{(session.startingChips || 0).toLocaleString()}</div>
                          <div>終了チップ: ¥{session.finalChips?.toLocaleString() || "-"}</div>
                          <div className="col-span-2">
                            損益:{" "}
                            <span
                              className={
                                session.finalChips && session.finalChips - session.startingChips >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {session.finalChips
                                ? `${session.finalChips - session.startingChips >= 0 ? "+" : ""}¥${(session.finalChips - session.startingChips).toLocaleString()}`
                                : "-"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  !currentSession && <p className="text-gray-500 text-center py-4">セッション履歴がありません</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receipt" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">伝票情報</CardTitle>
              </CardHeader>
              <CardContent>
                {playerReceipt ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">伝票ステータス:</span>
                      <Badge variant={playerReceipt.status === "completed" ? "default" : "secondary"}>
                        {playerReceipt.status === "completed" ? "完了" : "未完了"}
                      </Badge>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left">項目</th>
                            <th className="px-3 py-2 text-right">金額</th>
                          </tr>
                        </thead>
                        <tbody>
                          {playerReceipt.items.map((item, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-3 py-2">{item.name}</td>
                              <td className="px-3 py-2 text-right">¥{item.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t-2">
                          <tr>
                            <td className="px-3 py-2 font-medium">合計</td>
                            <td className="px-3 py-2 text-right font-bold">¥{playerReceipt.total.toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">伝票が作成されていません</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            {isOwnerMode && (
              <>
                {/* ゲーム終了 */}
                {currentSession && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">ゲーム終了</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="finalChips">終了時チップ数</Label>
                        <Input
                          id="finalChips"
                          type="number"
                          value={finalChips}
                          onChange={(e) => setFinalChips(Number(e.target.value))}
                          placeholder="終了時のチップ数を入力"
                        />
                      </div>
                      <Button onClick={handleEndGame} className="w-full">
                        ゲーム終了
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* スタック調整 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">スタック調整</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="adjustmentAmount">調整金額</Label>
                      <Input
                        id="adjustmentAmount"
                        type="number"
                        value={adjustmentAmount}
                        onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                        placeholder="調整金額を入力"
                      />
                    </div>
                    <div>
                      <Label htmlFor="adjustmentNote">調整理由</Label>
                      <Textarea
                        id="adjustmentNote"
                        value={adjustmentNote}
                        onChange={(e) => setAdjustmentNote(e.target.value)}
                        placeholder="調整理由を入力"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleStackAdjustment("add")}
                        className="flex-1"
                        disabled={!adjustmentAmount || !adjustmentNote.trim()}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        追加
                      </Button>
                      <Button
                        onClick={() => handleStackAdjustment("subtract")}
                        variant="outline"
                        className="flex-1"
                        disabled={!adjustmentAmount || !adjustmentNote.trim()}
                      >
                        <Minus className="w-4 h-4 mr-2" />
                        減算
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {!isOwnerMode && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-gray-500">操作を行うにはオーナーモードが必要です</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
