# レクチャー詳細規約

handson-builder で作る教材の「中身」のルール。雛形
[seekseep/ai-webapp-security-handson-2026](https://github.com/seekseep/ai-webapp-security-handson-2026)
の AGENTS.md を、PostgreSQL + 生 SQL の方針に合わせて一般化したもの。

## 用語：セクションとレクチャー

教材は 2 階層で整理する。

| 用語 | 指すもの | 例 |
|---|---|---|
| **セクション** | テーマで束ねた親ディレクトリ（`sections/<section>/`） | `01-basics/`, `02-advanced/` |
| **レクチャー** | 1 つのハンズオン単位 = 1 つの動くアプリ（`sections/<section>/<lecture>/`） | `01-basics/01-hello/` |

- 1 セクションは 1 つ以上のレクチャーを持つ
- レクチャーは `README.md`（プロジェクト説明）と `LECTURE.md`（教材本文）の 2 文書を持つ
- 学習者はレクチャー単位で `cd` して動かし、その `LECTURE.md` に沿って手を動かす
- ディレクトリ名は `NN-<slug>`（`01-`, `02-` …）。この番号がサイト sidebar の並び順になる

## 技術スタック（3 択）

サンプルアプリのスタックは 3 択（`SKILL.md` の「技術スタック（3 択）」で選ぶ）。1 リポジトリ内では統一する。
共通ルール: **JavaScript（ESM）で書く。TypeScript は使わない**。パッケージマネージャは
**レクチャー側が npm、サイト（`site/`）が pnpm**。レクチャーは受講者が実行するので前提を上げず
npm のままにし、保守者しか触らないサイトだけ pnpm にする（後述「サイト（site/）の開発」）。

### Cloudflare 系（既定・雛形リポジトリと同じ）

- **Workers** で API を書く。API は **Hono**（`import { Hono } from 'hono'`、`export default app`）
- **Pages** に静的フロントを置く（`public/`。CSS は CDN でよい。フロント JS は最小限）
- **D1**（SQLite）でデータを保存。**ORM は使わず生 SQL**、値は必ずプレースホルダ **`?`** でバインドする
  （`c.env.DB.prepare('... WHERE id = ?').bind(id)`）
- **R2** に画像などのオブジェクトを置く（キーは D1 に持たせる）
- **wrangler**（`wrangler dev` / `wrangler pages dev`）で起動。**Docker は使わない**
- 設定は **`wrangler.jsonc`**。受講者コピー用の `wrangler.example.jsonc` だけ追跡し、実 `wrangler.jsonc`
  はレクチャーの `.gitignore` に入れる（各自が名前を書き換えるため）
- スキーマは `schema.sql`（または `migrations/`）に置き、`npm run db:setup` で流す。起動時に自動実行しない
- シークレットは `wrangler secret put` / ローカルは `.dev.vars`（`.dev.vars`・`.wrangler/` は gitignore）

### Docker + PostgreSQL 系

- Web アプリのとき: Hono（`@hono/node-server` で起動）。テンプレートは `hono/html` のタグ付き
  テンプレートリテラルで SSR（`${...}` は自動エスケープ）。Markdown レンダリングが要るなら marked
- DB: **PostgreSQL**。**ORM は使わず `pg` で直接 SQL**。`pg` の `Pool` で接続（`DATABASE_URL`）、
  `pool.query('... WHERE id = $1', [id])` のように **プレースホルダ `$1`, `$2` …** でバインド
- 静的ファイルは `@hono/node-server/serve-static` で配信。`node --watch` で自動再起動
- **Docker / Docker Compose**（`docker compose watch`）で起動
- スキーマ定義・シード・リセットは `scripts/`（init/seed/reset）に分け、起動時に自動実行しない

### 静的ブラウザアプリ系（ビルドなし）

ブラウザだけで動くもの（ゲーム、Canvas、可視化、DOM 操作など）が題材のとき。

- ライブラリは **CDN（cdnjs）から `<script>` で読む**。npm・bundler を使わず `package.json` も置かない。
  バージョンは scaffold 時に `npm view <pkg> version` で確認して URL に固定する
- 動くコードは **`<lec>/example/`**（`index.html` ＋ `main.js` ＋ 必要なら `assets/`）。
  `index.html` を開けば動く。`assets/` を読む節は簡易サーバー経由（`file://` だと失敗する）
- **前の節の `example/` をコピーして差分を足す**。フォルダをまたぐ共有ファイルは作らない
- ES モジュールは使わず、複数の `<script defer>` を読み込み順で並べる
  （ファイル分割する節では `scenes/*.js` → `main.js` の順、のように）
- **過剰な抽象化をしない**。設定オブジェクトを変数に切り出さず直書きし、処理は関数へ切り出さず
  上から手続き的に書く。即値の定数は使う直前に置く（先頭へ巻き上げない）
- 解説用の小さなデモは **`<lec>/demos/<name>/index.html`**（複数可・ZIP には入らない）

### SQL インジェクションなどを題材にする回

その回だけ文字列連結で SQL を組む問題コードを書き、修正でプレースホルダに置き換える
（それ以外の回は最初からプレースホルダ）。

## ディレクトリ構成（レクチャー）

共通: どのレクチャーも `README.md`（プロジェクト説明）/ `LECTURE.md`（教材本文, `docs: true`）/
`images/`（説明図の SVG）を持つ。`package.json` は project 方式（Cloudflare 系・Docker 系）のみ。

### Cloudflare 系

```text
src/index.js            Worker（Hono の API。D1/R2 を binding 経由で使う）
public/                 静的フロント（index.html / main.js。Pages で配信）
schema.sql              D1 のテーブル定義（migrations/ でもよい）
wrangler.example.jsonc  Worker + binding 設定のテンプレ（受講者がコピーして wrangler.jsonc を作る）
.dev.vars.example       ローカル用シークレットのテンプレ（必要な回だけ）
images/00-thumbnail.svg 先頭サムネ（+ NN-*.svg の解説図）
```

`wrangler.jsonc` / `.dev.vars` / `.wrangler/` はレクチャーの `.gitignore` に入れる。

### Docker + PostgreSQL 系

```text
app/
  server.js             サーバー起動・ルート登録
  db.js                 pg Pool 接続（DATABASE_URL）
  routes/               ルートごとのエンドポイント定義
  middleware/           session.js, auth.js など（必要な回だけ）
  components/           layout.js（共通レイアウト）
  public/               静的ファイル（CSS、画像）
scripts/
  init.js               CREATE TABLE のみ
  seed.js               シード投入（既にデータがあればスキップ＝追記式・非破壊）
  reset.js              全テーブル TRUNCATE（投入はしない）
data/.gitkeep           （Postgres は Docker volume を使うので空）
```

### 静的ブラウザアプリ系

```text
example/                動くコード（配布 ZIP とライブプレビューの元）
  index.html            器（CDN の <script> と main.js の読み込み）
  main.js               本体
  scenes/*.js           ファイル分割する節だけ（<script defer> で順に読む）
  assets/               画像・音（この節で配る素材があるときだけ）
demos/                  解説用の小さなデモ（任意・複数可。ZIP には入らない）
  <name>/index.html
images/00-thumbnail.svg 先頭サムネ（+ NN-*.svg の解説図）
```

`package.json` は置かない（パッケージマネージャを使わないため）。

## package.json のスクリプト

各レクチャーの root に置く。

### Cloudflare 系

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "front": "wrangler pages dev ./public --port 8788",
    "db:create": "wrangler d1 create <db-name>",
    "db:setup": "wrangler d1 execute <db-name> --local --file=./schema.sql",
    "db:setup:remote": "wrangler d1 execute <db-name> --remote --file=./schema.sql"
  }
}
```

`hono` は dependencies、`wrangler` は devDependencies に置く。

### Docker + PostgreSQL 系

```json
{
  "scripts": {
    "dev": "node --watch --env-file-if-exists=.env app/server.js",
    "database:init": "node --env-file-if-exists=.env scripts/init.js",
    "database:seed": "node --env-file-if-exists=.env scripts/seed.js",
    "database:reset": "node --env-file-if-exists=.env scripts/reset.js && npm run database:seed"
  }
}
```

`--env-file-if-exists` は Node 20.12+ / 22+ で使える。ローカル実行時は `.env` に `DATABASE_URL` を書く
（`.env.example` を用意してある）。Docker 実行時は compose の `environment` で渡るので `.env` は不要。

---

以下「scripts/ の責務分離」〜「Dockerfile の共通パターン」は **Docker + PostgreSQL 系** のときの規約。
Cloudflare 系では代わりに `schema.sql` + `wrangler d1 execute`（`npm run db:setup`）を使い、Docker は使わない。

## scripts/ の責務分離（Docker + Postgres 系）

- `scripts/init.js` — テーブル定義（`CREATE TABLE IF NOT EXISTS`）のみ
- `scripts/seed.js` — シードデータ投入。**冒頭で対象テーブルの行数をチェックし、既にデータがあれば
  スキップ**（追記式・非破壊）。空のときだけ INSERT
- `scripts/reset.js` — `TRUNCATE ... RESTART IDENTITY CASCADE` で全消し。投入はしない
- 「全消ししてシードを入れ直す」は `npm run database:reset`（reset → seed）でまとめて行う

## 起動方法（2 通り）

### Docker（推奨）

```bash
docker compose watch
```

ビルド・起動・ファイル監視まで一気にやる（init / seed は **自動実行されない**）。`app/`・`scripts/`
の変更は sync+restart、`package.json`・`Dockerfile` の変更は rebuild。Mac の Docker Desktop では
ホストの fs イベントがコンテナに伝わらないので、bind mount + `node --watch` だけでは再起動が走らない。
Compose Watch でこれを回避する。

初回または DB を作り直すときは別ターミナルで:

```bash
docker compose exec app npm run database:init
docker compose exec app npm run database:seed
docker compose exec app npm run database:reset
```

Postgres のデータは Docker の named volume（`pgdata`）に残るので、`docker compose down` しても消えない
（`docker compose down -v` で消える）。

### ローカル Node.js

別途 PostgreSQL を立てて `.env` に `DATABASE_URL` を書く。

```bash
npm install
npm run database:init
npm run database:seed
npm run dev
```

すべてのアプリは `http://localhost:3000` で起動する。

