/**
 * LECTURE.md 中のセンチネルを、実ファイルから生成したブロックへ展開するモジュール。
 * sync-lectures.mjs から呼ばれる（`./project.zip` 差し替えと同じ「sync 時展開」方式）。
 *
 * 対応センチネル:
 *
 *   ::codeview              … コードを簡易エディタ UI で表示する。左にファイル一覧、右にコード。
 *                             既定の対象は現在レクチャーの example/（＝「このステップの完成例」）で、
 *                             このときだけ ZIP ダウンロードボタンが付く。
 *   ::codeview{path="demos/on-vs-once"}   表示するディレクトリ（レクチャーからの相対パス）。
 *                                         既定は "example"。デモには配布 ZIP が無いので
 *                                         ボタンは出ない。
 *   ::codeview{defaultFile="main.js"}     最初に開くファイル（既定は先頭）。
 *   ::codeview[見出し]{...}                ヘッダの文言を上書きする（既定は example なら
 *                                         「このステップの完成例」、それ以外は「このデモのコード」）。
 *
 *   ::assets                … 画像・音などの素材だけを配った ZIP のダウンロードボタンを置く。
 *                             対象は現在レクチャーの example/assets/（build-downloads.mjs が
 *                             `<sec>-<lec>-assets.zip` として出力する）。
 *   ::assets[ラベル]         … ボタンの文言を上書きできる（既定は「素材をダウンロード」）。
 *
 *   ::preview               … その場で遊べるライブプレビュー（iframe）を埋め込む。
 *   ::preview{src="<sec>/<lec>"}   別レクチャーの完成例を指定できる（省略時は現在レクチャー）。
 *   ::preview{demo="<name>"}       example/ ではなく demos/<name>/ を表示する。
 *                                  1 レクチャーに複数置けるので、1 ページに何個でも埋め込める。
 *   ::preview{height="220"}        iframe の高さ（px）を上書きする（既定は CSS の 480px）。
 *   ::preview[キャプション]{...}    figcaption を付けられる。
 *
 *   ::::sheetdemo / ::sheetcode … スプレッドシートの表示。書き方は sheets.mjs を参照。
 *
 * 生成物: エディタは `::::editor{...}` コンテナ（remark-editor.mjs が <section class="editor">
 * に変換）＋コードフェンス。プレビューは生 HTML の <figure><iframe></figure>。
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { walkFiles } from './fs-walk.mjs';
import { ROOT } from './paths.mjs';
import { assetsDownloadUrlFor, downloadUrlFor, previewUrlFor } from './naming.mjs';
import { expandSheetSentinels } from './sheets.mjs';

const CODEVIEW_RE = /^::codeview(?:\[([^\]]*)\])?(?:\{([^}]*)\})?\s*$/;
const PREVIEW_RE = /^::preview(?:\[([^\]]*)\])?(?:\{([^}]*)\})?\s*$/;
const ASSETS_RE = /^::assets(?:\[([^\]]*)\])?(?:\{([^}]*)\})?\s*$/;

// ::codeview{path="..."} の既定値。ここだけが配布 ZIP を持つ。
const EXAMPLE_DIR = 'example';

const IGNORE_DIRS = new Set(['node_modules', '.git']);
const IGNORE_NAMES = new Set(['.DS_Store']);

// エディタに全文表示する（＝学習者が書く）コードの拡張子。
const CODE_EXT = new Map([
  // VBA の標準モジュール（VBE の「ファイルのインポート」で読める形式）と Apps Script。
  ['.bas', 'vb'],
  ['.gs', 'js'],
  ['.html', 'html'],
  ['.js', 'js'],
  ['.css', 'css'],
  ['.json', 'json'],
]);

// ファイル一覧の並び順。Excel が主なので vba/ を先、gas/ を後に寄せる。残りは名前順。
const PRIORITY_DIRS = ['vba/', 'gas/'];

function rank(rel) {
  const i = PRIORITY_DIRS.findIndex((dir) => rel.startsWith(dir));
  return i === -1 ? PRIORITY_DIRS.length : i;
}

function sortFiles(rels) {
  return rels.slice().sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** `key="value"` 形式のディレクティブ属性文字列を { key: value } に。 */
