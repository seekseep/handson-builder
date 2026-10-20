---
name: handson-builder
description: 勉強会・ハンズオン教材リポジトリをゼロから組み立てるスキル。sections/ に「動かせるサンプルアプリ + 説明マークダウン」を、site/ にそれらを取り込んだ @astrojs/starlight サイトを作り、GitHub Actions で GitHub Pages にデプロイするところまでを一気通貫で用意する。サンプルアプリのスタックは4択（Cloudflare 系: Pages/Workers/D1/R2 + wrangler、Docker なし ／ Docker + Hono + PostgreSQL 生SQL ／ 静的ブラウザアプリ: CDN 読み込みでビルドなし ／ Office マクロ系: Excel VBA を主に Google スプレッドシートの Apps Script を併記、練習用 .xlsx を配布）から選べる。各レクチャーは ZIP で配布でき、素材だけの ZIP も出せる。本文には完成コードの簡易エディタ（::codeview）と、その場で遊べるライブプレビュー（::preview）を埋め込める。Office マクロ系では、ナビゲーションバーで Excel ／ スプレッドシートを切り替えて手順とコードを出し分ける仕組み（:::::platform）と、練習用ブックを描いた表計算のデモ（::sheetcode / ::::sheetdemo）も使える。図は genfig で作る。「○○の勉強会教材を作って」「ハンズオンリポジトリを作りたい」「セクション＋レクチャー形式の教材を scaffold して」「VBA（Excel マクロ）のハンズオンを作って」のような依頼で発火。seekseep/cloudflare-introduction-handson と seekseep/slingshot-game-handson の構成を雛形にしている。
---

# handson-builder

勉強会・ハンズオン教材を「セクション + レクチャー」の 2 階層で組み立て、動くサンプルと
Starlight 製の解説サイト、GitHub Pages への自動デプロイまでを揃えるスキル。

