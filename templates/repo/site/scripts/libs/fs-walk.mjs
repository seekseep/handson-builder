/** 作業ツリーの実ファイルを列挙・コピーするための小さな fs ヘルパー。 */

import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * absDir 以下のファイルを再帰的に列挙し、absDir からの POSIX 相対パス配列で返す。
 * ignoreDirs（ディレクトリ名）/ ignoreNames（ファイル名）に一致するものは除外する。
 */
export async function walkFiles(absDir, { ignoreDirs = new Set(), ignoreNames = new Set() } = {}) {
  const result = [];
  const walk = async (dir, relPrefix) => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (ignoreDirs.has(entry.name)) continue;
        await walk(path.join(dir, entry.name), relPrefix ? `${relPrefix}/${entry.name}` : entry.name);
      } else if (entry.isFile()) {
        if (ignoreNames.has(entry.name)) continue;
        result.push(relPrefix ? `${relPrefix}/${entry.name}` : entry.name);
      }
    }
  };
  await walk(absDir, '');
  return result;
}

/** absDir 以下の（除外を除いた）ファイルを destDir へコピーする。 */
export async function copyTree(absDir, destDir, opts = {}) {
  const rels = await walkFiles(absDir, opts);
  for (const rel of rels) {
    const src = path.join(absDir, ...rel.split('/'));
    const dest = path.join(destDir, ...rel.split('/'));
    await mkdir(path.dirname(dest), { recursive: true });
    await cp(src, dest);
  }
  return rels;
}
