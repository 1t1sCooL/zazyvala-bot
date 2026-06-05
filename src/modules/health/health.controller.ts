import { Controller, Get, Logger } from '@nestjs/common';

interface HealthStatus {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

/**
 * Тонкий healthcheck-эндпоинт для мониторинга и проверок деплоя.
 */
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  @Get()
  check(): HealthStatus {
    this.logger.debug('Health check requested');
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
