import { ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  function make(queryRaw: jest.Mock) {
    return new HealthController({
      $queryRaw: queryRaw,
    } as unknown as PrismaService);
  }

  it('liveness returns ok', () => {
    const res = make(jest.fn()).check();
    expect(res.status).toBe('ok');
    expect(typeof res.uptime).toBe('number');
  });

  it('readiness returns db up when query succeeds', async () => {
    const res = await make(jest.fn().mockResolvedValue([{ x: 1 }])).ready();
    expect(res).toEqual({ status: 'ok', db: 'up' });
  });

  it('readiness throws 503 when db is down', async () => {
    await expect(
      make(jest.fn().mockRejectedValue(new Error('no db'))).ready(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
