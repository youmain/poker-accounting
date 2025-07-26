"use client"
import { useState, useEffect, useCallback } from 'react'
import { User } from 'firebase/auth'
import { firebaseManager, FirebaseUser, QRCodeInfo } from '@/lib/firebase'

export interface FirebaseAuthResult {
  // 認証状態
  user: User | null
  firebaseUser: FirebaseUser | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // QRコード関連
  todayQRCode: QRCodeInfo | null
  qrCodeLoading: boolean
  
  // 認証メソッド
  signInWithQRCode: (qrCode: string, name: string) => Promise<boolean>
  signInAsOwner: (deviceId: string) => Promise<boolean>
  signOut: () => Promise<void>
  
  // QRコード管理（オーナー用）
  createTodayQRCode: () => Promise<string | null>
  refreshQRCode: () => Promise<void>
}

export function useFirebaseAuth(): FirebaseAuthResult {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [todayQRCode, setTodayQRCode] = useState<QRCodeInfo | null>(null)
  const [qrCodeLoading, setQrCodeLoading] = useState(false)

  // 認証状態の監視
  useEffect(() => {
    const unsubscribe = firebaseManager.onAuthStateChanged(async (authUser) => {
      setUser(authUser)
      
      if (authUser) {
        // ユーザー情報を取得
        const userInfo = await firebaseManager.getUserInfo(authUser.uid)
        setFirebaseUser(userInfo)
      } else {
        setFirebaseUser(null)
      }
      
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // 本日のQRコードを取得
  const refreshQRCode = useCallback(async () => {
    setQrCodeLoading(true)
    try {
      const qrCode = await firebaseManager.getTodayQRCode()
      setTodayQRCode(qrCode)
    } catch (error) {
      console.error('QRコード取得エラー:', error)
    } finally {
      setQrCodeLoading(false)
    }
  }, [])

  // QRコード取得（初回）
  useEffect(() => {
    refreshQRCode()
  }, [refreshQRCode])

  // QRコードでログイン
  const signInWithQRCode = useCallback(async (qrCode: string, name: string): Promise<boolean> => {
    try {
      // QRコードの有効性をチェック
      const today = new Date().toISOString().split('T')[0]
      const currentQRCode = await firebaseManager.getTodayQRCode()
      
      if (!currentQRCode || currentQRCode.code !== qrCode) {
        throw new Error('無効なQRコードです')
      }

      if (currentQRCode.businessDate !== today) {
        throw new Error('QRコードの有効期限が切れています')
      }

      // 匿名認証
      const authUser = await firebaseManager.signInAnonymously()
      
      // ユーザー情報を保存
      await firebaseManager.saveUserInfo({
        uid: authUser.uid,
        name,
        role: 'staff'
      })

      return true
    } catch (error) {
      console.error('QRコードログインエラー:', error)
      return false
    }
  }, [])

  // オーナーとしてログイン
  const signInAsOwner = useCallback(async (deviceId: string): Promise<boolean> => {
    try {
      // 匿名認証
      const authUser = await firebaseManager.signInAnonymously()
      
      // オーナー情報を保存
      await firebaseManager.saveUserInfo({
        uid: authUser.uid,
        name: 'オーナー',
        role: 'owner',
        deviceId
      })

      return true
    } catch (error) {
      console.error('オーナーログインエラー:', error)
      return false
    }
  }, [])

  // ログアウト
  const signOut = useCallback(async () => {
    try {
      await firebaseManager.signOut()
    } catch (error) {
      console.error('ログアウトエラー:', error)
    }
  }, [])

  // 本日のQRコードを作成（オーナー用）
  const createTodayQRCode = useCallback(async (): Promise<string | null> => {
    try {
      const qrCode = await firebaseManager.createTodayQRCode()
      await refreshQRCode() // QRコード一覧を更新
      return qrCode
    } catch (error) {
      console.error('QRコード作成エラー:', error)
      return null
    }
  }, [refreshQRCode])

  return {
    user,
    firebaseUser,
    isAuthenticated: !!user && !!firebaseUser,
    isLoading,
    todayQRCode,
    qrCodeLoading,
    signInWithQRCode,
    signInAsOwner,
    signOut,
    createTodayQRCode,
    refreshQRCode
  }
} 