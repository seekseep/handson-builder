import { pool } from '../app/db.js';

// テーブル定義のみ。データ投入は seed.js が担当する。
await pool.query(`
  CREATE TABLE IF NOT EXISTS items (
    id          SERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

console.log('[init] tables ready');
await pool.end();
