import { PrismaClient } from '@prisma/client';
import { PrismaService } from './prisma.service';

// Smoke-тест: не подключается к реальной БД, проверяет каркас сервиса.
describe('PrismaService', () => {
  it('is a PrismaClient with lifecycle hooks', () => {
    const service = new PrismaService();

    expect(service).toBeInstanceOf(PrismaClient);
    expect(typeof service.$connect).toBe('function');
    expect(typeof service.$disconnect).toBe('function');
    expect(typeof service.onModuleInit).toBe('function');
    expect(typeof service.onModuleDestroy).toBe('function');
  });
});
