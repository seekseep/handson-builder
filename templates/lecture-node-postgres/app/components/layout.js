import { html, raw } from 'hono/html';

// 共通レイアウト。本文（children）はタグ付きテンプレート（html``）で組み立てた
// 安全な断片を渡す前提。文字列をそのまま渡すとエスケープされる。
export function layout(title, children) {
  return html`<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <header class="site-header">
      <a href="/" class="site-title">__LECTURE_TITLE__</a>
    </header>
    <main class="container">
      ${children}
    </main>
  </body>
</html>`;
}

// children を文字列として受け取りたいときのためのヘルパー（必要なら使う）。
export { raw };
