/**
 * リポジトリ内の主要ディレクトリを一元管理するモジュール。
 * scripts 配下の各スクリプトはここを参照してパスを組み立てる。
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** リポジトリルート (site/scripts/libs から 3 つ上)。ファイル走査・glob はここ基準。 */
export const ROOT = path.resolve(__dirname, '..', '..', '..');
export const SITE_DIR = path.join(ROOT, 'site');

/**
 * リポジトリルートから ROOT までの POSIX 相対パス。
 * GitHub の blob/raw/edit URL は実ファイルのリポジトリ相対パスを指す必要があるため、
 * ROOT 相対パス (sections/... など) にこれを前置する。
 * この構成では ROOT ＝ リポジトリルートなので空文字。
 * （教材ソースを apps/site などに寄せた構成では 'apps/site' のように設定する。）
 */
export const REPO_SUBDIR = '';
export const DOCS_DIR = path.join(SITE_DIR, 'src', 'content', 'docs');
export const PUBLIC_DIR = path.join(SITE_DIR, 'public');
export const DOWNLOADS_DIR = path.join(PUBLIC_DIR, 'downloads');
