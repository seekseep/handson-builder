import pg from 'pg';

// ORM は使わず pg で生 SQL を書く。接続情報は DATABASE_URL 環境変数から取る。
// Docker では compose の environment、ローカルでは .env で渡す。
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 値のバインドは必ずプレースホルダ（$1, $2 ...）で行う。文字列連結で SQL を組まない。
export function query(text, params) {
  return pool.query(text, params);
}
