/**
 * スプレッドシート表示のセンチネル（sentinels.mjs から呼ばれる）。
 *
 *   ::::sheetdemo[キャプション]{book="data/sales.xlsx" sheet="売上" range="A1:F8"}
 *   F2:F31 = 1250, 360, 600
 *   J2 = 68580
 *   ::::
 *     … 実行前のシートを表示し、「▶ 実行」で中の行に書いたセルの値に切り替える。
 *       コードは実際には動かさない（何が起きるかのイメージを見せるだけ）。
 *       中の行は `セル = 値` または `範囲 = 値, 値, …`（範囲は左上から行の順に埋める）。
 *       `msgbox = 文言` と書くと、「▶ 実行」でメッセージの小窓（VBA の MsgBox ／ GAS の alert）も出す。
 *       GAS で文言を変えたいときは `msgbox.sheets = 文言` を足す（無ければ msgbox と同じ）。
 *       `before 範囲 = 値, …` で実行前の値を置ける（ブックの値の代わりに描く）。
 *       `log = 文言`（GAS 用は `log.sheets = 文言`）を並べると、実行でイミディエイト ウィンドウ ／ 実行ログの欄に出す。
 *       `tabs = 名前, 名前` で、実行するとシートの見出しが増える。openTab="added" を付けると、最初に足したシートを選んだ状態にする。
 *       book を省略すると空白のシート（range 既定 A1:E6）を描く。空白のブックから始める節向け。
 *       macro="Hello" を付けると、「▶ 実行」の代わりに実際の操作に近い流れになる:
 *         Excel        …「マクロ」ボタン → マクロの一覧から選んで「実行」（開発 → マクロ と同じ）
 *         スプレッドシート … 関数の選択欄で選んで「▶ 実行」（Apps Script エディタと同じ）
 *       一覧に並べる名前は macros="Hello,WriteCells"（既定は macro だけ）。GAS 側の名前は
 *       先頭を小文字にしたもの（Hello → hello）。結果が出るのは macro を選んだときだけ。
 *
 *   ::sheetcode{book="data/sales.xlsx" sheet="売上" range="A1:F8" code="SalesSummary" macro="CalcAmounts"}
 *     … VBA ／ GAS のコードと、そのコードが扱うシートを左右に並べる。
 *       code="SalesSummary" で vba/SalesSummary.bas と gas/SalesSummary.gs を対にする。
 *       macro="CalcAmounts" で VBA は Sub CalcAmounts、GAS は function calcAmounts だけを切り出す
 *       （省略するとファイル全体）。VBA ／ GAS の切り替えは `::::platform` と共有する。
 *
 * 共通の属性:
 *   book      … example/ から数えたブックのパス（::sheetcode では必須。::::sheetdemo では省略すると空白のシート）
 *   sheet     … 表示するシート名（省略時は先頭）
 *   range     … 表示する範囲（省略時はデータのある範囲全体）
 *   highlight … 強調する範囲。カンマ区切りで複数書ける
 *   src       … 別レクチャーの example/ を使うとき `<sec>/<lec>`
 *
 * 生成物: シートは生 HTML（空行を含めない）。::sheetcode はコードフェンスを含む
 * `::::sheetcode` コンテナになり、remark-sheetcode.mjs が左右に並べる。
 * クリック時の動き（実行・リセット・数式バー）は site/src/scripts/sheet-client.js、
 * 装飾は site/src/styles/sheet.css。
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const SHEETDEMO_OPEN_RE = /^::::sheetdemo(?:\[([^\]]*)\])?(?:\{([^}]*)\})?\s*$/;
export const SHEETCODE_RE = /^::sheetcode(?:\[([^\]]*)\])?(?:\{([^}]*)\})?\s*$/;
const CLOSE_RE = /^::::\s*$/;

// exceljs は読み込みに 0.1 秒ほどかかる。sync は dev 中にファイルを保存するたび走るので、
// シートのセンチネルがあるページを展開するときだけ読み込む。
let excelJs;
async function newWorkbook() {
  excelJs ??= (await import('exceljs')).default;
  return new excelJs.Workbook();
}

const books = new Map();

function loadBook(abs) {
  if (!books.has(abs)) {
    books.set(abs, (async () => {
      const wb = await newWorkbook();
      await wb.xlsx.readFile(abs);
      return wb;
    })());
  }
  return books.get(abs);
}

// ---- セル番地 ----

function colToNum(letters) {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function numToCol(n) {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function parseRef(ref) {
  const m = String(ref).trim().match(/^([A-Za-z]+)(\d+)$/);
  return m ? { col: colToNum(m[1]), row: Number(m[2]) } : null;
}

/** `A1:F8` / `F2` を { top, left, bottom, right } に。読めなければ null。 */
function parseRange(s) {
  const [a, b] = String(s).split(':');
  const p = parseRef(a);
  const q = b ? parseRef(b) : p;
  if (!p || !q) return null;
  return {
    top: Math.min(p.row, q.row),
    left: Math.min(p.col, q.col),
    bottom: Math.max(p.row, q.row),
    right: Math.max(p.col, q.col),
  };
}

