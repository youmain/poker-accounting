"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, ShoppingCart, Calculator, Coffee, Coins, X } from "lucide-react"
import type { Receipt, Player } from "@/types"
import { formatCurrency } from "@/utils/receiptCalculations"

interface AddOrderModalProps {
  isOpen: boolean
  onClose: () => void
  receipt: Receipt | null
  sessionStartTime?: Date
  players: Player[]
  onAddOrder: (receiptId: string, items: OrderItem[]) => void
}

interface OrderItem {
  name: string
  price: number
  quantity: number
  checked: boolean
  stackAddDetails?: {
    requestedAmount: number
    currentSystemBalance: number
    actualCost: number
    newSystemBalance: number
  }
}

const MENU_ITEMS = [
  { name: "ソフトドリンク", price: 200, icon: "🥤", category: "drink" },
  { name: "コーヒー", price: 300, icon: "☕", category: "drink" },
  { name: "チャージ", price: 500, icon: "⚡", category: "service" },
  { name: "追加チャージ", price: 1000, icon: "⚡", category: "service" },
]

export function AddOrderModal({ isOpen, onClose, receipt, sessionStartTime, players, onAddOrder }: AddOrderModalProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [stackAmount, setStackAmount] = useState("")
  const [customItemName, setCustomItemName] = useState("")
  const [customItemPrice, setCustomItemPrice] = useState("")
  const [showCustomItem, setShowCustomItem] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // メニュー項目を初期化
      const initialItems = MENU_ITEMS.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: 1,
        checked: false,
      }))
      setOrderItems(initialItems)
      setStackAmount("")
      setCustomItemName("")
      setCustomItemPrice("")
      setShowCustomItem(false)
    }
  }, [isOpen])

  if (!receipt) return null

  const player = players.find((p) => p.id === receipt.playerId)
  const currentSystemBalance = player?.currentChips || 0

  const handleItemCheck = (index: number, checked: boolean) => {
    const newItems = [...orderItems]
    newItems[index].checked = checked
    setOrderItems(newItems)
  }

  const handleQuantityChange = (index: number, quantity: number) => {
    const newItems = [...orderItems]
    newItems[index].quantity = Math.max(1, quantity)
    setOrderItems(newItems)
  }

  const handleStackAdd = () => {
    const requestedAmount = Number(stackAmount)
    if (!requestedAmount || requestedAmount <= 0) {
      alert("有効なスタック金額を入力してください。")
      return
    }

    // スタック追加の計算ロジック
    let actualCost = 0
    let newSystemBalance = currentSystemBalance

    if (requestedAmount > currentSystemBalance) {
      // 不足分を購入
      actualCost = requestedAmount - currentSystemBalance
      newSystemBalance = requestedAmount
    } else {
      // システム残高で足りる場合
      actualCost = 0
      newSystemBalance = currentSystemBalance
    }

    const stackItem: OrderItem = {
      name: "スタック追加",
      price: actualCost,
      quantity: 1,
      checked: true,
      stackAddDetails: {
        requestedAmount,
        currentSystemBalance,
        actualCost,
        newSystemBalance,
      },
    }

    setOrderItems((prev) => [...prev, stackItem])
    setStackAmount("")
  }

  const handleAddCustomItem = () => {
    const price = Number(customItemPrice)
    if (!customItemName.trim() || !price || price <= 0) {
      alert("商品名と有効な価格を入力してください。")
      return
    }

    const customItem: OrderItem = {
      name: customItemName.trim(),
      price,
      quantity: 1,
      checked: true,
    }

    setOrderItems((prev) => [...prev, customItem])
    setCustomItemName("")
    setCustomItemPrice("")
    setShowCustomItem(false)
  }

  const handleRemoveItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    const selectedItems = orderItems.filter((item) => item.checked)

    if (selectedItems.length === 0) {
      alert("追加する項目を選択してください。")
      return
    }

    onAddOrder(receipt.id, selectedItems)
    onClose()
  }

  const checkedItems = orderItems.filter((item) => item.checked)
  const totalAmount = checkedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const getItemIcon = (name: string) => {
    if (name.includes("ドリンク") || name.includes("コーヒー")) return "🥤"
    if (name.includes("チャージ")) return "⚡"
    if (name.includes("スタック")) return "💰"
    return "📦"
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            追加注文 - {receipt.playerName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* プレイヤー情報 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">プレイヤー情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">現在のシステム残高:</span>
                  <span className="ml-2 font-medium">{formatCurrency(currentSystemBalance)}©</span>
                </div>
                <div>
                  <span className="text-gray-600">伝票日付:</span>
                  <span className="ml-2 font-medium">{receipt.date}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* スタック追加 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Coins className="h-4 w-4" />
                スタック追加
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="stackAmount" className="text-sm">
                    希望スタック額 (©)
                  </Label>
                  <Input
                    id="stackAmount"
                    type="number"
                    placeholder="例: 10000"
                    value={stackAmount}
                    onChange={(e) => setStackAmount(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleStackAdd} disabled={!stackAmount || Number(stackAmount) <= 0} className="h-10">
                    <Plus className="h-4 w-4 mr-2" />
                    追加
                  </Button>
                </div>
              </div>

              {stackAmount && Number(stackAmount) > 0 && (
                <Alert>
                  <Calculator className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    希望額: {formatCurrency(Number(stackAmount))}© | 現在残高: {formatCurrency(currentSystemBalance)}© |
                    購入必要額: {formatCurrency(Math.max(0, Number(stackAmount) - currentSystemBalance))}円
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* メニュー項目 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Coffee className="h-4 w-4" />
                メニュー
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MENU_ITEMS.map((menuItem, index) => {
                  const orderItem = orderItems[index]
                  if (!orderItem) return null

                  return (
                    <div key={index} className="flex items-center space-x-3 p-2 border rounded">
                      <Checkbox
                        checked={orderItem.checked}
                        onCheckedChange={(checked) => handleItemCheck(index, checked as boolean)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{menuItem.icon}</span>
                          <span className="text-sm font-medium">{menuItem.name}</span>
                        </div>
                        <div className="text-xs text-gray-500">{formatCurrency(menuItem.price)}円</div>
                      </div>
                      {orderItem.checked && (
                        <Input
                          type="number"
                          min="1"
                          value={orderItem.quantity}
                          onChange={(e) => handleQuantityChange(index, Number(e.target.value))}
                          className="w-16 h-8 text-sm"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* カスタム項目追加 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  カスタム項目
                </span>
                <Button size="sm" variant="outline" onClick={() => setShowCustomItem(!showCustomItem)} className="h-8">
                  {showCustomItem ? "キャンセル" : "追加"}
                </Button>
              </CardTitle>
            </CardHeader>
            {showCustomItem && (
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="customName" className="text-sm">
                      商品名
                    </Label>
                    <Input
                      id="customName"
                      placeholder="例: 特別サービス"
                      value={customItemName}
                      onChange={(e) => setCustomItemName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customPrice" className="text-sm">
                      価格 (円)
                    </Label>
                    <Input
                      id="customPrice"
                      type="number"
                      placeholder="例: 500"
                      value={customItemPrice}
                      onChange={(e) => setCustomItemPrice(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddCustomItem}
                  disabled={!customItemName.trim() || !customItemPrice || Number(customItemPrice) <= 0}
                  className="w-full"
                >
                  カスタム項目を追加
                </Button>
              </CardContent>
            )}
          </Card>

          {/* 追加された項目一覧 */}
          {orderItems.length > MENU_ITEMS.length && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">追加された項目</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {orderItems.slice(MENU_ITEMS.length).map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={item.checked}
                            onCheckedChange={(checked) =>
                              handleItemCheck(MENU_ITEMS.length + index, checked as boolean)
                            }
                          />
                          <span className="text-lg">{getItemIcon(item.name)}</span>
                          <div>
                            <div className="text-sm font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">
                              {formatCurrency(item.price)}円
                              {item.stackAddDetails && (
                                <span className="ml-2">
                                  (希望: {formatCurrency(item.stackAddDetails.requestedAmount)}©)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveItem(MENU_ITEMS.length + index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* 合計金額 */}
          {checkedItems.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">選択項目: {checkedItems.length}件</span>
                  <span className="text-lg font-semibold">合計: {formatCurrency(totalAmount)}円</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* アクションボタン */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSubmit} disabled={checkedItems.length === 0} className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              注文追加 ({checkedItems.length}件)
            </Button>

            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              キャンセル
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
