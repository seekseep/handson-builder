/**
 * dev 専用インテグレーション。教材ソース（sections/**、README.md）の変更を監視し、
 * 変更があれば sync-lectures を再実行して src/content/docs/ を作り直す。
 * 生成物が書き換わると Astro の content collection HMR が走り、ブラウザが更新される。
 *
 * astro:server:setup は dev サーバ起動時にのみ呼ばれるため、build には影響しない。
 *
 * sync は Vite のモジュールグラフから切り離した子プロセス（node scripts/sync-lectures.mjs）
 * として実行する。dynamic import 経由だと Vite のモジュールランナー終了時に
 * 「Vite module runner has been closed」で失敗するため。
 */

import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// src/integrations から 2 つ上が site/、3 つ上がリポジトリルート（= 教材ソースのルート）。
const SITE_DIR = path.resolve(__dirname, '..', '..');
const ROOT = path.resolve(SITE_DIR, '..');
const SECTIONS_DIR = path.join(ROOT, 'sections');
const README = path.join(ROOT, 'README.md');
const SYNC_SCRIPT = path.join(SITE_DIR, 'scripts', 'sync-lectures.mjs');

/** 監視対象（sections 配下 or ルート README）の .md 変更だけ拾う。 */
function isLectureSource(file) {
  const f = path.resolve(file);
  if (!f.endsWith('.md')) return false;
  return f === README || f.startsWith(SECTIONS_DIR + path.sep);
}

export default function lectureSync() {
  return {
    name: 'lecture-sync',
    hooks: {
      'astro:server:setup': ({ server, logger }) => {
        let timer = null;
        let running = false;
        let pending = false;

        const run = async () => {
          if (running) {
            pending = true;
            return;
          }
          running = true;
          try {
            await execFileAsync(process.execPath, [SYNC_SCRIPT], { cwd: SITE_DIR });
            logger.info('教材ソースを同期しました (sections → src/content/docs)');
          } catch (err) {
            logger.error(`同期に失敗しました: ${err?.stderr || err?.message || err}`);
          } finally {
            running = false;
            if (pending) {
              pending = false;
              run();
            }
          }
        };

        const onChange = (file) => {
          if (!isLectureSource(file)) return; // 生成物(src/content/docs)由来の変更で自己ループしない
          clearTimeout(timer);
          timer = setTimeout(run, 150); // 連続保存をまとめる
        };

        // sections はプロジェクトルート内なので Vite が既に監視しているが、明示的に足しておく。
        server.watcher.add(SECTIONS_DIR);
        server.watcher.add(README);
        server.watcher.on('change', onChange);
        server.watcher.on('add', onChange);
        server.watcher.on('unlink', onChange);
      },
    },
  };
}
