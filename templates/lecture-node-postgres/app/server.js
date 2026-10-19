import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { items } from './routes/items.js';

const app = new Hono();

// 静的ファイル（CSS・画像）。app/public/ 配下を配信する。
app.use('/*', serveStatic({ root: './app/public' }));

// トップは一覧へ
app.get('/', (c) => c.redirect('/items/'));

// 各リソースのルートをマウント
app.route('/items', items);

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
});
