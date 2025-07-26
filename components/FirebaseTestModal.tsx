"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Loader2, Database, Wifi, WifiOff } from "lucide-react"
import { firebaseManager } from "@/lib/firebase"

interface FirebaseTestModalProps {
  isOpen: boolean
  onCloseAction: () => void
}

export function FirebaseTestModal({ isOpen, onCloseAction }: FirebaseTestModalProps) {
  const [testResults, setTestResults] = useState<{
    config: boolean
    auth: boolean
    firestore: boolean
    qrCode: boolean
  }>({
    config: false,
    auth: false,
    firestore: false,
    qrCode: false
  })
  const [isTesting, setIsTesting] = useState(false)
  const [error, setError] = useState("")

  const runTests = async () => {
    setIsTesting(true)
    setError("")
    
    const results = {
      config: false,
      auth: false,
      firestore: false,
      qrCode: false
    }

    try {
      // 1. 設定テスト
      console.log("Firebase設定テスト開始")
      results.config = true
      setTestResults({ ...results })

      // 2. 認証テスト
      console.log("Firebase認証テスト開始")
      try {
        const user = await firebaseManager.signInAnonymously()
        results.auth = !!user
        console.log("認証成功:", user.uid)
      } catch (authError) {
        console.error("認証エラー:", authError)
        results.auth = false
      }
      setTestResults({ ...results })

      // 3. Firestoreテスト
      console.log("Firestoreテスト開始")
      try {
        const testData = { test: true, timestamp: new Date() }
        await firebaseManager.saveData('history', testData)
        results.firestore = true
        console.log("Firestore書き込み成功")
      } catch (firestoreError) {
        console.error("Firestoreエラー:", firestoreError)
        results.firestore = false
      }
      setTestResults({ ...results })

      // 4. QRコードテスト
      console.log("QRコードテスト開始")
      try {
        const qrCode = await firebaseManager.createTodayQRCode()
        results.qrCode = !!qrCode
        console.log("QRコード作成成功:", qrCode)
      } catch (qrError) {
        console.error("QRコードエラー:", qrError)
        results.qrCode = false
      }
      setTestResults({ ...results })

    } catch (error) {
      console.error("テストエラー:", error)
      setError("テスト中にエラーが発生しました")
    } finally {
      setIsTesting(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      runTests()
    }
  }, [isOpen])

  const allTestsPassed = Object.values(testResults).every(result => result)

  return (
    <Dialog open={isOpen} onOpenChange={onCloseAction}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Firebase接続テスト
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">設定</span>
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : testResults.config ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">認証</span>
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : testResults.auth ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Firestore</span>
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : testResults.firestore ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">QRコード</span>
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : testResults.qrCode ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            {allTestsPassed ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm font-medium">
              {allTestsPassed ? "Firebase接続正常" : "Firebase接続に問題があります"}
            </span>
          </div>

          <div className="flex gap-2">
            <Button onClick={runTests} disabled={isTesting} className="flex-1">
              {isTesting ? "テスト中..." : "再テスト"}
            </Button>
            <Button onClick={onCloseAction} variant="outline">
              閉じる
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 