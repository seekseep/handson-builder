---
docs: true
title: 基本的な知識
---

# 基本的な知識

この教材で使う書き方を、テーマごとに短くまとめました。最初にざっと目を通して「こういう書き方があるんだな」と頭に入れておき、作業中に「どう書くんだっけ」と思ったら戻ってきて早見表として使ってください。

コードは、画面右上のナビゲーションバーで選んでいる環境（Excel（VBA）／スプレッドシート（GAS））のものが表示されます。考え方は同じで、書き方が違うだけです。もう一方の書き方も見比べたいときは、ナビゲーションバーで切り替えてください。

## 言語の決まり

VBA と GAS という言語そのものの書き方です。Excel やスプレッドシートを操作しないプログラムでも同じように使います。

### マクロの形

マクロは「名前の付いた手順のかたまり」です。はじまりと終わりの間に、上から順に実行したい命令を書きます。

:::::platform
::::excel
```vb
' アポストロフィから行末まではコメント（実行されない）
Sub Hello()
    MsgBox "こんにちは"
End Sub
```

VBE の標準モジュールに書き、`Sub` の中にカーソルを置いて `F5` で実行します。
::::
::::sheets
```js
// スラッシュ 2 つから行末まではコメント（実行されない）
function hello() {
  SpreadsheetApp.getUi().alert('こんにちは');
}
```

Apps Script エディタに書き、関数を選んで「実行」を押します。GAS は大文字と小文字を区別します（`hello` と `Hello` は別物）。
::::
:::::

### 変数

変数は値を入れておく箱です。名前を付けておくと、何度も使えて読みやすくなります。

:::::platform
::::excel
```vb
Dim price As Long              ' 整数を入れる箱
Dim customerName As String     ' 文字列を入れる箱
Dim total As Long              ' 整数を入れる箱

price = 1200                   ' 入れる
customerName = "ひまわり商事"  ' 入れる
total = 0                      ' 入れる
total = total + price          ' 入れ直す（中身を変える）
```

`Dim 名前 As 型` で箱を用意してから、`=` で値を入れます。型は `Long`（整数）・`String`（文字列）・`Double`（小数）・`Date`（日付）などです。`Option Explicit` を先頭に書いておくと、`Dim` していない名前（打ち間違い）を実行前に教えてくれます。
::::
::::sheets
```js
const price = 1200;                  // 箱を用意して入れる（あとで変えない）
const customerName = 'ひまわり商事'; // 箱を用意して入れる（あとで変えない）
let total = 0;                       // 箱を用意して入れる（あとで変える）

total = total + price;               // 入れ直す（中身を変える）
```

型は書かず、箱を用意すると同時に値を入れます。あとで中身を変える変数は `let`、変えない変数は `const` で作ります（`const` の変数に入れ直そうとするとエラーになります）。
::::
:::::

### 文字列と計算

:::::platform
::::excel
```vb
message = "請求書_" & customerName   ' 文字列をつなぐのは &
taxIncluded = Int(price * 1.1)        ' + - * / で計算、Int で切り捨て
```

文字列は `"` で囲みます。
::::
::::sheets
```js
const message = '請求書_' + customerName;     // 文字列をつなぐのは +
const taxIncluded = Math.floor(price * 1.1);  // + - * / で計算、Math.floor で切り捨て
```

文字列は `'` で囲みます。
::::
:::::

### 条件で分ける

条件が成り立つときだけ実行します。成り立たないときの処理も書けます。

:::::platform
::::excel
```vb
If Cells(i, 6).Value >= 5000 Then
    Cells(i, 7).Value = "大口"
Else
    Cells(i, 7).Value = "通常"
End If
```

比べる記号: `=`（等しい）`<>`（等しくない）`>` `>=` `<` `<=`。`If` の中の `=` は「等しいか」の意味になります。
::::
::::sheets
```js
if (sheet.getRange(i, 6).getValue() >= 5000) {
  sheet.getRange(i, 7).setValue('大口');
} else {
  sheet.getRange(i, 7).setValue('通常');
}
```

