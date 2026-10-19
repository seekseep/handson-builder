---
title: __LECTURE_TITLE__
docs: true
---

# __LECTURE_TITLE__

![__LECTURE_TITLE__](./images/00-thumbnail.svg)

このレクチャーで学ぶことの導入を 2〜3 文で書く。何を作り、動かすと何が起きるのかを先に見せる。

<!-- 図は genfig スキルで作り images/ に置く。00-thumbnail.svg を先頭サムネにする。 -->

### プロジェクトを用意する

このレクチャーのサンプルを ZIP で配布しています。次の手順で手元に用意してください。

1. 下の「サンプルコードをダウンロード」ボタンからプロジェクト ZIP をダウンロードする
2. ダウンロードした ZIP を解凍する（展開すると `__LECTURE_SLUG__` フォルダができます）
3. その `__LECTURE_SLUG__` フォルダを VSCode で開く（File → Open Folder）
4. VSCode でターミナルを開く。以降のコマンドは、この開いたフォルダの中で実行します。

:::download
[サンプルコードをダウンロード](./project.zip)
:::

### プロジェクト設定を用意する

テンプレートの `wrangler.example.jsonc` を同じフォルダで複製し、複製した方の名前を `wrangler.jsonc` に
変更します。開いて `name` の「あなたの名前」を自分用に書き換えてください（他の人と衝突しない一意な名前に）。

### ローカルで動かす

```bash
npm install
npm run db:create      # 表示された database_id を wrangler.jsonc に貼る
npm run db:setup       # schema.sql をローカル D1 に流す
npm run dev            # ターミナル1: Worker（API）:8787
npm run front          # ターミナル2: フロント :8788
```

`http://localhost:8788` を開いて動作を確認します。

### 公開する

```bash
npm run deploy
```

<!-- 必要なら「コラム」「次の章へ」などの見出しを続ける。構成はレクチャーの裁量。 -->
