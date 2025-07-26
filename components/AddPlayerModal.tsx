"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"
import type { Player } from "@/types"

interface AddPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  onAddPlayer: (player: Omit<Player, "id">) => void
}

export function AddPlayerModal({ isOpen, onClose, onAddPlayer }: AddPlayerModalProps) {
  const [name, setName] = useState("")
  const [initialAmount, setInitialAmount] = useState("0")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onAddPlayer({
        name: name.trim(),
        currentChips: 0,
        totalBuyIn: 0,
        totalCashOut: 0,
        totalProfit: 0,
        gameCount: 0,
        status: "inactive",
        initialAmount: initialAmount ? Number.parseInt(initialAmount) : undefined,
      })
      setName("")
      setInitialAmount("")
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            新規プレイヤー追加
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="text-sm text-gray-600 mb-4">新しいプレイヤーの名前と初期©を入力してください。</div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">名前</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="プレイヤー名を入力"
              required
            />
          </div>
          <div>
            <Label htmlFor="initialAmount">初期©</Label>
            <Input
              id="initialAmount"
              type="number"
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
              placeholder="初期©を数字で入力"
            />
          </div>
          <Button type="submit" className="w-full bg-black hover:bg-gray-800">
            追加
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