比べる記号: `===`（等しい）`!==`（等しくない）`>` `>=` `<` `<=`。`=` 1 つは「入れる」なので、比べるときは `===` を使います。
::::
:::::

### くり返す

同じ処理を行の数だけくり返します。番号で回す書き方と、全部について回す書き方があります。

:::::platform
::::excel
```vb
' 番号で回す: i が 2, 3, …, lastRow
For i = 2 To lastRow
    total = total + Cells(i, 6).Value
Next i

' 全部について回す: シートを 1 枚ずつ ws に入れる
For Each ws In Worksheets
    Debug.Print ws.Name
Next ws
```
::::
::::sheets
```js
// 番号で回す: i が 2, 3, …, lastRow
for (let i = 2; i <= lastRow; i++) {
  total = total + sheet.getRange(i, 6).getValue();
}

// 全部について回す: シートを 1 枚ずつ s に入れる
for (const s of ss.getSheets()) {
  console.log(s.getName());
}
```
::::
:::::

### 別のマクロを呼ぶ

よく使う手順は別のマクロにしておき、名前を書いて呼び出せます。

:::::platform
::::excel
```vb
Sub CreateInvoices()
    DeleteInvoices        ' ここで DeleteInvoices が実行される
    ' …
End Sub
```
::::
::::sheets
```js
function createInvoices() {
  deleteInvoices();       // ここで deleteInvoices が実行される
  // …
}
```
::::
:::::

## Excel とスプレッドシートの操作

ブック・シート・セルといった Excel ／スプレッドシートの部品の扱い方と、マクロを動かすための道具です。どの環境で動かすかによって書き方が決まります。

### セルを読み書きする

セルは「番地」か「行と列の番号」で指します。B2 は 2 行目の 2 列目です。

:::::platform
::::excel
```vb
Range("B2").Value = 100            ' 書く（番地で指す）
Cells(2, 2).Value = 100            ' 書く（行, 列の番号で指す）
price = Range("B2").Value          ' 読む
```

シートを書かないと、いま開いているシートが対象になります。
::::
::::sheets
```js
const sheet = SpreadsheetApp.getActiveSheet();
sheet.getRange('B2').setValue(100);           // 書く（番地で指す）
sheet.getRange(2, 2).setValue(100);           // 書く（行, 列の番号で指す）
const price = sheet.getRange('B2').getValue(); // 読む
```

GAS は必ずシートを取ってからセルを指します。
::::
:::::

### シートを指す

ブックの中のシートを名前で指します。何度も使うシートは変数に入れておきます。

:::::platform
::::excel
```vb
Dim salesSheet As Worksheet
Set salesSheet = Worksheets("売上")   ' オブジェクトを入れるときは Set

salesSheet.Range("A1").Value = "日付"
```

このマクロが入っているブックは `ThisWorkbook` です。`Worksheets("売上")` は `ThisWorkbook.Worksheets("売上")` を短く書いたものです。

シートやセルのような **オブジェクト** を変数に入れるときだけ、先頭に `Set` を付けます。
::::
::::sheets
```js
const ss = SpreadsheetApp.getActiveSpreadsheet(); // このスプレッドシート
const salesSheet = ss.getSheetByName('売上');     // Set は付けない

salesSheet.getRange('A1').setValue('日付');
```

このスクリプトが紐づいているスプレッドシートは `SpreadsheetApp.getActiveSpreadsheet()` です。GAS では、まずこれを取ってからシートを指します。
::::
:::::

### データのある最後の行

明細の行数は月によって変わるので、最後の行を数えて使います。

:::::platform
::::excel
```vb
lastRow = Cells(Rows.Count, 1).End(xlUp).Row
```

A 列のいちばん下から `Ctrl` + `↑` で上に飛んだ先の行番号です。
::::
::::sheets
```js
const lastRow = sheet.getLastRow();
```
::::
:::::

### シートを作る・コピーする・消す

関数ではできない、VBA ならではの操作です。

