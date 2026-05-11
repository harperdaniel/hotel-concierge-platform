-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "roomServiceBookable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roomServiceBookingNotes" TEXT;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "bookable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bookingInstructions" TEXT,
ADD COLUMN     "bookingMethod" TEXT;

-- AlterTable
ALTER TABLE "venues" ADD COLUMN     "bookable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bookingInstructions" TEXT,
ADD COLUMN     "bookingMethod" TEXT;
