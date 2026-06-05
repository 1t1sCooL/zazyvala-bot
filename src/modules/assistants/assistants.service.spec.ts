import { PrismaService } from '../../prisma/prisma.service';
import {
  AssistantsService,
  MAX_ASSISTANTS_PER_CHAT,
} from './assistants.service';

function createPrismaMock() {
  return {
    assistant: {
      count: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('AssistantsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: AssistantsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new AssistantsService(prisma as unknown as PrismaService);
  });

  it('adds an assistant when below the limit', async () => {
    prisma.assistant.count
      .mockResolvedValueOnce(0) // isAssistant
      .mockResolvedValueOnce(0); // count

    const res = await service.add(1n, 2n, 9n);

    expect(res).toEqual({ status: 'ok' });
    expect(prisma.assistant.create).toHaveBeenCalledWith({
      data: { chatId: 1n, userId: 2n, addedBy: 9n },
    });
  });

  it('returns exists when already an assistant', async () => {
    prisma.assistant.count.mockResolvedValueOnce(1); // isAssistant true

    const res = await service.add(1n, 2n);

    expect(res).toEqual({ status: 'exists' });
    expect(prisma.assistant.create).not.toHaveBeenCalled();
  });

  it('returns limit when the chat is at capacity', async () => {
    prisma.assistant.count
      .mockResolvedValueOnce(0) // isAssistant
      .mockResolvedValueOnce(MAX_ASSISTANTS_PER_CHAT); // count

    const res = await service.add(1n, 2n);

    expect(res).toEqual({ status: 'limit', max: MAX_ASSISTANTS_PER_CHAT });
    expect(prisma.assistant.create).not.toHaveBeenCalled();
  });

  it('removes an existing assistant', async () => {
    prisma.assistant.deleteMany.mockResolvedValue({ count: 1 });
    expect(await service.remove(1n, 2n)).toEqual({ status: 'ok' });
  });

  it('reports not_found when removing a non-assistant', async () => {
    prisma.assistant.deleteMany.mockResolvedValue({ count: 0 });
    expect(await service.remove(1n, 2n)).toEqual({ status: 'not_found' });
  });

  it('isAssistant reflects the count', async () => {
    prisma.assistant.count.mockResolvedValueOnce(1);
    expect(await service.isAssistant(1n, 2n)).toBe(true);
  });
});
