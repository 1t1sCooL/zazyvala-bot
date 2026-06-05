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
    <th>ID</th><th>Название</th><th>Тип</th><th>Участники</th><th>Помощники</th><th>Зовов</th>
  </tr></thead><tbody></tbody></table>

<script>
  const tokenEl = document.getElementById('token');
  tokenEl.value = localStorage.getItem('adminToken') || '';

  async function api(path) {
    const res = await fetch(path, { headers: { 'X-Admin-Token': tokenEl.value } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
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
        '<tr><td>' + c.id + '</td><td>' + (c.title || '') + '</td><td>' + (c.type || '') +
        '</td><td>' + c.members + '</td><td>' + c.assistants + '</td><td>' + c.summonsTotal + '</td></tr>'
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
