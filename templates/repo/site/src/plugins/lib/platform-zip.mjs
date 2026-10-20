/**
 * 配布 ZIP の URL から、環境ごとの ZIP（`<sec>-<lec>-excel.zip` / `-sheets.zip`）を探す。
 * build-downloads.mjs が Office マクロ系のレクチャーにだけ出すので、ファイルがあるかで判断する
 * （predev / prebuild でサイトのビルドより先に作られている）。無ければ null。
 */

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DOWNLOADS_DIR = fileURLToPath(new URL('../../../public/downloads/', import.meta.url));
const PLATFORMS = ['excel', 'sheets'];

export function platformZips(url) {
  const m = String(url ?? '').match(/^(.*\/downloads\/)([^/]+)\.zip$/);
  if (!m) return null;
  const found = PLATFORMS.map((platform) => ({
    platform,
    url: `${m[1]}${m[2]}-${platform}.zip`,
    file: path.join(DOWNLOADS_DIR, `${m[2]}-${platform}.zip`),
  }));
  return found.every((f) => existsSync(f.file)) ? found : null;
}
