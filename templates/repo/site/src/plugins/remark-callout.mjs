/**
 * `:::danger` / `:::warning` / `:::notice` のコンテナディレクティブを
 * カスタム callout（`<aside class="callout callout-xxx">`）に変換する remark プラグイン。
 *
 * 装飾は site/src/styles/callouts.css 側で当てる（背景色 + 右ボーダー、角丸なし）。
 *
 * 使い方（Markdown）:
 *   :::danger
 *   削除は元に戻せません。
 *   :::
 *
 * 任意でタイトルを付けられる:
 *   :::warning[注意]
 *   本文
 *   :::
 *
 * NOTE: `danger` は Starlight 標準の aside と名前が衝突するため、本プラグインを
 * Starlight の asides プラグインより前に走らせ、ここで HTML 要素へ変換してしまう
 * ことで標準 aside の処理対象から外す。
 */

const CALLOUTS = new Set(['danger', 'warning', 'notice']);

/** 子ノードを再帰的にたどって containerDirective を拾うシンプルな visitor。 */
function visit(node, callback) {
  if (!node || !Array.isArray(node.children)) return;
  for (const child of node.children) {
    callback(child);
    visit(child, callback);
  }
}

export default function remarkCallout() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== 'containerDirective') return;
      if (!CALLOUTS.has(node.name)) return;

      const data = node.data || (node.data = {});

      // `:::danger[タイトル]` の `[タイトル]` 部分（directiveLabel）を見出しとして取り出す。
      const labelIndex = node.children.findIndex(
        (child) => child.type === 'paragraph' && child.data && child.data.directiveLabel,
      );
      let titleChildren = null;
      if (labelIndex !== -1) {
        titleChildren = node.children[labelIndex].children;
        node.children.splice(labelIndex, 1);
      }

      const body = {
        type: 'div',
        data: { hName: 'div', hProperties: { className: ['callout-body'] } },
        children: node.children,
      };

      const children = [];
      if (titleChildren) {
        children.push({
          type: 'paragraph',
          data: { hName: 'p', hProperties: { className: ['callout-title'] } },
          children: titleChildren,
        });
      }
      children.push(body);

      node.children = children;
      // `containerDirective` のままだと Starlight 標準の asides プラグインが
      // `danger` 等を横取りしてしまう。型を独自のものに変えて対象から外す。
      // mdast-util-to-hast は未知の型でも data.hName を尊重して描画する。
      node.type = 'calloutContainer';
      data.hName = 'aside';
      data.hProperties = {
        className: ['callout', `callout-${node.name}`],
        role: 'note',
      };
    });
  };
}
