"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Wifi, WifiOff, RefreshCw, Clock, AlertCircle } from "lucide-react"

interface SyncStatusIndicatorProps {
  isConnected: boolean
  isSyncing: boolean
  lastSyncTime: Date | null
  pendingChanges: number
  onSyncNow: () => Promise<boolean>
}

export function SyncStatusIndicator({
  isConnected,
  isSyncing,
  lastSyncTime,
  pendingChanges,
  onSyncNow,
}: SyncStatusIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>("")

  // 最終同期時刻の表示を更新
  useEffect(() => {
    const updateTimeAgo = () => {
      if (!lastSyncTime) {
        setTimeAgo("未同期")
        return
      }

      const now = new Date()
      const diffMs = now.getTime() - lastSyncTime.getTime()
      const diffSec = Math.floor(diffMs / 1000)
      const diffMin = Math.floor(diffSec / 60)
      const diffHour = Math.floor(diffMin / 60)

      if (diffSec < 60) {
        setTimeAgo("たった今")
      } else if (diffMin < 60) {
        setTimeAgo(`${diffMin}分前`)
      } else if (diffHour < 24) {
        setTimeAgo(`${diffHour}時間前`)
      } else {
        setTimeAgo(
          lastSyncTime.toLocaleString("ja-JP", {
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        )
      }
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 60000) // 1分ごとに更新

    return () => clearInterval(interval)
  }, [lastSyncTime])

  return (
    <div className="flex items-center space-x-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center gap-1 px-2 py-1">
              {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span>{isConnected ? "オンライン" : "オフライン"}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isConnected ? "サーバーに接続中" : "オフラインモード"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {pendingChanges > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="flex items-center gap-1 px-2 py-1">
                <AlertCircle className="h-3 w-3" />
                <span>{pendingChanges}件</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{pendingChanges}件の未同期の変更があります</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="h-3 w-3 mr-1" />
              <span>{timeAgo}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>最終同期: {lastSyncTime ? lastSyncTime.toLocaleString("ja-JP") : "未同期"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Button
        size="sm"
        variant="ghost"
        onClick={onSyncNow}
        disabled={isSyncing || !isConnected}
        className="h-8 w-8 p-0"
      >
        <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
        <span className="sr-only">今すぐ同期</span>
      </Button>
    </div>
  )
}
