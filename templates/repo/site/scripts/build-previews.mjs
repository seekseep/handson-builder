#!/usr/bin/env node
/**
 * 各レクチャーの「動くコード」（`<lec>/example/`）を public/preview/<sec>-<lec>/ に
 * コピーする。`::codeview` / `::preview` が読み込むライブプレビューの実体はここに置かれる。
 *
 * 対象: sections/<sec>/<lec>/example/index.html を持つレクチャー（ブラウザで動く静的サンプル）。
 * コピー元は example/ 配下すべて（index.html / main.js / scenes/ / assets/ …）。
 * git 追跡は問わず作業ツリーの実ファイルをコピーするので、コミット前でも最新が反映される。
 *
 * 加えて、解説用の小さなデモ（`<lec>/demos/<name>/index.html`）を
 * public/preview/<sec>-<lec>--<name>/ にコピーする。1 レクチャーに複数置けるので、
 * `::preview{demo="<name>"}` から 1 ページに何個でも埋め込める。
 * デモは配布物ではないので ZIP 化（build-downloads.mjs）の対象外。
 */

import { glob, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

import { copyTree } from './libs/fs-walk.mjs';
import { demosDirOf, exampleDirOf, previewNameOf } from './libs/naming.mjs';
import { PUBLIC_DIR, ROOT } from './libs/paths.mjs';

const PREVIEW_DIR = path.join(PUBLIC_DIR, 'preview');
const IGNORE_DIRS = new Set(['node_modules', '.git']);
const IGNORE_NAMES = new Set(['.DS_Store']);

async function findLectures() {
  const dirs = [];
  const it = glob('sections/*/*/example/index.html', { cwd: ROOT });
  for await (const rel of it) {
    // sections/<sec>/<lec>/example/index.html -> sections/<sec>/<lec>
    const posix = rel.split(path.sep).join('/');
    dirs.push(path.posix.dirname(path.posix.dirname(posix)));
  }
  return dirs.sort();
}

/** `{ lectureRel, demo }` の一覧を返す（sections/<sec>/<lec>/demos/<name>/index.html）。 */
async function findDemos() {
  const found = [];
  const it = glob('sections/*/*/demos/*/index.html', { cwd: ROOT });
  for await (const rel of it) {
    // sections/<sec>/<lec>/demos/<name>/index.html
    const parts = rel.split(path.sep).join('/').split('/');
    const [, sec, lec, , demo] = parts;
    found.push({ lectureRel: `sections/${sec}/${lec}`, demo });
  }
  return found.sort((a, b) => `${a.lectureRel}/${a.demo}`.localeCompare(`${b.lectureRel}/${b.demo}`));
}

async function main() {
  await rm(PREVIEW_DIR, { recursive: true, force: true });
  await mkdir(PREVIEW_DIR, { recursive: true });

  const lectures = await findLectures();
  if (lectures.length === 0) {
    console.warn('[build-previews] no lectures found (sections/*/*/example/index.html)');
  }

  for (const lectureRel of lectures) {
    const [, sec, lec] = lectureRel.split('/');
    const srcAbs = path.join(ROOT, ...exampleDirOf(lectureRel).split('/'));
    const destAbs = path.join(PREVIEW_DIR, previewNameOf(sec, lec));
    const rels = await copyTree(srcAbs, destAbs, { ignoreDirs: IGNORE_DIRS, ignoreNames: IGNORE_NAMES });
    console.log(`[build-previews] ${lectureRel}/example -> public/preview/${previewNameOf(sec, lec)}/ (${rels.length} files)`);
  }

  for (const { lectureRel, demo } of await findDemos()) {
    const [, sec, lec] = lectureRel.split('/');
    const srcAbs = path.join(ROOT, ...demosDirOf(lectureRel).split('/'), demo);
    const destAbs = path.join(PREVIEW_DIR, previewNameOf(sec, lec, demo));
    const rels = await copyTree(srcAbs, destAbs, { ignoreDirs: IGNORE_DIRS, ignoreNames: IGNORE_NAMES });
    console.log(`[build-previews] ${lectureRel}/demos/${demo} -> public/preview/${previewNameOf(sec, lec, demo)}/ (${rels.length} files)`);
  }

  console.log('[build-previews] done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
