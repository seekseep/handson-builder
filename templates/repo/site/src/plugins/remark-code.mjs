/**
 * `:::code{filepath=... offset=...}` コンテナディレクティブを、
 * 「ファイル名ヘッダ + 行番号つきコードブロック」に変換する remark プラグイン。
 *
 * 使い方（Markdown）:
 *   :::code[create の中（いちばん最初）]{filepath=main.js offset=12}
 *   ```js
 *   const bird = this.add.circle(140, 340, 18, 0xffffff);
 *   ```
 *   :::
 *
 * 差分を見せる場合は `newOffset` を足す。旧/新の 2 列の行番号が出る:
 *   :::code[update をまるごと書き換え]{filepath=scenes/game-scene.js offset=30 newOffset=34}
 *   ```js
 *      update() {
 *   -    this.bird.setVelocity(12, -12);
 *   +    this.bird.setVelocity(vx, vy);
 *      }
 *   ```
 *   :::
 *
 * 描画そのものは Expressive Code に任せ、このプラグインは meta を合成して
 * 指示を渡すだけにしている:
 *   - `title="<filepath>"`        → EC 標準のファイル名タブ
 *   - `startLineNumber=<offset>`  → ec-line-numbers.mjs（自作 EC プラグイン）が読む
 *   - `startNewLineNumber=<newOffset>` → 同上。あれば差分モード
 * 差分のときは言語を `diff` に差し替え、`lang=<元の言語>` を meta に足す。こうすると
 * EC の text-markers が `useDiffSyntax` を立て、元の言語のハイライトを保ったまま
 * `+` / `-` の着色をしてくれる。
 *
 * ラベル `[...]` は「ファイルのどこに書くか」の日本語説明（旧 `**書く場所:**`）。
 * 装飾は site/src/styles/code.css と ec-line-numbers.mjs 側の addStyles。
 *
 * NOTE: 属性の区切りは **スペース**。`{a=1,b=2}` のようなカンマ区切りは
 * remark-directive のパーサ（引用符なしの値に `=` を許さない）で壊れる。
 */

const NAME = 'code';

/** 子ノードを再帰的にたどって containerDirective を拾うシンプルな visitor。 */
function visit(node, callback) {
  if (!node || !Array.isArray(node.children)) return;
  for (const child of node.children) {
    callback(child);
    visit(child, callback);
  }
}

/** 属性値を正の整数として読む。数値でなければ undefined。 */
function toPositiveInt(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export default function remarkCode() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== 'containerDirective') return;
      if (node.name !== NAME) return;

      const codeNode = node.children.find((c) => c.type === 'code');
      // コードフェンスが無ければ触らない（書き間違いを黙って握り潰さない）。
      if (!codeNode) return;

      const attrs = node.attributes || {};
      const filepath = attrs.filepath;
      const offset = toPositiveInt(attrs.offset) ?? 1;
      const newOffset = toPositiveInt(attrs.newOffset);
      const isDiff = newOffset !== undefined;

      // `:::code[説明]` の `[説明]` 部分（directiveLabel）を取り出す。
      const labelIndex = node.children.findIndex(
        (child) => child.type === 'paragraph' && child.data && child.data.directiveLabel,
      );
      let labelChildren = null;
      if (labelIndex !== -1) {
        labelChildren = node.children[labelIndex].children;
      }

      // Expressive Code へ渡す meta を組み立てる。
      const meta = [];
      if (codeNode.meta) meta.push(codeNode.meta);
      if (filepath) meta.push(`title="${filepath}"`);
      if (isDiff) {
        // 元の言語を lang= に退避してから diff に差し替える。
        if (codeNode.lang && codeNode.lang !== 'diff') meta.push(`lang=${codeNode.lang}`);
        codeNode.lang = 'diff';
        meta.push(`startLineNumber=${offset}`);
        meta.push(`startNewLineNumber=${newOffset}`);
      } else {
        meta.push(`startLineNumber=${offset}`);
      }
      codeNode.meta = meta.join(' ');

      const children = [];
      if (labelChildren) {
        children.push({
          type: 'paragraph',
          data: { hName: 'p', hProperties: { className: ['lecture-code-note'] } },
          children: labelChildren,
        });
      }
      children.push(codeNode);

      node.children = children;
      // `containerDirective` のままだと未知のディレクティブとして扱われるため、
      // 他のカスタムディレクティブと同じく独自の型に変えて hName で描画させる。
      node.type = 'lectureCode';
      node.data = {
        hName: 'div',
        hProperties: {
          className: ['lecture-code', ...(isDiff ? ['lecture-code-diff'] : [])],
        },
      };
    });
  };
}