function inRange(r, row, col) {
  return row >= r.top && row <= r.bottom && col >= r.left && col <= r.right;
}

// ---- 値の表示 ----

const pad = (n) => String(n).padStart(2, '0');

/** ブックの表示形式に合わせて、画面に出す文字列を作る。使っている形式だけに対応する。 */
function formatValue(value, numFmt) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = pad(value.getUTCMonth() + 1);
    const d = pad(value.getUTCDate());
    return `${y}/${m}/${d}`;
  }
  if (typeof value === 'object') {
    // 数式のセル。openpyxl で作ったブックは結果の値を持たないので、あれば出す。
    if ('formula' in value || 'sharedFormula' in value) return formatValue(value.result, numFmt);
    if ('richText' in value) return value.richText.map((t) => t.text).join('');
    if ('text' in value) return String(value.text);
    return '';
  }
  if (typeof value === 'number' && numFmt && /#,##0/.test(numFmt)) {
    const s = Math.round(value).toLocaleString('en-US');
    return /"¥"|\\¥|¥/.test(numFmt) ? `¥${s}` : s;
  }
  return String(value);
}

/** 数式バーに出す文字列（数式ならその式）。 */
function rawValue(value) {
  if (value && typeof value === 'object' && 'formula' in value) return `=${value.formula}`;
  return formatValue(value);
}

