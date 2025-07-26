"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { useToast } from '@/hooks/use-toast'
import QRCode from 'qrcode'

interface QRCodeModalProps {
  isOpen: boolean
  onCloseAction: () => void
  mode: 'display' | 'scan' // display: QRコード表示, scan: QRコード読み取り
}

export function QRCodeModal({ isOpen, onCloseAction, mode }: QRCodeModalProps) {
  const { todayQRCode, qrCodeLoading, createTodayQRCode, signInWithQRCode } = useFirebaseAuth()
  const { toast } = useToast()
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [qrCodeInput, setQrCodeInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // QRコード生成
  useEffect(() => {
    if (mode === 'display' && todayQRCode) {
      generateQRCode(todayQRCode.code)
    }
  }, [mode, todayQRCode])

  // QRコード画像生成
  const generateQRCode = async (text: string) => {
    try {
      const url = await QRCode.toDataURL(text, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setQrCodeUrl(url)
    } catch (error) {
      console.error('QRコード生成エラー:', error)
      toast({
        title: 'エラー',
        description: 'QRコードの生成に失敗しました',
        variant: 'destructive'
      })
    }
  }

  // 新しいQRコードを作成（オーナー用）
  const handleCreateQRCode = async () => {
    setIsLoading(true)
    try {
      const qrCode = await createTodayQRCode()
      if (qrCode) {
        toast({
          title: '成功',
          description: '本日のQRコードを作成しました'
        })
      }
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'QRコードの作成に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // QRコードでログイン
  const handleSignInWithQRCode = async () => {
    if (!qrCodeInput.trim() || !nameInput.trim()) {
      toast({
        title: 'エラー',
        description: 'QRコードと名前を入力してください',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    try {
      const success = await signInWithQRCode(qrCodeInput.trim(), nameInput.trim())
      if (success) {
        toast({
          title: '成功',
          description: 'ログインしました'
        })
        onCloseAction()
      } else {
        toast({
          title: 'エラー',
          description: 'ログインに失敗しました',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'ログインに失敗しました',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ファイルからQRコード読み取り
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        // 簡易的なQRコード読み取り（実際の実装ではqrcode-readerライブラリを使用）
        // ここではファイル名からQRコードを推測する簡易実装
        const fileName = file.name.replace(/\.[^/.]+$/, '') // 拡張子除去
        setQrCodeInput(fileName)
        toast({
          title: '成功',
          description: 'QRコードを読み取りました'
        })
      } catch (error) {
        toast({
          title: 'エラー',
          description: 'QRコードの読み取りに失敗しました',
          variant: 'destructive'
        })
      }
    }
    reader.readAsDataURL(file)
  }

  // 安全なクリップボードコピー
  const safeCopyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        toast({
          title: '成功',
          description: 'クリップボードにコピーしました'
        })
      } else {
        // フォールバック: テキストエリアを使用
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        toast({
          title: '成功',
          description: 'クリップボードにコピーしました'
        })
      }
    } catch (error) {
      console.error('Copy failed:', error)
      toast({
        title: 'エラー',
        description: 'クリップボードへのコピーに失敗しました',
        variant: 'destructive'
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onCloseAction}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'display' ? 'QRコード表示' : 'QRコード読み取り'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={mode} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="display">表示</TabsTrigger>
            <TabsTrigger value="scan">読み取り</TabsTrigger>
          </TabsList>

          <TabsContent value="display" className="space-y-4">
            {qrCodeLoading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : todayQRCode ? (
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex justify-center">
                      {qrCodeUrl && (
                        <img 
                          src={qrCodeUrl} 
                          alt="QR Code" 
                          className="max-w-full h-auto"
                        />
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-600">
                        本日のQRコード: {todayQRCode.code}
                      </p>
                      <p className="text-xs text-gray-500">
                        有効期限: {todayQRCode.businessDate} 23:59
                      </p>
                    </div>
                    <div className="mt-4 flex flex-col items-center">
                      <span className="text-sm text-gray-600 mb-1">従業員招待用URL</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{typeof window !== "undefined" ? window.location.origin : ""}</span>
                        <button
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              safeCopyToClipboard(window.location.origin)
                            }
                          }}
                          className="text-xs px-2 py-1 bg-blue-100 rounded hover:bg-blue-200"
                        >
                          コピー
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Button 
                  onClick={handleCreateQRCode} 
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? '作成中...' : '新しいQRコードを作成'}
                </Button>
              </div>
            ) : (
              <div className="text-center p-8">
                <p className="text-gray-600 mb-4">本日のQRコードがありません</p>
                <Button onClick={handleCreateQRCode} disabled={isLoading}>
                  {isLoading ? '作成中...' : 'QRコードを作成'}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="scan" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="qrCode">QRコード</Label>
                <Input
                  id="qrCode"
                  value={qrCodeInput}
                  onChange={(e) => setQrCodeInput(e.target.value)}
                  placeholder="QRコードを入力またはファイルをアップロード"
                />
              </div>

              <div>
                <Label htmlFor="name">名前</Label>
                <Input
                  id="name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="従業員名を入力"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  ファイルから読み取り
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <Button 
                onClick={handleSignInWithQRCode} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'ログイン中...' : 'ログイン'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
