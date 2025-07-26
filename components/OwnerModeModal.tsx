"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Lock, LogOut, Eye, EyeOff } from "lucide-react"

interface OwnerModeModalProps {
  isOpen: boolean
  onClose: () => void
  isOwnerMode: boolean
  onToggleOwnerMode: (enabled: boolean) => void
}

export function OwnerModeModal({ isOpen, onClose, isOwnerMode, onToggleOwnerMode }: OwnerModeModalProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const OWNER_PASSWORD = "owner123"

  const handleLogin = () => {
    if (password === OWNER_PASSWORD) {
      onToggleOwnerMode(true)
      setPassword("")
      setError("")
      onClose()
    } else {
      setError("パスワードが正しくありません")
      setPassword("")
    }
  }

  const handleLogout = () => {
    onToggleOwnerMode(false)
    setPassword("")
    setError("")
    onClose()
  }

  const handleClose = () => {
    setPassword("")
    setError("")
    onClose()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isOwnerMode) {
      handleLogin()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>オーナーモード</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!isOwnerMode ? (
            // ログイン画面
            <>
              <div className="text-sm text-gray-600">
                オーナーモードにアクセスするにはパスワードを入力してください。
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="パスワードを入力"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
                  キャンセル
                </Button>
                <Button onClick={handleLogin} className="flex-1" disabled={!password.trim()}>
                  <Lock className="h-4 w-4 mr-2" />
                  ログイン
                </Button>
              </div>
            </>
          ) : (
            // ログアウト画面
            <>
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto">
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-800">オーナーモード有効</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    現在オーナーモードでログインしています。
                    <br />
                    管理者機能にアクセスできます。
                  </p>
                </div>
              </div>

              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">利用可能な機能:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• プレイヤー情報の編集・削除</li>
                  <li>• セッション・伝票の削除</li>
                  <li>• データのエクスポート・インポート</li>
                  <li>• 売上管理・レーキ確定</li>
                  <li>• システム設定の変更</li>
                </ul>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
                  閉じる
                </Button>
                <Button onClick={handleLogout} variant="destructive" className="flex-1">
                  <LogOut className="h-4 w-4 mr-2" />
                  ログアウト
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
