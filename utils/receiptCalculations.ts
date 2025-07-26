export function calculateExpectedRake(totalBuyIn: number, playerCount: number, hoursPlayed: number): number {
  // 基本レーキ計算: バイイン総額の5% + 時間ボーナス
  const baseRake = totalBuyIn * 0.05
  const timeBonus = hoursPlayed * playerCount * 100
  return Math.floor(baseRake + timeBonus)
}

export function calculateReceiptTotal(items: Array<{ name: string; amount: number; type: string }>): number {
  const taxableItems = items.filter(
    (item) =>
      item.name !== "スタック購入" &&
      item.name !== "バイイン" &&
      item.name !== "©増減" &&
      item.name !== "最終©残高" &&
      item.name !== "小計" &&
      item.name !== "消費税",
  )

  const taxableAmount = taxableItems.reduce((sum, item) => sum + (item.amount || 0), 0)
  const stackPurchase = items.find((item) => item.name === "スタック購入")?.amount || 0
  const tax = Math.floor(taxableAmount * 0.1)

  return stackPurchase + taxableAmount + tax
}

export function calculateReceiptTotals(receipt: any) {
  const items = receipt?.items || []

  const subtotal = items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0)
  const tax = Math.floor(subtotal * 0.1)
  const total = subtotal + tax

  return {
    subtotal,
    tax,
    total,
    itemCount: items.length,
  }
}

export function calculateDailyStats(receipts: Array<{ total: number; status: string }>, confirmedRake: number) {
  const completedReceipts = receipts.filter((r) => r.status === "completed")
  const pendingReceipts = receipts.filter((r) => r.status === "pending")
  const cashRevenue = completedReceipts.reduce((sum, receipt) => sum + (receipt.total || 0), 0)

  return {
    cashRevenue: cashRevenue || 0,
    totalRevenue: (confirmedRake || 0) + (cashRevenue || 0),
    completedReceipts: completedReceipts.length,
    pendingReceipts: pendingReceipts.length,
  }
}

export function formatCurrency(amount: number): string {
  return (amount || 0).toLocaleString()
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function calculatePlayerProfit(buyIn: number, cashOut: number): number {
  return (cashOut || 0) - (buyIn || 0)
}
