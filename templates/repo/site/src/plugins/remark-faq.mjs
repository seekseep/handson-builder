/**
 * `:::faq` のコンテナディレクティブを、開いて読む「よくある質問」
 * （`<section class="faq">` ＋ `<details class="faq-item">`）に変換する remark プラグイン。
 *
 * 開閉はブラウザの `<details>` がやるので、client スクリプトは要らない。
 * 装飾は site/src/styles/faq.css 側で当てる。
 *
 * 使い方（Markdown）:
 *   :::faq
 *
 *   ### 要件と制約は、何が違うのですか
 *
 *   答えの本文。段落・リスト・リンク・コードなど、普通のマークダウンが書ける。
 *
 *   ### つぎの質問
 *
 *   答え。
 *
 *   :::
 *
 * - **見出しが質問、次の見出しまでが答え**。見出しの深さは問わない（本文では `###`）。
 * - 質問の見出しは `<summary>` になるので、ページ右の目次には出ない。目次に出るのは
 *   自動で付く「よくある質問」の見出し（`<h2>`）だけ。
 * - 題を変えたいときは `:::faq[この節でよく聞かれること]`。
 * - 答えの中で `:::notice` などを使いたいときは、外側のコロンを増やして `::::faq` にする
 *   （directive の入れ子は、外側のコロンが多いほうが親になる）。
 * - 最初の見出しより前に書いたものは、質問の並びの前（`.faq-lead`）に出る。
 */

const DEFAULT_TITLE = 'よくある質問';

/** 子ノードを再帰的にたどって containerDirective を拾うシンプルな visitor。 */
function visit(node, callback) {
  if (!node || !Array.isArray(node.children)) return;
  for (const child of node.children) {
    callback(child);
    visit(child, callback);
  }
}

export default function remarkFaq() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== 'containerDirective') return;
      if (node.name !== 'faq') return;

      // `:::faq[題]` の `[題]` 部分（directiveLabel）を見出しとして取り出す。
      const labelIndex = node.children.findIndex(
        (child) =>
          child.type === 'paragraph' && child.data && child.data.directiveLabel,
      );
      let titleChildren = null;
      if (labelIndex !== -1) {
        titleChildren = node.children[labelIndex].children;
        node.children.splice(labelIndex, 1);
      }

      // 見出しで切って、質問と答えの組に分ける。
      const lead = [];
      const items = [];
      for (const child of node.children) {
        if (child.type === 'heading') {
          items.push({ question: child.children, answer: [] });
        } else if (items.length === 0) {
          // 見出しがまだ出ていないものは前置き。書き忘れても本文が消えないようにする。
          lead.push(child);
        } else {
          items[items.length - 1].answer.push(child);
        }
      }

      const children = [
        {
          type: 'faqTitle',
          data: { hName: 'h2', hProperties: { className: ['faq-title'] } },
          children: titleChildren || [{ type: 'text', value: DEFAULT_TITLE }],
        },
      ];

      if (lead.length > 0) {
        children.push({
          type: 'faqLead',
          data: { hName: 'div', hProperties: { className: ['faq-lead'] } },
          children: lead,
        });
      }

      for (const item of items) {
        children.push({
          type: 'faqItem',
          data: { hName: 'details', hProperties: { className: ['faq-item'] } },
          children: [
            {
              type: 'faqQuestion',
              data: {
                hName: 'summary',
                hProperties: { className: ['faq-question'] },
              },
              children: item.question,
            },
            {
              type: 'faqAnswer',
              data: {
                hName: 'div',
                hProperties: { className: ['faq-answer'] },
              },
              children: item.answer,
            },
          ],
        });
      }

      node.children = children;
      // containerDirective のままだと未知の directive として扱われるので、
      // 独自の型に変える。mdast-util-to-hast は data.hName を尊重して描画する。
      node.type = 'faqSection';
      node.data = { hName: 'section', hProperties: { className: ['faq'] } };
    });
  };
}
