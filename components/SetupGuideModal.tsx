"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Smartphone,
  Monitor,
  Wifi,
  Cable,
  Router,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Copy,
  ExternalLink,
} from "lucide-react"
import QRCode from "qrcode"

interface SetupGuideModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SetupGuideModal({ isOpen, onClose }: SetupGuideModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [localURL, setLocalURL] = useState("")
  const [copied, setCopied] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname
      const port = window.location.port
      const protocol = window.location.protocol
      const url = `${protocol}//${hostname}${port ? ":" + port : ""}`
      setLocalURL(url)

      // QRコードを生成
      if (qrCanvasRef.current && url) {
        QRCode.toCanvas(qrCanvasRef.current, url, {
          width: 200,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        }).catch((err) => {
          console.error("QRコード生成エラー:", err)
        })
      }
    }
  }, [])

  const copyToClipboard = async () => {
    try {
      if (typeof window !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(localURL)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        // フォールバック: テキストエリアを使用
        const textArea = document.createElement('textarea')
        textArea.value = localURL
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error("コピーに失敗しました:", err)
    }
  }

  const steps = [
    {
      title: "ネットワーク接続の確認",
      content: (
        <div className="space-y-4">
          <Alert>
            <Router className="h-4 w-4" />
            <AlertDescription>
              <strong>重要：</strong>
              パソコンとスマホが同じローカルネットワーク（同じルーター）に接続されている必要があります。
            </AlertDescription>
          </Alert>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3 flex items-center">
              <Router className="h-4 w-4 mr-2" />
              接続パターン例
            </h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-2 bg-white rounded border">
                <Monitor className="h-5 w-5 text-blue-600" />
                <Cable className="h-4 w-4 text-gray-400" />
                <Router className="h-5 w-5 text-green-600" />
                <Wifi className="h-4 w-4 text-gray-400" />
                <Smartphone className="h-5 w-5 text-blue-600" />
                <span className="text-sm">パソコン（有線LAN）+ スマホ（Wi-Fi）</span>
                <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
              </div>
              <div className="flex items-center space-x-3 p-2 bg-white rounded border">
                <Monitor className="h-5 w-5 text-blue-600" />
                <Wifi className="h-4 w-4 text-gray-400" />
                <Router className="h-5 w-5 text-green-600" />
                <Wifi className="h-4 w-4 text-gray-400" />
                <Smartphone className="h-5 w-5 text-blue-600" />
                <span className="text-sm">パソコン（Wi-Fi）+ スマホ（Wi-Fi）</span>
                <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
              </div>
            </div>
          </div>

          <div className="bg-red-50 p-3 rounded border border-red-200">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-800">利用できない構成</span>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• パソコンとスマホが異なるWi-Fiネットワークに接続</li>
              <li>• スマホがモバイルデータ通信を使用</li>
              <li>• 企業ネットワークでデバイス間通信が制限されている場合</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: "URLの共有",
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold mb-2 flex items-center">
              <ExternalLink className="h-4 w-4 mr-2" />
              アクセスURL
            </h4>
            <div className="flex items-center space-x-2 mb-3">
              <code className="flex-1 p-2 bg-white rounded border text-sm font-mono break-all">{localURL}</code>
              <Button size="sm" onClick={copyToClipboard} variant="outline">
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-blue-700">
              このURLをスマホのブラウザで開くか、下のQRコードを読み取ってください。
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h4 className="font-semibold mb-3 flex items-center">
              <QrCode className="h-4 w-4 mr-2" />
              QRコード
            </h4>
            <div className="flex flex-col items-center space-y-3">
              <div className="bg-white p-2 rounded border">
                <canvas ref={qrCanvasRef} className="block" />
              </div>
              <p className="text-sm text-gray-600 text-center">スマホのカメラでQRコードを読み取ってアクセスできます</p>
            </div>
          </div>

          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              <strong>スマホでの操作方法：</strong>
              <br />
              1. カメラアプリでQRコードを読み取る、またはURLを直接入力
              <br />
              2. ブラウザでページが開きます
              <br />
              3. データが自動的に同期されます
            </AlertDescription>
          </Alert>
        </div>
      ),
    },
    {
      title: "データ同期の確認",
      content: (
        <div className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>同期確認方法：</strong>
              <br />
              1. パソコンでプレイヤーを追加してみる
              <br />
              2. スマホの画面で同じプレイヤーが表示されるか確認
              <br />
              3. 両方の画面で同じデータが表示されれば成功です
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  <Monitor className="h-4 w-4 mr-2" />
                  パソコン（メインサーバー）
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="default">メイン</Badge>
                  <span>データの保存・管理</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">機能</Badge>
                  <span>全機能利用可能</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  <Smartphone className="h-4 w-4 mr-2" />
                  スマホ（クライアント）
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">同期</Badge>
                  <span>リアルタイム同期</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">機能</Badge>
                  <span>閲覧・基本操作</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2">同期が成功している場合</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• ヘッダーに「同期中」と表示される</li>
              <li>• プレイヤー追加や伝票作成が即座に反映される</li>
              <li>• 複数のデバイスで同じデータが表示される</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: "トラブル解決",
      content: (
        <div className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-yellow-800 mb-2 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              よくある問題と解決方法
            </h4>
            <div className="space-y-3 text-sm">
              <div>
                <strong className="text-yellow-800">問題：</strong>
                <span className="text-yellow-700">スマホからアクセスできない</span>
                <ul className="mt-1 ml-4 text-yellow-700">
                  <li>• 同じWi-Fiネットワークに接続しているか確認</li>
                  <li>• パソコンのファイアウォール設定を確認</li>
                  <li>• URLを正確に入力しているか確認</li>
                </ul>
              </div>
              <div>
                <strong className="text-yellow-800">問題：</strong>
                <span className="text-yellow-700">データが同期されない</span>
                <ul className="mt-1 ml-4 text-yellow-700">
                  <li>• ページを再読み込みしてみる</li>
                  <li>• ネットワーク接続を確認</li>
                  <li>• パソコンのアプリを再起動</li>
                </ul>
              </div>
              <div>
                <strong className="text-yellow-800">問題：</strong>
                <span className="text-yellow-700">「オフライン」と表示される</span>
                <ul className="mt-1 ml-4 text-yellow-700">
                  <li>• ローカルデータで動作（機能制限あり）</li>
                  <li>• ネットワーク接続を確認して再接続</li>
                  <li>• データは自動的に同期されます</li>
                </ul>
              </div>
            </div>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>設定完了後：</strong>
              <br />• パソコンは常に起動しておいてください（メインサーバーとして動作）
              <br />• スマホは必要な時にアクセスして利用できます
              <br />• データは自動的にリアルタイム同期されます
            </AlertDescription>
          </Alert>
        </div>
      ),
    },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>設定手順</span>
            <Badge variant="outline">
              ステップ {currentStep} / {steps.length}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>

          {/* Current Step Content */}
          <div className="min-h-[400px]">
            <h3 className="text-lg font-semibold mb-4">
              ステップ {currentStep}: {steps[currentStep - 1].title}
            </h3>
            {steps[currentStep - 1].content}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              前へ
            </Button>
            <div className="flex space-x-2">
              {currentStep < steps.length ? (
                <Button onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}>次へ</Button>
              ) : (
                <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
                  完了
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
