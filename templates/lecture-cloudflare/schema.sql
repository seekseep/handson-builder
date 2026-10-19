-- D1（SQLite）のテーブル定義。`npm run db:setup` でローカル D1 に流す。
-- ORM は使わず、アプリ側は生 SQL + プレースホルダ `?` でこのテーブルを読み書きする。
CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
