-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "barHours" TEXT,
ADD COLUMN     "barNotes" TEXT,
ADD COLUMN     "conferenceNotes" TEXT,
ADD COLUMN     "gymHours" TEXT,
ADD COLUMN     "gymNotes" TEXT,
ADD COLUMN     "petPolicy" TEXT,
ADD COLUMN     "poolHours" TEXT,
ADD COLUMN     "poolNotes" TEXT,
ADD COLUMN     "spaHours" TEXT,
ADD COLUMN     "spaNotes" TEXT,
ADD COLUMN     "transferNotes" TEXT;

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "availableForRoomService" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "venueId" TEXT;

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'restaurant',
    "description" TEXT,
    "hours" TEXT,
    "location" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hotelId" TEXT NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
