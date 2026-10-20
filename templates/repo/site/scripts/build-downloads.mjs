#!/usr/bin/env node
/**
 * 各レクチャーのサンプルを ZIP 化し、site/public/downloads/ に出力する。
 *
 * レクチャーの形は 3 通りあり、どれも `<sec>-<lec>.zip` に出力する。
 *
 * ── A. example 方式（静的ブラウザアプリ。`<lec>/example/index.html` を持つ）
 *   中身: example/ 配下すべて（作業ツリー直読み。git 追跡は問わない）。
 *   ZIP 内のルートフォルダは常に `game/`。どの節を解凍しても `game/` になるので、
 *   前の `game/` に上書き展開すればそのまま育てていける。
 *   加えて `example/assets/` を持つレクチャーは、素材だけの
 *   `<sec>-<lec>-assets.zip`（ルートフォルダは `assets/`）も出す。
 *
 * ── A'. Office マクロ系（`<lec>/example/vba/` か `example/gas/` を持ち、index.html は無い）
 *   中身: example/ 配下すべて（data/*.xlsx・vba/*.bas・gas/*.gs）。
 *   ZIP 内のルートフォルダは `<lec>/`（節ごとに独立したフォルダとして展開する）。
 *   環境ごとの `<sec>-<lec>-excel.zip`（gas/ を除く）と `-sheets.zip`（vba/ を除く）も出す。
 *   本文のダウンロードボタンは、選んでいる環境の ZIP を指す（src/plugins/lib/platform-zip.mjs）。
 *   .bas だけは書き出し時に VBE が読める形へ変換する（convertForImport）:
 *     - 先頭に `Attribute VB_Name = "<ファイル名>"` を足す（インポート後のモジュール名）。
 *       リポジトリの .bas に書かないのは、本文の完成例からコピーして VBE に貼ると
 *       この行が構文エラーになるため
 *     - Shift_JIS（CP932）＋ CRLF にする。日本語版 Windows の VBE は .bas を CP932 として
 *       読むので、UTF-8 のままだとインポートした日本語が文字化けする
 *
 * ── B. project 方式（`<lec>/package.json` を持つ。Cloudflare 系 / Docker+Postgres 系）
 *   中身: git 管理下のファイル (libs/git.mjs) だけ。
 *     これにより node_modules/ .wrangler/ dist/ .dev.vars .env *.pem/*.key、
 *     各自コピー用の wrangler.jsonc など .gitignore 済みのものは自動で除外される。
 *   そのうえで教材ファイル (LECTURE.md, images/, demos/) だけ明示的に除外する。
 *   ZIP 内のルートフォルダは `<lec>/`（展開時に名前付きフォルダができる）。
 *   git 管理外（git init 前）では ls-files が失敗するので、警告して飛ばす。
 *
 * ダウンロード URL の規約 (<sec>-<lec>.zip) は libs/naming.mjs に集約し、
 * sync-lectures.mjs のリンク生成と共有している。
 */