function isNumberLike(value) {
  if (typeof value === 'number' || value instanceof Date) return true;
  if (value && typeof value === 'object' && 'result' in value) return isNumberLike(value.result);
  return false;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function argbToCss(color) {
  const argb = color?.argb;
  if (!argb || argb.length !== 8) return null;
  return `#${argb.slice(2)}`;
}

// Excel の列幅（文字数）をおおよその px に。
const colWidthPx = (w) => Math.round((w ?? 8.43) * 7 + 5);

// ---- シートの HTML ----

/**
 * シート 1 枚を表示する HTML（1 行。空行を含めない）。
 * after = Map<"F2", 値>。指定したセルには実行後の表示を data-after に持たせる。
 */
/** シート 1 枚の表（<table>）を描く。after は実行後の値、before は描くときに上書きする値。 */
function renderGrid(ws, { range, highlight, after, before }) {
  const dims = ws.dimensions;
  const view = parseRange(range) ?? {
    top: 1,
    left: 1,
    bottom: Math.max(dims?.bottom ?? 1, 1),
    right: Math.max(dims?.right ?? 1, 1),
  };
  const marks = String(highlight ?? '')
    .split(',')
    .map((s) => parseRange(s))
    .filter(Boolean);

  // 結合セル: 左上は colspan/rowspan、残りは描かない。
  const merges = [];
  for (const m of ws.model.merges ?? []) {
    const r = parseRange(m);
    if (r) merges.push(r);
  }
  const mergeAt = (row, col) => merges.find((r) => r.top === row && r.left === col);
  const hidden = (row, col) => merges.some((r) => inRange(r, row, col) && !(r.top === row && r.left === col));

  const cols = [];
  cols.push('<col class="sheet__rowhead-col">');
  // 列幅はブックの指定どおりに固定する（Excel と同じく、長い文字で列が広がらないように）。
  let tableWidth = 0;
  for (let c = view.left; c <= view.right; c++) {
    const w = colWidthPx(ws.getColumn(c).width);
    tableWidth += w;
    cols.push(`<col style="width:${w}px">`);
  }

  const head = ['<th class="sheet__corner"></th>'];
  for (let c = view.left; c <= view.right; c++) head.push(`<th class="sheet__colhead">${numToCol(c)}</th>`);

  const rows = [];
  for (let r = view.top; r <= view.bottom; r++) {
    const tds = [`<th class="sheet__rowhead">${r}</th>`];
    for (let c = view.left; c <= view.right; c++) {
      if (hidden(r, c)) continue;
      const cell = ws.getCell(r, c);
      const ref = `${numToCol(c)}${r}`;
      // `before` で実行前の値を指定したセルは、ブックの値の代わりにそれを描く（ブックはキャッシュを共有するので書き換えない）。
      const value = before?.has(ref) ? before.get(ref) : cell.value;
      const cls = ['sheet__cell'];
      const style = [];
      const attrs = [`data-ref="${ref}"`];
      const fill = cell.fill?.type === 'pattern' ? argbToCss(cell.fill.fgColor) : null;
      if (fill) style.push(`background-color:${fill}`);
      if (cell.font?.bold) cls.push('is-bold');
      if (cell.font?.size && cell.font.size >= 13) style.push(`font-size:${(cell.font.size / 11).toFixed(2)}em`);
      const align = cell.alignment?.horizontal;
      if (align === 'center' || align === 'right' || align === 'left') style.push(`text-align:${align}`);
      else if (isNumberLike(value)) cls.push('is-number');
      if (marks.some((m) => inRange(m, r, c))) cls.push('is-highlight');
      const merge = mergeAt(r, c);
      if (merge) {
        const cs = Math.min(merge.right, view.right) - c + 1;
        const rs = Math.min(merge.bottom, view.bottom) - r + 1;
        if (cs > 1) attrs.push(`colspan="${cs}"`);
        if (rs > 1) attrs.push(`rowspan="${rs}"`);
      }
      const shown = formatValue(value, cell.numFmt);
      const raw = rawValue(value);
      // Excel と同じく、左寄せの文字は右隣のセルが空ならそこまではみ出して見せる。
      const nextRef = `${numToCol(c + 1)}${r}`;
      const nextValue = before?.has(nextRef) ? before.get(nextRef) : ws.getCell(r, c + 1).value;
      const hasText = shown !== '' || after?.has(ref);
      const nextEmpty = formatValue(nextValue) === '' && !after?.has(nextRef) && !mergeAt(r, c + 1) && !hidden(r, c + 1);
      if (hasText && nextEmpty && !merge && c < view.right && !cls.includes('is-number') && align !== 'right' && align !== 'center') {
        cls.push('is-overflow');
      }
      if (raw !== shown) attrs.push(`data-raw="${escapeHtml(raw)}"`);
      if (after?.has(ref)) {
        const v = after.get(ref);
        attrs.push(`data-after="${escapeHtml(formatValue(v, cell.numFmt))}"`);
        attrs.push(`data-after-raw="${escapeHtml(rawValue(v))}"`);
        if ((typeof v === 'number' || v instanceof Date) && !align) attrs.push('data-after-number');
      }
      if (style.length) attrs.push(`style="${style.join(';')}"`);
      tds.push(`<td class="${cls.join(' ')}" ${attrs.join(' ')}>${escapeHtml(shown)}</td>`);
    }
    rows.push(`<tr>${tds.join('')}</tr>`);
  }

  return (
    `<table class="sheet__table" style="width:calc(2.6rem + ${tableWidth}px)"><colgroup>${cols.join('')}</colgroup>` +
    `<thead><tr>${head.join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`
  );
}

/**
 * ブック 1 冊ぶんの画面（タイトルバー・リボン・数式バー・シート・シートの見出し）を描く。
 * ブックの全シートを描き、見出しを押すと切り替わる（sheet-client.js）。最初は ws を出す。
 *   after / before … ws（選んでいるシート）に対する実行後の値 ／ 描くときに上書きする値
 *   sheetValues     … Map<シート名, Map<ref, 値>>。ws 以外のシートに描くときに上書きする値
 *   extraTabs       … 実行で増えるシート [{ name, from }]。from のシートをコピーした中身に
 *                     sheetValues.get(name) を上書きして描き、実行するまで隠しておく
 */
function renderSheet(wb, ws, { range, highlight, after, before, sheetValues = new Map(), extraTabs = [], fileName, ribbon = '', blank = false }) {
  const panes = [];
  const tabs = [];
  const sheets = blank ? [ws] : wb.worksheets;
  for (const s of sheets) {
    const active = s === ws;
    const table = active
      ? renderGrid(s, { range, highlight, after, before })
      : renderGrid(s, { before: sheetValues.get(s.name) });
    panes.push(`<div class="sheet__grid" data-sheet="${escapeHtml(s.name)}"${active ? '' : ' hidden'}>${table}</div>`);
    // 空白のブックは、新しく作ったときの名前を環境ごとに出す（Excel は Book1 / Sheet1）。
    const label = blank
      ? `<span class="sheet__only--excel">Sheet1</span><span class="sheet__only--sheets">シート1</span>`
      : escapeHtml(s.name);
    tabs.push(`<button type="button" class="sheet__tab${active ? ' is-active' : ''}" data-sheet="${escapeHtml(s.name)}">${label}</button>`);
  }
  // 実行で増えるシート（`tabs = ...`）。最初は隠しておき、実行すると出す。
  for (const t of extraTabs) {
    const src = t.from ? wb.getWorksheet(t.from) : null;
    const values = sheetValues.get(t.name);
    const table = src
      ? renderGrid(src, { before: values })
      : renderGrid(blankSheet(), { range: rangeFor(values), before: values });
    panes.push(`<div class="sheet__grid" data-sheet="${escapeHtml(t.name)}" hidden>${table}</div>`);
    tabs.push(`<button type="button" class="sheet__tab sheet__tab--added" data-sheet="${escapeHtml(t.name)}" hidden>${escapeHtml(t.name)}</button>`);
  }
  const file = blank
    ? `<span class="sheet__file"><span class="sheet__only--excel">Book1</span><span class="sheet__only--sheets">無題のスプレッドシート</span></span>`
    : `<span class="sheet__file">${escapeHtml(fileName)}</span>`;

  return (
    `<div class="sheet not-content">` +
    `<div class="sheet__titlebar">` +
    `<span class="sheet__app sheet__app--excel sheet__only--excel">Excel</span>` +
    `<span class="sheet__app sheet__app--sheets sheet__only--sheets">スプレッドシート</span>` +
    file +
    `</div>` +
    ribbon +
    `<div class="sheet__formulabar">` +
    `<span class="sheet__namebox"></span><span class="sheet__fx">fx</span><span class="sheet__formula"></span>` +
    `</div>` +
    panes.join('') +
    // 下端をドラッグすると、シートの表示を縦に広げられる。
    `<div class="sheet__resizer" role="separator" aria-orientation="horizontal" aria-label="表示の高さを変える"></div>` +
    `<div class="sheet__tabs">${tabs.join('')}</div>` +
    `</div>`
  );
}

// 増えるシートに元のシートが無いとき（白紙のシート）に使う、空のシートの代わり。
// renderGrid が使うのは dimensions / model.merges / getColumn / getCell だけなので、その形だけをそろえる。
function blankSheet() {
  return { dimensions: null, model: { merges: [] }, getColumn: () => ({}), getCell: () => ({ value: null }) };
}

// 白紙のシートに値を書くときは、書いた範囲が収まる大きさで描く（最低 A1:F10）。
function rangeFor(values) {
  let bottom = 10;
  let right = 6;
  for (const ref of values?.keys() ?? []) {
    const p = parseRef(ref);
    if (p) {
      bottom = Math.max(bottom, p.row);
      right = Math.max(right, p.col);
    }
  }
  return `A1:${numToCol(right)}${bottom}`;
}

// ---- 属性・ファイル ----

/** ブックや コードを読むレクチャーディレクトリ。src="<sec>/<lec>" なら別レクチャー。 */
function lectureDirFor(attrs, lectureAbsDir) {
  if (!attrs.src) return lectureAbsDir;
  const parts = attrs.src.split('/');
  if (parts.length !== 2 || parts.some((p) => !/^[\w-]+$/.test(p))) return null;
  return path.join(lectureAbsDir, '..', '..', parts[0], parts[1]);
}

function safeRel(rel) {
  const s = String(rel ?? '').trim().replace(/^\/+/, '');
  if (!s || s.split('/').some((seg) => seg === '..' || seg === '.')) return null;
  return s;
}

async function sheetHtml(attrs, lectureAbsDir, after, { allowBlank = false, ribbon = '', before, sheetValues, extraTabs } = {}) {
  const common = { highlight: attrs.highlight, after, ribbon, before, sheetValues, extraTabs };
  // book を指定しないときは空白のブック。シート名は sheet 属性（既定 Sheet1）。
  if (allowBlank && !attrs.book) {
    const wb = await newWorkbook();
    const ws = wb.addWorksheet(attrs.sheet || 'Sheet1');
    return { html: renderSheet(wb, ws, { ...common, range: attrs.range || 'A1:E6', blank: !attrs.sheet }) };
  }
  const dir = lectureDirFor(attrs, lectureAbsDir);
  const rel = safeRel(attrs.book);
  if (!dir || !rel) return { error: `invalid book="${attrs.book ?? ''}"` };
  const abs = path.join(dir, 'example', ...rel.split('/'));
  let wb;
  try {
    wb = await loadBook(abs);
  } catch (e) {
    return { error: `cannot read ${path.relative(path.join(lectureAbsDir, '..', '..'), abs)} (${e.code ?? e.message})` };
  }
  const ws = attrs.sheet ? wb.getWorksheet(attrs.sheet) : wb.worksheets[0];
  if (!ws) return { error: `no sheet "${attrs.sheet}" in ${rel}` };
  return { html: renderSheet(wb, ws, { ...common, range: attrs.range, fileName: path.basename(rel) }) };
}

// ---- ::::sheetdemo ----

// VBA の Hello に対する GAS の関数名は hello（先頭だけ小文字。AGENTS.md の命名ルール）。
function gasNameOf(vbaName) {
  return vbaName.charAt(0).toLowerCase() + vbaName.slice(1);
}

function parseValue(s) {
  const t = s.trim();
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  // 2026/10/07 のような日付は Date にする（ブックの日付と同じく右寄せで描く）。
  const d = t.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (d) return new Date(Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3])));
  // 数式も書ける（数式バーに出す）。セルにはそのまま表示する。
  if (t.startsWith('=')) return { formula: t.slice(1), result: undefined };
  return t.replace(/^"(.*)"$/, '$1');
}

