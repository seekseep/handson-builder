/**
 * コードブロックのガター（左端）に行番号を出す Expressive Code プラグイン。
 *
 * meta に `startLineNumber=<n>` があるブロックだけが対象。無いブロックには
 * ガターを一切足さないので、素の ``` フェンスは今まで通り描画される。
 *
 * `startNewLineNumber=<n>` も付いていれば差分モードになり、行番号を 2 列出す:
 *   - `-` で始まる行 … 旧側だけ番号が付き、新側は空欄
 *   - `+` で始まる行 … 新側だけ番号が付き、旧側は空欄
 *   - それ以外       … 両方に番号が付く
 *
 * meta は remark-code.mjs（`:::code` ディレクティブ）が合成する。
 *
 * NOTE: 行の先頭文字（`+` / `-`）を読むので、EC の text-markers が差分マーカーを
 * 剥がす `preprocessCode` より前に走る必要がある。EC のフックはプラグイン単位では
 * なくフェーズ単位で回る（全プラグインの preprocessMetadata → 全プラグインの
 * preprocessCode …）ため、preprocessMetadata で読めば順序は保証される。
 *
 * NOTE: apps/site からは pnpm の都合で expressive-code / hastscript を import
 * できないので、HAST ノードはプレーンなオブジェクトで組み立てる。
 */

const STYLES = `
.lec-ln {
  display: inline-block;
  box-sizing: content-box;
  min-width: var(--lecLnWidth, 2ch);
  padding-inline: 0.5ch;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.lec-ln-old {
  opacity: 0.6;
}
`;

/** 行番号 1 つ分の HAST ノード。値が無い行でも幅は保つ（列がずれないように）。 */
function lineNumberElement(value, variantClass, width) {
  return {
    type: 'element',
    tagName: 'div',
    properties: {
      className: ['lec-ln', variantClass],
      style: `--lecLnWidth: ${width}ch`,
    },
    children: value === undefined ? [] : [{ type: 'text', value: String(value) }],
  };
}

/**
 * 各行の旧/新の行番号を先に全部計算しておく。
 * 差分モードでないときは新側だけを使う。
 */
function computeLineNumbers(code, start, newStart) {
  const isDiff = newStart !== undefined;
  const oldNumbers = [];
  const newNumbers = [];
  let oldNo = start;
  let newNo = isDiff ? newStart : start;

  for (const line of code.split('\n')) {
    if (!isDiff) {
      oldNumbers.push(undefined);
      newNumbers.push(newNo++);
      continue;
    }
    const marker = line.charAt(0);
    if (marker === '+') {
      oldNumbers.push(undefined);
      newNumbers.push(newNo++);
    } else if (marker === '-') {
      oldNumbers.push(oldNo++);
      newNumbers.push(undefined);
    } else {
      oldNumbers.push(oldNo++);
      newNumbers.push(newNo++);
    }
  }

  return { oldNumbers, newNumbers, isDiff };
}

/** 全行を通しての最大桁数。ガターの幅を固定するために使う。 */
function maxDigits(numbers) {
  let max = 1;
  for (const n of numbers) {
    if (n === undefined) continue;
    max = Math.max(max, String(n).length);
  }
  return max;
}

export default function ecLineNumbers() {
  return {
    name: 'LectureLineNumbers',
    hooks: {
      preprocessMetadata: ({ codeBlock, addGutterElement, addStyles }) => {
        const start = codeBlock.metaOptions.getInteger('startLineNumber');
        if (start === undefined) return;
        const newStart = codeBlock.metaOptions.getInteger('startNewLineNumber');

        const { oldNumbers, newNumbers, isDiff } = computeLineNumbers(
          codeBlock.code,
          start,
          newStart,
        );

        // 旧/新で桁数を揃えておくと、差分でも列幅がぶれない。
        const width = Math.max(maxDigits(oldNumbers), maxDigits(newNumbers));

        addStyles(STYLES);

        const gutterFor = (numbers, variantClass) => ({
          // 行の先頭（他のガター要素より左）に置く。
          renderPhase: 'earlier',
          renderLine: ({ lineIndex }) =>
            lineNumberElement(numbers[lineIndex], variantClass, width),
          renderPlaceholder: () => lineNumberElement(undefined, variantClass, width),
        });

        // 登録順がそのまま左からの並び順になる。
        if (isDiff) addGutterElement(gutterFor(oldNumbers, 'lec-ln-old'));
        addGutterElement(gutterFor(newNumbers, 'lec-ln-new'));
      },
    },
  };
}
