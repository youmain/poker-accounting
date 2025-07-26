"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  CheckCircle,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  FileText,
  Calculator,
  Eye,
  Download,
  Printer,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Save,
  Database,
} from "lucide-react"
import { useState, useEffect } from "react"
import { formatCurrency } from "@/utils/receiptCalculations"
import type { Receipt, ReceiptItem, Player, GameSession, DailySales, HistoryEntry, SystemSettings } from "@/types"

interface EndOfDayModalProps {
  isOpen: boolean
  onClose: () => void
  onEndOfDay: (data: {
    confirmedRake: number
    cashRevenue: number
    totalRevenue: number
    completedReceipts: number
    pendingReceipts: number
  }) => void
  expectedRake: number
  cashRevenue: number
  completedReceipts: number
  pendingReceipts: number
  receipts: Receipt[]
  players: Player[]
  gameSessions: GameSession[]
  dailySales: DailySales[]
  history: HistoryEntry[]
  systemSettings: SystemSettings
  onClearAllData?: () => void
}

type ProcessStep = "check" | "receipt-review" | "confirm" | "complete"

export function EndOfDayModal({
  isOpen,
  onClose,
  onEndOfDay,
  expectedRake,
  cashRevenue,
  completedReceipts,
  pendingReceipts: pendingReceiptsCountProp,
  receipts,
  players,
  gameSessions,
  dailySales,
  history,
  systemSettings,
  onClearAllData,
}: EndOfDayModalProps) {
  const [currentStep, setCurrentStep] = useState<ProcessStep>("check")
  const [rakeAmount, setRakeAmount] = useState(expectedRake)
  const [issues, setIssues] = useState<string[]>([])
  const [showDetails, setShowDetails] = useState(false)

  // 伝票レビュー用の状態
  const [currentReceiptIndex, setCurrentReceiptIndex] = useState(0)
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null)
  const [editingItems, setEditingItems] = useState<ReceiptItem[]>([])
  const [pendingReceipts, setPendingReceipts] = useState<Receipt[]>([])

  // 今日の日付
  const today = new Date().toISOString().split("T")[0]
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  // 今日の未精算伝票を取得
  useEffect(() => {
    if (isOpen) {
      const todayPendingReceipts = receipts.filter((r) => {
        const receiptDate = r.date?.includes("/")
          ? r.date
              .split("/")
              .map((p) => p.padStart(2, "0"))
              .join("-")
              .replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$1-$2-$3")
          : r.date
        return receiptDate === today && r.status === "pending"
      })
      setPendingReceipts(todayPendingReceipts)
      setCurrentReceiptIndex(0)
    }
  }, [isOpen, receipts, today])

  // データ整合性チェック
  useEffect(() => {
    if (isOpen) {
      const foundIssues: string[] = []

      // 未精算の伝票チェック
      const pendingReceiptsCount = pendingReceipts.length
      if (pendingReceiptsCount > 0) {
        foundIssues.push(`${pendingReceiptsCount}件の未精算伝票があります`)
      }

      // 期待レーキと確定レーキの差異チェック
      const rakeDifference = Math.abs(expectedRake - rakeAmount)
      if (rakeDifference > 1000) {
        foundIssues.push(`期待レーキと確定レーキに${formatCurrency(rakeDifference)}円の差があります`)
      }

      setIssues(foundIssues)
      setRakeAmount(expectedRake)
    }
  }, [isOpen, expectedRake, pendingReceipts])

  // 全データを保存する関数
  const handleSaveAllData = () => {
    const allData = {
      exportDate: new Date().toISOString(),
      businessDate: today,
      players: players || [],
      gameSessions: gameSessions || [],
      receipts: receipts || [],
      dailySales: dailySales || [],
      history: history || [],
      systemSettings: systemSettings || {},
      summary: {
        totalPlayers: (players || []).length,
        totalSessions: (gameSessions || []).length,
        totalReceipts: (receipts || []).length,
        expectedRake,
        cashRevenue,
        totalRevenue: rakeAmount + cashRevenue,
      },
    }

    const dataStr = JSON.stringify(allData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `poker-data-backup-${today}.json`
    link.click()
    URL.revokeObjectURL(url)

    alert(`${today}のデータを保存しました。`)
  }

  const handleNextStep = () => {
    if (currentStep === "check") {
      if (pendingReceipts.length > 0) {
        setCurrentStep("receipt-review")
      } else {
        setCurrentStep("confirm")
      }
    } else if (currentStep === "receipt-review") {
      setCurrentStep("confirm")
    } else if (currentStep === "confirm") {
      onEndOfDay({
        confirmedRake: rakeAmount,
        cashRevenue: cashRevenue,
        totalRevenue: rakeAmount + cashRevenue,
        completedReceipts: completedReceipts,
        pendingReceipts: pendingReceipts.length,
      })
      setCurrentStep("complete")
    }
  }

  const handlePrevStep = () => {
    if (currentStep === "confirm") {
      if (pendingReceipts.length > 0) {
        setCurrentStep("receipt-review")
      } else {
        setCurrentStep("check")
      }
    } else if (currentStep === "receipt-review") {
      setCurrentStep("check")
    } else if (currentStep === "complete") {
      setCurrentStep("confirm")
    }
  }

  const handleClose = () => {
    setCurrentStep("check")
    setIssues([])
    setShowDetails(false)
    setEditingReceipt(null)
    setEditingItems([])
    setCurrentReceiptIndex(0)
    onClose()
  }

  const canProceed = issues.length === 0 || currentStep !== "check"
  const currentReceipt = pendingReceipts[currentReceiptIndex]

  const today_formatted = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  })

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-base sm:text-lg">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">日締め処理 - {today_formatted}</span>
          </DialogTitle>
        </DialogHeader>

        {/* ステップインジケーター */}
        <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-4 sm:mb-6 overflow-x-auto px-2">
          <div
            className={`flex items-center space-x-1 sm:space-x-2 ${
              currentStep === "check"
                ? "text-blue-600"
                : currentStep === "receipt-review" || currentStep === "confirm" || currentStep === "complete"
                  ? "text-green-600"
                  : "text-gray-400"
            }`}
          >
            <div
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs ${
                currentStep === "check"
                  ? "bg-blue-100 border-2 border-blue-600"
                  : currentStep === "receipt-review" || currentStep === "confirm" || currentStep === "complete"
                    ? "bg-green-100 border-2 border-green-600"
                    : "bg-gray-100 border-2 border-gray-300"
              }`}
            >
              {currentStep === "receipt-review" || currentStep === "confirm" || currentStep === "complete" ? (
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : (
                "1"
              )}
            </div>
            <span className="font-medium text-xs sm:text-sm whitespace-nowrap">データ確認</span>
          </div>
          <div className="w-2 sm:w-4 h-0.5 bg-gray-300"></div>
          <div
            className={`flex items-center space-x-1 sm:space-x-2 ${
              currentStep === "receipt-review"
                ? "text-blue-600"
                : currentStep === "confirm" || currentStep === "complete"
                  ? "text-green-600"
                  : "text-gray-400"
            }`}
          >
            <div
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs ${
                currentStep === "receipt-review"
                  ? "bg-blue-100 border-2 border-blue-600"
                  : currentStep === "confirm" || currentStep === "complete"
                    ? "bg-green-100 border-2 border-green-600"
                    : "bg-gray-100 border-2 border-gray-300"
              }`}
            >
              {currentStep === "confirm" || currentStep === "complete" ? (
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : (
                "2"
              )}
            </div>
            <span className="font-medium text-xs sm:text-sm whitespace-nowrap">伝票確認</span>
          </div>
          <div className="w-2 sm:w-4 h-0.5 bg-gray-300"></div>
          <div
            className={`flex items-center space-x-1 sm:space-x-2 ${
              currentStep === "confirm"
                ? "text-blue-600"
                : currentStep === "complete"
                  ? "text-green-600"
                  : "text-gray-400"
            }`}
          >
            <div
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs ${
                currentStep === "confirm"
                  ? "bg-blue-100 border-2 border-blue-600"
                  : currentStep === "complete"
                    ? "bg-green-100 border-2 border-green-600"
                    : "bg-gray-100 border-2 border-gray-300"
              }`}
            >
              {currentStep === "complete" ? <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" /> : "3"}
            </div>
            <span className="font-medium text-xs sm:text-sm whitespace-nowrap">レーキ確定</span>
          </div>
          <div className="w-2 sm:w-4 h-0.5 bg-gray-300"></div>
          <div
            className={`flex items-center space-x-1 sm:space-x-2 ${
              currentStep === "complete" ? "text-green-600" : "text-gray-400"
            }`}
          >
            <div
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs ${
                currentStep === "complete"
                  ? "bg-green-100 border-2 border-green-600"
                  : "bg-gray-100 border-2 border-gray-300"
              }`}
            >
              {currentStep === "complete" ? <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" /> : "4"}
            </div>
            <span className="font-medium text-xs sm:text-sm whitespace-nowrap">処理完了</span>
          </div>
        </div>

        <Tabs value={currentStep} className="w-full">
          {/* ステップ1: データ確認 */}
          <TabsContent value="check" className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-bold mb-2">本日のデータを確認してください</h2>
              <p className="text-sm sm:text-base text-gray-600">日締め処理を行う前に、データの整合性を確認します</p>
            </div>

            {/* 問題がある場合の警告 */}
            {issues.length > 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <div className="font-medium mb-2">以下の問題を解決してから日締めを行ってください：</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* データ保存ボタン */}
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center text-purple-700">
                  <Database className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  データバックアップ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  日締め前に全データをバックアップすることをお勧めします。
                  プレイヤー、セッション、伝票、売上、履歴データがすべて保存されます。
                </p>
                <Button onClick={handleSaveAllData} className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  全データを保存
                </Button>
              </CardContent>
            </Card>

            {/* 売上サマリー */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center">
                    <Calculator className="h-4 w-4 mr-2 text-blue-600" />
                    期待レーキ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-xl sm:text-2xl font-bold ${expectedRake < 0 ? "text-red-600" : "text-blue-600"}`}
                  >
                    {expectedRake < 0 ? "-" : ""}
                    {formatCurrency(Math.abs(expectedRake))}円
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{expectedRake < 0 ? "プレイヤー利益" : "プレイヤー損失"}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                    現金売上
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">{formatCurrency(cashRevenue)}円</div>
                  <p className="text-xs text-gray-500 mt-1">精算済み {completedReceipts}件</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-orange-600" />
                    予想総売上
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-orange-600">
                    {formatCurrency(expectedRake + cashRevenue)}円
                  </div>
                  <p className="text-xs text-gray-500 mt-1">レーキ + 現金売上</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-lg">未精算伝票</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => setShowDetails(!showDetails)}>
                      <Eye className="h-4 w-4 mr-2" />
                      {showDetails ? "非表示" : "詳細表示"}
                    </Button>
                  </div>
                </CardHeader>
                {showDetails && (
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center text-sm sm:text-base">
                        <FileText className="h-4 w-4 mr-2" />
                        未精算伝票 ({pendingReceipts.length}件)
                      </h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {pendingReceipts.map((receipt) => (
                          <div
                            key={receipt.id}
                            className="flex justify-between items-center p-2 bg-red-50 rounded text-sm"
                          >
                            <span className="font-medium truncate">{receipt.playerName}</span>
                            <span className="text-sm whitespace-nowrap ml-2">
                              {formatCurrency(receipt.total || 0)}円
                            </span>
                          </div>
                        ))}
                        {pendingReceipts.length === 0 && (
                          <p className="text-gray-500 text-sm">未精算の伝票はありません</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* ステップ2: 伝票確認 */}
          <TabsContent value="receipt-review" className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-bold mb-2">未精算伝票を確認してください</h2>
              <p className="text-sm sm:text-base text-gray-600">各伝票を確認し、修正・精算・翌日送りを行ってください</p>
            </div>

            {pendingReceipts.length === 0 ? (
              <Card>
                <CardContent className="p-6 sm:p-8 text-center">
                  <CheckCircle className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 text-green-600" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2">未精算伝票はありません</h3>
                  <p className="text-sm sm:text-base text-gray-600">すべての伝票が精算済みです。</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* ナビゲーション */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentReceiptIndex(Math.max(0, currentReceiptIndex - 1))}
                    disabled={currentReceiptIndex === 0}
                    size="sm"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">前の伝票</span>
                    <span className="sm:hidden">前</span>
                  </Button>

                  <Badge variant="outline" className="text-sm sm:text-lg px-3 sm:px-4 py-1 sm:py-2">
                    {currentReceiptIndex + 1} / {pendingReceipts.length}
                  </Badge>

                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentReceiptIndex(Math.min(pendingReceipts.length - 1, currentReceiptIndex + 1))
                    }
                    disabled={currentReceiptIndex === pendingReceipts.length - 1}
                    size="sm"
                  >
                    <span className="hidden sm:inline">次の伝票</span>
                    <span className="sm:hidden">次</span>
                    <ChevronRight className="h-4 w-4 ml-1 sm:ml-2" />
                  </Button>
                </div>

                {currentReceipt && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg">{currentReceipt.playerName} の伝票</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* 基本情報 */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 sm:mb-6">
                        <div>
                          <p className="text-sm text-gray-600">プレイヤー名</p>
                          <p className="font-semibold">{currentReceipt.playerName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">日付</p>
                          <p className="font-semibold">{currentReceipt.date}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">合計金額</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatCurrency(currentReceipt.total || 0)}円
                          </p>
                        </div>
                      </div>

                      {/* 伝票明細 */}
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs sm:text-sm">項目名</TableHead>
                              <TableHead className="text-right text-xs sm:text-sm">数量</TableHead>
                              <TableHead className="text-right text-xs sm:text-sm">単価</TableHead>
                              <TableHead className="text-right text-xs sm:text-sm">金額</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(currentReceipt.items || []).map((item, index) => (
                              <TableRow key={index} className={item.type === "negative" ? "bg-red-50" : ""}>
                                <TableCell className="font-medium text-xs sm:text-sm break-words max-w-[120px] sm:max-w-none">
                                  {item.name}
                                </TableCell>
                                <TableCell className="text-right text-xs sm:text-sm">{item.quantity || 1}</TableCell>
                                <TableCell className="text-right text-xs sm:text-sm whitespace-nowrap">
                                  {formatCurrency(item.amount || 0)}
                                  {item.name === "©増減" ||
                                  item.name === "最終©残高" ||
                                  item.name === "開始時スタック" ||
                                  item.name === "バイイン"
                                    ? "©"
                                    : "円"}
                                </TableCell>
                                <TableCell className="text-right font-medium text-xs sm:text-sm whitespace-nowrap">
                                  {formatCurrency((item.amount || 0) * (item.quantity || 1))}
                                  {item.name === "©増減" ||
                                  item.name === "最終©残高" ||
                                  item.name === "開始時スタック" ||
                                  item.name === "バイイン"
                                    ? "©"
                                    : "円"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* 伝票アクション */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-4 sm:mt-6 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => {
                            // 明日の伝票に移動する処理
                            setPendingReceipts((prev) => prev.filter((r) => r.id !== currentReceipt.id))
                            if (currentReceiptIndex >= pendingReceipts.length - 1) {
                              setCurrentReceiptIndex(Math.max(0, pendingReceipts.length - 2))
                            }
                          }}
                          className="text-orange-600 border-orange-600 hover:bg-orange-50 bg-transparent w-full sm:w-auto"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          明日の伝票に移動
                        </Button>

                        <Button
                          onClick={() => {
                            // 精算完了処理
                            setPendingReceipts((prev) => prev.filter((r) => r.id !== currentReceipt.id))
                            if (currentReceiptIndex >= pendingReceipts.length - 1) {
                              setCurrentReceiptIndex(Math.max(0, pendingReceipts.length - 2))
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          精算完了
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* ステップ3: レーキ確定 */}
          <TabsContent value="confirm" className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-bold mb-2">レーキを確定してください</h2>
              <p className="text-sm sm:text-base text-gray-600">期待レーキを確認し、必要に応じて調整してください</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">レーキ確定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">期待レーキ（自動計算）</label>
                    <div
                      className={`text-xl sm:text-2xl font-bold p-3 bg-gray-50 rounded ${
                        expectedRake < 0 ? "text-red-600" : "text-blue-600"
                      }`}
                    >
                      {expectedRake < 0 ? "-" : ""}
                      {formatCurrency(Math.abs(expectedRake))}円
                    </div>
                    <p className="text-xs text-gray-500 mt-1">プレイヤーの損益から自動計算</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">確定レーキ（調整可能）</label>
                    <Input
                      type="number"
                      value={rakeAmount}
                      onChange={(e) => setRakeAmount(Number(e.target.value))}
                      className="text-xl sm:text-2xl font-bold h-12 sm:h-16"
                    />
                    <p className="text-xs text-gray-500 mt-1">必要に応じて手動で調整してください</p>
                  </div>
                </div>

                {Math.abs(expectedRake - rakeAmount) > 0 && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800 text-sm">
                      期待レーキと確定レーキに{formatCurrency(Math.abs(expectedRake - rakeAmount))}円の差があります。
                      調整理由を記録することをお勧めします。
                    </AlertDescription>
                  </Alert>
                )}

                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">確定後の売上予想</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">確定レーキ</p>
                      <p className="text-base sm:text-lg font-bold text-blue-600">{formatCurrency(rakeAmount)}円</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">現金売上</p>
                      <p className="text-base sm:text-lg font-bold text-green-600">{formatCurrency(cashRevenue)}円</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">総売上</p>
                      <p className="text-base sm:text-lg font-bold text-orange-600">
                        {formatCurrency(rakeAmount + cashRevenue)}円
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ステップ4: 処理完了 */}
          <TabsContent value="complete" className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-green-600 mb-2">日締め処理が完了しました</h2>
              <p className="text-sm sm:text-base text-gray-600">お疲れさまでした。本日の営業が正常に終了しました。</p>
            </div>

            <Card className="bg-gradient-to-r from-green-50 to-blue-50">
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-4 text-center">本日の最終売上</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-center">
                    <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-gray-600">確定レーキ</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">{formatCurrency(rakeAmount)}円</p>
                  </div>
                  <div className="text-center">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2 text-green-600" />
                    <p className="text-sm text-gray-600">現金売上</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">{formatCurrency(cashRevenue)}円</p>
                  </div>
                  <div className="text-center">
                    <div className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2 bg-orange-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">¥</span>
                    </div>
                    <p className="text-sm text-gray-600">総売上</p>
                    <p className="text-xl sm:text-2xl font-bold text-orange-600">
                      {formatCurrency(rakeAmount + cashRevenue)}円
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row justify-center gap-2 sm:space-x-4">
              <Button
                onClick={handleSaveAllData}
                variant="outline"
                className="flex items-center justify-center bg-transparent w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                最終データを保存
              </Button>
              <Button variant="outline" className="flex items-center justify-center bg-transparent w-full sm:w-auto">
                <Printer className="h-4 w-4 mr-2" />
                売上レポートを印刷
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* フッターボタン */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto bg-transparent">
            <X className="h-4 w-4 mr-2" />
            キャンセル
          </Button>

          <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 w-full sm:w-auto">
            {currentStep !== "check" && (
              <Button variant="outline" onClick={handlePrevStep} className="w-full sm:w-auto bg-transparent">
                戻る
              </Button>
            )}

            {currentStep === "check" && (
              <Button
                onClick={handleNextStep}
                disabled={!canProceed}
                className={`w-full sm:w-auto ${!canProceed ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                次へ：{pendingReceipts.length > 0 ? "伝票確認" : "レーキ確定"}
              </Button>
            )}

            {currentStep === "receipt-review" && (
              <Button onClick={handleNextStep} className="w-full sm:w-auto">
                次へ：レーキ確定
              </Button>
            )}

            {currentStep === "confirm" && (
              <Button onClick={handleNextStep} className="w-full sm:w-auto">
                確定して完了
              </Button>
            )}

            {currentStep === "complete" && (
              <Button onClick={handleClose} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
                閉じる
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