/**
 * `F2:F31 = 1, 2, 3` / `請求書_ひまわり商事!A5 = …` の行を読む。
 * 返り値は { sheet, entries: [[ref, 値], …] }（sheet はシート名の指定が無ければ null）。読めなければ null。
 */
function parseCellLine(line) {
  const m = line.match(/^\s*(?:([^!=]+)!)?([A-Za-z]+\d+(?::[A-Za-z]+\d+)?)\s*=\s*(.*)$/);
  if (!m) return null;
  const map = new Map();
  if (!fillRange(m[2], m[3], map)) return null;
  return { sheet: m[1] ? m[1].trim() : null, entries: [...map] };
}

/** `F2:F31 = 1, 2, 3` の行を Map<ref, 値> に足す。読めなければ false。 */
function parseAfterLine(line, after) {
  const m = line.match(/^\s*([A-Za-z]+\d+(?::[A-Za-z]+\d+)?)\s*=\s*(.*)$/);
  if (!m) return false;
  return fillRange(m[1], m[2], after);
}

function fillRange(rangeText, valuesText, map) {
  const r = parseRange(rangeText);
  if (!r) return false;
  const after = map;
  const values = valuesText.split(',').map(parseValue);
  let i = 0;
  for (let row = r.top; row <= r.bottom; row++) {
    for (let col = r.left; col <= r.right; col++) {
      if (i >= values.length) return true;
      after.set(`${numToCol(col)}${row}`, values[i++]);
    }
  }
  return true;
}

