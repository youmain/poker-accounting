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
  onCloseAction: () => void
  onAddPlayerAction: (player: Omit<Player, "id">) => void
}

export function AddPlayerModal({ isOpen, onCloseAction, onAddPlayerAction }: AddPlayerModalProps) {
  const [name, setName] = useState("")
  const [initialAmount, setInitialAmount] = useState("0")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("=== AddPlayerModal handleSubmit ===")
    console.log("name:", name.trim())
    console.log("initialAmount:", initialAmount)
    
    if (name.trim()) {
      console.log("Calling onAddPlayerAction...")
      onAddPlayerAction({
        name: name.trim(),
        currentChips: 0,
        totalBuyIn: 0,
        totalCashOut: 0,
        totalProfit: 0,
        gameCount: 0,
        status: "inactive",
        dailyHistory: [],
        stackHistory: [],
        initialAmount: initialAmount ? Number.parseInt(initialAmount) : undefined,
      })
      console.log("onAddPlayerAction called successfully")
      setName("")
      setInitialAmount("")
      onCloseAction()
    } else {
      console.log("Name is empty, not calling onAddPlayerAction")
    }
  }

  return (
            <Dialog open={isOpen} onOpenChange={onCloseAction}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            新規プレイヤー追加
            <Button variant="ghost" size="sm" onClick={onCloseAction}>
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
