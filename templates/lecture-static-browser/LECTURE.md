---
docs: true
title: __LECTURE_TITLE__
---

# __LECTURE_NUMBER__ __LECTURE_TITLE__

![__LECTURE_TITLE__](./images/00-thumbnail.svg)

（この節で何を作るかを 2〜3 文で。前の節の到達点からの差分として書く。
TODO や「学ぶこと」の箇条書きは書かない。）

> **今回さわる `game/`:** `main.js` を書き換え

<!--
  素材（画像・音）を配る節では、`example/assets/` に実ファイルを置いて次を書く。
  build-downloads.mjs が `<sec>-<lec>-assets.zip` を作り、ボタンと中身の一覧が出る。

  ::assets[素材をダウンロード]
-->

## （見出し）

（何をするかを 1〜2 文 → コード → 各行の説明、の順。コードは差分だけ載せる。）

**書く場所:** `main.js` → （どの関数のどのあたりか）

```js
// ここに差分のコード
```

- `（コード片）` … （何をしているか）

<!--
  解説用の小さなデモを埋め込むときは `demos/<name>/index.html` を置いて次を書く。
  1 ページに何個でも置ける。ZIP 配布の対象にはならない。

  ::preview[キャプション]{demo="<name>" height="320"}
-->

## 動かす

`index.html` をブラウザで開いて、（何が見えれば成功か）を確認します。

画像や音を使う節は `file://` だと読み込みに失敗します。Live Server か
`python3 -m http.server 8000` のような簡易サーバーで開いてください。

::preview[このステップの完成イメージ（実際に触って動かせます）]

::codeview{defaultFile="main.js"}
