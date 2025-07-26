"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Save, X, Printer, ChevronLeft, ChevronRight } from "lucide-react"
import { formatCurrency } from "@/utils/receiptCalculations"
import type { DailySales, Receipt } from "@/types"

interface SalesCalendarProps {
  dailySales: DailySales[]
  selectedDate?: Date
  onDateSelect: (date: Date | undefined) => void
  onEditSales?: (salesId: string, updates: Partial<DailySales>) => void
  onEditReceipt?: (receiptId: string, updates: Partial<Receipt>) => void
  onPrintSales?: (sales: DailySales) => void
}

export function SalesCalendar({
  dailySales,
  selectedDate,
  onDateSelect,
  onEditSales,
  onEditReceipt,
  onPrintSales,
}: SalesCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showSalesModal, setShowSalesModal] = useState(false)
  const [selectedSales, setSelectedSales] = useState<DailySales | null>(null)
  const [editingRake, setEditingRake] = useState(false)
  const [editingCash, setEditingCash] = useState(false)
  const [tempRake, setTempRake] = useState(0)
  const [tempCash, setTempCash] = useState(0)

  // 月の日数を取得
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))
  }

  // 前月・次月のナビゲーション
  const navigateMonth = (direction: "prev" | "next") => {
    const newMonth = new Date(currentMonth)
    if (direction === "prev") {
      newMonth.setMonth(newMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
  }

  // 日付の売上データを取得
  const getSalesForDate = (date: Date) => {
    const dateString = date.toISOString().split("T")[0]
    return dailySales.find((s) => s.date === dateString)
  }

  // 行クリック処理
  const handleRowClick = (date: Date) => {
    onDateSelect(date)
    const sales = getSalesForDate(date)
    if (sales) {
      setSelectedSales(sales)
      setShowSalesModal(true)
    }
  }

  const handleCloseModal = () => {
    setShowSalesModal(false)
    setSelectedSales(null)
    setEditingRake(false)
    setEditingCash(false)
    setTempRake(0)
    setTempCash(0)
  }

  const handleStartEditRake = () => {
    setTempRake(selectedSales?.confirmedRake || 0)
    setEditingRake(true)
  }

  const handleStartEditCash = () => {
    setTempCash(selectedSales?.cashRevenue || 0)
    setEditingCash(true)
  }

  const handleSaveRake = () => {
    if (selectedSales && onEditSales) {
      const newTotalRevenue = tempRake + (selectedSales.cashRevenue || 0)
      onEditSales(selectedSales.id, {
        confirmedRake: tempRake,
        totalRevenue: newTotalRevenue,
      })
      setSelectedSales({
        ...selectedSales,
        confirmedRake: tempRake,
        totalRevenue: newTotalRevenue,
      })
    }
    setEditingRake(false)
  }

  const handleSaveCash = () => {
    if (selectedSales && onEditSales) {
      const newTotalRevenue = (selectedSales.confirmedRake || 0) + tempCash
      onEditSales(selectedSales.id, {
        cashRevenue: tempCash,
        totalRevenue: newTotalRevenue,
      })
      setSelectedSales({
        ...selectedSales,
        cashRevenue: tempCash,
        totalRevenue: newTotalRevenue,
      })
    }
    setEditingCash(false)
  }

  const handleCancelEditRake = () => {
    setEditingRake(false)
    setTempRake(0)
  }

  const handleCancelEditCash = () => {
    setEditingCash(false)
    setTempCash(0)
  }

  const monthDays = getDaysInMonth(currentMonth)
  const monthName = currentMonth.toLocaleDateString("ja-JP", { year: "numeric", month: "long" })

  // 月間合計を計算
  const monthlyTotals = {
    confirmedRake: dailySales
      .filter((s) => {
        const salesDate = new Date(s.date)
        return (
          salesDate.getMonth() === currentMonth.getMonth() && salesDate.getFullYear() === currentMonth.getFullYear()
        )
      })
      .reduce((sum, s) => sum + (s.confirmedRake || 0), 0),
    cashRevenue: dailySales
      .filter((s) => {
        const salesDate = new Date(s.date)
        return (
          salesDate.getMonth() === currentMonth.getMonth() && salesDate.getFullYear() === currentMonth.getFullYear()
        )
      })
      .reduce((sum, s) => sum + (s.cashRevenue || 0), 0),
    totalRevenue: dailySales
      .filter((s) => {
        const salesDate = new Date(s.date)
        return (
          salesDate.getMonth() === currentMonth.getMonth() && salesDate.getFullYear() === currentMonth.getFullYear()
        )
      })
      .reduce((sum, s) => sum + (s.totalRevenue || 0), 0),
    playerCount: dailySales
      .filter((s) => {
        const salesDate = new Date(s.date)
        return (
          salesDate.getMonth() === currentMonth.getMonth() && salesDate.getFullYear() === currentMonth.getFullYear()
        )
      })
      .reduce((sum, s) => sum + (s.playerCount || 0), 0),
  }

  return (
    <>
      <div className="space-y-6">
        {/* 月ナビゲーション */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")} className="flex items-center">
            <ChevronLeft className="h-4 w-4 mr-1" />
            前月
          </Button>
          <h3 className="text-lg font-semibold">{monthName}</h3>
          <Button variant="outline" size="sm" onClick={() => navigateMonth("next")} className="flex items-center">
            次月
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* 売上表 */}
        <Card>
          <CardHeader>
            <CardTitle>日別売上表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">日付</TableHead>
                    <TableHead className="w-16">曜日</TableHead>
                    <TableHead className="text-right">確定レーキ</TableHead>
                    <TableHead className="text-right">現金売上</TableHead>
                    <TableHead className="text-right">総売上</TableHead>
                    <TableHead className="text-right">来店者数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthDays.map((date) => {
                    const sales = getSalesForDate(date)
                    const isToday = date.toDateString() === new Date().toDateString()
                    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()

                    return (
                      <TableRow
                        key={date.getDate()}
                        className={`
                          cursor-pointer hover:bg-gray-50
                          ${isSelected ? "bg-blue-50" : ""}
                          ${isToday ? "bg-yellow-50" : ""}
                          ${sales ? "font-medium" : "text-gray-400"}
                        `}
                        onClick={() => handleRowClick(date)}
                      >
                        <TableCell className={`font-medium ${isToday ? "text-blue-600" : ""}`}>
                          {date.getDate()}日
                        </TableCell>
                        <TableCell className="text-sm">
                          {date.toLocaleDateString("ja-JP", { weekday: "short" })}
                        </TableCell>
                        <TableCell className="text-right">
                          {sales ? (
                            <span className="text-blue-600 font-medium">
                              {formatCurrency(sales.confirmedRake || 0)}円
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {sales ? (
                            <span className="text-green-600 font-medium">
                              {formatCurrency(sales.cashRevenue || 0)}円
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {sales ? (
                            <span className="text-orange-600 font-medium">
                              {formatCurrency(sales.totalRevenue || 0)}円
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {sales ? (
                            <span className="text-purple-600 font-medium">{sales.playerCount || 0}人</span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {/* 月間合計行 */}
                  <TableRow className="bg-gray-100 font-bold border-t-2">
                    <TableCell colSpan={2} className="text-center">
                      月間合計
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(monthlyTotals.confirmedRake)}円
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(monthlyTotals.cashRevenue)}円
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(monthlyTotals.totalRevenue)}円
                    </TableCell>
                    <TableCell className="text-right text-purple-600">{monthlyTotals.playerCount}人</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 売上詳細モーダル */}
      <Dialog open={showSalesModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>売上詳細 - {selectedSales?.date}</DialogTitle>
          </DialogHeader>

          {selectedSales && (
            <div className="space-y-6">
              {/* 売上サマリー */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">確定レーキ</p>
                  <div className="flex items-center justify-center space-x-2">
                    {editingRake ? (
                      <div className="flex items-center space-x-1">
                        <Input
                          type="number"
                          value={tempRake}
                          onChange={(e) => setTempRake(Number(e.target.value))}
                          className="w-20 h-8 text-sm"
                        />
                        <Button size="sm" variant="ghost" onClick={handleSaveRake}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelEditRake}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <p className="text-lg font-bold text-blue-600">
                          {formatCurrency(selectedSales.confirmedRake)}円
                        </p>
                        {onEditSales && (
                          <Button size="sm" variant="ghost" onClick={handleStartEditRake}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">現金売上</p>
                  <div className="flex items-center justify-center space-x-2">
                    {editingCash ? (
                      <div className="flex items-center space-x-1">
                        <Input
                          type="number"
                          value={tempCash}
                          onChange={(e) => setTempCash(Number(e.target.value))}
                          className="w-20 h-8 text-sm"
                        />
                        <Button size="sm" variant="ghost" onClick={handleSaveCash}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelEditCash}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(selectedSales.cashRevenue)}円
                        </p>
                        {onEditSales && (
                          <Button size="sm" variant="ghost" onClick={handleStartEditCash}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">来店者数</p>
                  <p className="text-lg font-bold text-purple-600">{selectedSales.playerCount}人</p>
                </div>

                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-600">総売上</p>
                  <p className="text-lg font-bold text-orange-600">{formatCurrency(selectedSales.totalRevenue)}円</p>
                </div>
              </div>

              <Separator />

              {/* 伝票一覧 */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">伝票一覧 ({selectedSales.receipts?.length || 0}件)</h3>
                  {onPrintSales && (
                    <Button variant="outline" size="sm" onClick={() => onPrintSales(selectedSales)}>
                      <Printer className="h-4 w-4 mr-2" />
                      印刷
                    </Button>
                  )}
                </div>

                {selectedSales.receipts && selectedSales.receipts.length > 0 ? (
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {selectedSales.receipts.map((receipt) => (
                        <div key={receipt.id} className="flex justify-between items-center p-3 border rounded">
                          <div>
                            <p className="font-medium">{receipt.playerName}</p>
                            <p className="text-sm text-gray-600">{receipt.date}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(receipt.total || 0)}円</p>
                            <Badge variant={receipt.status === "completed" ? "default" : "secondary"}>
                              {receipt.status === "completed" ? "精算済み" : "未精算"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-gray-500 text-center py-8">伝票データがありません</p>
                )}
              </div>

              <Separator />

              {/* 確定情報 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">確定情報</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">確定日時:</span>
                    <span className="ml-2">
                      {selectedSales.confirmedAt
                        ? new Date(selectedSales.confirmedAt).toLocaleString("ja-JP")
                        : "未確定"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">確定者:</span>
                    <span className="ml-2">{selectedSales.confirmedBy || "未確定"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