:::::platform
::::excel
```vb
Set newSheet = Worksheets.Add(After:=Worksheets(Worksheets.Count)) ' 末尾に追加
newSheet.Name = "メモ"                                              ' 名前を付ける

Worksheets("請求書テンプレート").Copy After:=Worksheets(Worksheets.Count) ' 末尾にコピー

Application.DisplayAlerts = False   ' 「削除しますか？」を出さない
Worksheets("メモ").Delete
Application.DisplayAlerts = True
```
::::
::::sheets
```js
const newSheet = ss.insertSheet('メモ');                       // 追加して名前を付ける
const copied = ss.getSheetByName('請求書テンプレート').copyTo(ss); // 末尾にコピー
ss.deleteSheet(ss.getSheetByName('メモ'));                     // 消す
```
::::
:::::

### 書式

色・太字・罫線もコードで付けられます。

:::::platform
::::excel
```vb
Range("A1:F1").Interior.Color = RGB(31, 78, 121)    ' 背景色
Range("A1:F1").Font.Color = RGB(255, 255, 255)      ' 文字色
Range("F2").Font.Bold = True                        ' 太字
Range("A1:F31").Borders.LineStyle = xlContinuous    ' 罫線
```

`RGB(赤, 緑, 青)` で色を 0〜255 の 3 つの数で表します。
::::
::::sheets
```js
sheet.getRange('A1:F1').setBackground('#1f4e79');  // 背景色
sheet.getRange('A1:F1').setFontColor('#ffffff');   // 文字色
sheet.getRange('F2').setFontWeight('bold');        // 太字
sheet.getRange('A1:F31').setBorder(true, true, true, true, true, true); // 罫線
```

色は `#` に続く 6 桁（赤・緑・青を 2 桁ずつ）で表します。
::::
:::::

### メッセージとログ

画面に知らせるのがメッセージ、作業中の確認用に書き出すのがログです。

:::::platform
::::excel
```vb
MsgBox "完了しました"        ' 小窓を出す
Debug.Print i, total         ' イミディエイト ウィンドウ（Ctrl + G）に書き出す
```
::::
::::sheets
```js
SpreadsheetApp.getUi().alert('完了しました'); // 小窓を出す
console.log(i, total);                        // 実行ログに書き出す
```
::::
:::::

### ファイルを保存する

:::::platform
::::excel
```vb
folder = ThisWorkbook.Path                              ' このブックのフォルダ
ThisWorkbook.SaveCopyAs folder & Application.PathSeparator & "バックアップ.xlsm"
ws.ExportAsFixedFormat Type:=xlTypePDF, Filename:=folder & Application.PathSeparator & "請求書.pdf"
```

`Application.PathSeparator` はフォルダの区切り文字（Windows は `\`、Mac は `/`）です。
::::
::::sheets
```js
const file = DriveApp.getFileById(ss.getId());
file.makeCopy('バックアップ');               // ドライブにコピーを作る
const folder = file.getParents().next();    // このスプレッドシートのフォルダ
```

シートを PDF にする専用の命令はありません。`UrlFetchApp` でスプレッドシートの「ダウンロード → PDF」と同じ URL（`export?format=pdf&gid=...`）を呼び、`DriveApp` に保存します。
::::
:::::

### ボタン・開いたときに動かす

利用者の操作（ボタンを押す、ファイルを開く）をきっかけにマクロを動かせます。

:::::platform
::::excel
- **ボタン:** 「開発」→「挿入」→ フォーム コントロールの「ボタン」を置き、「マクロの登録」でマクロを選ぶ
- **開いたとき:** VBE の `ThisWorkbook` に `Private Sub Workbook_Open()` 〜 `End Sub` を書く
::::
::::sheets
- **ボタン:** 「挿入」→「図形描画」で図形を作り、︙ →「スクリプトを割り当て」に関数名を書く
- **開いたとき:** `function onOpen() { }` という名前の関数を書く（メニューを足すのによく使う）
::::
:::::
