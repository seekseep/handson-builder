/**
 * `::::editor{title="..." zip="URL" open="main.js"}` コンテナディレクティブを、簡易エディタ UI
 * `<section class="editor">`（左=ファイル一覧・右=コード）に変換する remark プラグイン。
 *
 * 属性:
 *   title … ヘッダの文言（省略時は「このステップの完成例」）
 *   zip   … ZIP ダウンロードボタンのリンク先。省略するとボタンを出さない（デモなど配布物が無い場合）
 *   open  … 最初に開くファイル名（省略時は先頭）
 *
 * コンテナの中身は sync-lectures.mjs（libs/sentinels.mjs）が実ファイルから生成した
 * コードフェンス（各 fence の meta に `data-file="<相対パス>"`）。このプラグインは:
 *   - 各コードフェンスからファイル名を読み取り（meta は消して Expressive Code の枠を出さない）
 *   - 左のファイル切り替えボタン、右のコードペインを組み立てる
 *   - ヘッダに ZIP ダウンロードボタンを付ける
 * タブ切り替えの挙動は site/src/scripts/editor-client.js（全ページに inline 注入）。
 * 装飾は site/src/styles/editor.css。
 *
 * NOTE: 中で ZIP ボタンを自前生成するため remark-download には依存しない。
 * コンテナは 4 コロン（::::）で開く（中にコードフェンスを含むため 3 コロンでもよいが統一）。
 */

const NAME = 'editor';
const FILE_META_RE = /data-file="([^"]*)"/;
const DEFAULT_TITLE = 'このステップの完成例';

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

/** remark-download と同じ見た目の ZIP ダウンロードボタンを作る。 */
function downloadButton(zipUrl) {
  return {
    type: 'element',
    data: {
      hName: 'a',
      hProperties: { className: ['download-button'], href: zipUrl, download: true },
    },
    children: [
      el('span', ['download-button__icon'], [], { 'aria-hidden': 'true' }),
      el('span', ['download-button__label'], [text('コードをダウンロード')]),
    ],
  };
}

export default function remarkEditor() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== 'containerDirective') return;
      if (node.name !== NAME) return;

      const attrs = node.attributes || {};
      const zipUrl = attrs.zip;

      // コードフェンスを集め、ファイル名を取り出す。
      const codeNodes = node.children.filter((c) => c.type === 'code');
      const files = [];
      codeNodes.forEach((code, i) => {
        const m = (code.meta || '').match(FILE_META_RE);
        const name = m ? m[1] : code.lang || `file${i}`;
        code.meta = null; // Expressive Code にファイル名枠を出させない
        files.push({ name, code });
      });

      // デフォルトで開くファイル（open 属性で指定）。無ければ先頭。
      let activeIndex = attrs.open ? files.findIndex((f) => f.name === attrs.open) : -1;
      if (activeIndex === -1) activeIndex = 0;

      const fileButtons = files.map((f, i) =>
        el('button', ['editor__file', ...(i === activeIndex ? ['is-active'] : [])], [text(f.name)], {
          type: 'button',
          'data-file': f.name,
        }),
      );

      const panes = files.map((f, i) =>
        el('div', ['editor__pane', ...(i === activeIndex ? ['is-active'] : [])], [f.code], {
          'data-file': f.name,
        }),
      );

      const headerChildren = [el('span', ['editor__title'], [text(attrs.title || DEFAULT_TITLE)])];
      if (zipUrl) headerChildren.push(downloadButton(zipUrl));

      const header = el('div', ['editor__header'], headerChildren);
      const body = el('div', ['editor__body'], [
        el('div', ['editor__files'], fileButtons),
        el('div', ['editor__code'], panes),
      ]);

      node.type = 'editorContainer';
      node.data = { hName: 'section', hProperties: { className: ['editor'] } };
      node.children = [header, body];
    });
  };
}
