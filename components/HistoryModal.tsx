"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/utils/receiptCalculations"
import type { HistoryEntry } from "@/types"
import { Clock, User, DollarSign, FileText } from "lucide-react"

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
  entry: HistoryEntry | null
  onEdit: (entryId: string, updates: Partial<HistoryEntry>) => void
}

export function HistoryModal({ isOpen, onClose, entry, onEdit }: HistoryModalProps) {
  const [editedDescription, setEditedDescription] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (entry) {
      setEditedDescription(entry.description)
      setIsEditing(false)
    }
  }, [entry])

  if (!entry) return null

  const handleSave = () => {
    onEdit(entry.id, { description: editedDescription })
    setIsEditing(false)
    onClose()
  }

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      player_add: "プレイヤー追加",
      player_edit: "プレイヤー編集",
      player_delete: "プレイヤー削除",
      game_start: "ゲーム開始",
      game_end: "ゲーム終了",
      order_add: "注文追加",
      receipt_complete: "伝票精算",
      receipt_delete: "伝票削除",
      session_delete: "セッション削除",
      rake_confirm: "レーキ確定",
      data_import: "データインポート",
      data_export: "データエクスポート",
    }
    return labels[type] || type
  }

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      player_add: "bg-green-100 text-green-800",
      player_edit: "bg-blue-100 text-blue-800",
      player_delete: "bg-red-100 text-red-800",
      game_start: "bg-purple-100 text-purple-800",
      game_end: "bg-orange-100 text-orange-800",
      order_add: "bg-yellow-100 text-yellow-800",
      receipt_complete: "bg-emerald-100 text-emerald-800",
      receipt_delete: "bg-red-100 text-red-800",
      session_delete: "bg-red-100 text-red-800",
      rake_confirm: "bg-indigo-100 text-indigo-800",
      data_import: "bg-cyan-100 text-cyan-800",
      data_export: "bg-teal-100 text-teal-800",
    }
    return colors[type] || "bg-gray-100 text-gray-800"
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>履歴詳細</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本情報 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-600">日時</Label>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{entry.timestamp.toLocaleString("ja-JP")}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-600">操作種類</Label>
              <Badge className={getTypeColor(entry.type)}>{getTypeLabel(entry.type)}</Badge>
            </div>
          </div>

          {/* 説明 */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-600">
              説明
            </Label>
            {isEditing ? (
              <Textarea
                id="description"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="min-h-[80px]"
                placeholder="履歴の説明を入力..."
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-md text-sm">{entry.description}</div>
            )}
          </div>

          {/* 詳細情報 */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-gray-600">詳細情報</Label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {entry.details.playerName && (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">プレイヤー: {entry.details.playerName}</span>
                </div>
              )}

              {entry.details.amount !== undefined && (
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">金額: {formatCurrency(entry.details.amount)}円</span>
                </div>
              )}

              {entry.details.sessionId && (
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">セッションID: {entry.details.sessionId}</span>
                </div>
              )}

              {entry.details.receiptId && (
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">伝票ID: {entry.details.receiptId}</span>
                </div>
              )}
            </div>

            {/* 追加項目 */}
            {entry.details.items && entry.details.items.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">追加項目</Label>
                <div className="p-3 bg-gray-50 rounded-md">
                  <ul className="text-sm space-y-1">
                    {entry.details.items.map((item, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* 関連ID */}
            {entry.details.relatedIds && entry.details.relatedIds.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">関連データ</Label>
                <div className="p-3 bg-red-50 rounded-md">
                  <p className="text-sm text-red-700 mb-2">この操作により以下のデータも影響を受けました:</p>
                  <ul className="text-sm space-y-1">
                    {entry.details.relatedIds.map((id, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                        ID: {id}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* アクションボタン */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditedDescription(entry.description)
                    setIsEditing(false)
                  }}
                >
                  キャンセル
                </Button>
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                  保存
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={onClose}>
                  閉じる
                </Button>
                <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                  編集
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
