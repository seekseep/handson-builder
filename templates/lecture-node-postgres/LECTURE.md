---
title: __LECTURE_TITLE__
docs: true
---

# __LECTURE_TITLE__

![__LECTURE_TITLE__](./images/00-thumbnail.svg)

このレクチャーで何を題材にするのか、導入を 1〜3 段落で書く。学習者が「これから何を体験するのか」を
つかめるようにする。

<!-- 図は genfig スキルで作り images/ に置く。00-thumbnail.svg を先頭サムネにする。 -->

該当のコードは [app/routes/items.js](./app/routes/items.js) などにある（リンクはサイト上では
GitHub のソースに自動変換される）。

### プロジェクトを用意する

このレクチャーのサンプルを ZIP で配布しています。ダウンロードして解凍し、そのフォルダを VSCode で開いて
ください。

:::download
[サンプルコードをダウンロード](./project.zip)
:::

### 動かす

起動手順（[README.md](./README.md) 参照）に従ってアプリを立ち上げ、<http://localhost:3000> を開いて
挙動を確認する。

```bash
docker compose watch
docker compose exec app npm run database:init
docker compose exec app npm run database:seed
```

### コードを読む

該当のハンドラを読み、処理の流れを追う。

```js
// 例: app/routes/items.js の一覧ハンドラ
const { rows } = await query(
  'SELECT id, title, created_at FROM items ORDER BY id DESC',
);
```

ポイントを説明する。

<!-- 以降の見出しはレクチャーの裁量。必要なら「コラム」「次の章へ」などを続ける。 -->
