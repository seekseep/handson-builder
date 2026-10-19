---
docs: true
title: 開発ツール（VSCode / ブラウザ）
sidebar:
  label: 開発ツール
  order: 3
---

# 開発ツール（VSCode / ブラウザ）

ハンズオンを進めるうえで使うエディタとブラウザについてまとめます。

## VSCode

エディタには [Visual Studio Code](https://code.visualstudio.com/) を推奨します。コード編集と同じ
ウィンドウ内でターミナルを使えるので、起動コマンドの実行とソース閲覧を素早く切り替えられます。

### インストール方法

公式サイトからインストーラーをダウンロードするか、Homebrew でインストールします。

```bash
# macOS（Homebrew を使う場合）
brew install --cask visual-studio-code
```

### プロジェクトを開く

このリポジトリのルートで以下を実行するか、VSCode の **File → Open Folder** からリポジトリのフォルダを
開きます。

```bash
code .
```

### ターミナルを開く

`Ctrl + ` （バッククォート）でエディタ内にターミナルが開きます。ここで `cd sections/...` して各
レクチャーを起動します。

## ブラウザの開発者ツール

アプリの挙動を確認するときは、ブラウザの開発者ツール（DevTools）を使います。Chrome / Edge / Firefox
いずれでも `F12` または右クリック →「検証」で開けます。

- **Network タブ** — リクエスト / レスポンスの中身、ステータスコード、所要時間を確認できます
- **Console タブ** — エラーやログを確認できます
- **Application タブ**（Chrome）— Cookie や Storage の中身を確認・編集できます
