import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// フロント（別オリジン）から呼べるように CORS を許可。本番では origin を自分の Pages に絞る。
app.use(
  '/api/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
);

// 一覧を返す（D1 から新しい順に取得）
app.get('/api/messages', async (c) => {
  // env.DB は wrangler.jsonc の d1_databases の binding 名。
  const { results } = await c.env.DB.prepare(
    'SELECT id, name, body, created_at FROM messages ORDER BY id DESC LIMIT 100',
  ).all();
  return c.json(results);
});

// 投稿を保存する
app.post('/api/messages', async (c) => {
  const data = await c.req.json();
  const name = String(data.name ?? '').trim();
  const body = String(data.body ?? '').trim();

  // サーバー側の入力チェック（フロントのチェックは迂回できるため必須）
  if (!name || !body) {
    return c.json({ error: 'name と body は必須です' }, 400);
  }

  // ORM は使わず生 SQL。値は必ずプレースホルダ `?` でバインドする（SQL インジェクション対策）。
  const result = await c.env.DB.prepare(
    'INSERT INTO messages (name, body) VALUES (?, ?)',
  )
    .bind(name, body)
    .run();

  return c.json({ id: result.meta.last_row_id, name, body }, 201);
});

export default app;
