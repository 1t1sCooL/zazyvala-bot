import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { sleep } from '../../shared/utils/telegram-retry';
import { ChatsService } from '../chats';
import { Context } from './context.interface';

/**
 * Разовый бэкфилл названий чатов на старте: у чатов, зарегистрированных до
 * того, как бот стал сохранять title, имя в БД пустое и админка показывает
 * пустую колонку «Название». Здесь дотягиваем его через getChat, не дожидаясь
 * следующего сообщения в группе. Идемпотентно: берём только чаты без названия,
 * поэтому после успешного заполнения повторные старты ничего не запрашивают.
 */
@Injectable()
export class ChatTitleBackfillService implements OnModuleInit {
  private readonly logger = new Logger(ChatTitleBackfillService.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly chats: ChatsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const ids = await this.chats.listIdsWithoutTitle();
    if (ids.length === 0) return;

    this.logger.log(
      `Backfilling titles for ${ids.length} chat(s) without a name`,
    );
    let filled = 0;
    for (const id of ids) {
      try {
        const chat = await this.bot.telegram.getChat(Number(id));
        const title = 'title' in chat ? chat.title : undefined;
        if (title) {
          await this.chats.setTitle(id, title);
          filled++;
        }
        // Лёгкая пауза против rate limit при множестве чатов.
        await sleep(50);
      } catch (err) {
        // Бот удалён из чата / нет доступа — пропускаем, старт не валим.
        this.logger.debug(
          `Skip title backfill for chat ${id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    this.logger.log(`Title backfill done: ${filled}/${ids.length} updated`);
  }
}