const MSGBOX_RE = /^\s*msgbox(?:\.(excel|sheets))?\s*=\s*(.*)$/i;
const LOG_RE = /^\s*log(?:\.(excel|sheets))?\s*=\s*(.*)$/i;
const BEFORE_RE = /^\s*before\s+(.*)$/i;
const TABS_RE = /^\s*tabs\s*=\s*(.*)$/i;

/** 実行で出すログ（VBA は Debug.Print のイミディエイト ウィンドウ、GAS は console.log の実行ログ）。 */
function logHtml(log) {
  const lines = (arr) => arr.map((l) => `<span class="sheetdemo__log-line">${escapeHtml(l)}</span>`).join('');
  const excel = log.excel.length ? log.excel : log.sheets;
  const sheets = log.sheets.length ? log.sheets : log.excel;
  return (
    `<div class="sheetdemo__log" hidden>` +
    `<div class="sheetdemo__log-title"><span class="sheet__only--excel">イミディエイト</span><span class="sheet__only--sheets">実行ログ</span></div>` +
    `<div class="sheetdemo__log-body sheet__only--excel">${lines(excel)}</div>` +
    `<div class="sheetdemo__log-body sheet__only--sheets">${lines(sheets)}</div>` +
    `</div>`
  );
}

/** 「▶ 実行」で出すメッセージの小窓。Excel（MsgBox）とスプレッドシート（alert）の 2 通りを持つ。 */
function dialogHtml(msg) {
  const excel = msg.excel ?? msg.sheets;
  const sheets = msg.sheets ?? msg.excel;
  return (
    `<div class="sheetdemo__dialog" hidden>` +
    `<div class="sheetdemo__dialog-box sheetdemo__dialog-box--excel sheet__only--excel" role="dialog" aria-label="Microsoft Excel">` +
    `<div class="sheetdemo__dialog-title">Microsoft Excel</div>` +
    `<p class="sheetdemo__dialog-text">${escapeHtml(excel)}</p>` +
    `<div class="sheetdemo__dialog-actions"><button type="button" class="sheetdemo__dialog-ok">OK</button></div>` +
    `</div>` +
    `<div class="sheetdemo__dialog-box sheetdemo__dialog-box--sheets sheet__only--sheets" role="dialog" aria-label="スプレッドシートのメッセージ">` +
    `<p class="sheetdemo__dialog-text">${escapeHtml(sheets)}</p>` +
    `<div class="sheetdemo__dialog-actions"><button type="button" class="sheetdemo__dialog-ok">OK</button></div>` +
    `</div>` +
    `</div>`
  );
}

