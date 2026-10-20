---
docs: true
title: __LECTURE_TITLE__
---

# __LECTURE_TITLE__

![__LECTURE_TITLE__](./images/00-thumbnail.svg)

（この節で何をするかを 2〜3 文で。前の節からの続きなら「N-M の続きです」と書く。
TODO や「学ぶこと」の箇条書きは書かない。）

:::download
[練習用ブックと完成コードをダウンロード](./project.zip)
:::

## 準備

<!--
  練習用ブックを初めて配る節では、ここで ZIP の中身（data/ と vba/ または gas/）、
  練習用ブックをマクロなしの .xlsx で配る理由、完成コードの入れ方（コピーして貼る／
  VBE の「ファイルのインポート」）を説明する。準備の章（00-setup/）には書かない。
-->

<!--
  Excel とスプレッドシートで手順が分かれるところだけを :::::platform で囲む。
  外側ほどコロンを多くする（:::::platform > ::::excel / ::::sheets > :::code / :::warning）。
  片方だけでもよい（Excel にしか無い操作は ::::excel だけ）。
-->

:::::platform
::::excel
1. `data/sample.xlsx` を Excel で開き、**Excel マクロ有効ブック（\*.xlsm）** として保存する
2. `Alt` + `F11` で VBE を開き、「挿入」→「標準モジュール」
::::
::::sheets
1. `data/sample.xlsx` を Google ドライブにアップロードして開き、「ファイル」→「Google スプレッドシートとして保存」
2. 「拡張機能」→「Apps Script」
::::
:::::

## （見出し）

（何をするかを 1〜2 文 → コード → 各行の説明、の順。コードは差分だけ載せる。）

<!--
  コードとシートを並べて見せるとき（表示するコードは、ナビゲーションバーで選んだ環境に合わせて
  VBA ／ GAS が切り替わる）:

  ::sheetcode{book="data/sample.xlsx" sheet="シート1" code="Sample" macro="CalcAmounts"}
-->

:::::platform
::::excel
```vb
Sub CalcAmounts()
    ' ...
End Sub
```
::::
::::sheets
```js
function calcAmounts() {
  // ...
}
```
::::
:::::

## 動かしてみる

（完成したマクロを実行すると何が起きるかを 1〜2 文。最後に「ブラウザ上で再現したデモで試してみましょう」。）

:::::platform
::::excel
「開発」タブの「マクロ」を押し、一覧から `CalcAmounts` を選んで「実行」を押します。
::::
::::sheets
Apps Script エディタの関数の選択欄で `calcAmounts` を選び、「▶ 実行」を押します。
::::
:::::

<!--
  各節に ::::sheetdemo を 1 つ以上置き、その節のマクロを動かしたときの様子を見せる（コードは動かさない）。
  range は書かず、シート全体を描くのを基本にする。macro を付けると、Excel は「マクロ」の一覧から、
  GAS は関数の選択欄から実行する実際の操作をなぞる（一覧に並べる名前は macros="A,B"）。
  中に書けるもの（詳しくは references/conventions.md の「本文センチネル」）:
    範囲 = 値, …            実行後の値（左上から行の順に埋める）
    before 範囲 = 値, …     実行前の値（ブックの中身の代わりに描く）
    シート名!A5 = 値         選んでいるシート以外（実行で増えるシートを含む）の中身
    tabs = 名前, …          実行で増えるシート。`新しいシート <- 元のシート` で元をコピーした中身にする
    msgbox = 文言           MsgBox ／ alert 風の小窓（GAS だけ変えるなら msgbox.sheets = 文言）
    log = 文言              イミディエイト ウィンドウ ／ 実行ログ（GAS だけ変えるなら log.sheets = 文言）
  book を省略すると空白のブックを描く（そのときだけ range="A1:E6" のように範囲を書く）:

  ::::sheetdemo[Hello を実行すると、メッセージの小窓が出る]{range="A1:E6" macro="Hello"}
  msgbox = こんにちは、VBA！
  msgbox.sheets = こんにちは、Apps Script！
  ::::
-->

::::sheetdemo[CalcAmounts を実行すると、C 列に金額が入る]{book="data/sample.xlsx" sheet="シート1" macro="CalcAmounts"}
C2:C6 = 600, 900, 1250, 2200, 680
::::

::codeview[この節の完成コード]{defaultFile="vba/Sample.bas"}

<!--
  節の一番最後に「よくある質問」を置く。見出しが質問、次の見出しまでが答え。
  受講者がつまずきやすいところ（エラー、思った結果にならない、関数でもできないか、など）を 3〜4 個。
-->

:::faq

### （受講者がつまずきやすいところを質問の形で）

（答え。原因と、どうすればよいか。）

:::