function parseAttrs(s) {
  const attrs = {};
  if (!s) return attrs;
  const re = /(\w+)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(s))) attrs[m[1]] = m[2];
  return attrs;
}

/**
 * `path="..."` を正規化する。レクチャーディレクトリの外に出る指定は無効（null）。
 * 先頭・末尾の `/` は落とし、`example` / `demos/on-vs-once` の形にそろえる。
 */
function normalizeCodePath(input) {
  const rel = String(input ?? EXAMPLE_DIR).trim().replace(/^\/+|\/+$/g, '');
  if (!rel) return EXAMPLE_DIR;
  if (rel.split('/').some((seg) => seg === '..' || seg === '.')) return null;
  return rel;
}

/**
 * コードのあるディレクトリから、簡易エディタ UI ブロック（Markdown）を作る。
 * ディレクトリが無い／コードファイルが 1 つも無ければ null。
 * zipUrl は配布 ZIP がある場合だけ渡す（デモには無い）。
 */
async function buildEditorBlock({ srcAbs, zipUrl, defaultFile, title }) {
  let all;
  try {
    all = await walkFiles(srcAbs, { ignoreDirs: IGNORE_DIRS, ignoreNames: IGNORE_NAMES });
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
  const codeFiles = sortFiles(all.filter((rel) => CODE_EXT.has(path.extname(rel).toLowerCase())));
  if (codeFiles.length === 0) return null;

  const out = [];
  const zipAttr = zipUrl ? ` zip="${zipUrl}"` : '';
  const openAttr = defaultFile ? ` open="${defaultFile}"` : '';
  out.push(`::::editor{title="${title}"${zipAttr}${openAttr}}`);
  for (const rel of codeFiles) {
    const lang = CODE_EXT.get(path.extname(rel).toLowerCase());
    const content = (await readFile(path.join(srcAbs, ...rel.split('/')), 'utf8')).replace(/\n+$/, '');
    out.push('```' + lang + ' data-file="' + rel + '"');
    out.push(content);
    out.push('```');
  }
  out.push('::::');
  return out.join('\n');
}

/**
 * 素材 ZIP のダウンロードボタンの生 HTML を作る。空行を含めない（HTML ブロックを壊さないため）。
 * 何が入っているかが分かるよう、ファイル名も並べる。assets/ が無いレクチャーでは null。
 */
async function buildAssetsBlock({ exampleAbs, sec, lec, base, label }) {
  const assetsAbs = path.join(exampleAbs, 'assets');
  let files;
  try {
    files = await walkFiles(assetsAbs, { ignoreDirs: IGNORE_DIRS, ignoreNames: IGNORE_NAMES });
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
  if (files.length === 0) return null;

  const url = assetsDownloadUrlFor(base, sec, lec);
  const list = files.sort().map((rel) => `<code>${rel}</code>`).join('、');
  return (
    `<div class="assets-download">` +
    `<a class="download-button" href="${url}" download>` +
    `<span class="download-button__icon" aria-hidden="true"></span>` +
    `<span class="download-button__label">${label || '素材をダウンロード'}</span>` +
    `</a>` +
    `<p class="assets-download__files">中身（${files.length} ファイル）: ${list}` +
    `</p>` +
    `</div>`
  );
}

/** ライブプレビュー（iframe）の生 HTML を作る。空行を含めない（HTML ブロックを壊さないため）。 */
function buildPreviewBlock({ base, sec, lec, demo, caption, height }) {
  const src = previewUrlFor(base, sec, lec, demo);
  const cap = caption ? `<figcaption class="lecture-preview__caption">${caption}</figcaption>` : '';
  // 高さは CSS（.lecture-preview__frame）の既定 480px を inline style で上書きする。
  const style = /^\d+$/.test(String(height ?? '')) ? ` style="height:${height}px"` : '';
  return (
    `<figure class="lecture-preview">` +
    `<div class="lecture-preview__bar">` +
    `<button type="button" class="lecture-preview__reload" title="プレビューを再読み込み">↻ 再読み込み</button>` +
    // 開発者ツールを開いて確かめる節があるので、iframe の外で開く導線も用意する。
    `<a class="lecture-preview__open" href="${src}" target="_blank" rel="noopener"` +
    ` title="プレビューを新しいタブで開く">↗ 新しいタブで開く</a>` +
    `</div>` +
    `<iframe class="lecture-preview__frame" src="${src}" title="ライブプレビュー" loading="lazy"${style}></iframe>` +
    cap +
    `</figure>`
  );
}

/**
 * 本文中の `::codeview` / `::assets` / `::preview` センチネルを展開する。
 * current = { sec, lec }（このレクチャー）。
 *
 * レクチャー以外の docs（トップページや章の概要）でも呼べる。ただし自分の `example/` を
 * 持たないので、使えるのは行き先を明示した `::preview{src="<sec>/<lec>"}` だけ。
 * `::codeview` / `::assets` と行き先の無い `::preview` は警告を出して行ごと消す。
 */
export async function expandSentinels(body, { lectureAbsDir, sec, lec, base, where: label }) {
  const inLecture = Boolean(sec && lec);
  const where = inLecture ? `sections/${sec}/${lec}` : (label || 'docs');
  // レクチャー以外では、センチネルが1つも無ければ何もしない。
  if (!inLecture && !/^::(codeview|preview|assets|::sheetdemo|sheetcode)\b/m.test(body)) return body;
  const exampleAbs = inLecture ? path.join(lectureAbsDir, EXAMPLE_DIR) : null;
  // `::::sheetdemo` / `::sheetcode`（スプレッドシート表示）は sheets.mjs で展開する。
  // レクチャー以外（概要ページなど）では、src="<sec>/<lec>" で指したレクチャーのブックを使う。
  // lectureDirFor は「自分のレクチャー/../../<src>」で探すので、sections/ 直下の仮の位置を渡す。
  body = await expandSheetSentinels(body, {
    lectureAbsDir: inLecture ? lectureAbsDir : path.join(ROOT, 'sections', '_', '_'),
    where,
    parseAttrs,
  });

  const lines = body.split('\n');
  const out = [];
  for (const line of lines) {
    const cv = line.match(CODEVIEW_RE);
    if (cv) {
      if (!inLecture) {
        console.warn(`[sentinels] ::codeview is only available in a LECTURE.md (${where}, skipped)`);
        continue;
      }
      const attrs = parseAttrs(cv[2]);
      const rel = normalizeCodePath(attrs.path);
      if (!rel) {
        console.warn(`[sentinels] ::codeview has an invalid path="${attrs.path}" in ${where} (skipped)`);
        continue;
      }
      const isExample = rel === EXAMPLE_DIR;
      const block = await buildEditorBlock({
        srcAbs: path.join(lectureAbsDir, ...rel.split('/')),
        // 配布 ZIP があるのは example/ だけ（build-downloads.mjs の対象）。
        zipUrl: isExample ? downloadUrlFor(base, sec, lec) : null,
        defaultFile: attrs.defaultFile,
        title: cv[1] ? cv[1].trim() : isExample ? 'このステップの完成例' : 'このデモのコード',
      });
      if (block) {
        out.push(block);
        continue;
      }
      console.warn(`[sentinels] ::codeview but no code in ${where}/${rel} (skipped)`);
      continue;
    }
    const as = line.match(ASSETS_RE);
    if (as) {
      if (!inLecture) {
        console.warn(`[sentinels] ::assets is only available in a LECTURE.md (${where}, skipped)`);
        continue;
      }
      const label = as[1] ? as[1].trim() : '';
      const block = await buildAssetsBlock({ exampleAbs, sec, lec, base, label });
      if (block) {
        out.push(block);
        continue;
      }
      console.warn(`[sentinels] ::assets but no example/assets in ${where} (skipped)`);
      continue;
    }
    const pv = line.match(PREVIEW_RE);
    if (pv) {
      const caption = pv[1] ? pv[1].trim() : '';
      const attrs = parseAttrs(pv[2]);
      let tSec = sec;
      let tLec = lec;
      if (attrs.src) {
        const parts = attrs.src.split('/');
        if (parts.length === 2) {
          tSec = parts[0];
          tLec = parts[1];
        }
      }
      if (!tSec || !tLec) {
        console.warn(`[sentinels] ::preview outside a lecture needs src="<sec>/<lec>" (${where}, skipped)`);
        continue;
      }
      out.push(buildPreviewBlock({
        base,
        sec: tSec,
        lec: tLec,
        demo: attrs.demo,
        caption,
        height: attrs.height,
      }));
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}
