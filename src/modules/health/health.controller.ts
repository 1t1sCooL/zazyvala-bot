import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface HealthStatus {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

interface ReadyStatus {
  status: 'ok';
  db: 'up';
}

/**
 * Liveness (/health) — процесс жив; readiness (/health/ready) — проверка БД.
 */
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  check(): HealthStatus {
    this.logger.debug('Liveness check requested');
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async ready(): Promise<ReadyStatus> {
    this.logger.debug('Readiness check requested');
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'up' };
    } catch (err) {
      this.logger.warn(
        `Readiness failed (db down): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new ServiceUnavailableException({ status: 'error', db: 'down' });
    }
  }
}
