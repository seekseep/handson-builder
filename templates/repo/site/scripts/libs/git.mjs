/** git 管理下のファイルを扱うためのヘルパー。 */

import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * `git ls-files -z` で pathspec に一致する追跡ファイルを列挙し、
 * POSIX 区切りの相対パス配列で返す。
 * 追跡下のファイルだけを対象にすることで、node_modules/ や .gitignore
 * 済みのファイル (dist/, .dev.vars, *.pem など) は自動的に除外される。
 */
export async function lsFiles(cwd, pathspec, maxBuffer = 20 * 1024 * 1024) {
  const { stdout } = await execFileAsync(
    'git',
    ['ls-files', '-z', '--', pathspec],
    { cwd, maxBuffer },
  );
  return stdout
    .split('\0')
    .filter(Boolean)
    .map((p) => p.split(path.sep).join('/'));
}