export async function buildSheetDemo({ caption, attrs, lines, lectureAbsDir, where }) {
  const after = new Map();
  const before = new Map();
  const sheetValues = new Map();
  const msg = {};
  const log = { excel: [], sheets: [] };
  const extraTabs = [];
  // 選んでいるシート（attrs.sheet、無ければ先頭）以外のシート名が付いた行は、そのシートの中身として描く。
  const putSheet = (name, entries) => {
    if (!sheetValues.has(name)) sheetValues.set(name, new Map());
    for (const [ref, v] of entries) sheetValues.get(name).set(ref, v);
  };
  for (const line of lines) {
    if (!line.trim()) continue;
    const m = line.match(MSGBOX_RE);
    if (m) {
      msg[(m[1] || 'excel').toLowerCase()] = m[2].trim().replace(/^"(.*)"$/, '$1');
      continue;
    }
    const lg = line.match(LOG_RE);
    if (lg) {
      log[(lg[1] || 'excel').toLowerCase()].push(lg[2].replace(/^"(.*)"$/, '$1'));
      continue;
    }
    const tb = line.match(TABS_RE);
    if (tb) {
      // `新しいシート <- 元のシート` で、元のシートをコピーした中身にする。
      for (const t of tb[1].split(',').map((x) => x.trim()).filter(Boolean)) {
        const [name, from] = t.split('<-').map((x) => x.trim());
        extraTabs.push({ name, from: from || null });
      }
      continue;
    }
    const bf = line.match(BEFORE_RE);
    const cell = parseCellLine(bf ? bf[1] : line);
    if (!cell) {
      console.warn(`[sheets] ::::sheetdemo: cannot read "${line}" in ${where}`);
      continue;
    }
    const activeName = attrs.sheet || null;
    if (cell.sheet && cell.sheet !== activeName) {
      putSheet(cell.sheet, cell.entries);
      continue;
    }
    for (const [ref, v] of cell.entries) (bf ? before : after).set(ref, v);
  }
  const hasMsg = msg.excel !== undefined || msg.sheets !== undefined;
  const hasLog = log.excel.length > 0 || log.sheets.length > 0;
  const canRun = after.size || hasMsg || hasLog || extraTabs.length;
  const useMacro = Boolean(canRun && attrs.macro);
  const names = useMacro
    ? [...new Set([attrs.macro, ...String(attrs.macros || '').split(',').map((n) => n.trim()).filter(Boolean)])]
    : [];
  // Excel: 本文の手順（「開発」タブ →「マクロ」）どおり、Excel の画面の中にリボンを描く。
  const ribbon = useMacro
    ? `<div class="sheet__ribbon sheet__only--excel">` +
      `<div class="sheet__ribbon-tabs">` +
      ['ファイル', 'ホーム', '挿入', 'ページ レイアウト', '数式', 'データ', '校閲', '表示']
        .map((t) => `<span>${t}</span>`)
        .join('') +
      `<span class="is-active">開発</span>` +
      `</div>` +
      `<div class="sheet__ribbon-body">` +
      `<span class="sheet__ribbon-btn is-disabled">Visual Basic</span>` +
      `<button type="button" class="sheet__ribbon-btn sheetdemo__macro-open">マクロ</button>` +
      `</div>` +
      `</div>`
    : '';
  const { html, error } = await sheetHtml(attrs, lectureAbsDir, after, { allowBlank: true, ribbon, before, sheetValues, extraTabs });
  if (error) {
    console.warn(`[sheets] ::::sheetdemo ${error} in ${where} (skipped)`);
    return null;
  }
  const cap = caption ? `<figcaption class="sheetdemo__caption">${escapeHtml(caption)}</figcaption>` : '';
  const reset = `<button type="button" class="sheetdemo__reset" disabled>↺ リセット</button>`;
  const note =
    `<span class="sheetdemo__note">ブラウザ上での再現です</span>` +
    `<button type="button" class="sheetdemo__fullscreen" aria-pressed="false">⛶ 全画面</button>`;
  let buttons = '';
  let picker = '';
  let gasEditor = '';
  if (useMacro) {
    buttons = `<div class="sheetdemo__bar" data-macro="${escapeHtml(attrs.macro)}">${reset}${note}</div>`;
    // スプレッドシート: 本文の手順（Apps Script エディタで関数を選んで実行）どおり、
    // シートの上にエディタの画面を描く。小窓はシート側に出る。
    const gasOptions = names
      .map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(gasNameOf(n))}</option>`)
      .join('');
    gasEditor =
      `<div class="sheetdemo__gas-editor sheet__only--sheets">` +
      `<div class="sheetdemo__gas-titlebar"><span class="sheetdemo__gas-logo"></span>Apps Script<span class="sheetdemo__gas-project">無題のプロジェクト</span></div>` +
      `<div class="sheetdemo__gas-toolbar">` +
      `<button type="button" class="sheetdemo__gas-run">▶ 実行</button>` +
      `<span class="sheetdemo__gas-debug">デバッグ</span>` +
      `<select class="sheetdemo__gas-select" aria-label="実行する関数">${gasOptions}</select>` +
      `</div>` +
      `</div>`;
    const items = names
      .map((n) => `<li><button type="button" class="sheetdemo__macro-item" data-name="${escapeHtml(n)}">${escapeHtml(n)}</button></li>`)
      .join('');
    picker =
      `<div class="sheetdemo__macros" hidden>` +
      `<div class="sheetdemo__macros-box" role="dialog" aria-label="マクロ">` +
      `<div class="sheetdemo__dialog-title">マクロ</div>` +
      `<div class="sheetdemo__macros-body">` +
      `<div class="sheetdemo__macros-label">マクロ名:</div>` +
      `<ul class="sheetdemo__macros-list">${items}</ul>` +
      `<p class="sheetdemo__macros-error" role="alert" hidden>マクロを選んでください</p>` +
      `<div class="sheetdemo__macros-actions">` +
      `<button type="button" class="sheetdemo__macros-run">実行</button>` +
      `<button type="button" class="sheetdemo__macros-cancel">キャンセル</button>` +
      `</div>` +
      `</div>` +
      `</div>` +
      `</div>`;
  } else if (canRun) {
    buttons =
      `<div class="sheetdemo__bar">` +
      `<button type="button" class="sheetdemo__run">▶ 実行</button>` +
      reset +
      note +
      `</div>`;
  }
  const dialog = hasMsg ? dialogHtml(msg) : '';
  const logPanel = hasLog ? logHtml(log) : '';
  // openTab="added" … 実行後に、増えたシートを選んだ状態にする（シートをコピーしたまま終わるマクロ）。
  const openAdded = attrs.openTab === 'added' ? ' data-open-added' : '';
  return `<figure class="sheetdemo not-content"${openAdded}>${buttons}${gasEditor}<div class="sheetdemo__stage">${html}${picker}${dialog}</div>${logPanel}${cap}</figure>`;
}

// ---- ::sheetcode ----

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * start に一致する行から end に一致する行までを、直前のコメント行（comment）ごと切り出す。
 * 見つからなければ null。
 */
function extractBlock(src, { start, end, comment }) {
  const lines = src.split('\n');
  const from = lines.findIndex((l) => start.test(l));
  if (from === -1) return null;
  const to = lines.findIndex((l, i) => i > from && end.test(l));
  if (to === -1) return null;
  let top = from;
  while (top > 0 && comment.test(lines[top - 1])) top--;
  return lines.slice(top, to + 1).join('\n');
}

/** VBA の `Sub Name(` 〜 `End Sub`。 */
function extractVba(src, name) {
  return extractBlock(src, {
    start: new RegExp(`^(Public |Private )?(Sub|Function) ${escapeRe(name)}\\b`, 'i'),
    end: /^End (Sub|Function)\b/i,
    comment: /^\s*'/,
  });
}

/** GAS の `function name(` 〜 行頭の `}`。 */
function extractGas(src, name) {
  return extractBlock(src, {
    start: new RegExp(`^function ${escapeRe(name)}\\s*\\(`),
    end: /^}/,
    comment: /^\s*\/\//,
  });
}


async function readCode(abs) {
  try {
    return (await readFile(abs, 'utf8')).replace(/\r\n/g, '\n').replace(/\n+$/, '');
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

export async function buildSheetCode({ attrs, lectureAbsDir, where }) {
  const dir = lectureDirFor(attrs, lectureAbsDir);
  const code = safeRel(attrs.code);
  if (!dir || !code) {
    console.warn(`[sheets] ::sheetcode needs code="<name>" in ${where} (skipped)`);
    return null;
  }
  const { html, error } = await sheetHtml(attrs, lectureAbsDir, null);
  if (error) {
    console.warn(`[sheets] ::sheetcode ${error} in ${where} (skipped)`);
    return null;
  }

  // Excel が主なので VBA を先に並べる。
  const panes = [
    { key: 'excel', lang: 'vb', file: `vba/${code}.bas`, pick: (s) => extractVba(s, attrs.macro) },
    { key: 'sheets', lang: 'js', file: `gas/${code}.gs`, pick: (s) => extractGas(s, gasNameOf(attrs.macro)) },
  ];
  const out = [`::::sheetcode`];
  for (const p of panes) {
    const src = await readCode(path.join(dir, 'example', ...p.file.split('/')));
    if (src === null) {
      console.warn(`[sheets] ::sheetcode: ${p.file} not found in ${where}`);
      continue;
    }
    const body = attrs.macro ? p.pick(src) : src;
    if (body === null) {
      console.warn(`[sheets] ::sheetcode: macro "${attrs.macro}" not found in ${p.file} (${where})`);
      continue;
    }
    out.push('```' + p.lang + ` data-platform="${p.key}" data-file="${p.file}"`);
    out.push(body);
    out.push('```');
  }
  if (out.length === 1) return null;
  out.push(html);
  out.push('::::');
  return out.join('\n');
}

/**
 * 本文中の `::::sheetdemo` 〜 `::::` と `::sheetcode` を展開する。
 * レクチャーの外（example/ を持たない docs）では呼ばない。
 */
export async function expandSheetSentinels(body, { lectureAbsDir, where, parseAttrs }) {
  if (!/^::(::)?sheet(demo|code)\b/m.test(body)) return body;
  const lines = body.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const demo = line.match(SHEETDEMO_OPEN_RE);
    if (demo) {
      const inner = [];
      let j = i + 1;
      while (j < lines.length && !CLOSE_RE.test(lines[j])) inner.push(lines[j++]);
      i = j;
      const block = await buildSheetDemo({
        caption: demo[1]?.trim(),
        attrs: parseAttrs(demo[2]),
        lines: inner,
        lectureAbsDir,
        where,
      });
      if (block) out.push(block);
      continue;
    }
    const sc = line.match(SHEETCODE_RE);
    if (sc) {
      const block = await buildSheetCode({ attrs: parseAttrs(sc[2]), lectureAbsDir, where });
      if (block) out.push(block);
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}
