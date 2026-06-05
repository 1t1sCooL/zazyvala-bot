// Словари локализации. Ключи общие; язык выбирается из настроек чата.
export const messages: Record<string, Record<string, string>> = {
  ru: {
    welcome:
      'Привет! Я «Зазывала» — зову всех участников группы одним сообщением.\n\n' +
      'Добавь меня в групповой чат и используй /help, чтобы увидеть команды.',
    help:
      'Команды:\n' +
      '/call <текст> — позвать всех подписанных участников (текст необязателен)\n' +
      '/call <группа> — позвать только участников группы\n' +
      '/join, /leave — подписаться/отписаться от зова\n' +
      '/helpers, /addhelper, /delhelper — помощники (управление — админ, reply)\n' +
      '/callpolicy — кто может звать: all | assistants | admins (админ)\n' +
      '/groups, /newgroup, /delgroup, /joingroup, /leavegroup — группы тегов\n' +
      '/settings, /setheader, /setcooldown, /setbatch, /setlang — настройки (админ)\n' +
      '/ignore, /unignore — исключить/вернуть участника (reply, админ)',
    call_only_group: 'Команда /call работает только в групповом чате.',
    call_cooldown: 'Слишком часто. Попробуйте через {sec} сек.',
    call_empty:
      'Некого звать — пусть участники напишут /join или просто что-нибудь в чат.',
    call_empty_group:
      'В группе «{group}» пока никого. Вступить: /joingroup {group}',
    call_no_group: 'Такой группы нет. Список: /groups',
    call_denied: 'Звать может: {policy}. Политику меняет админ: /callpolicy',
    lang_usage: 'Текущий язык: {lang}. Сменить: /setlang <ru | en>',
    lang_admin_only: 'Менять язык может только администратор чата.',
    lang_unknown: 'Неизвестный язык. Доступно: ru, en',
    lang_set: 'Готово. Язык чата: {lang}.',
    policy_all: 'все участники',
    policy_assistants: 'администраторы и помощники',
    policy_admins: 'только администраторы',
  },
  en: {
    welcome:
      'Hi! I am "Zazyvala" — I summon everyone in the group with one message.\n\n' +
      'Add me to a group chat and use /help to see the commands.',
    help:
      'Commands:\n' +
      '/call <text> — summon all subscribed members (text optional)\n' +
      '/call <group> — summon only a tag group\n' +
      '/join, /leave — subscribe/unsubscribe from summons\n' +
      '/helpers, /addhelper, /delhelper — assistants (admin manages, reply)\n' +
      '/callpolicy — who can summon: all | assistants | admins (admin)\n' +
      '/groups, /newgroup, /delgroup, /joingroup, /leavegroup — tag groups\n' +
      '/settings, /setheader, /setcooldown, /setbatch, /setlang — settings (admin)\n' +
      '/ignore, /unignore — exclude/include a member (reply, admin)',
    call_only_group: 'The /call command works only in a group chat.',
    call_cooldown: 'Too soon. Try again in {sec} sec.',
    call_empty:
      'Nobody to summon — ask members to send /join or just write in the chat.',
    call_empty_group: 'Group "{group}" is empty. Join it: /joingroup {group}',
    call_no_group: 'No such group. List: /groups',
    call_denied:
      'Allowed to summon: {policy}. Admin changes it via /callpolicy',
    lang_usage: 'Current language: {lang}. Change: /setlang <ru | en>',
    lang_admin_only: 'Only a chat administrator can change the language.',
    lang_unknown: 'Unknown language. Available: ru, en',
    lang_set: 'Done. Chat language: {lang}.',
    policy_all: 'everyone',
    policy_assistants: 'admins and assistants',
    policy_admins: 'admins only',
  },
};
