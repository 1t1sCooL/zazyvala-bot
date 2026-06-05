import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Идемпотентный сид демо-данных. Запуск: npm run db:seed
async function main(): Promise<void> {
  const demoChatId = 1n; // плейсхолдер Telegram chat id

  const chat = await prisma.chat.upsert({
    where: { id: demoChatId },
    update: {},
    create: {
      id: demoChatId,
      title: 'Demo chat',
      type: 'supergroup',
    },
  });
  console.log(`Seeded chat ${chat.id}`);

  const settings = await prisma.chatSettings.upsert({
    where: { chatId: demoChatId },
    update: {},
    create: {
      chatId: demoChatId,
      header: 'Зову всех! 📣',
      mentionsPerBatch: 5,
      cooldownSec: 60,
      language: 'ru',
    },
  });
  console.log(`Seeded settings for chat ${settings.chatId}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