## docker-compose.yml の共通パターン

- `app` サービスと `db`（postgres）サービスの 2 つ
- `container_name` は `handson-<repo>-<section>-<lecture>` 規則（`docker ps` で識別しやすく）
- `app` は `db` の healthcheck 成功を `depends_on` で待つ
- `app/`・`scripts/` は Compose Watch の `sync+restart`、`package.json`・`Dockerfile` は `rebuild`
- Postgres データは named volume `pgdata` に永続化

## Dockerfile の共通パターン

```dockerfile
FROM node:24-slim
WORKDIR /workspace
COPY package*.json ./
RUN npm install
COPY app ./app
COPY scripts ./scripts
CMD ["node", "app/server.js"]
```

- `pg` は pure JS なのでビルドツール（python/make/g++）は不要
- CMD で `--watch` は使わない。再起動は Compose Watch が外側から行う（二重 watch にしない）
- `init` / `seed` は CMD に含めない（毎回データを作り直さないため。学習者が能動的に叩く）

## .gitignore に含めるもの（レクチャー）

- 共通: `node_modules/`
- Cloudflare 系: `.wrangler/` / `.dev.vars`（`!.dev.vars.example`）/ `wrangler.jsonc`
  （受講者が各自コピーするため。テンプレの `wrangler.example.jsonc` は追跡する）
