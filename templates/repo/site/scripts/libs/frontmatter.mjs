/** マークダウンの YAML フロントマターを扱うヘルパー。 */

function parseScalar(val) {
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null' || val === '~') return null;
  if (/^-?\d+$/.test(val)) return Number(val);
  return val;
}

/**
 * 簡易 YAML フロントマターパーサー。
 * フラットなキーと、1 段ネストしたブロック (例: `sidebar: { order, label }`) のみを扱う。
 * 戻り値は { data, body }。フロントマターが無ければ data は空オブジェクト。
 */
export function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: content };
  const data = {};
  let currentParent = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (line.trim() === '') { currentParent = null; continue; }
    const nested = line.match(/^[ \t]+([\w-]+):\s*(.*)$/);
    if (nested && currentParent) {
      data[currentParent][nested[1]] = parseScalar(nested[2].trim());
      continue;
    }
    const top = line.match(/^([\w-]+):\s*(.*)$/);
    if (!top) { currentParent = null; continue; }
    const val = top[2].trim();
    if (val === '') {
      data[top[1]] = {};
      currentParent = top[1];
    } else {
      data[top[1]] = parseScalar(val);
      currentParent = null;
    }
  }
  return { data, body: content.slice(m[0].length) };
}