雛形は 2 つ。
[seekseep/cloudflare-introduction-handson](https://github.com/seekseep/cloudflare-introduction-handson)
から「構造・同期の仕組み・ZIP 配布・図・Pages 運用」を、
[seekseep/slingshot-game-handson](https://github.com/seekseep/slingshot-game-handson)
から「完成コードの簡易エディタ（`::codeview`）・ライブプレビュー（`::preview`）・素材 ZIP（`::assets`）・
解説用デモ（`demos/`）」を取り込み、再利用可能な形にまとめたもの。

## 成果物の全体像

```
<repo>/
├── README.md                  # リポジトリ全体の説明（frontmatter に docs: true）
├── .claude/AGENTS.md          # プロジェクト方針（教材を増やすときの規約）
├── .gitignore
├── .github/workflows/
│   └── deploy-docs.yml        # GitHub Pages へのビルド & デプロイ
├── sections/                  # 教材本体
│   ├── README.md              # セクション/レクチャー一覧（docs: true → /getting-started/）
│   ├── TOOLS.md               # セットアップ: 開発ツール（docs: true）
│   ├── DOCKER.md / HOST.md    # セットアップ（Docker+Postgres 系のときだけ残す）
│   └── <NN-section>/          # セクション（例: 01-basics/）。README は置かない（レクチャーだけを並べる）
│       └── <NN-lecture>/      # レクチャー = 1 つの動くサンプル
│           ├── package.json   # project 方式（Cloudflare 系 / Docker+Postgres 系）のとき
│           ├── README.md      # プロジェクト説明（起動方法・構成）
│           ├── LECTURE.md     # 教材本文（docs: true → サイトに載る）
│           ├── images/        # 説明図の SVG（00-thumbnail.svg を先頭サムネに / genfig で作る）
│           ├── example/       # example 方式（静的ブラウザアプリ）のときの動くコード
│           │   └── assets/    # この節で配る素材（あれば素材だけの ZIP も出る）
│           ├── demos/         # 解説用の小さなデモ（任意・複数可。ZIP には入らない）
│           └── ...            # アプリ本体（project 方式のとき）
└── site/                      # @astrojs/starlight の解説サイト（pnpm）
    ├── package.json
    ├── pnpm-workspace.yaml        # allowBuilds: esbuild の postinstall を許可
    ├── astro.config.mjs
    ├── tsconfig.json
    ├── .gitignore
    ├── public/downloads/           # 生成物: 配布 ZIP と素材 ZIP（gitignore）
    ├── public/preview/             # 生成物: ライブプレビューの実体（gitignore）
    ├── src/content.config.ts
    ├── src/integrations/lecture-sync.mjs  # dev 中に sections を監視して再生成（HMR）
    ├── src/plugins/                # remark: callout / download / questions / editor / script / code
    │                               #   ＋ ec-line-numbers（Expressive Code に行番号を足す）
    ├── src/styles/                 # customCss 7枚（可読性 / 外部リンク / callout / quiz / download /
    │                               #   editor / code）
    ├── src/scripts/                # client: quiz / editor / preview / run-scripts（全ページに inline 注入）
    └── scripts/
        ├── sync-lectures.mjs       # sections の docs:true マークダウンを取り込む
        │                           #   併せて ::codeview / ::preview / ::assets を実ファイルから展開
        ├── build-downloads.mjs     # ZIP 化 → public/downloads/（example 方式・project 方式の両対応）
        ├── build-previews.mjs      # example/ と demos/ を public/preview/ にコピー
        └── libs/                   # paths / astro-config / frontmatter / markdown / links / naming /
                                    #   git / fs-walk / sentinels
```

## 中心となる考え方

1. **単一の情報源は `sections/`**。教材の文章はレクチャーの隣（`LECTURE.md`）に書く。
   サイト（`site/`）はそれを **コピーして生成** するだけで、二重管理しない。
2. **`docs: true` フラグで公開対象を選ぶ**。frontmatter に `docs: true` を持つマークダウンだけが
   `site/scripts/sync-lectures.mjs` に拾われ、Starlight のページになる。
3. **レクチャー = 1 つの動くサンプル**。`cd` して起動すれば動く（Cloudflare 系は `wrangler dev`、
   Docker+Postgres 系は `docker compose watch`、静的ブラウザアプリは `example/index.html` を開くだけ）。
   動かす → コードを読む、という流れを各レクチャーで回す。
4. **サンプルは ZIP で配布する**。`build-downloads.mjs` が `<sec>-<lec>.zip` を作る。
   `package.json` 方式は git 管理ファイルだけを、`example/` 方式は `example/` 配下すべてを ZIP 化する。
   本文に `[...](./project.zip)` と書くと sync が実 URL に差し替える。
5. **本文からは実ファイルを参照する。コードを本文に二重に書かない**。`::codeview` は
   `example/` の実ファイルから完成例パネルを、`::preview` は同じ実ファイルから動くプレビューを
   組み立てる。教材本文とサンプルコードがズレない仕掛け。
6. **図は genfig で作る**。各レクチャーの `images/` に SVG で置き、`00-thumbnail.svg` を先頭サムネにする。
7. **作成時に最新のライブラリを採用する**。バージョンはテンプレに固定値を書かず、scaffold 時に
   `npm view <pkg> version` で最新を確認して入れる（後述）。

## いつ使うか

- 「○○（テーマ）の勉強会・ハンズオン教材リポジトリを作って」
- 「セクション + レクチャー形式で、Docker で動くサンプルと解説サイトを用意して」
- 「GitHub Pages に出る Starlight の教材サイト付きで scaffold して」

## いつ使わないか

- 単発のサンプルコード 1 つだけ欲しい → 普通に書く
- 既存の教材リポジトリにレクチャーを 1 つ足すだけ → このスキルの「レクチャーを追加する」節だけ参照
- 静的なスライド資料だけ作りたい → Starlight サイト構築の重さに見合わない

## 技術スタック（4 択）

サンプルアプリのスタックは次のどれかを **要件確認時に選ぶ**（後述の 0 節）。1 リポジトリ内では統一し、
混在させない。共通ルール（JS ESM・TS 不使用・レクチャーは npm・サイトは pnpm + Starlight）は
全部に適用する。

### Cloudflare 系（既定・雛形リポジトリと同じ）

- **Pages**（静的フロント）/ **Workers**（API・[Hono](https://hono.dev/)）/ **D1**（SQLite）/ **R2**
- **wrangler**（`wrangler dev` / `wrangler pages dev` で起動。**Docker は使わない**）
- 設定は **`wrangler.jsonc`**（`wrangler.toml` は使わない）。受講者コピー用の `wrangler.example.jsonc`
  だけ追跡し、実 `wrangler.jsonc` は `.gitignore`
- D1 は **ORM を使わず生 SQL**、値はプレースホルダ **`?`** でバインド
- シークレットは `wrangler secret put` / ローカルは `.dev.vars`（`.dev.vars`・`.wrangler/` は gitignore）
- テンプレ: `templates/lecture-cloudflare/`

### Docker + PostgreSQL 系

- **Hono**（`@hono/node-server` で起動）+ `hono/html` のタグ付きテンプレートリテラルで SSR
- **PostgreSQL**（Docker で立てる）。**ORM は使わず `pg` で生 SQL**、プレースホルダ **`$1`** でバインド
- **Docker / Docker Compose** で起動（`docker compose watch`）
- テンプレ: `templates/lecture-node-postgres/`

### 静的ブラウザアプリ系（ビルドなし）

ブラウザだけで動くもの（ゲーム、Canvas、可視化、DOM 操作など）が題材のとき。

- **ライブラリは CDN（cdnjs）から `<script>` で読む**。npm・bundler・パッケージ管理を使わない
  （`package.json` を置かない）。バージョンは scaffold 時に `npm view <pkg> version` で確認して固定する
- 動くコードは **`<lec>/example/`** に置く（`index.html` + `main.js` + 必要なら `assets/`）。
  `example/index.html` を開けば動く。素材を読む節は簡易サーバー経由（`file://` だと失敗する）
- **前の節の `example/` をコピーして差分を足す**。フォルダをまたぐ共有ファイルは作らない
- ES モジュールは使わず、複数の `<script defer>` を読み込み順で並べる
- 配布 ZIP のルートは常に `game/`。前の `game/` に上書き展開すればそのまま育つ
- 解説用の小さなデモは **`<lec>/demos/<name>/index.html`**（複数可・ZIP には入らない）
- テンプレ: `templates/lecture-static-browser/`

### Office マクロ系（Excel VBA ＋ Google Apps Script）

Excel のマクロ（VBA）が題材のとき。基本は Excel で書き、同じ課題を Google スプレッドシート
（Apps Script / GAS）でも進められるようにする。雛形は seekseep/excel-and-vba-handson。

- 動くコードは **`<lec>/example/`** に置く。`vba/*.bas`（VBA）・`gas/*.gs`（GAS）・`data/*.xlsx`
  （練習用ブック）。`package.json` は置かない。中身は **その節を終えた時点の完成コード** で、
  次の節は前の節の `example/` をコピーして差分を足す
- 練習用ブックは **マクロを含まない `.xlsx`** を `tools/build_workbooks.py`（openpyxl）で生成する。
  出所の分からないマクロ付きブックを開かせないため。`.xlsx` はスプレッドシートにもアップロードできる
- `.bas` は UTF-8 / LF で書き、**`Attribute VB_Name` 行を書かない**（本文からコピーして VBE に貼ると
  構文エラーになる）。ZIP 化のときに `build-downloads.mjs` が VB_Name を足し、CP932 ＋ CRLF に変換する
  （日本語版 VBE でインポートしても文字化けしない）
- 配布 ZIP のルートは `<lec>/`（節ごとに独立）
- 環境で手順やコードが分かれる箇所だけを **`:::::platform`** で囲み、中に `::::excel` / `::::sheets`
  を置く。外側ほどコロンを多くする（`:::::platform` > `::::excel` > `:::code` / `:::warning`）
- GAS は VBA と 1 対 1 で読み比べられる形にする（セルを 1 つずつ読み書きする）
- 環境の切り替えは **ナビゲーションバーの選択欄だけ**（`src/components/ThemeSelect.astro`）。本文のブロックには
  タブを出さず、選んでいる環境の中身だけを表示する。進め方のページ（`sections/README.md`）の冒頭に
  `::platform-choice` を置き、最初に環境を選んでもらう
- シートを見せたいときは **`::sheetcode`**（コードと練習用ブックのシートを左右に並べる）と
  **`::::sheetdemo`**（実行前のシートを描き、▶ 実行で結果の値に切り替える。コードは動かさない）。
  **各節に `::::sheetdemo` を 1 つ以上置く**。`macro` を付けると、Excel は「開発」→「マクロ」の一覧から、
  GAS は Apps Script エディタの関数の選択欄から実行する実際の操作をなぞる。書き方の一覧は
  `references/conventions.md` の「本文センチネル」
- 節は「手順 → 動かしてみる（実行手順 ＋ `::::sheetdemo`）→ `::codeview` → `:::faq`」の順で締める。
  よくある質問は生の `<details>` ではなく `:::faq` で書く
- 準備の章（`sections/00-setup/` の 01-excel / 02-sheets / 03-basics）と `tools/build_workbooks.py` は
  `templates/office/` にある
- テンプレ: `templates/lecture-office-macro/`

Web アプリ以外（CLI、データ処理など）が題材の場合も、「動く / sections に置く / LECTURE.md を書く /
docs: true で site に載る」という骨格は同じ。アプリ部分だけ題材に合わせて差し替える。

## 進め方

### 0. 要件を確認する

ユーザーに最低限これを確認してから scaffold する（埋まっていれば飛ばす）:

- **テーマ / タイトル**（例: 「PostgreSQL 入門ハンズオン」）と 1〜2 文の説明
- **GitHub のユーザー/Org 名とリポジトリ名**（`astro.config.mjs` の `site` / `base`、各種リンクに使う）
- **スタックの選択**（Cloudflare 系 / Docker + PostgreSQL 系 / 静的ブラウザアプリ系 / Office マクロ系。
  上記「技術スタック（4 択）」）
- **セクション / レクチャーの構成案**（最初は 1 セクション 1 レクチャーから始めてもよい）
- サンプルが **DB を使うか**（Cloudflare 系なら D1、Docker 系なら PostgreSQL。静的系は該当なし）

### 1. リポジトリ骨格を置く

`templates/repo/` を作業ディレクトリにコピーし、プレースホルダを置換する。
プレースホルダ一覧（テンプレ内の `__...__`）:

| プレースホルダ | 意味 | 例 |
|---|---|---|
| `__SITE_TITLE__` | サイト/リポジトリのタイトル | `PostgreSQL 入門ハンズオン` |
| `__SITE_DESC__` | 1 行説明 | `手を動かして学ぶ PostgreSQL` |
| `__GH_USER__` | GitHub ユーザー/Org | `seekseep` |
| `__REPO_NAME__` | リポジトリ名 | `postgres-handson-2026` |
| `__REPO_URL__` | リポジトリ URL | `https://github.com/seekseep/postgres-handson-2026` |

置換は全ファイル一括で行う（例, macOS の `sed -i ''`。Linux は `sed -i`）:

```bash
cd <repo>
grep -rl '__REPO_NAME__\|__GH_USER__\|__SITE_TITLE__\|__SITE_DESC__\|__REPO_URL__' . \
  | xargs sed -i '' \
    -e 's|__REPO_URL__|https://github.com/seekseep/postgres-handson-2026|g' \
    -e 's|__GH_USER__|seekseep|g' \
    -e 's|__REPO_NAME__|postgres-handson-2026|g' \
    -e 's|__SITE_TITLE__|PostgreSQL 入門ハンズオン|g' \
    -e 's|__SITE_DESC__|手を動かして学ぶ PostgreSQL|g'
```

`astro.config.mjs` の `site` は `https://__GH_USER__.github.io`、`base` は `/__REPO_NAME__` になる。
ユーザー独自ドメインや Org Pages の場合はここを調整する。`sync-lectures.mjs` / `build-downloads.mjs` は
`astro.config.mjs` から `base` と `repoUrl` 定数（テンプレで `__REPO_URL__`）を読む（libs/astro-config.mjs）
ので、リポジトリ URL は一箇所直せばよい。

「過去のハンズオン」のページ（`sections/PAST-HANDSON.md` → `/past-handson/`。サイドバーの一番下）には、
同じ作者の公開中のハンズオンを新しい順に並べる。トップページには、このページへのリンクだけを書く。GitHub Pages が有効な public リポジトリだけを載せ、題名はサイトの `<title>` か
README の見出しから取る（説明はリポジトリの description）。表示を確認できないサイトは載せない。

```bash
gh repo list <GH_USER> --limit 200 --visibility public --json name,description,pushedAt \
  --jq '.[] | select(.name | test("handson")) | [.pushedAt[:10], .name, .description] | @tsv' | sort -r
gh api repos/<GH_USER>/<name>/pages --jq .html_url   # 404 なら Pages 無し
```

Office マクロ系のときは、さらに `templates/office/sections/*` を `sections/` に、
`templates/office/tools/` をリポジトリ直下にコピーし、`sections/DOCKER.md` / `HOST.md` / `TOOLS.md`
を消す。`astro.config.mjs` の「セットアップ」は、進め方（`/getting-started/`）のあとに `{ autogenerate: { directory: '00-setup' } }` を置く。
`.gitignore` には Excel の一時ファイル `~$*` を足す。

> レクチャーのテンプレには `__LECTURE_TITLE__` `__LECTURE_SLUG__` `__LECTURE_NAME__` `__DB_NAME__`
> `__APP_NAME__` などレクチャー個別のプレースホルダもある。これらは 2 節でレクチャーを作るときに、
> そのレクチャー配下だけ置換する（リポジトリ全体の一括 sed では埋めない）。

### 2. レクチャーを 1 つ作る（テンプレからコピー）

選んだスタックのテンプレを `sections/<NN-section>/<NN-lecture>/` にコピーする:

- Cloudflare 系 → `templates/lecture-cloudflare/`
- Docker + PostgreSQL 系 → `templates/lecture-node-postgres/`
- 静的ブラウザアプリ系 → `templates/lecture-static-browser/`
- Office マクロ系 → `templates/lecture-office-macro/`（`__LECTURE_TITLE__` / `__LECTURE_NUMBER__` を置換。
  練習用ブックは `tools/build_workbooks.py` の `main()` にレクチャーを足して生成する）

ディレクトリ名は必ず `NN-` 始まり（`01-`, `02-` …）。この番号がサイドバーの並び順になる。

コピー後にやること:

1. `package.json` の `name` をレクチャー名にする（静的系は `package.json` を持たないので不要）
2. `README.md` / `LECTURE.md` を題材に合わせて書く（frontmatter の `docs: true` と `title` を維持。
   TODO/学ぶこと は書かない。冒頭に H1 → `images/00-thumbnail.svg` サムネ）
3. 図を [genfig](genfig) で作り `images/` に置く（`00-thumbnail.svg` ＋ 番号付き解説図）
4. アプリ本体をその回の題材に作り替える:
   - Cloudflare 系: `wrangler.example.jsonc` の `name` / `d1_databases` を調整（DB 不要なら D1 を削る）。
     実 `wrangler.jsonc` は受講者が各自コピーするので、リポジトリ側は `.gitignore` に追記
   - Docker 系: `docker-compose.yml` の `container_name` を `handson-<repo>-<sec>-<lec>` に。DB 不要なら
     `scripts/` と db 周りを削る
   - 静的系: 前の節の `example/` をコピーして差分だけ足す。CDN の `<script src>` のバージョンを確認する
5. サンプル配布:
   - project 方式: 本文に `:::download` ＋ `[...](./project.zip)` を置く（sync が実 URL に差し替える）
   - example 方式: 本文の末尾に `::preview` と `::codeview` を置く（ZIP ボタンはパネルに付く）。
     素材を配る節は `::assets` も置く

詳細な規約は [references/conventions.md](references/conventions.md) を読むこと。文書構成・図・ZIP 配布・
scripts の責務分離・スタック別の方針を全部そこに書いてある。

### 3. 最新ライブラリにそろえる

テンプレの `package.json` の依存は **目印** であって固定ではない。scaffold 時に最新へ更新する:

```bash
# レクチャー側（Cloudflare 系の例）
cd sections/<sec>/<lec>
for p in hono; do npm pkg set dependencies."$p"="^$(npm view "$p" version)"; done
for p in wrangler; do npm pkg set devDependencies."$p"="^$(npm view "$p" version)"; done
npm install
# Docker + Postgres 系なら: hono @hono/node-server pg marked を dependencies に

# サイト側（パッケージマネージャは pnpm。レクチャー側は npm のままで混在させてよい）
cd site
# `pnpm pkg set dependencies."<name>"` は名前に `@` や `-` があると
# ERR_PNPM_UNEXPECTED_TOKEN_IN_PROPERTY_PATH で落ちる。依存の更新は `pnpm add <name>@latest` で行う
pnpm add astro@latest @astrojs/starlight@latest @astrojs/markdown-remark@latest sharp@latest \
  rehype-external-links@latest remark-directive@latest
pnpm add -D archiver@latest exceljs@latest iconv-lite@latest   # exceljs: ::sheetcode / iconv-lite: .bas の変換
pnpm pkg set packageManager="pnpm@$(pnpm --version)"   # CI の pnpm/action-setup がここを読む
pnpm install
```

サイト側で踏みやすい3点。テンプレでは対応済みだが、更新のたびに再発しうる。

- **`archiver` は 8 系で default export が無くなった**。`build-downloads.mjs` は
  `import { ZipArchive } from 'archiver'` ＋ `new ZipArchive({ zlib: { level: 9 } })` を使う
- **Astro 7 以降は remark / rehype プラグインに `@astrojs/markdown-remark` が必要**
  （既定の Markdown プロセッサが変わったため）。入れないと config 検証の段階で落ちる。
  この経路自体も Astro 7 で deprecated（警告が出るが動く）。詳細は
  [references/conventions.md](references/conventions.md) の「サイト（site/）の開発」
- **pnpm は esbuild の postinstall を既定でブロックする**。ブロックされたままだと
  `pnpm run build` が依存チェックで exit 1 になる。許可は `site/pnpm-workspace.yaml` の
  `allowBuilds`（pnpm 11 の書式。`onlyBuiltDependencies` は読まれず、黙って無視される）

Cloudflare 系は `wrangler.example.jsonc` の `compatibility_date` を作成時の日付に更新する。
Docker 系は `Dockerfile` の `FROM node:NN-slim` / `postgres:NN` を最新 LTS に合わせる。

### 4. ローカルで動作確認する

レクチャー単体:

```bash
# Cloudflare 系
cd sections/<sec>/<lec>
# wrangler.example.jsonc を複製して wrangler.jsonc を作る
npm install
npm run db:setup     # D1 を使うレクチャーのみ
npm run dev          # Worker :8787（別ターミナルで npm run front → :8788）

# Docker + Postgres 系
cd sections/<sec>/<lec>
docker compose watch
docker compose exec app npm run database:init
docker compose exec app npm run database:seed
# http://localhost:3000

# 静的ブラウザアプリ系
cd sections/<sec>/<lec>/example
python3 -m http.server 8000   # http://localhost:8000/（素材を読む節は file:// では動かない）

# Office マクロ系（ローカルで自動実行はできない。Excel とスプレッドシートで実際に動かして確かめる）
pip install openpyxl && python3 tools/build_workbooks.py   # 練習用ブックを作り直す
```

Office マクロ系は、サイトのビルドが通っても **コードが Excel / GAS で動くことは保証されない**。
Windows の Excel（.bas のインポート、PDF 書き出し）・Mac の Excel・スプレッドシート（初回の承認）で
実際に動かしてから渡す。動かしていなければ、そう伝える。

サイト:

```bash
cd site
pnpm install
pnpm run dev     # predev で build-previews + sync-lectures + build-downloads が走る → http://localhost:4321
pnpm run build   # 本番ビルドが通るか確認
```

`pnpm run build` が通ること（`build-previews.mjs` / `sync-lectures.mjs` / `build-downloads.mjs` が落ちず、
`site/public/downloads/<sec>-<lec>.zip` が生成されること）を必ず確認してから渡す。
`example/` を持つレクチャーがあるときは、加えて次も確認する:

- `site/public/preview/<sec>-<lec>/` と、デモがあれば `<sec>-<lec>--<demo>/` ができている
- 素材を配る節は `site/public/downloads/<sec>-<lec>-assets.zip` ができている
- ページを開いて `::codeview` のパネルでファイルが切り替わり、`::preview` の iframe が動く

### 5. GitHub Pages を有効化する

- リポジトリの Settings → Pages → Source を **GitHub Actions** にする
- `main` に push すると `.github/workflows/deploy-docs.yml` が走り、`site/` をビルドしてデプロイ
- 公開 URL は `https://<GH_USER>.github.io/<REPO_NAME>/`

> commit / push はユーザーの明示指示があるまで行わない（グローバル方針）。scaffold 完了後、
> 「これで commit していいか」を確認してから進める。

## レクチャーを追加するとき（既存リポジトリ）

1. 近いレクチャーか該当スタックのテンプレ（`templates/lecture-cloudflare/` など）をコピーして
   `sections/<sec>/<lec>/` を作る
2. `package.json` の `name`（Cloudflare 系は `wrangler.example.jsonc` の `name`／Docker 系は
   `container_name`）を直す。静的系は前の節の `example/` をコピーして差分だけ足す
3. `README.md` / `LECTURE.md` を書く（`docs: true` 必須、図は `images/`、配布は `:::download`
   または `::codeview` ＋ `::preview`）
4. 新しいセクションを足したときは、トップページ（ルートの `README.md`）の「このハンズオンで作るもの」に図と説明を足す（節の一覧は書かない。セクション直下に README は作らない）
5. `astro.config.mjs` の `sidebar` に新セクションを足したときだけ `autogenerate` のエントリを追加
   （既存セクション内のレクチャー追加なら `autogenerate` が自動で拾うので不要）
6. `cd site && pnpm run build` で確認

## 参考資料

- [references/conventions.md](references/conventions.md) — レクチャーの詳細規約（必読）。文書構成 /
  図（genfig）/ ZIP 配布 / 本文センチネル（`::codeview` `::preview` `::assets`）と `:::code` / scripts の責務分離 /
  コーディングルール、スタック別（Cloudflare・Postgres・静的ブラウザ）の方針。
- 雛形リポジトリ:
  - <https://github.com/seekseep/cloudflare-introduction-handson>（Cloudflare 系・project 方式）
  - <https://github.com/seekseep/slingshot-game-handson>（静的ブラウザ系・example 方式。
    `::codeview` / `::preview` / `::assets` / `demos/` の実例はここが一番揃っている）
