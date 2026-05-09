/*
  Warnings:

  - You are about to drop the column `sooulContent` on the `openclaw_configs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "openclaw_configs" DROP COLUMN "sooulContent",
ADD COLUMN     "soulContent" TEXT;
