---
docs: true
title: スプレッドシートの準備
---

# スプレッドシートの準備

Google スプレッドシートでは、VBA の代わりに **Google Apps Script（GAS）** でマクロを書きます。言語は JavaScript ですが、この教材では VBA と同じ考え方で書けるところだけを使います。

## 必要なもの

- Google アカウント（個人の Gmail アカウントがおすすめ）
- ブラウザ（Chrome / Edge / Safari など）

会社や学校の Google アカウントでは、管理者の設定で Apps Script の実行や承認が止められていることがあります。動かないときは個人のアカウントで試してください。

## 練習用ブックをスプレッドシートにする

ハンズオンの節では、Excel 形式の練習用ブック（`.xlsx`）を配っています。スプレッドシートで使うには変換が必要です。

1. ZIP を展開し、`data/` の中の `.xlsx` を Google ドライブにアップロードする
2. アップロードしたファイルをダブルクリックして開く
3. 「ファイル」→ **Google スプレッドシートとして保存** を押す

:::warning[.xlsx のままでは Apps Script が使えません]
ファイル名の横に「.XLSX」と表示されている間は、Excel 形式のまま開いている状態です。「拡張機能」メニューに Apps Script が出ないので、必ず変換してから使ってください。
:::

詳しくは Google の公式ドキュメントも参照してください。

- [Google ドライブにファイルやフォルダをアップロードする（Google ドライブ ヘルプ）](https://support.google.com/drive/answer/2424368?hl=ja)
- [Office ファイルの使用（Google ドキュメント エディタ ヘルプ）](https://support.google.com/docs/answer/6055139?hl=ja)

## Apps Script エディタを開く

スプレッドシートのメニューで「拡張機能」→ **Apps Script** を押すと、新しいタブでエディタが開きます。このスクリプトはいま開いているスプレッドシートに紐づいていて、そのシートを読み書きできます。

エディタには `コード.gs` というファイルがあり、`function myFunction() { }` が入っています。これを消して、教材のコードを貼り付けます。

- [Google Apps Script の概要（Google for Developers）](https://developers.google.com/apps-script/overview?hl=ja)
- [コンテナにバインドされたスクリプト（Google for Developers）](https://developers.google.com/apps-script/guides/bound?hl=ja) … スプレッドシートに紐づいたスクリプトの仕組み

## 初回の承認

スプレッドシートを読み書きするスクリプトを初めて実行すると、「承認が必要です」と表示されます。

1. **権限を確認** を押し、自分のアカウントを選ぶ
2. 「このアプリは Google で確認されていません」と出たら、左下の **詳細** →「（プロジェクト名）（安全ではないページ）に移動」を押す
3. 求められている権限を確認して **許可** を押す

警告が出るのは、Google の審査を受けていない（＝自分で書いた）スクリプトだからです。自分で書いたコードなら許可して問題ありませんが、**人からもらったスクリプトを同じ手順で許可するのは危険** です。許可した権限で、ドライブのファイルを読んだりメールを送ったりできてしまいます。

- [Google サービスの承認（Google for Developers）](https://developers.google.com/apps-script/guides/services/authorization?hl=ja)
- [Unverified apps（Google Cloud ヘルプ）](https://support.google.com/cloud/answer/7454865?hl=ja) … 「このアプリは Google で確認されていません」が出る理由

## Excel と違うところ

- **コードはクラウドで動く** — 実行のたびに Google のサーバーとやり取りするので、セルを 1 つずつ読み書きすると Excel より遅くなります。教材の分量なら問題ありません
- **実行時間に上限がある** — 1 回の実行は 6 分まで
- **履歴から戻せる** — スクリプトでの変更も「ファイル」→「変更履歴」から前の状態に戻せます（Excel では、VBA で行った変更は `Ctrl` + `Z` で戻せません。試す前に保存しておきましょう）

Google の公式ドキュメント:

- [Google サービスの割り当て（Google for Developers）](https://developers.google.com/apps-script/guides/services/quotas?hl=ja) … 実行時間の上限（6 分 / 実行）など
- [ファイルの変更内容を確認する（Google ドキュメント エディタ ヘルプ）](https://support.google.com/docs/answer/190843?hl=ja) … 変更履歴から前の状態に戻す

VBA と GAS の書き方の違いは [基本的な知識](../03-basics/LECTURE.md) で見比べられます。