import { createWriteStream } from 'node:fs';
import { glob, mkdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import { ZipArchive } from 'archiver';
import iconv from 'iconv-lite';

import { walkFiles } from './libs/fs-walk.mjs';
import { lsFiles } from './libs/git.mjs';
import {
  assetsZipBasenameFor,
  exampleDirOf,
  parseLectureRel,
  platformZipBasenameFor,
  zipBasenameFor,
} from './libs/naming.mjs';
import { DOWNLOADS_DIR, ROOT } from './libs/paths.mjs';

const IGNORE_DIRS = new Set(['node_modules', '.git']);
const IGNORE_NAMES = new Set(['.DS_Store']);

// 教材ファイル。project 方式の ZIP には含めない。
function isLectureAsset(relToLecture) {
  return (
    relToLecture === 'LECTURE.md' ||
    relToLecture.startsWith('images/') ||
    relToLecture.startsWith('demos/')
  );
}

/** VBE に読ませる形式へ変換する（.bas のみ）。それ以外のファイルは null（そのまま入れる）。 */
async function convertForImport(absPath) {
  if (path.extname(absPath).toLowerCase() !== '.bas') return null;
  const moduleName = path.basename(absPath, path.extname(absPath));
  const source = (await readFile(absPath, 'utf8')).replace(/\r\n/g, '\n');
  const text = `Attribute VB_Name = "${moduleName}"\n${source}`.replace(/\n/g, '\r\n');
  return iconv.encode(text, 'cp932');
}

/** files（<absDir> 相対）を outPath に ZIP 化する。ZIP 内は rootDir/ 配下に置く。 */
async function zipFiles(absDir, files, outPath, rootDir) {
  const output = createWriteStream(outPath);
  const archive = new ZipArchive({ zlib: { level: 9 } });
  const done = new Promise((resolve, reject) => {
    output.on('close', () => resolve(files.length));
    archive.on('warning', reject);
    archive.on('error', reject);
  });
  archive.pipe(output);
  for (const rel of files) {
    const abs = path.join(absDir, ...rel.split('/'));
    const name = path.posix.join(rootDir, rel);
    const converted = await convertForImport(abs);
    if (converted) archive.append(converted, { name });
    else archive.file(abs, { name });
  }
  archive.finalize();
  return done;
}

async function exists(abs) {
  try {
    await stat(abs);
    return true;
  } catch (e) {
    if (e.code === 'ENOENT') return false;
    throw e;
  }
}

// ---------------------------------------------------------------------------
// A / A'. example 方式（静的ブラウザ系・Office マクロ系）
// ---------------------------------------------------------------------------

async function findExampleLectures() {
  // 静的ブラウザ系は example/index.html、Office マクロ系は example/vba/ か example/gas/ が目印。
  const dirs = new Set();
  for (const pattern of ['sections/*/*/example/index.html', 'sections/*/*/example/vba', 'sections/*/*/example/gas']) {
    for await (const rel of glob(pattern, { cwd: ROOT })) {
      dirs.add(rel.split(path.sep).slice(0, 3).join('/'));
    }
  }
  return [...dirs].sort();
}

async function zipExample(lectureRel) {
  const { sec, lec } = parseLectureRel(lectureRel);
  const exampleAbs = path.join(ROOT, ...exampleDirOf(lectureRel).split('/'));
  const files = await walkFiles(exampleAbs, { ignoreDirs: IGNORE_DIRS, ignoreNames: IGNORE_NAMES });
  const outPath = path.join(DOWNLOADS_DIR, zipBasenameFor(sec, lec));
  // 静的ブラウザ系は前の game/ に上書き展開して育てるのでルートは常に game/。
  // Office マクロ系は節ごとに独立したフォルダとして配る。
  const isBrowserApp = await exists(path.join(exampleAbs, 'index.html'));
  const rootDir = isBrowserApp ? 'game' : lec;
  const count = await zipFiles(exampleAbs, files, outPath, rootDir);
  // Office マクロ系は、環境ごとの ZIP も出す（Excel は gas/ を、スプレッドシートは vba/ を入れない）。
  if (!isBrowserApp && files.some((f) => f.startsWith('vba/') || f.startsWith('gas/'))) {
    for (const [platform, drop] of [['excel', 'gas/'], ['sheets', 'vba/']]) {
      const picked = files.filter((f) => !f.startsWith(drop));
      await zipFiles(exampleAbs, picked, path.join(DOWNLOADS_DIR, platformZipBasenameFor(sec, lec, platform)), rootDir);
    }
  }
  return count;
}

/**
 * example/assets/ があれば、その中身だけの ZIP を作る。無ければ null。
 * 学習者は game/ の隣に展開するだけで assets/ が揃う。
 */
async function zipExampleAssets(lectureRel) {
  const { sec, lec } = parseLectureRel(lectureRel);
  const assetsAbs = path.join(ROOT, ...exampleDirOf(lectureRel).split('/'), 'assets');
  let files;
  try {
    files = await walkFiles(assetsAbs, { ignoreDirs: IGNORE_DIRS, ignoreNames: IGNORE_NAMES });
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
  if (files.length === 0) return null;
  const outPath = path.join(DOWNLOADS_DIR, assetsZipBasenameFor(sec, lec));
  return zipFiles(assetsAbs, files, outPath, 'assets');
}

// ---------------------------------------------------------------------------
// B. project 方式
// ---------------------------------------------------------------------------

async function findProjectLectures(exclude) {
  // package.json を持つ sections/<sec>/<lec> を、git 管理下のファイルから拾う。
  // git 管理外（init 前）だと ls-files が失敗する。project 方式は git 追跡が前提なので、
  // そのときは警告して飛ばす（example 方式・Office マクロ系は git が無くても配れる）。
  let files;
  try {
    files = await lsFiles(ROOT, 'sections/*/*/package.json');
  } catch {
    console.warn('[build-downloads] not a git repository; skipping project-style lectures (package.json)');
    return [];
  }
  const dirs = files.map((p) => path.posix.dirname(p));
  return [...new Set(dirs)].filter((d) => !exclude.has(d)).sort();
}

function zipProject(lectureRel, files) {
  const { sec, lec } = parseLectureRel(lectureRel);
  const outPath = path.join(DOWNLOADS_DIR, zipBasenameFor(sec, lec));
  const included = files
    .map((fileRel) => path.posix.relative(lectureRel, fileRel))
    .filter((rel) => !isLectureAsset(rel));
  return zipFiles(path.join(ROOT, ...lectureRel.split('/')), included, outPath, lec);
}

async function main() {
  await rm(DOWNLOADS_DIR, { recursive: true, force: true });
  await mkdir(DOWNLOADS_DIR, { recursive: true });

  const exampleLectures = await findExampleLectures();
  for (const lectureRel of exampleLectures) {
    const { sec, lec } = parseLectureRel(lectureRel);
    const count = await zipExample(lectureRel);
    console.log(`[build-downloads] ${lectureRel}/example -> site/public/downloads/${zipBasenameFor(sec, lec)} (${count} files)`);
    const assetCount = await zipExampleAssets(lectureRel);
    if (assetCount !== null) {
      console.log(`[build-downloads] ${lectureRel}/example/assets -> site/public/downloads/${assetsZipBasenameFor(sec, lec)} (${assetCount} files)`);
    }
  }

  // example 方式で出したレクチャーは project 方式で二重に出さない。
  const projectLectures = await findProjectLectures(new Set(exampleLectures));
  for (const lectureRel of projectLectures) {
    const { sec, lec } = parseLectureRel(lectureRel);
    const files = await lsFiles(ROOT, lectureRel);
    const count = await zipProject(lectureRel, files);
    console.log(`[build-downloads] ${lectureRel} -> site/public/downloads/${zipBasenameFor(sec, lec)} (${count}/${files.length} files)`);
  }

  if (exampleLectures.length === 0 && projectLectures.length === 0) {
    console.warn('[build-downloads] no lectures found (sections/*/*/example/ or sections/*/*/package.json)');
  }

  console.log('[build-downloads] done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