- Docker + Postgres 系: `.env`（`data/.gitkeep` は残す。DB は volume を使うので git 管理しない）

---

## レクチャーの文書構成

README.md と LECTURE.md の 2 ファイルに分ける。

### README.md（プロジェクト説明）

「動かすために必要な情報」を簡潔に:

1. レクチャーの概要（1〜2 文）
2. 起動方法（そのスタックの手順）
3. アカウントやシードデータ（あれば）
4. （課題型教材なら）**このレクチャーで問題のあるファイル**の表
5. ディレクトリ構成（テンプレ参照で OK）
6. npm scripts 一覧

frontmatter は付けても付けなくてもよい。付けて `docs: true` にすると README もサイトに載る
（雛形では LECTURE.md だけ載せ、README はリポジトリ内向けにしている）。

### LECTURE.md（教材本文）

学習者が順番に進める教材。**frontmatter は `title` と `docs: true` のみ必須**（`TODO` `学ぶこと` などの
専用フィールドは使わない）。本文の型:

1. 冒頭に H1（`title` と同じでよい。サイト生成時に自動で除去される）
2. その直後に `![title](./images/00-thumbnail.svg)` のサムネイル画像
3. 導入文（何を作り、動かすと何が起きるか）＋必要なら解説図
4. 以降の見出し構成は **教材の裁量**。トピックごとに自由な見出し（例: 「プロジェクトを用意する」
   「ローカルで動かす」「公開する」）を並べる。末尾に「コラム」（深掘り）や「次の章へ」（次レクチャーへの
   リンク）を置いてもよい

