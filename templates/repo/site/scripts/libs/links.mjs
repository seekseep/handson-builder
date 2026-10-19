/**
 * マークダウン本文中の相対リンク・画像を、生成後のサイトで正しく解決される
 * URL に書き換えるモジュール。
 *   - 同期対象のマークダウン → 対応するサイト URL (相対) に変換
 *   - sections/ 配下のソースコードや他リソース → GitHub blob URL に変換
 *   - 画像 (`![...](...)`) → GitHub raw URL に変換 (blob は HTML を返し <img> が壊れるため)
 *   - リポジトリルート直下のファイル (AGENTS.md など) → GitHub blob URL に変換
 *   - 手書きセンチネル `./project.zip` → 生成した配布 ZIP の URL に差し替え
 */

import path from 'node:path';

import { REPO_SUBDIR } from './paths.mjs';

// Astro の画像最適化 (Sharp) でビルドが落ちるなど、src/content/docs/ 経由で
// 載せられないアセットを site/public/ に置き、Markdown 内の参照を
// 絶対 URL に書き換えるための whitelist。値はファイル名 (basename) で指定。
// sections 配下の各レクチャー直下にある docs/ を走査し、basename が一致する
// ファイルを site/public/<sec>/<lec>/docs/<file> にコピーする。
export const PUBLIC_ASSETS = new Set([
  // 例: 'write-cookie.gif',  // アニメ GIF は Sharp の pixel 上限を超え落ちることがある
]);

/**
 * PUBLIC_ASSETS 対象のソースパスから、サイト URL と public/ 配下の出力先を導く。
 * `sections/<sec>/<lec>/docs/<file>` → `{ url: '<base>/<sec>/<lec>/docs/<file>', destRel: '<sec>/<lec>/docs/<file>' }`
 */
export function publicTargetFor(resolved, base) {
  const m = resolved.match(/^sections\/([\w-]+\/[\w-]+\/docs\/.+)$/);
  if (!m) return null;
  return { url: `${base}/${m[1]}`, destRel: m[1] };
}

/** fromUrl から toUrl への相対 URL を組み立てる (末尾スラッシュ付き)。 */
function relativeUrl(fromUrl, toUrl, hash = '') {
  const fromSegs = fromUrl.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
  const toSegs = toUrl.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
  let i = 0;
  while (i < fromSegs.length && i < toSegs.length && fromSegs[i] === toSegs[i]) i++;
  const ups = fromSegs.length - i;
  const downs = toSegs.slice(i);
  let rel;
  if (ups === 0 && downs.length === 0) {
    rel = './';
  } else if (ups === 0) {
    rel = './' + downs.join('/') + '/';
  } else {
    rel = '../'.repeat(ups) + (downs.length > 0 ? downs.join('/') + '/' : '');
  }
  return rel + hash;
}

/**
 * 既知のサイト内ターゲットへのマッピング。
 * resolved (リポジトリルートからの POSIX 相対) を、サイト URL に変換する。
 * 一致しなければ null を返す。
 */
function resolveSiteUrl(resolved, isDirLink) {
  if (resolved === 'sections/README.md') return '/getting-started/';

  let m = resolved.match(/^sections\/([\w-]+)\.md$/);
  if (m && m[1] !== 'README') return `/${m[1].toLowerCase()}/`;

  m = resolved.match(/^sections\/([\w-]+)\/README\.md$/);
  if (m) return `/${m[1]}/`;

  m = resolved.match(/^sections\/([\w-]+)\/([\w-]+)\/LECTURE\.md$/i);
  if (m) return `/${m[1]}/${m[2]}/`;

  m = resolved.match(/^sections\/([\w-]+)\/([\w-]+)\/README\.md$/i);
  if (m) return `/${m[1]}/${m[2]}/readme/`;

  if (isDirLink) {
    m = resolved.match(/^sections\/([\w-]+)\/([\w-]+)$/);
    if (m) return `/${m[1]}/${m[2]}/`;
    m = resolved.match(/^sections\/([\w-]+)$/);
    if (m) return `/${m[1]}/`;
  }
  return null;
}

