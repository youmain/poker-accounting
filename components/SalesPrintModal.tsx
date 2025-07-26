"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { X, Printer, Download, Calendar } from "lucide-react"
import { formatCurrency } from "@/utils/receiptCalculations"
import type { DailySales, Player, Receipt, GameSession, PlayerRanking } from "@/types"

interface SalesPrintModalProps {
  isOpen: boolean
  onClose: () => void
  dailySales: DailySales[]
  players: Player[]
  receipts: Receipt[]
  gameSessions: GameSession[]
  playerRankings: PlayerRanking[]
  expectedRake: number
  cashRevenue: number
}

export function SalesPrintModal({
  isOpen,
  onClose,
  dailySales = [],
  players = [],
  receipts = [],
  gameSessions = [],
  playerRankings = [],
  expectedRake = 0,
  cashRevenue = 0,
}: SalesPrintModalProps) {
  const today = new Date().toISOString().split("T")[0]
  const todayReceipts = (receipts || []).filter((r) => {
    if (!r.date) return false
    const receiptDate = r.date.replace(/\//g, "-")
    return receiptDate.includes(today.replace(/-/g, "-")) || receiptDate.includes(today.replace(/-/g, "/"))
  })

  const completedTodayReceipts = todayReceipts.filter((r) => r.status === "completed")
  const pendingTodayReceipts = todayReceipts.filter((r) => r.status === "pending")
  const activeSessions = (gameSessions || []).filter((s) => s.status === "playing")
  const completedSessions = (gameSessions || []).filter((s) => s.status === "completed")

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadDaily = () => {
    const content = generateDailyReport()
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `日別売上レポート_${today}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadReceipts = () => {
    const content = generateReceiptReport()
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `伝票詳細レポート_${today}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const generateDailyReport = () => {
    const date = new Date().toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    let content = `キングハイポーカー 日別売上レポート\n`
    content += `${"=".repeat(50)}\n`
    content += `日付: ${date}\n`
    content += `出力日時: ${new Date().toLocaleString("ja-JP")}\n`
    content += `${"=".repeat(50)}\n\n`

    content += `■ 売上サマリー\n`
    content += `予想レーキ: ${formatCurrency(expectedRake)}円\n`
    content += `現金売上: ${formatCurrency(cashRevenue)}円\n`
    content += `総売上: ${formatCurrency(expectedRake + cashRevenue)}円\n`
    content += `現在プレイヤー数: ${activeSessions.length}人\n`
    content += `完了ゲーム数: ${completedSessions.length}回\n\n`

    content += `■ 伝票サマリー\n`
    content += `総伝票数: ${todayReceipts.length}件\n`
    content += `精算済み: ${completedTodayReceipts.length}件\n`
    content += `未精算: ${pendingTodayReceipts.length}件\n\n`

    if (playerRankings.length > 0) {
      content += `■ プレイヤーランキング\n`
      playerRankings.slice(0, 10).forEach((ranking, index) => {
        content += `${index + 1}. ${ranking.playerName}: ${ranking.profit >= 0 ? "+" : ""}${formatCurrency(ranking.profit)}円 (${ranking.gameCount}回)\n`
      })
      content += `\n`
    }

    content += `${"=".repeat(50)}\n`
    content += `出力日時: ${new Date().toLocaleString("ja-JP")}\n`

    return content
  }

  const generateReceiptReport = () => {
    const date = new Date().toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    let content = `キングハイポーカー 伝票詳細レポート\n`
    content += `${"=".repeat(50)}\n`
    content += `日付: ${date}\n`
    content += `出力日時: ${new Date().toLocaleString("ja-JP")}\n`
    content += `${"=".repeat(50)}\n\n`

    content += `■ 伝票詳細\n`
    todayReceipts.forEach((receipt, index) => {
      content += `${index + 1}. ${receipt.playerName} (${receipt.status === "completed" ? "精算済み" : "未精算"})\n`
      content += `   合計: ${formatCurrency(receipt.total || 0)}円\n`

      if (receipt.items && Array.isArray(receipt.items)) {
        receipt.items.forEach((item) => {
          if (item.amount > 0) {
            content += `   - ${item.name}: ${formatCurrency(item.amount)}${item.name.includes("©") ? "©" : "円"}\n`
          }
        })
      }
      content += `\n`
    })

    content += `${"=".repeat(50)}\n`
    content += `出力日時: ${new Date().toLocaleString("ja-JP")}\n`

    return content
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            売上・伝票印刷
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 print:space-y-4">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold">キングハイポーカー</h1>
            <h2 className="text-lg">売上・伝票レポート</h2>
            <p className="text-sm text-gray-600">
              {new Date().toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <Separator />

          {/* Daily Summary */}
          <div>
            <h3 className="text-lg font-semibold mb-4">本日の売上サマリー</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">予想レーキ</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(expectedRake)}円</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">現金売上</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(cashRevenue)}円</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">総売上</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(expectedRake + cashRevenue)}円</div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Receipt Summary */}
          <div>
            <h3 className="text-lg font-semibold mb-4">伝票サマリー</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{todayReceipts.length}</div>
                <div className="text-sm text-gray-600">総伝票数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{completedTodayReceipts.length}</div>
                <div className="text-sm text-gray-600">精算済み</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{pendingTodayReceipts.length}</div>
                <div className="text-sm text-gray-600">未精算</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{activeSessions.length}</div>
                <div className="text-sm text-gray-600">プレイ中</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Player Rankings */}
          {playerRankings.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">プレイヤーランキング（本日）</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">順位</TableHead>
                    <TableHead>プレイヤー名</TableHead>
                    <TableHead>損益</TableHead>
                    <TableHead>ゲーム数</TableHead>
                    <TableHead>平均損益</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playerRankings.slice(0, 10).map((ranking, index) => (
                    <TableRow key={ranking.playerId}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{ranking.playerName}</TableCell>
                      <TableCell>
                        <span className={`font-medium ${ranking.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {ranking.profit >= 0 ? "+" : ""}
                          {formatCurrency(ranking.profit)}円
                        </span>
                      </TableCell>
                      <TableCell>{ranking.gameCount}回</TableCell>
                      <TableCell>
                        <span
                          className={`font-medium ${ranking.averageProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {ranking.averageProfit >= 0 ? "+" : ""}
                          {formatCurrency(Math.round(ranking.averageProfit))}円
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <Separator />

          {/* Receipt Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4">伝票詳細</h3>
            <div className="space-y-4">
              {todayReceipts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">本日の伝票はありません</p>
              ) : (
                todayReceipts.map((receipt, index) => (
                  <div key={receipt.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold">
                        {index + 1}. {receipt.playerName}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant={receipt.status === "completed" ? "default" : "secondary"}>
                          {receipt.status === "completed" ? "精算済み" : "未精算"}
                        </Badge>
                        <span className="font-bold">{formatCurrency(receipt.total || 0)}円</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {receipt.items &&
                        Array.isArray(receipt.items) &&
                        receipt.items.map(
                          (item, itemIndex) =>
                            item.amount > 0 && (
                              <div key={itemIndex} className="flex justify-between">
                                <span>{item.name}:</span>
                                <span>
                                  {formatCurrency(item.amount)}
                                  {item.name.includes("©") ? "©" : "円"}
                                </span>
                              </div>
                            ),
                        )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Historical Sales */}
          {(dailySales || []).length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4">過去の売上履歴</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>営業日</TableHead>
                      <TableHead>確定レーキ</TableHead>
                      <TableHead>現金売上</TableHead>
                      <TableHead>総売上</TableHead>
                      <TableHead>来店者数</TableHead>
                      <TableHead>ゲーム数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(dailySales || [])
                      .slice(-7)
                      .reverse()
                      .map((sales) => (
                        <TableRow key={sales.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              {new Date(sales.date).toLocaleDateString("ja-JP")}
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(sales.confirmedRake)}円</TableCell>
                          <TableCell>{formatCurrency(sales.cashRevenue)}円</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(sales.totalRevenue)}円</TableCell>
                          <TableCell>{sales.playerCount}人</TableCell>
                          <TableCell>{sales.gameCount}回</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Footer */}
          <Separator />
          <div className="text-center text-sm text-gray-500">
            <p>出力日時: {new Date().toLocaleString("ja-JP")}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 print:hidden">
          <Button variant="outline" onClick={handleDownloadDaily}>
            <Download className="h-4 w-4 mr-2" />
            日別レポート
          </Button>
          <Button variant="outline" onClick={handleDownloadReceipts}>
            <Download className="h-4 w-4 mr-2" />
            伝票レポート
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            印刷
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