> 以前の「TODO / 学ぶこと / 説明」の 3 節固定はやめた。目標の列挙を強制せず、素直なトピック見出しで書く。

サンプルコードのあるレクチャーは、本文に配布ボタンを置く（後述「サンプルコードの ZIP 配布」）:

```markdown
:::download
[サンプルコードをダウンロード](./project.zip)
:::
```

本文中の相対リンクは sync スクリプトが自動変換する:

- 同期対象のマークダウン（他レクチャーの `LECTURE.md` など）→ サイト内 URL（相対）
- `sections/` 配下のソースコードなど → GitHub blob URL、画像 → GitHub raw URL
- リポジトリルート直下のファイル（`.claude/AGENTS.md` など）→ GitHub blob URL
- `./project.zip` センチネル → 生成した配布 ZIP の URL

なので `[src/index.js](./src/index.js)` のように書けば、サイト上では GitHub のソースへのリンクになる。

## 図（genfig）

説明図は各レクチャーの `images/` に **SVG** で置く。

- `00-thumbnail.svg` を先頭サムネにし、本文冒頭に置く。以降は `01-*.svg`, `02-*.svg` … と番号付き
- 作図は [genfig](genfig) スキルを使う（twemoji を登場物にした FigJam 風 SVG）
- 埋め込みは `![説明（何を表す図か）](./images/NN-xxx.svg)`。alt には図の意味を書く
- 画像は Astro の Sharp を通さず、サイトでは GitHub raw URL、GitHub では相対で解決される
  （Sharp で落ちる形式が要るときだけ `libs/links.mjs` の `PUBLIC_ASSETS` 経由で `site/public/` に逃がす）

## サンプルコードの ZIP 配布

`site/scripts/build-downloads.mjs` が自動で ZIP を作る。レクチャーの形によって 2 方式ある。

### project 方式（`<lec>/package.json` を持つ）

- 対象は `git ls-files` の結果（＝**git 管理下のファイルだけ**）。`node_modules/` `.wrangler/`
  `.dev.vars` 各自コピー用の `wrangler.jsonc` などは自動で除外される
- そのうえで教材ファイル（`LECTURE.md`・`images/`・`demos/`）は明示的に除外する
- 出力は `site/public/downloads/<sec>-<lec>.zip`（生成物なので gitignore）。ZIP 内のルートフォルダは
  `<lec>/`（展開すると名前付きフォルダができる）
- 本文には `:::download` ＋ `[...](./project.zip)` を書く。`sync-lectures.mjs` が実 URL に差し替える

### example 方式（`<lec>/example/index.html` を持つ）

- 対象は `example/` 配下すべて（作業ツリー直読み。git 追跡は問わないので、コミット前でも最新が入る）。
  `node_modules/` と `.DS_Store` だけ除外する
- ZIP 内のルートフォルダは常に **`game/`**。どの節を解凍しても `game/` になるので、前の `game/` に
  上書き展開すればそのまま育てていける（節をまたいで同じフォルダを育てる進め方に合わせている）
- `example/assets/` があれば、**素材だけの `<sec>-<lec>-assets.zip`**（ルートは `assets/`）も出す。
  画像や音を足す節で「素材だけ落として `game/assets/` に置く」ために使う
- 本文には ZIP リンクを書かない。`::codeview` のパネルにダウンロードボタンが付き、素材は `::assets`
  が専用のボタンを出す
- 例外として、**受講者が配布物の一部を自分のフォルダに置く必要がある節**（受け取り側の HTML を
  配る、など）は、本文に `:::download` ＋ `[...](./project.zip)` を置く。`./project.zip` は
  example 方式でも実 URL に差し替わる。そのとき「解凍してできる `<root>/` のどのファイルを
  どこへ置くか」を本文に明示し、`index.html` を上書きしないよう `:::warning` で注意する

命名規約（`<sec>-<lec>.zip` / `<sec>-<lec>-assets.zip` / `preview/<sec>-<lec>`）は `libs/naming.mjs` に
一元化され、`build-downloads.mjs`（出力名）・`build-previews.mjs`（配置名）・`libs/sentinels.mjs`
（本文に埋めるリンク）が共有する。

