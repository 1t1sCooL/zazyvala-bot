import { Controller, Get, Header } from '@nestjs/common';

const PAGE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Зазывала — админка</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; }
  h1 { font-size: 1.3rem; }
  input { padding: .5rem; width: 320px; }
  button { padding: .5rem .9rem; cursor: pointer; }
  table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
  th, td { border: 1px solid #ddd; padding: .4rem .6rem; text-align: left; font-size: .9rem; }
  th { background: #f5f5f5; }
  .stats { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1rem; }
  .card { border: 1px solid #ddd; border-radius: 8px; padding: .8rem 1rem; }
  .card b { font-size: 1.4rem; display: block; }
  .err { color: #c00; margin-top: .5rem; }
  .members-cell { background: #fafafa; }
  .members-cell table { margin: .3rem 0; }
  .muted { color: #888; }
</style>
</head>
<body>
  <h1>Зазывала — админка</h1>
  <div>
    <input id="token" type="password" placeholder="ADMIN_TOKEN" />
    <button onclick="load()">Загрузить</button>
  </div>
  <div id="err" class="err"></div>
  <div id="stats" class="stats"></div>
  <h2>Чаты</h2>
  <table id="chats"><thead><tr>
    <th>ID</th><th>Название</th><th>Тип</th><th>Участники</th><th>Помощники</th><th>Зовов</th><th></th>
  </tr></thead><tbody></tbody></table>

<script>
  const tokenEl = document.getElementById('token');
  tokenEl.value = localStorage.getItem('adminToken') || '';

  async function api(path, options) {
    const res = await fetch(path, Object.assign({}, options, {
      headers: Object.assign(
        { 'X-Admin-Token': tokenEl.value },
        options && options.body ? { 'Content-Type': 'application/json' } : {},
      ),
    }));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  // Имена приходят из Telegram — экранируем перед вставкой в HTML.
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // Разворачивает/сворачивает список участников чата под его строкой.
  async function toggleMembers(chatId) {
    const existing = document.getElementById('members-' + chatId);
    if (existing) { existing.remove(); return; }
    try {
      const members = await api('/admin/chats/' + chatId + '/members?limit=200');
      const tr = document.createElement('tr');
      tr.id = 'members-' + chatId;
      const rows = members.map(m =>
        '<tr><td>' + esc(m.name) + '</td><td>' + (m.username ? '@' + esc(m.username) : '') +
        '</td><td>' + esc(m.status) + '</td><td>' + (m.subscribed ? 'да' : 'нет') +
        '</td><td>' + (m.blacklisted ? 'да' : '') + '</td></tr>'
      ).join('');
      tr.innerHTML = '<td colspan="7" class="members-cell">' + (members.length
        ? '<table><thead><tr><th>Имя</th><th>Username</th><th>Статус</th><th>Подписан</th><th>Игнор</th></tr></thead><tbody>' + rows + '</tbody></table>'
        : '<span class="muted">Пока никого: участники появляются по активности в чате, /join или кнопке «+ участник».</span>') + '</td>';
      document.getElementById('chat-' + chatId).after(tr);
    } catch (e) {
      alert('Не удалось загрузить участников: ' + e.message);
    }
  }

  // Добавление участника по @username: если бот уже знает его id — сразу
  // полноценный участник, иначе появится в зове как @username до первого
  // его сообщения.
  async function addMember(chatId) {
    const raw = prompt('Юзернейм участника (например, @ivanov):');
    if (!raw) return;
    try {
      const r = await api('/admin/chats/' + chatId + '/members', {
        method: 'POST',
        body: JSON.stringify({ username: raw.trim() }),
      });
      alert(r.status === 'member'
        ? 'Добавлен как полноценный участник (id уже известен боту).'
        : 'Добавлен как @' + r.username + ' — до первого сообщения будет упоминаться по юзернейму.');
      await load();
      await toggleMembers(chatId); // показать обновлённый список
    } catch (e) {
      alert('Не получилось: ' + e.message + ' (юзернейм: 5-32 символа, латиница/цифры/_)');
    }
  }

  async function load() {
    document.getElementById('err').textContent = '';
    localStorage.setItem('adminToken', tokenEl.value);
    try {
      const stats = await api('/admin/stats');
      document.getElementById('stats').innerHTML = Object.entries({
        'Чатов': stats.chats, 'Пользователей': stats.users,
        'Активных участников': stats.activeMembers, 'Всего зовов': stats.summonsTotal,
      }).map(([k, v]) => '<div class="card">' + k + '<b>' + v + '</b></div>').join('');

      const chats = await api('/admin/chats');
      document.querySelector('#chats tbody').innerHTML = chats.map(c =>
        '<tr id="chat-' + c.id + '"><td>' + c.id + '</td><td>' + esc(c.title) + '</td><td>' + esc(c.type) +
        '</td><td><a href="javascript:void(0)" onclick="toggleMembers(\\'' + c.id + '\\')">' + c.members + ' →</a>' +
        '</td><td>' + c.assistants + '</td><td>' + c.summonsTotal +
        '</td><td><button onclick="addMember(\\'' + c.id + '\\')">+ участник</button></td></tr>'
      ).join('');
    } catch (e) {
      document.getElementById('err').textContent = 'Ошибка: ' + e.message + ' (проверьте токен)';
    }
  }
  if (tokenEl.value) load();
</script>
</body>
</html>`;

/**
 * Публичная страница админ-панели (без guard) — токен вводится в форме и
 * отправляется в заголовке X-Admin-Token к защищённым /admin/* эндпоинтам.
 */
@Controller('admin')
export class AdminUiController {
  @Get('ui')
  @Header('Content-Type', 'text/html; charset=utf-8')
  ui(): string {
    return PAGE;
  }
}
