"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/utils/receiptCalculations"
import type { GameSession, Receipt, Player } from "@/types"

interface EndGameModalProps {
  isOpen: boolean
  onClose: () => void
  activeSessions: GameSession[]
  receipts?: Receipt[]
  players?: Player[]
  onEndGame: (sessionId: string, finalChips: number) => void
}

export function EndGameModal({
  isOpen,
  onClose,
  activeSessions,
  receipts = [],
  players = [],
  onEndGame,
}: EndGameModalProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string>("")
  const [finalChips, setFinalChips] = useState<number>(0)

  // 配列の安全性チェック
  const safeActiveSessions = Array.isArray(activeSessions) ? activeSessions : []
  const safePlayers = Array.isArray(players) ? players : []
  const safeReceipts = Array.isArray(receipts) ? receipts : []

  const selectedSession = safeActiveSessions.find((s) => s.id === selectedSessionId)
  const selectedPlayer = selectedSession ? safePlayers.find((p) => p.id === selectedSession.playerId) : null
  const selectedReceipt = selectedSession ? safeReceipts.find((r) => r.playerId === selectedSession.playerId) : null

  // プレイヤーの現在のシステム残高を取得（プレイヤー詳細画面と同じ値）
  const systemBalance = selectedPlayer ? selectedPlayer.currentChips || 0 : 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedSessionId && finalChips >= 0) {
      onEndGame(selectedSessionId, finalChips)
      setSelectedSessionId("")
      setFinalChips(0)
      onClose()
    }
  }

  const handleClose = () => {
    setSelectedSessionId("")
    setFinalChips(0)
    onClose()
  }

  if (safeActiveSessions.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ゲーム終了</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="text-gray-600">現在プレイ中のセッションがありません</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleClose}>閉じる</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // 開始時残高と本日の©増減を計算
  const startStack = selectedReceipt?.items?.find((item) => item.name === "開始時スタック")?.amount || 0
  const dailyChange = startStack - finalChips // 開始時残高 - 最終チップ数
  const totalFinalBalance = finalChips + systemBalance // 実際の最終チップ数 + システム残高

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>ゲーム終了</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="session">プレイヤー選択 *</Label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="プレイヤーを選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {safeActiveSessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.playerName} (バイイン: {formatCurrency(session.buyIn || 0)}円)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSession && selectedPlayer && (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">プレイヤー:</span>
                      <span className="font-medium">{selectedSession.playerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">開始時残高:</span>
                      <span className="font-medium">{formatCurrency(startStack)}©</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">システム残高:</span>
                      <span className="font-medium">{formatCurrency(systemBalance)}©</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">開始時間:</span>
                      <span className="font-medium">
                        {selectedSession.startTime
                          ? new Date(selectedSession.startTime).toLocaleString("ja-JP")
                          : "不明"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <Label htmlFor="finalChips">ゲーム終了時の保有チップ数 *</Label>
              <Input
                id="finalChips"
                type="number"
                min="0"
                value={finalChips}
                onChange={(e) => setFinalChips(Number.parseInt(e.target.value) || 0)}
                placeholder="最終チップ数を入力"
                className="mt-1"
              />
            </div>

            {selectedSession && finalChips > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">本日の©増減</span>
                      <span className={`font-medium ${dailyChange <= 0 ? "text-green-600" : "text-red-600"}`}>
                        {dailyChange <= 0 ? "+" : "-"}
                        {formatCurrency(Math.abs(dailyChange))}©
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      開始時残高 {formatCurrency(startStack)}© - 最終チップ {formatCurrency(finalChips)}© + システム残高{" "}
                      {formatCurrency(systemBalance)}© = {formatCurrency(totalFinalBalance)}©
                    </div>
                    <div className="text-xs text-gray-500 mt-2">※ 最終チップ数を入力してゲームを終了します。</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex space-x-3">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
              キャンセル
            </Button>
            <Button type="submit" disabled={!selectedSessionId || finalChips < 0} className="flex-1">
              ゲーム終了
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
