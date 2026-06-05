import { Module } from '@nestjs/common';
import { AppConfigModule } from './shared/config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { BotModule } from './modules/bot/bot.module';
import { HealthModule } from './modules/health/health.module';

/**
 * Корневой модуль приложения (composition root).
 * Доменные и инфраструктурные модули подключаются здесь по мере реализации вех.
 */
@Module({
  imports: [AppConfigModule, PrismaModule, HealthModule, BotModule],
})
export class AppModule {}
