---
docs: true
title: Excel の準備
---

# Excel の準備

VBA を書いて動かすまでの準備です。勉強会の前に一度通しておくと、当日すぐに手を動かせます。

## 使える Excel

| 環境 | VBA | 補足 |
|---|---|---|
| Windows の Excel（Microsoft 365 / 2021 / 2019） | ◯ | 教材はこれを前提に書いています |
| Mac の Excel（Microsoft 365） | ◯ | ショートカットと PDF の保存先が少し違います |
| Excel for the web（ブラウザ版） | ✕ | VBA は動きません。[スプレッドシート](../02-sheets/LECTURE.md) で参加してください |
| iPad / スマートフォンの Excel | ✕ | 同上 |

会社の PC では、情報システム部門の方針でマクロが禁止されていることがあります。その場合は無理に設定を変えず、個人の PC かスプレッドシートで参加してください。

## 開発タブを表示する

VBA の入口は「開発」タブです。初期状態では隠れています。

**Windows:** 「ファイル」→「オプション」→「リボンのユーザー設定」で、右側の一覧の **開発** にチェックを入れて「OK」。

**Mac:** メニューバーの「Excel」→「環境設定」→「リボンとツールバー」で、**開発** にチェックを入れて「保存」。

リボンに「開発」タブが出れば完了です。

詳しい手順は Microsoft の公式ドキュメントにもあります。

- [[開発] タブを表示する（Microsoft サポート）](https://support.microsoft.com/ja-jp/office/開発タブを表示する-e1192344-5e56-4d45-931b-e5fd9bea2d45)
- [Office VBA の基礎知識 ― [開発] タブを有効にするには（Microsoft Learn）](https://learn.microsoft.com/ja-jp/office/vba/library-reference/concepts/getting-started-with-vba-in-office#開発-タブを有効にするには)

## Visual Basic Editor（VBE）を開く

VBA を書く専用の画面です。

- 「開発」タブ →「Visual Basic」
- ショートカット: Windows は `Alt` + `F11`、Mac は `Option` + `F11`（`fn` が必要な機種もあります）

VBE が開いたら、「挿入」→「標準モジュール」で、コードを書く白い画面（モジュール）を作ります。左の「プロジェクト」欄に `Module1` が増えていれば成功です。

- [Office VBA の基礎知識 ― マクロと Visual Basic Editor（Microsoft Learn）](https://learn.microsoft.com/ja-jp/office/vba/library-reference/concepts/getting-started-with-vba-in-office#マクロと-visual-basic-editor)
- [Excel のキーボード ショートカット（Microsoft サポート）](https://support.microsoft.com/ja-jp/office/excel-のキーボード-ショートカット-1798d9d5-842a-42b8-9c99-9b7213f0040f) … `Alt` + `F11` で VBA エディターが開くことが載っています

### 変数の宣言を強制する（おすすめ）

VBE の「ツール」→「オプション」→「編集」タブで、**変数の宣言を強制する** にチェックを入れます。新しいモジュールの先頭に `Option Explicit` が自動で入り、変数名の打ち間違いを実行前に教えてくれるようになります。

## マクロ有効ブック（.xlsm）で保存する

VBA を書いたブックは、「名前を付けて保存」で **Excel マクロ有効ブック（\*.xlsm）** を選んで保存します。

:::warning[.xlsx で保存するとコードが消えます]
いつもの `.xlsx` 形式はマクロを保存できません。「VBプロジェクトを含まないブックとして保存しますか？」と聞かれたら「いいえ」を押し、形式を `.xlsm` に変えて保存し直してください。
:::

## マクロのセキュリティ

マクロ付きのブックを開くと、上部に「セキュリティの警告 マクロが無効にされました」と黄色いバーが出ます。**自分で書いたブックだと分かっているときだけ**「コンテンツの有効化」を押してください。

「すべてのマクロを有効にする」に設定を変える必要はありません。マクロはファイルの削除や外部への送信もできるので、出所の分からないブックのマクロは有効にしないのが原則です。

- [Microsoft 365 ファイルでマクロを有効または無効にする（Microsoft サポート）](https://support.microsoft.com/ja-jp/office/12b036fd-d140-4e74-b45e-16fed1a7e5c6) … 「セキュリティの警告」と「コンテンツの有効化」

:::notice[赤いバーで「マクロの実行がブロックされました」と出たら]
インターネットからダウンロードしたファイルは、Windows が「危険かもしれない」という印を付けます。この教材の練習用ブックはマクロを含まない `.xlsx` なので通常は問題になりませんが、もし赤いバーが出たら、ダウンロードした ZIP を右クリック →「プロパティ」→ **許可する** にチェックを入れてから展開し直してください。

[潜在的に危険なマクロがブロックされました（Microsoft サポート）](https://support.microsoft.com/ja-jp/topic/0952faa0-37e7-4316-b61d-5b5ed6024216)
:::
