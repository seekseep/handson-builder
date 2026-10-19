---
docs: true
title: ホストマシン（Node.js）で動かす
sidebar:
  label: ホストマシン
  order: 2
---

# ホストマシン（Node.js）で動かす

ホスト OS に直接 Node.js（と、DB を使うレクチャーでは PostgreSQL）をインストールして起動するパターン
です。Docker を使わない場合に選びます。

## インストール

### インストール済みかの確認

```bash
node --version
npm --version
```

Node.js は **v22 以上（LTS）** を推奨します。

### Node.js のインストール

**macOS（Homebrew を使う場合）**

```bash
brew install node
```

**バージョン管理ツールを使う場合（推奨）**

複数の Node.js バージョンを切り替えたい場合は [Volta](https://volta.sh/) や
[nvm](https://github.com/nvm-sh/nvm) が便利です。

```bash
# Volta の例
curl https://get.volta.sh | bash
volta install node@22
```

**公式インストーラー（Windows / macOS）**

[nodejs.org](https://nodejs.org/) から LTS 版をダウンロードしてインストールしてください。

### PostgreSQL のインストール（DB を使うレクチャーのみ）

Docker を使わずにローカルで動かす場合は PostgreSQL も必要です。手軽なのは
[Postgres.app](https://postgresapp.com/)（macOS）や Homebrew です。

```bash
# macOS（Homebrew）
brew install postgresql@17
brew services start postgresql@17
createdb app
```

接続情報をレクチャーの `.env` に書きます（`.env.example` をコピーして編集）。

```bash
cp .env.example .env
# DATABASE_URL=postgres://localhost:5432/app など
```

## 起動方法

レクチャーのディレクトリに移動してから実行します。起動後はブラウザで <http://localhost:3000> を
開いてください。

### アプリケーションの起動

```bash
npm install
npm run dev             # 開発サーバー起動（ファイル変更で自動再起動）
```

止めるときは `Ctrl+C` で停止します。

### データベースのセットアップ（DB を使うレクチャーのみ）

```bash
npm run database:init   # テーブル作成
npm run database:seed   # 初期データ投入
npm run database:reset  # 全消し → シード再投入
```
