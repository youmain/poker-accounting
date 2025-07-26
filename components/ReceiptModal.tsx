"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle, Edit, Save, X, ChevronLeft, ChevronRight, Clock, Calculator, ReceiptIcon } from "lucide-react"
import type { Receipt } from "@/types"
import { formatCurrency } from "@/utils/receiptCalculations"

interface ReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  receipt: Receipt | null
  sessionStartTime?: Date
  onCompleteReceipt: (receiptId: string) => void
  onUpdateReceipt?: (receiptId: string, updates: Partial<Receipt>) => void
  isOwnerMode: boolean
  onNavigate?: (direction: "prev" | "next") => void
  currentIndex?: number
  totalReceipts?: number
}

export function ReceiptModal({
  isOpen,
  onClose,
  receipt,
  sessionStartTime,
  onCompleteReceipt,
  onUpdateReceipt,
  isOwnerMode,
  onNavigate,
  currentIndex = 0,
  totalReceipts = 1,
}: ReceiptModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedItems, setEditedItems] = useState<any[]>([])
  const [sessionDuration, setSessionDuration] = useState<string>("")

  useEffect(() => {
    if (receipt) {
      setEditedItems([...(receipt.items || [])])
    }
  }, [receipt])

  useEffect(() => {
    if (sessionStartTime) {
      const updateDuration = () => {
        const now = new Date()
        const diff = now.getTime() - sessionStartTime.getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        setSessionDuration(`${hours}時間${minutes}分`)
      }

      updateDuration()
      const interval = setInterval(updateDuration, 60000) // 1分ごとに更新

      return () => clearInterval(interval)
    }
  }, [sessionStartTime])

  if (!receipt) return null

  const handleSaveEdit = () => {
    if (onUpdateReceipt) {
      onUpdateReceipt(receipt.id, { items: editedItems })
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditedItems([...(receipt.items || [])])
    setIsEditing(false)
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...editedItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setEditedItems(newItems)
  }

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case "negative":
        return "text-red-600"
      case "positive":
        return "text-green-600"
      default:
        return "text-gray-900"
    }
  }

  const getItemTypeIcon = (name: string) => {
    if (name.includes("スタック")) {
      return "💰"
    } else if (name.includes("ドリンク")) {
      return "🥤"
    } else if (name.includes("チャージ")) {
      return "⚡"
    } else if (name.includes("税")) {
      return "📊"
    }
    return "📝"
  }

  // 消費税対象商品の計算
  const taxableAmount = (receipt.items || [])
    .filter(
      (item) =>
        !item.name.includes("スタック") &&
        item.name !== "バイイン" &&
        item.name !== "©増減" &&
        item.name !== "最終©残高" &&
        item.name !== "開始時スタック" &&
        item.name !== "小計" &&
        item.name !== "消費税",
    )
    .reduce((sum, item) => sum + (item.amount || 0) * (item.quantity || 1), 0)

  const stackAmount = (receipt.items || [])
    .filter((item) => item.name.includes("スタック") && item.type === "negative")
    .reduce((sum, item) => sum + (item.amount || 0) * (item.quantity || 1), 0)

  const tax = Math.floor(taxableAmount * 0.1)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <ReceiptIcon className="h-5 w-5" />
              伝票詳細 - {receipt.playerName}
            </DialogTitle>

            {/* ナビゲーションボタン */}
            {onNavigate && totalReceipts > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigate("prev")}
                  disabled={currentIndex === 0}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-500">
                  {currentIndex + 1} / {totalReceipts}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigate("next")}
                  disabled={currentIndex === totalReceipts - 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* 基本情報 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                基本情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">日付:</span>
                  <span className="ml-2 font-medium">{receipt.date}</span>
                </div>
                <div>
                  <span className="text-gray-600">ステータス:</span>
                  <Badge variant={receipt.status === "completed" ? "default" : "secondary"} className="ml-2">
                    {receipt.status === "completed" ? "精算済み" : "未精算"}
                  </Badge>
                </div>
                {sessionStartTime && (
                  <div className="col-span-2">
                    <span className="text-gray-600">セッション時間:</span>
                    <span className="ml-2 font-medium">{sessionDuration}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 伝票項目 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  伝票項目
                </CardTitle>
                {isOwnerMode && (
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button size="sm" onClick={handleSaveEdit} className="h-8">
                          <Save className="h-3 w-3 mr-1" />
                          保存
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-8 bg-transparent">
                          <X className="h-3 w-3 mr-1" />
                          キャンセル
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="h-8">
                        <Edit className="h-3 w-3 mr-1" />
                        編集
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {(isEditing ? editedItems : receipt.items || []).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded border bg-gray-50">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-lg">{getItemTypeIcon(item.name)}</span>
                        <div className="flex-1">
                          {isEditing ? (
                            <Input
                              value={item.name}
                              onChange={(e) => handleItemChange(index, "name", e.target.value)}
                              className="h-8 text-sm"
                            />
                          ) : (
                            <span className="text-sm font-medium">{item.name}</span>
                          )}
                          {item.stackDetails && (
                            <div className="text-xs text-gray-500 mt-1">
                              希望: {formatCurrency(item.stackDetails.requestedAmount)}© → 購入:{" "}
                              {formatCurrency(item.stackDetails.actualCost)}円
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.quantity && item.quantity > 1 && (
                          <div className="text-sm text-gray-500">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                                className="w-16 h-8 text-sm"
                                min="1"
                              />
                            ) : (
                              `×${item.quantity}`
                            )}
                          </div>
                        )}

                        <div className={`text-sm font-medium ${getItemTypeColor(item.type || "neutral")}`}>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={item.amount || 0}
                              onChange={(e) => handleItemChange(index, "amount", Number(e.target.value))}
                              className="w-20 h-8 text-sm text-right"
                            />
                          ) : (
                            <>
                              {item.name.includes("©")
                                ? `${formatCurrency(item.amount || 0)}©`
                                : `${formatCurrency(item.amount || 0)}円`}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* 計算詳細 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">計算詳細</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">スタック購入:</span>
                  <span className="font-medium">{formatCurrency(stackAmount)}円</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">課税対象:</span>
                  <span className="font-medium">{formatCurrency(taxableAmount)}円</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">消費税 (10%):</span>
                  <span className="font-medium">{formatCurrency(tax)}円</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>合計:</span>
                  <span className="text-lg">{formatCurrency(receipt.total || 0)}円</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* アクションボタン */}
          <div className="flex gap-3 pt-4">
            {receipt.status === "pending" && (
              <Button onClick={() => onCompleteReceipt(receipt.id)} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                精算完了
              </Button>
            )}

            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              閉じる
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
