/**
 * `:::questions` のコンテナディレクティブを、◯✕クイズの入れ物
 * （`<div class="quiz" data-questions="[...]">`）に変換する remark プラグイン。
 *
 * 画面遷移・採点・localStorage への記録は client 側（quiz-client.js、
 * astro.config.mjs で全ページの <head> に注入）が担当する。ここでは各問の
 * 「問題文」と「正解（o / x）」を JSON にして data 属性へ載せるだけ。
 *
 * 使い方（Markdown）:
 *   :::questions
 *   - 公開したフロントの JS に API キーを書いても表示しなければ読めない [x]
 *   - `.env` は `.gitignore` で Git から除外する [o]
 *   :::
 *
 * 各項目の末尾に `[o]`（正解が ◯ / まる）か `[x]`（正解が ✕ / ばつ）を書く。
 * `[◯]` `[○]` `[×]` `[✕]` も受け付ける。マーカーは表示テキストから取り除く。
 */

/** ノード配下のテキスト（text / inlineCode）を素朴に連結する。 */
function toText(node) {
  if (!node) return '';
  if (node.type === 'text' || node.type === 'inlineCode') return node.value || '';
  if (!Array.isArray(node.children)) return '';
  return node.children.map(toText).join('');
}

/** 子ノードを再帰的にたどって containerDirective を拾うシンプルな visitor。 */
function visit(node, callback) {
  if (!node || !Array.isArray(node.children)) return;
  for (const child of node.children) {
    callback(child);
    visit(child, callback);
  }
}

const MARKER = /\s*[\[（(]\s*([oxOX◯○●×✕✗])\s*[\]）)]\s*$/;

function normalizeAnswer(mark) {
  if (mark === 'o' || mark === 'O' || mark === '◯' || mark === '○' || mark === '●') return 'o';
  return 'x';
}

export default function remarkQuestions() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== 'containerDirective') return;
      if (node.name !== 'questions') return;

      // 直下（またはネスト）の list からリスト項目を集める。
      const questions = [];
      visit(node, (child) => {
        if (child.type !== 'listItem') return;
        const raw = toText(child).trim();
        const m = raw.match(MARKER);
        if (!m) return; // マーカーの無い項目は問題として扱わない
        const text = raw.replace(MARKER, '').trim();
        if (!text) return;
        questions.push({ text, answer: normalizeAnswer(m[1]) });
      });

      // JSON を data 属性に載せる。`<` はエスケープ不要（属性値なので " のみが問題）
      // だが、to-hast/HTML シリアライズが属性値を安全に扱う。
      const json = JSON.stringify(questions);

      node.type = 'quizContainer';
      node.children = [];
      node.data = {
        hName: 'div',
        hProperties: {
          className: ['quiz'],
          'data-quiz': '',
          'data-questions': json,
        },
      };
    });
  };
}
