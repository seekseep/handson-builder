#!/usr/bin/env node
/**
 * 各レクチャーのサンプルを ZIP 化し、site/public/downloads/ に出力する。
 *
 * レクチャーの形は 2 通りあり、どちらも同じ `<sec>-<lec>.zip` に出力する。
 *
 * ── A. example 方式（静的ブラウザアプリ。`<lec>/example/index.html` を持つ）
 *   中身: example/ 配下すべて（作業ツリー直読み。git 追跡は問わない）。
 *   ZIP 内のルートフォルダは常に `game/`。どの節を解凍しても `game/` になるので、
 *   前の `game/` に上書き展開すればそのまま育てていける。
 *   加えて `example/assets/` を持つレクチャーは、素材だけの
 *   `<sec>-<lec>-assets.zip`（ルートフォルダは `assets/`）も出す。
 *   画像・音を扱う節で「素材だけ落として game/assets/ に置く」ためのもの。
 *
 * ── B. project 方式（`<lec>/package.json` を持つ。Cloudflare 系 / Docker+Postgres 系）
 *   中身: git 管理下のファイル (libs/git.mjs) だけ。
 *     これにより node_modules/ .wrangler/ dist/ .dev.vars .env *.pem/*.key、
 *     各自コピー用の wrangler.jsonc など .gitignore 済みのものは自動で除外される。
 *     example (wrangler.example.jsonc / .dev.vars.example) や、追跡されている
 *     wrangler.jsonc は自然に含まれる。
 *   そのうえで教材ファイル (LECTURE.md, images/, demos/) だけ明示的に除外する。
 *   ZIP 内のルートフォルダは `<lec>/`（展開時に名前付きフォルダができる）。
 *
 * ダウンロード URL の規約 (<sec>-<lec>.zip) は libs/naming.mjs に集約し、
 * sync-lectures.mjs のリンク生成と共有している。
 */

import { createWriteStream } from 'node:fs';
import { glob, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

import { ZipArchive } from 'archiver';

import { walkFiles } from './libs/fs-walk.mjs';
import { lsFiles } from './libs/git.mjs';
import { assetsZipBasenameFor, exampleDirOf, parseLectureRel, zipBasenameFor } from './libs/naming.mjs';
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

/** files（<absDir> 相対）を outPath に ZIP 化する。ZIP 内は rootDir/ 配下に置く。 */
function zipFiles(absDir, files, outPath, rootDir) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });
    output.on('close', () => resolve(files.length));
    archive.on('warning', reject);
    archive.on('error', reject);
    archive.pipe(output);
    for (const rel of files) {
      archive.file(path.join(absDir, ...rel.split('/')), { name: path.posix.join(rootDir, rel) });
    }
    archive.finalize();
  });
}

// ---------------------------------------------------------------------------
// A. example 方式
// ---------------------------------------------------------------------------

async function findExampleLectures() {
  const dirs = [];
  const it = glob('sections/*/*/example/index.html', { cwd: ROOT });
  for await (const rel of it) {
    const posix = rel.split(path.sep).join('/');
    dirs.push(path.posix.dirname(path.posix.dirname(posix)));
  }
  return dirs.sort();
}

async function zipExample(lectureRel) {
  const { sec, lec } = parseLectureRel(lectureRel);
  const exampleAbs = path.join(ROOT, ...exampleDirOf(lectureRel).split('/'));
  const files = await walkFiles(exampleAbs, { ignoreDirs: IGNORE_DIRS, ignoreNames: IGNORE_NAMES });
  const outPath = path.join(DOWNLOADS_DIR, zipBasenameFor(sec, lec));
  return zipFiles(exampleAbs, files, outPath, 'game');
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
  const files = await lsFiles(ROOT, 'sections/*/*/package.json');
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
    console.warn('[build-downloads] no lectures found (sections/*/*/example/index.html or sections/*/*/package.json)');
  }

  console.log('[build-downloads] done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
