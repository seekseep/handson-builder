import { pool } from '../app/db.js';

// 追記式・非破壊。すでにデータがあればスキップし、空のときだけ初期データを入れる。
const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM items');
if (rows[0].count > 0) {
  console.log(`[seed] items already has ${rows[0].count} rows, skip`);
  await pool.end();
  process.exit(0);
}

const samples = [
  { title: 'はじめてのアイテム', body: 'これはシードデータの本文です。' },
  { title: '2 つ目のアイテム', body: '一覧と詳細の動作確認用。' },
  { title: '3 つ目のアイテム', body: '自由に書き換えてください。' },
];

for (const s of samples) {
  await pool.query('INSERT INTO items (title, body) VALUES ($1, $2)', [s.title, s.body]);
}

console.log(`[seed] inserted ${samples.length} items`);
await pool.end();