/**
 * 本文中のリンク・画像を書き換える。
 * @param {string} content              変換対象のマークダウン本文
 * @param {object} opts
 * @param {string} opts.sourceDir       ソースの POSIX 相対ディレクトリ
 * @param {string} opts.sourceSiteUrl   ソースが配置されるサイト URL
 * @param {string} opts.repo            GitHub リポジトリ URL
 * @param {string} opts.base            サイトの base プレフィックス
 * @param {string|null} [opts.downloadUrl]  `./project.zip` の差し替え先 (対象外なら null)
 */
export function transformLinks(content, { sourceDir, sourceSiteUrl, repo, base, downloadUrl = null }) {
  // 画像 (`![alt](...)`) はソースコードのように blob URL へ飛ばすと、blob は画像
  // 本体ではなく HTML ページを返すため <img> がリンク切れになる。画像だけは
  // 画像バイト列をそのまま返す raw.githubusercontent.com に向ける。
  const RAW = repo.replace('github.com', 'raw.githubusercontent.com');
  // resolved は ROOT(apps/site) 相対。GitHub URL は実ファイルのリポジトリ相対パスを
  // 指す必要があるため REPO_SUBDIR(apps/site) を前置する。
  const githubAsset = (isImage, resolved, hash, titlePart) => {
    const repoRel = path.posix.join(REPO_SUBDIR, resolved);
    return isImage
      ? `${RAW}/main/${repoRel}${hash}${titlePart}`
      : `${repo}/blob/main/${repoRel}${hash}${titlePart}`;
  };

  return content.replace(/(!?)(\[[^\]]*\])\(([^)\s]+)(\s+"[^"]*")?\)/g, (match, bang, label, rawTarget, title) => {
    const target = rawTarget.trim();
    const titlePart = title || '';
    const isImage = bang === '!';
    const prefix = `${bang}${label}`;

    if (/^(https?:|mailto:|tel:|#)/i.test(target)) return match;
    if (target.startsWith('/')) return match;

    const [pathPart, hashPart = ''] = target.split('#', 2);
    const hash = hashPart ? `#${hashPart}` : '';
    const isDirLink = pathPart.endsWith('/');
    const resolved = path.posix.normalize(path.posix.join(sourceDir, pathPart)).replace(/\/$/, '');

    // 本文中の手書きセンチネル `./project.zip` を、生成した配布 ZIP の URL に差し替える。
    if (downloadUrl && path.posix.basename(resolved) === 'project.zip') {
      return `${prefix}(${downloadUrl}${hash}${titlePart})`;
    }

    if (PUBLIC_ASSETS.has(path.posix.basename(resolved))) {
      const t = publicTargetFor(resolved, base);
      if (t) return `${prefix}(${t.url}${hash}${titlePart})`;
    }

    if (!target.startsWith('./') && !target.startsWith('../')) return match;
    if (resolved.startsWith('..') || resolved === '..') return match;

    // section 内の画像 (`<sec>/<lec>/images/...`) は public/ にコピーして base 相対で
    // 配信する。GitHub raw (main) と違い、push しなくてもローカル・本番の両方で表示される。
    if (isImage) {
      const im = resolved.match(/^sections\/([\w-]+)\/([\w-]+)\/(images\/.+)$/);
      if (im) return `${prefix}(${base}/${im[1]}/${im[2]}/${im[3]}${hash}${titlePart})`;
    }

    const toUrl = resolveSiteUrl(resolved, isDirLink);
    if (toUrl) {
      return `${prefix}(${relativeUrl(sourceSiteUrl, toUrl, hash)}${titlePart})`;
    }

    if (resolved.startsWith('sections/')) {
      return `${prefix}(${githubAsset(isImage, resolved, hash, titlePart)})`;
    }

    if (!resolved.includes('/') && resolved.length > 0) {
      return `${prefix}(${githubAsset(isImage, resolved, hash, titlePart)})`;
    }

    return match;
  });
}