## 本文センチネル（`::codeview` / `::preview` / `::assets`）

`example/` を持つレクチャーでは、本文に**行頭のセンチネル**を書くと、`sync-lectures.mjs`
（→ `libs/sentinels.mjs`）が **実ファイルから中身を生成**して展開する。教材本文にコードを
二重に書かないための仕掛けで、サンプルを直せば本文の完成例も自動で追従する。

| 書き方 | 展開されるもの |
|---|---|
| `::codeview` | 「このステップの完成例」パネル。左にファイル一覧、右にコード。ZIP ボタン付き |
| `::codeview{path="demos/on-vs-once"}` | 表示するディレクトリ（レクチャー相対。既定は `example`）。デモには配布 ZIP が無いのでボタンは出ない |
| `::codeview{defaultFile="main.js"}` | 最初に開いておくファイル（既定は先頭） |
| `::codeview[見出し]{...}` | ヘッダの文言を上書きする |
| `::preview` | その場で遊べるライブプレビュー（iframe）。中身は自分の `example/` |
| `::preview[キャプション]` | figcaption を付ける |
| `::preview{src="<sec>/<lec>"}` | 別レクチャーの完成例を出す。**レクチャー以外（トップページ・章の概要）でも使える唯一のセンチネル** |
| `::preview{demo="<name>"}` | `example/` ではなく `demos/<name>/` を出す。1 ページに何個でも置ける |
| `::preview{height="320"}` | iframe の高さ（px）を上書きする（既定は CSS の 480px） |
| `::assets` | `example/assets/` を配る ZIP のボタン ＋ 中身のファイル名一覧 |
| `::assets[ラベル]` | ボタンの文言を上書きする（既定は「素材をダウンロード」） |

書き方のルール:

- センチネルは **行頭に単独で**書く（前後に空行を置く）。属性は `key="value"` 形式
- `::codeview` はレクチャーの末尾に置く。その直前に `::preview` を置くと「動かして確認 → 完成例を見る」
  の流れになる。デモを解説する節では `::preview{demo="<name>"}` と
  `::codeview{path="demos/<name>"}` を対にする
- パネルに全文表示されるのは `.html` / `.js` / `.css` / `.json`。ファイル順は `index.html` → `main.js` →
  残りは名前順
- `::assets` は `example/assets/` が無いと警告を出して行ごと消える（ビルドは落ちない）
- `LECTURE.md` 以外（ルートの `README.md`、`sections/<sec>/README.md` など）で使えるのは
  `::preview{src="<sec>/<lec>"}` だけ。自分の `example/` を持たないので、`::codeview` /
  `::assets` と行き先の無い `::preview` は警告を出して消える
- プレビューには「↻ 再読み込み」と「↗ 新しいタブで開く」が付く。開発者ツールを開いて
  確かめる節では、本文から後者を使うよう促す

## 本文に「どこに書くか」を示す（`:::code`）

差分コードを載せるときは `:::code` コンテナを使う（`src/plugins/remark-code.mjs`）。
ファイル名タブと行番号が付き、差分表示にもできる。

````markdown
:::code[create の中（いちばん最初）]{filepath=main.js offset=12}
```js
const bird = this.add.circle(140, 340, 18, 0xffffff);
```
:::
````

- `filepath` … ファイル名タブに出す文字列。`offset` … 先頭行の行番号
- `newOffset` を足すと差分モードになる。`+` / `-` 付きのコードを書くと旧・新 2 列の行番号が出る
- 描画は Expressive Code に任せ、行番号だけ自作プラグイン `src/plugins/ec-line-numbers.mjs` が足す
  （`astro.config.mjs` の `expressiveCode.plugins` に登録済み）。他のコードブロックには影響しない

### 解説用デモ（`demos/`）

`<lec>/demos/<name>/index.html` を置くと `site/public/preview/<sec>-<lec>--<name>/` にコピーされ、
`::preview{demo="<name>"}` で埋め込める。

- 用途は**解説の裏付け**。「HTML と Canvas で同じ四角を描く」「物理エンジンなしで座標を手書きする」
  のように、本文の主張をその場で触らせたいときに使う
- 配布物ではないので ZIP には入らない。1 レクチャーに何個でも置ける
- 各デモは自己完結させる（外部ファイルは CDN だけ。レクチャーの `example/` に依存しない）

