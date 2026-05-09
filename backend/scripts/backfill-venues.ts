import { prisma } from "../src/config/database";

// Backfill: every existing hotel that has menu items but no venue
// gets a "Main Restaurant" venue created, and its items moved into it.

async function main() {
  const hotels = await prisma.hotel.findMany({ include: { venues: true, menuItems: true } });
  let createdVenues = 0;
  let movedItems = 0;

  for (const hotel of hotels) {
    if (hotel.venues.length > 0) continue; // already has venues
    if (hotel.menuItems.length === 0) continue; // nothing to backfill

    const venue = await prisma.venue.create({
      data: {
        hotelId: hotel.id,
        name: "Main Restaurant",
        kind: "restaurant",
        description: "Auto-created during venues migration",
      },
    });
    createdVenues++;

    const updated = await prisma.menuItem.updateMany({
      where: { hotelId: hotel.id, venueId: null },
      data: { venueId: venue.id },
    });
    movedItems += updated.count;
  }

  console.log(`✅ Backfilled ${createdVenues} venues, moved ${movedItems} items`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
