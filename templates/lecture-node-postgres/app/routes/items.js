import { Hono } from 'hono';
import { html } from 'hono/html';
import { query } from '../db.js';
import { layout } from '../components/layout.js';

// 「items」リソースの最小 CRUD（一覧・詳細・作成）。
// レクチャーの題材に合わせてこのファイルを作り替える土台。
export const items = new Hono();

// 一覧
items.get('/', async (c) => {
  const { rows } = await query(
    'SELECT id, title, created_at FROM items ORDER BY id DESC',
  );
  return c.html(
    layout(
      'アイテム一覧',
      html`
        <h1>アイテム一覧</h1>
        <form method="post" action="/items" class="new-item">
          <input type="text" name="title" placeholder="タイトル" required />
          <button type="submit">追加</button>
        </form>
        <ul class="item-list">
          ${rows.map(
            (item) => html`
              <li>
                <a href="/items/${item.id}">${item.title}</a>
              </li>
            `,
          )}
        </ul>
      `,
    ),
  );
});

// 詳細
items.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const { rows } = await query(
    'SELECT id, title, body, created_at FROM items WHERE id = $1',
    [id],
  );
  const item = rows[0];
  if (!item) return c.notFound();

  return c.html(
    layout(
      item.title,
      html`
        <p><a href="/items/">← 一覧に戻る</a></p>
        <h1>${item.title}</h1>
        <p class="meta">作成: ${String(item.created_at)}</p>
        <p>${item.body}</p>
      `,
    ),
  );
});

// 作成
items.post('/', async (c) => {
  const form = await c.req.parseBody();
  const title = String(form.title ?? '').trim();
  if (title) {
    // 値はプレースホルダでバインドする（文字列連結しない）。
    await query('INSERT INTO items (title, body) VALUES ($1, $2)', [title, '']);
  }
  return c.redirect('/items/');
});