## コーディングルール

- JavaScript（ESM）で書く（TypeScript は使わない）
- 1 ファイルが大きくなりすぎないようにする
- 変数名・関数名は分かりやすく
- コメントは「なぜ」を書く。「何をしているか」はコードを見れば分かる

## 課題型（脆弱性・アンチパターン体験）の教材を作るとき

- あえて問題のあるコードを含める場合、問題は `src/index.js` や `app/routes/*.js`, `scripts/seed.js`
  など、学習者が読みそうなファイルに置く
- 修正対象に `// TODO:` のヒントコメントを入れない（自力で見つけさせる）
- 問題のあるファイル一覧は README、修正手順は LECTURE.md に書く
- 危険なコマンド実行などを扱う場合はモック実装にする。日本法上の注意が要るテーマなら
  `sections/LEGAL.md`（`docs: true`）を置く

## サイト（site/）の開発

パッケージマネージャは **pnpm**。レクチャー側（npm）とは意図的に分けている。

```sh
cd site
pnpm install
pnpm run dev      # predev で build-previews → sync-lectures → build-downloads が走る
pnpm run build    # 本番ビルド（prebuild で同じ3つが走る）
```

バージョンは `site/package.json` の `packageManager` で固定する。CI の `pnpm/action-setup` が
ここを読むので、scaffold 時に `pnpm pkg set packageManager="pnpm@$(pnpm --version)"` を実行する。
ワークフローでは `package_json_file: site/package.json` の指定が必要（既定はリポジトリルートを見る）。

### 依存更新で踏みやすい3点

テンプレでは対応済みだが、依存を上げ直すたびに再発しうる。

- **`archiver` 8 で default export が無くなった** — `build-downloads.mjs` は
  `import { ZipArchive } from 'archiver'` ＋ `new ZipArchive({ zlib: { level: 9 } })` を使う。
  `import archiver from 'archiver'` のままだと `SyntaxError` でビルドが落ちる
- **Astro 7 以降は remark / rehype プラグインに `@astrojs/markdown-remark` が必要** —
  既定の Markdown プロセッサが変わったため。入れないと config 検証の段階で落ちる
  （`astro.config.mjs` は `config.markdown.processor.options.remarkPlugins` に push している）。
  なお Astro 7 の時点でこの経路自体が deprecated で、ビルド時に
  「`markdown.remarkPlugins` ... are deprecated. Pass them to `unified({...})` from
  `@astrojs/markdown-remark` directly instead.」と警告が出る。**動作はするが、次のメジャーで
  落ちる可能性がある**。そのときは `calloutIntegration()` の push をやめ、
  `unified({...})` に直接渡す形へ移す
- **pnpm は esbuild の postinstall を既定でブロックする** — ブロックされたままだと
  `pnpm run build` が依存チェックで exit 1 になる。許可は `site/pnpm-workspace.yaml` に書く

  ```yaml
  allowBuilds:
    esbuild: true
  ```

  pnpm 11 の書式。`package.json` の `pnpm` フィールド（pnpm 9）と `pnpm-workspace.yaml` の
  `onlyBuiltDependencies`（pnpm 10）はどちらも読まれない。前者は警告が出るが、後者は
  `pnpm config get` では読めるのに install が黙って無視するので気づきにくい

## サイト（site/）への載り方（規約）

`site/scripts/sync-lectures.mjs` が `docs: true` のマークダウンを次の規則で取り込む:

| ソース | サイト URL |
|---|---|
| `README.md`（ルート） | `/` |
| `sections/README.md` | `/getting-started/` |
| `sections/<name>.md`（例 `DOCKER.md`） | `/<name>/`（小文字） |
| `sections/<sec>/README.md` | `/<sec>/` |
| `sections/<sec>/<lec>/LECTURE.md` | `/<sec>/<lec>/` |

frontmatter で `title` / `sidebar.label` / `sidebar.order` を上書きできる。`LECTURE.md` の
`sidebar.order` はディレクトリ名（`01-...`）から自動導出される。

そのほか sync が本文に対してやること:

- 相対リンク・画像・`./project.zip` センチネルの書き換え（`libs/links.mjs`）
- `:::download` → ダウンロードボタン、`:::danger`/`:::warning`/`:::notice` → callout、
  `:::questions` → ◯✕クイズ（`site/src/plugins/` の remark プラグイン）
