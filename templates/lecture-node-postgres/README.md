# __LECTURE_TITLE__

__LECTURE_SUMMARY__（1〜2 文でこのレクチャーの概要を書く）

レクチャーの内容は [LECTURE.md](./LECTURE.md) を参照してください。

## 起動方法

### Docker の場合

```bash
docker compose watch
```

サーバーが起動し、`app/`・`scripts/` の変更を検知して自動でコンテナを再起動します。**初回起動時は別
ターミナルでデータベースの初期化が必要です**。

```bash
docker compose exec app npm run database:init    # テーブル作成（初回のみ）
docker compose exec app npm run database:seed     # 初期データ投入（追記式・データがあればスキップ）
docker compose exec app npm run database:reset    # 全消し → シード再投入
```

PostgreSQL のデータは Docker の named volume に保存されるので、`docker compose down` してもデータは
消えません（完全に消すには `docker compose down -v`）。

### ローカル Node.js の場合

別途 PostgreSQL を立て、`.env.example` を `.env` にコピーして `DATABASE_URL` を設定します。

```bash
cp .env.example .env
npm install
npm run database:init   # テーブル作成
npm run database:seed   # 初期データ投入
npm run dev             # 開発サーバー起動（ファイル変更で自動再起動）
```

ブラウザで <http://localhost:3000> にアクセスしてください。

## ディレクトリ構成

```text
app/
  server.js             サーバー起動・ルート登録
  db.js                 pg Pool 接続（DATABASE_URL）
  routes/               ルートごとのエンドポイント定義
  components/layout.js  共通レイアウト
  public/               静的ファイル（CSS、画像）
scripts/
  init.js               テーブル作成
  seed.js               シード投入（追記式）
  reset.js              全消し
```

## npm scripts

| コマンド | 説明 |
|---|---|
| `npm run dev` | 開発サーバーを起動（`node --watch` で自動再起動） |
| `npm run database:init` | テーブルを作成 |
| `npm run database:seed` | シードデータを投入（追記式・既にデータがあればスキップ） |
| `npm run database:reset` | 全データを削除してからシードを再投入 |
