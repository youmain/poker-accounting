# 本番環境デプロイガイド

## QRコードでインターネット経由接続を有効にする

### 1. 環境変数の設定

本番環境で以下の環境変数を設定してください：

```bash
# 本番環境のURL（必須）
NEXT_PUBLIC_PRODUCTION_URL=https://your-domain.com

# その他の環境変数
NODE_ENV=production
```

### 2. デプロイ方法

#### Vercel でのデプロイ

1. **プロジェクトをVercelに接続**
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

2. **環境変数を設定**
   - Vercelダッシュボード → プロジェクト設定 → Environment Variables
   - `NEXT_PUBLIC_PRODUCTION_URL` を追加

3. **デプロイ**
   ```bash
   vercel --prod
   ```

#### その他のホスティングサービス

1. **Netlify**
   - 環境変数を `NEXT_PUBLIC_PRODUCTION_URL` として設定

2. **Railway**
   - 環境変数を設定してデプロイ

3. **自前サーバー**
   - `.env.local` ファイルに環境変数を追加

### 3. QRコードの動作

#### 開発環境
- ローカルネットワーク用のURL（例: `http://192.168.1.4:3000`）
- 同じWiFiネットワーク内でのみアクセス可能

#### 本番環境
- インターネット経由でアクセス可能なURL
- 世界中のどこからでもアクセス可能
- 環境変数 `NEXT_PUBLIC_PRODUCTION_URL` で指定したURL

### 4. セキュリティ考慮事項

1. **HTTPS必須**
   - 本番環境では必ずHTTPSを使用
   - セキュアな通信を確保

2. **ファイアウォール設定**
   - 必要に応じてアクセス制限を設定
   - 特定のIPアドレスからのみアクセス可能にする

3. **認証機能**
   - 必要に応じて認証機能を追加
   - 不正アクセスを防止

### 5. トラブルシューティング

#### QRコードが読み取れない
- 本番URLが正しく設定されているか確認
- HTTPSが有効になっているか確認
- ドメインが正しく解決されているか確認

#### 接続できない
- ファイアウォール設定を確認
- ネットワーク設定を確認
- ブラウザのコンソールでエラーを確認

### 6. 設定例

#### Vercel での設定例
```bash
# vercel.json
{
  "env": {
    "NEXT_PUBLIC_PRODUCTION_URL": "https://your-app.vercel.app"
  }
}
```

#### 環境変数ファイル例
```bash
# .env.production
NEXT_PUBLIC_PRODUCTION_URL=https://your-domain.com
NODE_ENV=production
```

### 7. テスト方法

1. **ローカルテスト**
   ```bash
   npm run build
   npm start
   ```

2. **本番環境テスト**
   - QRコードを生成
   - 別のネットワーク（モバイルデータなど）からアクセス
   - 接続が成功することを確認

### 8. 注意事項

- 本番環境では必ず `NEXT_PUBLIC_PRODUCTION_URL` を設定
- 設定しない場合、ローカルネットワーク用のURLが使用される
- 環境変数はビルド時に埋め込まれるため、変更時は再ビルドが必要 