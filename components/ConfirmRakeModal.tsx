"use client"

import type React from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { X, AlertTriangle } from "lucide-react"
import { useState, useEffect } from "react"

interface ConfirmRakeModalProps {
  isOpen: boolean
  onClose: () => void
  expectedRake: number
  currentRake?: number
  onConfirmRake: (rake: number) => void
  cashRevenue?: number
  completedReceipts?: number
  pendingReceipts?: number
}

export function ConfirmRakeModal({
  isOpen,
  onClose,
  expectedRake,
  currentRake = 0,
  onConfirmRake,
  cashRevenue = 0,
  completedReceipts = 0,
  pendingReceipts = 0,
}: ConfirmRakeModalProps) {
  const [rake, setRake] = useState("0")
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Update rake value when expectedRake changes or modal opens
  useEffect(() => {
    if (isOpen && expectedRake !== undefined) {
      setRake(expectedRake.toString())
      setShowConfirmation(false)
    }
  }, [isOpen, expectedRake])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowConfirmation(true)
  }

  const handleFinalConfirm = () => {
    const rakeValue = Number.parseInt(rake) || 0
    onConfirmRake(rakeValue)
    setShowConfirmation(false)
    onClose()
  }

  const handleCancel = () => {
    setShowConfirmation(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {showConfirmation ? "営業日終了の確認" : "確定レーキ（運営売上）"}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {!showConfirmation ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="rake">デフォルト：予想レーキ値</Label>
              <Input
                id="rake"
                type="number"
                value={rake}
                onChange={(e) => setRake(e.target.value)}
                placeholder="レーキ値を入力"
              />
              <p className="text-xs text-gray-500 mt-1">予想レーキ: {expectedRake?.toLocaleString() || 0}©</p>
            </div>

            {/* 現在の売上状況を表示 */}
            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
              <h3 className="font-semibold text-sm">本日の売上状況</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>現金売上: {cashRevenue.toLocaleString()}円</div>
                <div>精算済み: {completedReceipts}件</div>
                <div>未精算: {pendingReceipts}件</div>
                <div>現在確定レーキ: {currentRake.toLocaleString()}©</div>
              </div>
            </div>

            <Button type="submit" className="w-full bg-black hover:bg-gray-800">
              確定
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>重要：営業日終了処理</strong>
                <br />
                レーキを確定すると本日の営業が終了し、以下の処理が実行されます：
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>本日の売上データを確定・保存</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>プレイヤーの本日データを履歴に移行</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>伝票・セッションデータをリセット</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>新しい営業日の準備</span>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium">確定内容</p>
              <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                <div>
                  確定レーキ: <span className="font-bold text-blue-600">{Number.parseInt(rake) || 0}©</span>
                </div>
                <div>
                  現金売上: <span className="font-bold text-green-600">{cashRevenue.toLocaleString()}円</span>
                </div>
                <div className="col-span-2">
                  総売上:{" "}
                  <span className="font-bold text-purple-600">
                    {((Number.parseInt(rake) || 0) + cashRevenue).toLocaleString()}円
                  </span>
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleCancel} className="flex-1 bg-transparent">
                キャンセル
              </Button>
              <Button onClick={handleFinalConfirm} className="flex-1 bg-red-600 hover:bg-red-700">
                営業日を終了する
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
