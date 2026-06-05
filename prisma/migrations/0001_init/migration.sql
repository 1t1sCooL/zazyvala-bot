-- CreateTable
CREATE TABLE "Chat" (
    "id" BIGINT NOT NULL,
    "title" TEXT,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMember" (
    "chatId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "subscribed" BOOLEAN NOT NULL DEFAULT true,
    "blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "ChatMember_pkey" PRIMARY KEY ("chatId","userId")
);

-- CreateTable
CREATE TABLE "Assistant" (
    "chatId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "addedBy" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assistant_pkey" PRIMARY KEY ("chatId","userId")
);

-- CreateTable
CREATE TABLE "ChatSettings" (
    "chatId" BIGINT NOT NULL,
    "header" TEXT,
    "mentionsPerBatch" INTEGER NOT NULL DEFAULT 5,
    "cooldownSec" INTEGER NOT NULL DEFAULT 60,
    "language" TEXT NOT NULL DEFAULT 'ru',
    "callPolicy" TEXT NOT NULL DEFAULT 'all',
    "lastSummonAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSettings_pkey" PRIMARY KEY ("chatId")
);

-- CreateTable
CREATE TABLE "TagGroup" (
    "id" SERIAL NOT NULL,
    "chatId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TagGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagGroupMember" (
    "tagGroupId" INTEGER NOT NULL,
    "userId" BIGINT NOT NULL,

    CONSTRAINT "TagGroupMember_pkey" PRIMARY KEY ("tagGroupId","userId")
);

-- CreateIndex
CREATE INDEX "ChatMember_chatId_status_idx" ON "ChatMember"("chatId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TagGroup_chatId_name_key" ON "TagGroup"("chatId", "name");

-- AddForeignKey
ALTER TABLE "ChatMember" ADD CONSTRAINT "ChatMember_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMember" ADD CONSTRAINT "ChatMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assistant" ADD CONSTRAINT "Assistant_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSettings" ADD CONSTRAINT "ChatSettings_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagGroup" ADD CONSTRAINT "TagGroup_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagGroupMember" ADD CONSTRAINT "TagGroupMember_tagGroupId_fkey" FOREIGN KEY ("tagGroupId") REFERENCES "TagGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

