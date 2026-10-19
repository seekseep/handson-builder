/**
 * `:::download` コンテナディレクティブを「大きなダウンロードボタン」に変換する remark プラグイン。
 *
 * 中に書いた通常のリンクの URL とラベルを取り出し、`<a class="download-button">` に変換する。
 * URL の解決（`./project.zip` → 実際の配布 ZIP URL）は sync-lectures.mjs 側が済ませているため、
 * ここではリンクをボタンの見た目に変えるだけ。装飾は site/src/styles/download.css で当てる。
 *
 * 使い方（Markdown）:
 *   :::download
 *   [サンプルコードをダウンロード](./project.zip)
 *   :::
 */

/** 子ノードを再帰的にたどって最初の link ノードを返す。 */
function findFirstLink(node) {
  if (!node) return null;
  if (node.type === 'link') return node;
  if (!Array.isArray(node.children)) return null;
  for (const child of node.children) {
    const found = findFirstLink(child);
    if (found) return found;
  }
  return null;
}

/** containerDirective を再帰的に拾うシンプルな visitor。 */
function visit(node, callback) {
  if (!node || !Array.isArray(node.children)) return;
  for (const child of node.children) {
    callback(child);
    visit(child, callback);
  }
}

export default function remarkDownload() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== 'containerDirective') return;
      if (node.name !== 'download') return;

      const link = findFirstLink(node);
      if (!link) return;

      const data = node.data || (node.data = {});
      node.type = 'downloadButton';
      data.hName = 'a';
      data.hProperties = {
        className: ['download-button'],
        href: link.url,
        download: true,
      };

      // アイコン（CSS で描画）＋ ラベル（元リンクのテキスト）に組み替える。
      node.children = [
        {
          type: 'downloadButtonIcon',
          data: {
            hName: 'span',
            hProperties: { className: ['download-button__icon'], 'aria-hidden': 'true' },
          },
          children: [],
        },
        {
          type: 'downloadButtonLabel',
          data: { hName: 'span', hProperties: { className: ['download-button__label'] } },
          children: link.children,
        },
      ];
    });
  };
}
