"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Search } from "lucide-react"
import type { Player } from "@/types"

interface StartGameModalProps {
  isOpen: boolean
  onClose: () => void
  onStartGame: (playerId: string, buyIn: number) => void
  players: Player[]
  preselectedPlayerId?: string | null
}

export function StartGameModal({ isOpen, onClose, onStartGame, players, preselectedPlayerId }: StartGameModalProps) {
  const [selectedPlayer, setSelectedPlayer] = useState("")
  const [buyIn, setBuyIn] = useState("")
  const [playerSearchQuery, setPlayerSearchQuery] = useState("")

  // プリセレクトされたプレイヤーがある場合は自動選択
  useEffect(() => {
    if (preselectedPlayerId && isOpen) {
      setSelectedPlayer(preselectedPlayerId)
    }
  }, [preselectedPlayerId, isOpen])

  // プレイヤー検索フィルター
  const filteredPlayers = players.filter((player) =>
    player.name?.toLowerCase().includes(playerSearchQuery.toLowerCase()),
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedPlayer && buyIn) {
      onStartGame(selectedPlayer, Number.parseInt(buyIn))
      setSelectedPlayer("")
      setBuyIn("")
      setPlayerSearchQuery("")
      onClose()
    }
  }

  const handleClose = () => {
    setSelectedPlayer("")
    setBuyIn("")
    setPlayerSearchQuery("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            ゲーム開始
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="text-sm text-gray-600 mb-4">プレイヤーとバイイン金額を選択してください。</div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="playerSearch">プレイヤー検索</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="playerSearch"
                value={playerSearchQuery}
                onChange={(e) => setPlayerSearchQuery(e.target.value)}
                placeholder="プレイヤー名で検索..."
                className="pl-10"
              />
            </div>
            {playerSearchQuery && (
              <div className="text-xs text-gray-500 mt-1">{filteredPlayers.length}件見つかりました</div>
            )}
          </div>

          <div>
            <Label htmlFor="player">プレイヤー</Label>
            <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
              <SelectTrigger>
                <SelectValue placeholder="プレイヤーを選択" />
              </SelectTrigger>
              <SelectContent>
                {filteredPlayers.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500 text-center">
                    {playerSearchQuery ? "検索条件に一致するプレイヤーがありません" : "プレイヤーがありません"}
                  </div>
                ) : (
                  filteredPlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      <div className="flex justify-between items-center w-full">
                        <span>{player.name}</span>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 ml-4">
                          <span>現在©: {player.currentChips.toLocaleString()}</span>
                          <span
                            className={`px-1 py-0.5 rounded text-xs ${
                              player.status === "active" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {player.status === "active" ? "来店中" : "未来店"}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="buyIn">バイイン金額</Label>
            <Input
              id="buyIn"
              type="number"
              value={buyIn}
              onChange={(e) => setBuyIn(e.target.value)}
              placeholder="バイイン金額を入力"
              required
            />
          </div>

          <Button type="submit" className="w-full bg-black hover:bg-gray-800" disabled={!selectedPlayer || !buyIn}>
            ゲーム開始
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
