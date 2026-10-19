// ローカルの Worker。公開後はデプロイで表示された Worker の URL に書き換える。
const API_BASE = 'http://localhost:8787';

const list = document.getElementById('message-list');
const form = document.getElementById('post-form');
const note = document.getElementById('note');

function showNote(text) {
  note.textContent = text;
  note.hidden = false;
}

function renderMessages(messages) {
  list.innerHTML = '';
  for (const m of messages) {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    const name = document.createElement('div');
    name.className = 'fw-bold';
    name.textContent = m.name;
    const body = document.createElement('div');
    body.className = 'fs-5';
    body.textContent = m.body;
    li.append(name, body);
    list.appendChild(li);
  }
}

async function loadMessages() {
  try {
    const res = await fetch(`${API_BASE}/api/messages`);
    renderMessages(await res.json());
  } catch (e) {
    showNote('API に接続できませんでした。Worker（npm run dev）が起動しているか確認してください。');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = form.name.value.trim();
  const body = form.body.value.trim();
  const res = await fetch(`${API_BASE}/api/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, body }),
  });
  if (!res.ok) {
    showNote('投稿に失敗しました。');
    return;
  }
  form.reset();
  note.hidden = true;
  // 保存されたので、サーバーから取り直して最新の一覧を表示する。
  await loadMessages();
});

loadMessages();
