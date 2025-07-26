"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Download, Printer, Users, Receipt, GamepadIcon, X } from "lucide-react"
import { useState } from "react"
import type { Player, Receipt as ReceiptType, GameSession } from "@/types"

interface IndividualDataModalProps {
  isOpen: boolean
  onClose: () => void
  players?: Player[]
  receipts?: ReceiptType[]
  sessions?: GameSession[]
  onExportSelected?: (selectedData: any, format: "json" | "csv") => void
  onPrintSelected?: (selectedData: any) => void
}

export function IndividualDataModal({
  isOpen,
  onClose,
  players = [],
  receipts = [],
  sessions = [],
  onExportSelected,
  onPrintSelected,
}: IndividualDataModalProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [selectedReceipts, setSelectedReceipts] = useState<string[]>([])
  const [selectedSessions, setSelectedSessions] = useState<string[]>([])
  const [includePlayerHistory, setIncludePlayerHistory] = useState(true)
  const [includeStackHistory, setIncludeStackHistory] = useState(true)

  // 安全な配列チェック
  const safePlayers = Array.isArray(players) ? players : []
  const safeReceipts = Array.isArray(receipts) ? receipts : []
  const safeSessions = Array.isArray(sessions) ? sessions : []

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers((prev) => (prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]))
  }

  const handleReceiptToggle = (receiptId: string) => {
    setSelectedReceipts((prev) =>
      prev.includes(receiptId) ? prev.filter((id) => id !== receiptId) : [...prev, receiptId],
    )
  }

  const handleSessionToggle = (sessionId: string) => {
    setSelectedSessions((prev) =>
      prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId],
    )
  }

  const handleSelectAllPlayers = () => {
    if (selectedPlayers.length === safePlayers.length) {
      setSelectedPlayers([])
    } else {
      setSelectedPlayers(safePlayers.map((p) => p.id))
    }
  }

  const handleSelectAllReceipts = () => {
    if (selectedReceipts.length === safeReceipts.length) {
      setSelectedReceipts([])
    } else {
      setSelectedReceipts(safeReceipts.map((r) => r.id))
    }
  }

  const handleSelectAllSessions = () => {
    if (selectedSessions.length === safeSessions.length) {
      setSelectedSessions([])
    } else {
      setSelectedSessions(safeSessions.map((s) => s.id))
    }
  }

  const getSelectedData = () => {
    const selectedPlayerData = safePlayers
      .filter((p) => selectedPlayers.includes(p.id))
      .map((player) => ({
        ...player,
        dailyHistory: includePlayerHistory ? player.dailyHistory : undefined,
        stackHistory: includeStackHistory ? player.stackHistory : undefined,
      }))

    const selectedReceiptData = safeReceipts.filter((r) => selectedReceipts.includes(r.id))
    const selectedSessionData = safeSessions.filter((s) => selectedSessions.includes(s.id))

    return {
      players: selectedPlayerData,
      receipts: selectedReceiptData,
      sessions: selectedSessionData,
      exportDate: new Date().toISOString(),
      options: {
        includePlayerHistory,
        includeStackHistory,
      },
    }
  }

  const handleExport = (format: "json" | "csv") => {
    const selectedData = getSelectedData()

    if (format === "json") {
      if (onExportSelected) {
        onExportSelected(selectedData, format)
      } else {
        // デフォルトのJSONエクスポート
        const blob = new Blob([JSON.stringify(selectedData, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `selected-data-${new Date().toISOString().split("T")[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
    } else if (format === "csv") {
      // UTF-8 BOMを追加
      const BOM = "\uFEFF"

      // エクスポート情報
      let csvContent = BOM + "エクスポート情報\n"
      csvContent += `出力日時,"${new Date().toLocaleString("ja-JP")}"\n`
      csvContent += `選択データ,"プレイヤー${selectedData.players?.length || 0}人 伝票${selectedData.receipts?.length || 0}件 セッション${selectedData.sessions?.length || 0}件"\n\n`

      // プレイヤーデータ
      if (selectedData.players && selectedData.players.length > 0) {
        csvContent += "プレイヤーデータ\n"
        csvContent += "ID,名前,現在チップ,本日バイイン,本日損益,ゲーム数,状態\n"
        selectedData.players.forEach((player: Player) => {
          csvContent += `${player.id},"${player.name}",${player.currentChips || 0},${player.totalBuyIn || 0},${player.totalProfit || 0},${player.gameCount || 0},"${player.status === "active" ? "来店中" : "未来店"}"\n`
        })
        csvContent += "\n"
      }

      // 伝票データ
      if (selectedData.receipts && selectedData.receipts.length > 0) {
        csvContent += "伝票データ\n"
        csvContent += "ID,プレイヤー名,日付,合計金額,状態\n"
        selectedData.receipts.forEach((receipt: ReceiptType) => {
          csvContent += `${receipt.id},"${receipt.playerName}","${receipt.date}",${receipt.total || 0},"${receipt.status === "completed" ? "精算済み" : "未精算"}"\n`
        })
        csvContent += "\n"
      }

      // セッションデータ
      if (selectedData.sessions && selectedData.sessions.length > 0) {
        csvContent += "セッションデータ\n"
        csvContent += "ID,プレイヤー名,バイイン,開始時間,状態\n"
        selectedData.sessions.forEach((session: GameSession) => {
          csvContent += `${session.id},"${session.playerName}",${session.buyIn || 0},"${new Date(session.startTime).toLocaleString("ja-JP")}","${session.status === "playing" ? "プレイ中" : "終了"}"\n`
        })
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `selected-data-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handlePrint = () => {
    const selectedData = getSelectedData()
    if (onPrintSelected) {
      onPrintSelected(selectedData)
    } else {
      // デフォルトの印刷処理
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>選択データ印刷</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1, h2 { color: #333; }
                table { border-collapse: collapse; width: 100%; margin: 10px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
              </style>
            </head>
            <body>
              <h1>選択データレポート</h1>
              <p>出力日時: ${new Date().toLocaleString("ja-JP")}</p>
              <h2>プレイヤー (${selectedData.players?.length || 0}人)</h2>
              <h2>伝票 (${selectedData.receipts?.length || 0}件)</h2>
              <h2>セッション (${selectedData.sessions?.length || 0}件)</h2>
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const totalSelected = selectedPlayers.length + selectedReceipts.length + selectedSessions.length

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>個別データ選択</span>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">{totalSelected}件選択中</Badge>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-6">
            {/* プレイヤー選択 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold">プレイヤー ({safePlayers.length}人)</h3>
                </div>
                <Button variant="outline" size="sm" onClick={handleSelectAllPlayers}>
                  {selectedPlayers.length === safePlayers.length ? "全解除" : "全選択"}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {safePlayers.map((player) => (
                  <div key={player.id} className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox
                      checked={selectedPlayers.includes(player.id)}
                      onCheckedChange={() => handlePlayerToggle(player.id)}
                    />
                    <div className="flex-1">
                      <span className="font-medium">{player.name}</span>
                      <div className="text-sm text-gray-500">
                        現在©: {player.currentChips?.toLocaleString() || 0} | 損益:{" "}
                        {player.totalProfit && player.totalProfit >= 0 ? "+" : ""}
                        {player.totalProfit?.toLocaleString() || 0}
                      </div>
                    </div>
                    <Badge variant={player.status === "active" ? "default" : "secondary"}>
                      {player.status === "active" ? "来店中" : "未来店"}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* プレイヤーデータオプション */}
              <div className="ml-6 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox checked={includePlayerHistory} onCheckedChange={setIncludePlayerHistory} />
                  <span className="text-sm">日別履歴を含める</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox checked={includeStackHistory} onCheckedChange={setIncludeStackHistory} />
                  <span className="text-sm">スタック履歴を含める</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* 伝票選択 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Receipt className="h-4 w-4 text-green-600" />
                  <h3 className="font-semibold">伝票 ({safeReceipts.length}件)</h3>
                </div>
                <Button variant="outline" size="sm" onClick={handleSelectAllReceipts}>
                  {selectedReceipts.length === safeReceipts.length ? "全解除" : "全選択"}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {safeReceipts.map((receipt) => (
                  <div key={receipt.id} className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox
                      checked={selectedReceipts.includes(receipt.id)}
                      onCheckedChange={() => handleReceiptToggle(receipt.id)}
                    />
                    <div className="flex-1">
                      <span className="font-medium">{receipt.playerName}</span>
                      <div className="text-sm text-gray-500">
                        {receipt.date} | {receipt.total?.toLocaleString() || 0}円
                      </div>
                    </div>
                    <Badge variant={receipt.status === "completed" ? "default" : "secondary"}>
                      {receipt.status === "completed" ? "精算済み" : "未精算"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* セッション選択 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <GamepadIcon className="h-4 w-4 text-purple-600" />
                  <h3 className="font-semibold">セッション ({safeSessions.length}件)</h3>
                </div>
                <Button variant="outline" size="sm" onClick={handleSelectAllSessions}>
                  {selectedSessions.length === safeSessions.length ? "全解除" : "全選択"}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {safeSessions.map((session) => (
                  <div key={session.id} className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox
                      checked={selectedSessions.includes(session.id)}
                      onCheckedChange={() => handleSessionToggle(session.id)}
                    />
                    <div className="flex-1">
                      <span className="font-medium">{session.playerName}</span>
                      <div className="text-sm text-gray-500">
                        バイイン: {session.buyIn?.toLocaleString() || 0}© | 開始:{" "}
                        {new Date(session.startTime).toLocaleString("ja-JP")}
                      </div>
                    </div>
                    <Badge variant={session.status === "playing" ? "default" : "secondary"}>
                      {session.status === "playing" ? "プレイ中" : "終了"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex flex-col space-y-3 pt-4 border-t">
          <div className="text-sm text-gray-600 text-center">選択したデータのみを保存・印刷できます</div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => handleExport("json")} disabled={totalSelected === 0} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              JSON保存
            </Button>
            <Button onClick={() => handleExport("csv")} disabled={totalSelected === 0} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              CSV保存
            </Button>
          </div>

          <Button onClick={handlePrint} disabled={totalSelected === 0} className="w-full">
            <Printer className="h-4 w-4 mr-2" />
            選択データを印刷
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
