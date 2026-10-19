/**
 * `:::script` コンテナディレクティブ。中の JS コードフェンスを
 *   - そのまま表示（Expressive Code でハイライト）しつつ、
 *   - このページ上で実際に実行する（console.log などが読者の Console に出る）。
 *
 * 使い方（Markdown）:
 *   :::script
 *   ```js
 *   console.log('こんにちは');
 *   ```
 *   :::
 *
 * 実行は、コードを `<script type="text/plain" class="run-on-load">` に埋め込み、
 * site/src/scripts/run-scripts.js（全ページに inline 注入）が読み取って実行する。
 * type="text/plain" なのでブラウザ自身は実行せず、client が new Function で走らせる。
 */

const NAME = 'script';

function visit(node, callback) {
  if (!node || !Array.isArray(node.children)) return;
  for (const child of node.children) {
    callback(child);
    visit(child, callback);
  }
}

export default function remarkScript() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== 'containerDirective') return;
      if (node.name !== NAME) return;

      const code = node.children.find((c) => c.type === 'code');
      if (!code) return;

      // `</script>` が含まれると text/plain スクリプトが途中で閉じてしまうため退避。
      const safe = String(code.value).replace(/<\/(script)/gi, '<\\/$1');
      const runner = {
        type: 'html',
        value: `<script type="text/plain" class="run-on-load">${safe}</script>`,
      };

      node.type = 'runnableScript';
      node.data = { hName: 'div', hProperties: { className: ['runnable-script'] } };
      node.children = [code, runner];
    });
  };
}
