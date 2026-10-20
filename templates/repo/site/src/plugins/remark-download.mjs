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

import { platformZips } from './lib/platform-zip.mjs';

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

      // ボタンの中身: アイコン（CSS で描画）＋ ラベル（元リンクのテキスト）。
      const inner = () => [
        {
          type: 'downloadButtonIcon',
          data: {
            hName: 'span',
            hProperties: { className: ['download-button__icon'], 'aria-hidden': 'true' },
          },
        },
        {
          type: 'downloadButtonLabel',
          data: { hName: 'span', hProperties: { className: ['download-button__label'] } },
          // ボタンを 2 つ作るときに同じノードを共有しないよう、毎回複製する。
          children: structuredClone(link.children),
        },
      ];

      // Office マクロ系で環境ごとの ZIP があるときは、Excel 用とスプレッドシート用のボタンを両方作り、
      // 選んでいる環境のほうだけを見せる（platform.css の platform-only--*）。
      const variants = platformZips(link.url);
      if (variants) {
        node.type = 'downloadButtons';
        node.data = { hName: 'span', hProperties: { className: ['download-buttons'] } };
        node.children = variants.map((v) => ({
          type: 'downloadButton',
          data: {
            hName: 'a',
            hProperties: { className: ['download-button', `platform-only--${v.platform}`], href: v.url, download: true },
          },
          children: inner(),
        }));
        return;
      }

      const data = node.data || (node.data = {});
      node.type = 'downloadButton';
      data.hName = 'a';
      data.hProperties = {
        className: ['download-button'],
        href: link.url,
        download: true,
      };
      node.children = inner();
    });
  };
}
