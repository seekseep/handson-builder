/** マークダウン本文とフロントマター文字列を組み立てるためのヘルパー群。 */

/** H1 の直後に続く最初の段落を description として抜き出す (最大 160 文字)。 */
export function extractDescription(content) {
  const lines = content.split('\n');
  let foundH1 = false;
  const buffer = [];
  for (const line of lines) {
    if (!foundH1) {
      if (/^#[ \t]/.test(line)) foundH1 = true;
      continue;
    }
    if (line.trim() === '') {
      if (buffer.length > 0) break;
      continue;
    }
    if (/^#/.test(line)) break;
    // 先頭サムネなど画像だけの行は description に使わない（本文冒頭は
    // `![alt](./images/00-thumbnail.svg)` で始まる規約のため、次の段落まで読み飛ばす）。
    if (buffer.length === 0 && /^!\[[^\]]*\]\([^)]*\)\s*$/.test(line.trim())) continue;
    buffer.push(line.trim());
    if (buffer.join(' ').length > 160) break;
  }
  const text = buffer.join(' ').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, 160) : undefined;
}

/** 先頭の H1 見出しを本文から取り除く (title はフロントマターで表現するため)。 */
export function stripLeadingH1(content) {
  return content.replace(/^\s*#[ \t]+.+?(?:\r?\n)+/, '');
}

/** レクチャーのディレクトリ名 (`01-...`) から sidebar.order の既定値を導く。 */
export function parseLectureOrder(lecture) {
  const m = lecture.match(/^(\d+)-/);
  return m ? Number(m[1]) : 99;
}

function yamlEscape(s) {
  if (s === undefined || s === null) return '""';
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Starlight 用のフロントマターブロック (末尾に空行 2 つ) を生成する。 */
export function buildFrontmatter({ title, description, sidebarOrder, sidebarLabel, editUrl }) {
  const lines = ['---'];
  lines.push(`title: ${yamlEscape(title)}`);
  if (description) lines.push(`description: ${yamlEscape(description)}`);
  if (sidebarOrder !== undefined || sidebarLabel) {
    lines.push('sidebar:');
    if (sidebarOrder !== undefined) lines.push(`  order: ${sidebarOrder}`);
    if (sidebarLabel) lines.push(`  label: ${yamlEscape(sidebarLabel)}`);
  }
  if (editUrl) lines.push(`editUrl: ${yamlEscape(editUrl)}`);
  lines.push('---', '', '');
  return lines.join('\n');
}
