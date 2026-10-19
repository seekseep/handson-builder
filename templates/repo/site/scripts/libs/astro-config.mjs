/** site/astro.config.mjs から生成スクリプトが必要とする設定を読み取る。 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { SITE_DIR } from './paths.mjs';

/**
 * astro.config.mjs から base (公開パスのプレフィックス) と
 * repoUrl (GitHub リポジトリ URL、REPO) を読み取る。
 * 見つからないキーは空文字を返す。
 */
export async function loadAstroConfig() {
  const cfg = await readFile(path.join(SITE_DIR, 'astro.config.mjs'), 'utf8');
  const baseMatch = cfg.match(/^\s*base:\s*['"]([^'"]+)['"]/m);
  const repoMatch = cfg.match(/repoUrl\s*=\s*['"]([^'"]+)['"]/);
  return {
    base: baseMatch ? baseMatch[1].replace(/\/+$/, '') : '',
    repo: repoMatch ? repoMatch[1].replace(/\/+$/, '') : '',
  };
}
