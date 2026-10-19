import { pool } from '../app/db.js';

// 全消しのみ。投入はしない（database:reset が reset → seed の順で呼ぶ）。
// RESTART IDENTITY で SERIAL のカウンタも 1 に戻す。
await pool.query('TRUNCATE TABLE items RESTART IDENTITY CASCADE');

console.log('[reset] all tables truncated');
await pool.end();
