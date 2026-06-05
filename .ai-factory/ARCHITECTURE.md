# Архитектура: Модульный монолит (Modular Monolith)

## Обзор

Бот «Зазывала» — единое NestJS-приложение, разбитое на изолированные доменные модули с явными границами. Это естественно ложится на модульную систему NestJS (`@Module`, DI) и даёт простую эксплуатацию (один деплой, одна БД), сохраняя возможность позже вынести тяжёлые части (например, рассылку зова) в отдельный воркер или сервис без переписывания доменной логики.

Telegram-слой (хендлеры `nestjs-telegraf`) — это presentation-слой бота: он тонкий и только транслирует апдейты в вызовы доменных сервисов. Веб-админка — второй presentation-слой поверх тех же доменных модулей.

## Обоснование решения

- **Тип проекта:** Telegram-бот + веб-админка (из DESCRIPTION.md)
- **Стек:** TypeScript, NestJS, PostgreSQL, Prisma, nestjs-telegraf
- **Команда/масштаб:** небольшая команда, умеренная доменная сложность, несколько подобластей
- **Ключевой фактор:** несколько чётких доменов (зов, участники, помощники, настройки) при одном деплое — модульный монолит даёт изоляцию без операционных издержек микросервисов. Альтернативы (Layered — слишком плоско для нескольких доменов; DDD/Microservices — избыточны на этом масштабе).

## Структура папок

```
src/
├── main.ts                     # Bootstrap приложения
├── app.module.ts               # Composition root: подключение модулей
│
├── prisma/                     # Инфраструктура доступа к данным
│   ├── prisma.module.ts        # Global-модуль с PrismaService
│   └── prisma.service.ts       # Обёртка PrismaClient (lifecycle hooks)
│
├── shared/                     # Действительно общий код
│   ├── config/                 # Схема и валидация env
│   ├── guards/                 # Напр. CanSummonGuard (общие политики)
│   └── utils/                  # batching, sleep, retry helpers
│
└── modules/
    ├── bot/                    # Presentation-слой Telegram (тонкий)
    │   ├── bot.module.ts
    │   ├── bot.update.ts       # @Update: /start, /help, маршрутизация
    │   ├── context.interface.ts
    │   └── scenes/             # @Scene/@Wizard диалоги настройки
    │
    ├── chats/                  # Регистрация чатов, где есть бот
    │   ├── chats.module.ts
    │   ├── chats.service.ts
    │   └── index.ts            # Публичный API модуля
    │
    ├── members/                # Реестр участников (opt-in/opt-out)
    │   ├── members.module.ts
    │   ├── members.service.ts
    │   └── index.ts
    │
    ├── summon/                 # ЯДРО: логика зова + батчинг упоминаний
    │   ├── summon.module.ts
    │   ├── summon.service.ts
    │   └── index.ts
    │
    ├── assistants/             # Помощники (со-ведущие с правом зова)
    │   ├── assistants.module.ts
    │   ├── assistants.service.ts
    │   └── index.ts
    │
    ├── settings/               # Настройки на чат + локализация
    │   ├── settings.module.ts
    │   ├── settings.service.ts
    │   └── index.ts
    │
    └── admin/                  # Presentation-слой веб-админки (REST)
        ├── admin.module.ts
        ├── *.controller.ts
        └── dto/

prisma/
└── schema.prisma               # Модели: Chat, ChatMember, Assistant, ChatSettings, TagGroup
```

## Правила зависимостей

- ✅ Presentation-слои (`bot`, `admin`) → доменные модули (`summon`, `members`, ...).
- ✅ Доменные модули → `prisma` (через PrismaService) и `shared`.
- ✅ `summon` → `members`, `chats`, `settings`, `assistants` (через их публичные API).
- ❌ Доменные модули НЕ импортируют `bot` или `admin` (presentation не вызывается из домена).
- ❌ Нельзя тянуться во внутренности чужого модуля — только через его `index.ts`.
- ❌ Бизнес-логика в `*.update.ts`/контроллерах запрещена — только делегирование сервисам.

Поток вызова зова: `bot.update.ts (@Command('call'))` → `SummonService.callAll()` → `MembersService` + `SettingsService` + батчинг (`shared/utils`) → Telegram API.

## Коммуникация модулей

- **Внутри процесса:** через DI и публичные API модулей (экспортируемые провайдеры в `index.ts` / `exports` модуля).
- **Presentation → домен:** хендлеры и контроллеры внедряют доменные сервисы.
- **Доступ к данным:** только через `PrismaService`; доменные сервисы не знают про детали SQL.
- **Готовность к выносу:** тяжёлый зов больших чатов оформляется как фоновая задача/очередь, чтобы хендлер возвращался сразу и не блокировал event loop (позже легко вынести в отдельный воркер).

## Ключевые принципы

1. **Тонкий Telegram-слой.** `@Update`-классы и контроллеры админки только парсят вход и зовут сервис.
2. **Явные границы модулей.** Каждый модуль экспортирует минимальный публичный API; внутренности скрыты.
3. **Изоляция ORM.** Prisma спрятана за `PrismaService`; доменные сервисы оперируют доменными методами.
4. **Конфиг и секреты из окружения.** `BOT_TOKEN`, `DATABASE_URL` — только через `ConfigService`.
5. **Устойчивость к лимитам Telegram.** Массовые упоминания батчатся, 429/flood обрабатываются с backoff; частичный сбой не роняет зов.

## Примеры кода

### Тонкий хендлер делегирует в доменный сервис

```ts
// modules/bot/bot.update.ts
@Update()
export class BotUpdate {
  constructor(private readonly summon: SummonService) {} // домен внедрён

  @Command('call')
  async onCall(@Ctx() ctx: Context) {
    await this.summon.callAll(ctx); // никакой логики здесь
  }
}
```

### Доменный сервис использует только PrismaService и публичные API соседей

```ts
// modules/summon/summon.service.ts
@Injectable()
export class SummonService {
  constructor(
    private readonly members: MembersService,   // публичный API модуля members
    private readonly settings: SettingsService,
    @InjectBot() private readonly bot: Telegraf<Context>,
  ) {}

  async callAll(ctx: Context) {
    const chatId = ctx.chat!.id;
    const cfg = await this.settings.forChat(chatId);
    const people = await this.members.listActive(chatId); // без прямого SQL
    await summonAll(this.bot.telegram, chatId, people, cfg.header); // батчинг из shared/utils
  }
}
```

### Граница модуля: публичный API

```ts
// modules/members/index.ts — единственная точка входа в модуль
export { MembersModule } from './members.module';
export { MembersService } from './members.service';
// внутренние репозитории/хелперы НЕ экспортируются
```

## Анти-паттерны

- ❌ Бизнес-логика прямо в `*.update.ts` или в контроллерах админки.
- ❌ Импорт `PrismaService`/`PrismaClient` напрямую в Telegram-хендлерах.
- ❌ Импорт внутренних файлов чужого модуля в обход его `index.ts`.
- ❌ Синхронный зов всего чата в обработчике (блокировка event loop) вместо батчинга/фоновой задачи.
- ❌ Хардкод токена бота или строки подключения к БД в коде.
- ❌ Зависимость доменного модуля от presentation-слоёв (`bot`/`admin`).
