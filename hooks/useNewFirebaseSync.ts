import { useState, useEffect, useCallback } from 'react'
import { newFirebaseSync, type ConnectedUser } from '@/lib/newFirebaseSync'
import type { ServerData, FirebaseSyncResult } from '@/types'
import { useLocalStorage } from './useLocalStorage'

export function useNewFirebaseSync(): FirebaseSyncResult {
  // 基本状態
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [serverData, setServerData] = useState<ServerData | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [syncProgress, setSyncProgress] = useState<{
    isSyncing: boolean
    currentStep: string
    totalSteps: number
    currentStepIndex: number
  } | null>(null)
  
  // 接続情報
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([])
  const [connectedDevices, setConnectedDevices] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  
  // ローカルストレージ
  const [localPlayers, setLocalPlayers] = useLocalStorage<ServerData['players']>('poker-players', [])
  const [localSessions, setLocalSessions] = useLocalStorage<ServerData['sessions']>('poker-sessions', [])
  const [localReceipts, setLocalReceipts] = useLocalStorage<ServerData['receipts']>('poker-receipts', [])
  const [localDailySales, setLocalDailySales] = useLocalStorage<ServerData['dailySales']>('poker-daily-sales', [])
  const [localHistory, setLocalHistory] = useLocalStorage<ServerData['history']>('poker-history', [])
  const [localSettings, setLocalSettings] = useLocalStorage<ServerData['settings']>('poker-settings', {
    confirmedRake: 0,
    rakeConfirmed: false,
    ownerMode: true,
    currentBusinessDate: new Date().toISOString().split('T')[0]
  })

  // 初期化
  useEffect(() => {
    console.log('=== useNewFirebaseSync 初期化 ===')
    
    // ローカルデータを初期状態として設定
    const initialData: ServerData = {
      players: localPlayers,
      sessions: localSessions,
      receipts: localReceipts,
      dailySales: localDailySales,
      history: localHistory,
      settings: localSettings
    }
    
    setServerData(initialData)
    console.log('初期データ設定完了:', {
      players: initialData.players.length,
      sessions: initialData.sessions.length,
      receipts: initialData.receipts.length,
      dailySales: initialData.dailySales.length,
      history: initialData.history.length
    })
  }, [])

  // 新しいセッションを作成
  const createNewSession = useCallback(async (hostName?: string): Promise<string | null> => {
    console.log('=== 新しいセッション作成 ===')
    console.log('HostName:', hostName)
    
    setIsLoading(true)
    setSyncProgress({
      isSyncing: true,
      currentStep: 'セッション作成中...',
      totalSteps: 1,
      currentStepIndex: 0
    })
    
    try {
      const name = hostName || 'ホスト'
      const newSessionId = await newFirebaseSync.createSession(name)
      
      setSessionId(newSessionId)
      setIsConnected(true)
      setIsHost(true)
      setConnectedDevices(1)
      
      // 初期データを保存
      const currentData = serverData || {
        players: localPlayers,
        sessions: localSessions,
        receipts: localReceipts,
        dailySales: localDailySales,
        history: localHistory,
        settings: localSettings
      }
      
      // 各データタイプを保存
      await Promise.all([
        newFirebaseSync.saveData('players', currentData.players),
        newFirebaseSync.saveData('sessions', currentData.sessions),
        newFirebaseSync.saveData('receipts', currentData.receipts),
        newFirebaseSync.saveData('dailySales', currentData.dailySales),
        newFirebaseSync.saveData('history', currentData.history),
        newFirebaseSync.saveData('settings', [currentData.settings])
      ])
      
      setLastSyncTime(new Date())
      setSyncProgress(null)
      
      console.log('セッション作成完了:', newSessionId)
      return newSessionId
    } catch (error) {
      console.error('セッション作成エラー:', error)
      setSyncProgress(null)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [serverData, localPlayers, localSessions, localReceipts, localDailySales, localHistory, localSettings])

  // セッションに参加
  const joinSession = useCallback(async (targetSessionId: string, participantName?: string): Promise<boolean> => {
    console.log('=== セッション参加 ===')
    console.log('SessionId:', targetSessionId)
    console.log('ParticipantName:', participantName)
    
    setIsLoading(true)
    setSyncProgress({
      isSyncing: true,
      currentStep: 'セッションに参加中...',
      totalSteps: 3,
      currentStepIndex: 0
    })
    
    try {
      const name = participantName || '参加者'
      const success = await newFirebaseSync.joinSession(targetSessionId, name)
      
      if (!success) {
        console.error('セッション参加に失敗しました')
        setSyncProgress(null)
        return false
      }
      
      setSessionId(targetSessionId)
      setIsConnected(true)
      setIsHost(false)
      
      setSyncProgress({
        isSyncing: true,
        currentStep: 'ホストのデータを取得中...',
        totalSteps: 3,
        currentStepIndex: 1
      })
      
      // ホストのデータを取得
      const dataTypes: (keyof ServerData)[] = ['players', 'sessions', 'receipts', 'dailySales', 'history', 'settings']
      const ownerData: Partial<ServerData> = {}
      
      for (const type of dataTypes) {
        console.log(`${type}データ取得中...`)
        const data = await newFirebaseSync.getData(type)
        console.log(`${type}データ取得結果:`, data.length, '件')
        
        if (type === 'settings') {
          ownerData[type] = data[0] || localSettings
        } else {
          ownerData[type] = data
        }
        
        setSyncProgress({
          isSyncing: true,
          currentStep: `${type}データ取得中...`,
          totalSteps: 3,
          currentStepIndex: 2
        })
        
        // 各データタイプの取得を確認
        console.log(`${type}データ確認:`, ownerData[type])
      }
      
      // 完全なServerDataオブジェクトを作成
      const completeOwnerData: ServerData = {
        players: ownerData.players || [],
        sessions: ownerData.sessions || [],
        receipts: ownerData.receipts || [],
        dailySales: ownerData.dailySales || [],
        history: ownerData.history || [],
        settings: ownerData.settings || localSettings
      }
      
      console.log('取得したデータ詳細:', {
        players: completeOwnerData.players.length,
        sessions: completeOwnerData.sessions.length,
        receipts: completeOwnerData.receipts.length,
        dailySales: completeOwnerData.dailySales.length,
        history: completeOwnerData.history.length,
        settings: completeOwnerData.settings
      })
      
      // 即座にserverDataを更新
      setServerData(completeOwnerData)
      setLastSyncTime(new Date())
      setSyncProgress(null)
      
      console.log('セッション参加完了')
      console.log('取得したデータ:', {
        players: completeOwnerData.players.length,
        sessions: completeOwnerData.sessions.length,
        receipts: completeOwnerData.receipts.length,
        dailySales: completeOwnerData.dailySales.length,
        history: completeOwnerData.history.length
      })
      
      return true
    } catch (error) {
      console.error('セッション参加エラー:', error)
      setSyncProgress(null)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [localSettings])

  // セッションから退出
  const leaveSession = useCallback(async (): Promise<void> => {
    console.log('=== セッション退出 ===')
    
    try {
      await newFirebaseSync.leaveSession()
      
      setIsConnected(false)
      setIsHost(false)
      setSessionId(null)
      setConnectedUsers([])
      setConnectedDevices(0)
      setLastSyncTime(null)
      setSyncProgress(null)
      
      console.log('セッション退出完了')
    } catch (error) {
      console.error('セッション退出エラー:', error)
    }
  }, [])

  // データをサーバーに保存
  const saveToServer = useCallback(async (type: keyof ServerData, data: any): Promise<boolean> => {
    console.log('=== データ保存 ===')
    console.log('Type:', type)
    console.log('Data:', data)
    
    if (!isConnected) {
      console.log('接続されていないため、ローカルストレージに保存')
      // ローカルストレージに保存
      try {
        localStorage.setItem(`poker-${type}`, JSON.stringify(data))
        console.log('ローカルストレージに保存完了')
        return true
      } catch (error) {
        console.error('ローカルストレージ保存エラー:', error)
        return false
      }
    }
    
    // リトライ機能付きでFirebaseに保存
    const maxRetries = 3
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`保存試行 ${attempt}/${maxRetries}`)
        const success = await newFirebaseSync.saveData(type, data)
        
        if (success) {
          setLastSyncTime(new Date())
          console.log('データ保存完了')
          return true
        } else {
          throw new Error('Firebase保存が失敗しました')
        }
      } catch (error) {
        lastError = error as Error
        console.error(`保存試行 ${attempt} 失敗:`, error)
        
        if (attempt < maxRetries) {
          // 指数バックオフでリトライ
          const delay = Math.pow(2, attempt) * 1000
          console.log(`${delay}ms後にリトライします...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    // 全てのリトライが失敗した場合、ローカルストレージにフォールバック
    console.error('全てのリトライが失敗、ローカルストレージにフォールバック')
    try {
      localStorage.setItem(`poker-${type}`, JSON.stringify(data))
      console.log('ローカルストレージにフォールバック保存完了')
      return true
    } catch (error) {
      console.error('フォールバック保存も失敗:', error)
      return false
    }
  }, [isConnected])

  // データを再取得
  const refreshData = useCallback(async (): Promise<boolean> => {
    console.log('=== データ再取得 ===')
    
    if (!isConnected) {
      console.log('接続されていないため、再取得をスキップ')
      return false
    }
    
    try {
      const dataTypes: (keyof ServerData)[] = ['players', 'sessions', 'receipts', 'dailySales', 'history', 'settings']
      const newData: Partial<ServerData> = {}
      
      for (const type of dataTypes) {
        const data = await newFirebaseSync.getData(type)
        if (type === 'settings') {
          newData[type] = data[0] || localSettings
        } else {
          newData[type] = data
        }
      }
      
      const completeData: ServerData = {
        players: newData.players || [],
        sessions: newData.sessions || [],
        receipts: newData.receipts || [],
        dailySales: newData.dailySales || [],
        history: newData.history || [],
        settings: newData.settings || localSettings
      }
      
      setServerData(completeData)
      setLastSyncTime(new Date())
      
      console.log('データ再取得完了')
      return true
    } catch (error) {
      console.error('データ再取得エラー:', error)
      return false
    }
  }, [isConnected, localSettings])

  // 他のユーザーを切断
  const disconnectUser = useCallback(async (targetUid: string): Promise<boolean> => {
    console.log('=== ユーザー切断 ===')
    console.log('Target UID:', targetUid)
    
    if (!isHost) {
      console.error('ホストのみが切断できます')
      return false
    }
    
    try {
      const success = await newFirebaseSync.disconnectUser(targetUid)
      console.log('ユーザー切断結果:', success)
      return success
    } catch (error) {
      console.error('ユーザー切断エラー:', error)
      return false
    }
  }, [isHost])

  // リアルタイムリスナーの設定
  useEffect(() => {
    console.log('=== リアルタイムリスナー設定 ===')
    console.log('SessionId:', sessionId)
    console.log('IsConnected:', isConnected)
    
    // セッションIDがない場合はスキップ
    if (!sessionId) {
      console.log('リスナー設定をスキップ - セッションIDがありません')
      return
    }
    
    console.log('リアルタイムリスナーを設定中...')
    
    // 接続ユーザーの監視
    const unsubscribeUsers = newFirebaseSync.onConnectedUsersChange((users) => {
      console.log('=== 接続ユーザー更新 ===')
      console.log('Users:', users)
      setConnectedUsers(users)
      setConnectedDevices(users.length)
      
      // 現在のユーザーがホストかどうかを確認
      const currentUser = users.find(user => user.uid === newFirebaseSync.getCurrentState().currentUser?.uid)
      setIsHost(currentUser?.isHost || false)
    })
    
    // 各データタイプの監視
    const dataTypes: (keyof ServerData)[] = ['players', 'sessions', 'receipts', 'dailySales', 'history', 'settings']
    const unsubscribes = dataTypes.map(type => {
      return newFirebaseSync.onDataChange(type, (data) => {
        console.log(`=== ${type} データ更新 ===`)
        console.log('Data:', data)
        console.log('Data length:', data.length)
        console.log('Timestamp:', new Date().toLocaleTimeString())
        
        setServerData(prev => {
          const newData = prev ? { ...prev } : {
            players: [],
            sessions: [],
            receipts: [],
            dailySales: [],
            history: [],
            settings: localSettings
          }
          
          if (type === 'settings') {
            newData[type] = data[0] || localSettings
          } else {
            newData[type] = data
          }
          
          console.log(`新しい${type}データ:`, newData[type])
          console.log(`更新後のserverData:`, {
            players: newData.players.length,
            sessions: newData.sessions.length,
            receipts: newData.receipts.length,
            dailySales: newData.dailySales.length,
            history: newData.history.length
          })
          return newData
        })
        
        setLastSyncTime(new Date())
        console.log('Last sync time updated to:', new Date().toLocaleTimeString())
      })
    })
    
    return () => {
      console.log('=== リスナークリーンアップ ===')
      unsubscribeUsers()
      unsubscribes.forEach(unsubscribe => unsubscribe())
    }
  }, [sessionId, localSettings])

  // 接続状態の監視
  useEffect(() => {
    const checkConnection = () => {
      const state = newFirebaseSync.getCurrentState()
      console.log('=== 接続状態確認 ===')
      console.log('State:', state)
      
      const wasConnected = isConnected
      const wasSessionId = sessionId
      
      setIsConnected(state.isConnected)
      setSessionId(state.sessionId || null)
      setIsHost(state.currentUser?.isHost || false)
      
      // 接続状態が変わった場合はログ出力
      if (wasConnected !== state.isConnected || wasSessionId !== (state.sessionId || null)) {
        console.log('接続状態が変更されました:', {
          wasConnected,
          isConnected: state.isConnected,
          wasSessionId,
          sessionId: state.sessionId || null
        })
      }
    }
    
    // 初回チェック
    checkConnection()
    
    // 定期的にチェック（1秒間隔）
    const interval = setInterval(checkConnection, 1000)
    
    return () => clearInterval(interval)
  }, [isConnected, sessionId])

  return {
    // 基本状態
    isConnected,
    isLoading,
    serverData,
    lastSyncTime,
    syncProgress,
    connectedUsers,
    connectedDevices,
    isHost,
    sessionId,
    firebaseConnected: isConnected,
    firebaseIsHost: isHost,

    // 基本機能
    saveToServer,
    refreshData,

    // セッション管理
    createNewSession,
    joinSession,
    leaveSession,
    disconnectUser,
  }
} 