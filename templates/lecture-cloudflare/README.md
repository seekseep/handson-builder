# __LECTURE_SLUG__ - __LECTURE_TITLE__

このレクチャーのサンプル（Cloudflare Workers + D1）。

## 構成

```text
src/index.js           Worker（D1 から読み書きする API・Hono）
schema.sql             テーブル定義
public/                フロント（静的・投稿後に一覧を取り直す）
wrangler.example.jsonc Worker + D1 binding 設定のテンプレート（コピーして wrangler.jsonc を作る）
package.json           npm scripts（dev / deploy / db:*）
```

## 起動方法

```bash
# 1. wrangler.example.jsonc を複製して wrangler.jsonc を作り、name を自分用に書き換える
npm install
npm run db:create      # = wrangler d1 create __DB_NAME__（表示された database_id を wrangler.jsonc に貼る）
npm run db:setup       # = schema.sql をローカル D1 に流す
npm run dev            # ターミナル1: Worker（API）:8787
npm run front          # ターミナル2: フロント :8788
```

`http://localhost:8788` を開いて投稿し、再読み込みしても残っていれば成功です。

## 公開

```bash
npm run deploy
```

公開後は `public/main.js` の `API_BASE` を公開 Worker の URL に変え、フロントを再デプロイします。

## npm scripts

| コマンド | 説明 |
|---|---|
| `npm run db:create` | D1 データベースを作成 |
| `npm run db:setup` | ローカル D1 に schema.sql を適用 |
| `npm run db:setup:remote` | 本番 D1 に schema.sql を適用 |
| `npm run dev` | Worker（API）をローカル起動（:8787） |
| `npm run front` | フロントをローカル起動（:8788） |
| `npm run deploy` | Worker を Cloudflare に公開 |
