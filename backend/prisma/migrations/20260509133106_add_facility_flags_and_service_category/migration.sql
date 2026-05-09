-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "hasBar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasConference" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasGym" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasPool" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasRestaurant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasRoomService" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasSpa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasTransfers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "petFriendly" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'general';
