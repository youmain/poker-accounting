import fs from "fs/promises"
import path from "path"
import type { Player, GameSession, Receipt, DailySales, HistoryEntry, SystemSettings } from "@/types"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_FILES = {
  players: "players.json",
  sessions: "sessions.json",
  receipts: "receipts.json",
  dailySales: "daily-sales.json",
  history: "history.json",
  settings: "settings.json",
}

// データディレクトリを作成
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// データファイルを読み込み
async function readDataFile<T>(filename: string, defaultValue: T): Promise<T> {
  await ensureDataDir()
  const filePath = path.join(DATA_DIR, filename)

  try {
    const data = await fs.readFile(filePath, "utf-8")
    return JSON.parse(data)
  } catch {
    // ファイルが存在しない場合はデフォルト値を返す
    await writeDataFile(filename, defaultValue)
    return defaultValue
  }
}

// データファイルに書き込み
async function writeDataFile<T>(filename: string, data: T): Promise<void> {
  await ensureDataDir()
  const filePath = path.join(DATA_DIR, filename)
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8")
}

// 各データタイプの操作関数
export const dataManager = {
  // プレイヤーデータ
  async getPlayers(): Promise<Player[]> {
    return readDataFile(DATA_FILES.players, [])
  },

  async savePlayers(players: Player[]): Promise<void> {
    await writeDataFile(DATA_FILES.players, players)
  },

  // セッションデータ
  async getSessions(): Promise<GameSession[]> {
    return readDataFile(DATA_FILES.sessions, [])
  },

  async saveSessions(sessions: GameSession[]): Promise<void> {
    await writeDataFile(DATA_FILES.sessions, sessions)
  },

  // 伝票データ
  async getReceipts(): Promise<Receipt[]> {
    return readDataFile(DATA_FILES.receipts, [])
  },

  async saveReceipts(receipts: Receipt[]): Promise<void> {
    await writeDataFile(DATA_FILES.receipts, receipts)
  },

  // 売上データ
  async getDailySales(): Promise<DailySales[]> {
    return readDataFile(DATA_FILES.dailySales, [])
  },

  async saveDailySales(dailySales: DailySales[]): Promise<void> {
    await writeDataFile(DATA_FILES.dailySales, dailySales)
  },

  // 履歴データ
  async getHistory(): Promise<HistoryEntry[]> {
    return readDataFile(DATA_FILES.history, [])
  },

  async saveHistory(history: HistoryEntry[]): Promise<void> {
    await writeDataFile(DATA_FILES.history, history)
  },

  // システム設定
  async getSettings(): Promise<SystemSettings> {
    return readDataFile(DATA_FILES.settings, {
      confirmedRake: 0,
      rakeConfirmed: false,
      ownerMode: true,
      currentBusinessDate: new Date().toISOString().split("T")[0],
    })
  },

  async saveSettings(settings: SystemSettings): Promise<void> {
    await writeDataFile(DATA_FILES.settings, settings)
  },

  // 全データを取得
  async getAllData() {
    const [players, sessions, receipts, dailySales, history, settings] = await Promise.all([
      this.getPlayers(),
      this.getSessions(),
      this.getReceipts(),
      this.getDailySales(),
      this.getHistory(),
      this.getSettings(),
    ])

    return { players, sessions, receipts, dailySales, history, settings }
  },

  // バックアップ作成
  async createBackup(): Promise<string> {
    const allData = await this.getAllData()
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupFilename = `backup-${timestamp}.json`
    const backupPath = path.join(DATA_DIR, "backups")

    try {
      await fs.access(backupPath)
    } catch {
      await fs.mkdir(backupPath, { recursive: true })
    }

    await fs.writeFile(path.join(backupPath, backupFilename), JSON.stringify(allData, null, 2), "utf-8")

    return backupFilename
  },
}
