/**
 * `:::::platform` コンテナディレクティブを、Excel（VBA）／ Google スプレッドシート（GAS）の
 * 2 つのパネルに変換する remark プラグイン。
 *
 * この教材は Excel を主に書き、同じ手順をスプレッドシートでも進められるようにしている。
 * 手順やコードが環境で分かれるところだけをこのコンテナで囲む。
 *
 * 使い方（Markdown）:
 *   :::::platform
 *   ::::excel
 *   Excel での手順・VBA のコード
 *   ::::
 *   ::::sheets
 *   スプレッドシートでの手順・GAS のコード
 *   ::::
 *   :::::
 *
 * どちらを表示するかは、ナビゲーションバーの選択欄（src/components/ThemeSelect.astro）で決める。
 * ブロックごとの切り替えは無い。表示の出し分けは site/src/styles/platform.css。
 * 片方だけでもよい（Excel にしか無い操作は ::::excel だけ）。そのときは、どちらを選んでいても出す。
 */

const NAME = 'platform';
const PANELS = [{ key: 'excel' }, { key: 'sheets' }];

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

// `::platform-choice` … 環境を選ぶ大きなボタン（進め方のページの冒頭に置く）。
// ナビゲーションバーの選択欄と同じ働きで、押すと platform-client.js が全ページを切り替える。
const CHOICE = 'platform-choice';
const CHOICES = [
  { key: 'excel', name: 'Excel（VBA）', desc: 'Windows / Mac の Excel で、VBA のマクロを書く' },
  { key: 'sheets', name: 'スプレッドシート（GAS）', desc: 'Google スプレッドシートで、Apps Script を書く' },
];

function choiceNode(node) {
  const options = CHOICES.map((c) =>
    el('button', ['platform-choice__option', `platform-choice__option--${c.key}`], [
      el('span', ['platform-choice__name'], [{ type: 'text', value: c.name }]),
      el('span', ['platform-choice__desc'], [{ type: 'text', value: c.desc }]),
    ], { type: 'button', 'data-platform': c.key }),
  );
  node.type = 'platformChoice';
  node.data = { hName: 'div', hProperties: { className: ['platform-choice', 'not-content'], role: 'group', 'aria-label': '教材の環境' } };
  node.children = options;
}

export default function remarkPlatform() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type === 'leafDirective' && node.name === CHOICE) {
        choiceNode(node);
        return;
      }
      if (node.type !== 'containerDirective' || node.name !== NAME) return;

      const found = PANELS.map((p) => ({
        ...p,
        node: node.children.find((c) => c.type === 'containerDirective' && c.name === p.key),
      })).filter((p) => p.node);
      if (found.length === 0) return;

      // タブの中のコードには行番号を付ける（ec-line-numbers.mjs が meta の startLineNumber を読む）。
      // `:::code` で offset を指定したものは、remark-code.mjs が先に meta を付けているのでそのまま。
      for (const p of found) {
        visit(p.node, (child) => {
          if (child.type !== 'code') return;
          if (/\bstartLineNumber=/.test(child.meta || '')) return;
          child.meta = `${child.meta || ''} startLineNumber=1`.trim();
        });
      }

      const panels = found.map((p) =>
        el('div', ['platform__panel', `platform__panel--${p.key}`], p.node.children, {
          'data-platform': p.key,
        }),
      );

      node.type = 'platformContainer';
      // 片方しか無いときは、どちらを選んでいても出す（platform.css の platform--only-*）。
      const only = found.length === 1 ? found[0].key : null;
      node.data = { hName: 'div', hProperties: { className: ['platform', ...(only ? [`platform--only-${only}`] : [])] } };
      node.children = panels;
    });
  };
}
