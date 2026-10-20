/**
 * `::::sheetcode` コンテナディレクティブを「左=コード（VBA ／ GAS）、右=シート」に
 * 並べる remark プラグイン。
 *
 * コンテナは sync-lectures.mjs（libs/sheets.mjs）が `::sheetcode{...}` から生成する。中身は
 *   - コードフェンス（meta に `data-platform="excel|sheets"` と `data-file="<相対パス>"`）
 *   - シートの生 HTML（<div class="sheet">）
 *
 * パネルは `:::::platform` と同じクラス（platform__panel）を使うので、どちらを出すかは
 * ナビゲーションバーの選択欄（src/components/ThemeSelect.astro）と platform-client.js が決める。
 * どこかで切り替えると、ページ内のほかのブロックも次に開くページもそろう。
 * 装飾は site/src/styles/sheet.css。
 */

const NAME = 'sheetcode';
const PLATFORM_META_RE = /data-platform="(excel|sheets)"/;
const FILE_META_RE = /data-file="([^"]*)"/;

function visit(node, callback) {
  if (!node || !Array.isArray(node.children)) return;
  for (const child of node.children) {
    callback(child);
    visit(child, callback);
  }
}

function el(hName, className, children, extraProps = {}) {
  return {
    type: 'element',
    data: { hName, hProperties: { className, ...extraProps } },
    children: children || [],
  };
}

function text(value) {
  return { type: 'text', value };
}

export default function remarkSheetcode() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== 'containerDirective' || node.name !== NAME) return;

      const codes = [];
      for (const c of node.children) {
        if (c.type !== 'code') continue;
        const meta = c.meta || '';
        const key = meta.match(PLATFORM_META_RE)?.[1];
        if (!key) continue;
        const file = meta.match(FILE_META_RE)?.[1] ?? '';
        c.meta = null; // Expressive Code にファイル名枠を出させない（ファイル名は自前で出す）
        codes.push({ key, file, code: c });
      }
      const sheet = node.children.filter((c) => c.type === 'html');
      if (codes.length === 0) return;

      const panels = codes.map((p) =>
        el('div', ['platform__panel', `platform__panel--${p.key}`, 'sheetcode__panel'], [
          el('div', ['sheetcode__file'], [text(p.file.replace(/^(vba|gas)\//, ''))]),
          p.code,
        ], { 'data-platform': p.key }),
      );

      // 片方しか無いときは `::::platform` と同じく、もう片方を選んでいても出しておく。
      const only = codes.length === 1 ? [`platform--only-${codes[0].key}`] : [];

      node.type = 'sheetcodeContainer';
      // 外側の sheetcode-wrap は、本文の欄の幅で並べ方を決める（CSS のコンテナクエリ）ための入れ物。
      node.data = { hName: 'div', hProperties: { className: ['sheetcode-wrap'] } };
      node.children = [
        el('div', ['sheetcode'], [
          el('div', ['sheetcode__code', 'platform', ...only], panels),
          el('div', ['sheetcode__sheet'], sheet),
        ]),
      ];
    });
  };
}
