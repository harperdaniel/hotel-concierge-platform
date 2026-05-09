import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo user
  const hash = await bcrypt.hash("demo1234", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@hotelconcierge.dev" },
    update: {},
    create: {
      email: "demo@hotelconcierge.dev",
      passwordHash: hash,
      name: "Demo Hotelier",
    },
  });
  console.log(`   User: ${user.email} (password: demo1234)`);

  // Create demo hotel
  const hotel = await prisma.hotel.upsert({
    where: { id: "demo-hotel-001" },
    update: {},
    create: {
      id: "demo-hotel-001",
      name: "Grand Oslo Hotel",
      address: "Karl Johans gate 1, 0154 Oslo",
      phone: "+47 22 00 00 00",
      email: "hello@grandoslo.no",
      website: "https://grandoslo.no",
      userId: user.id,
    },
  });
  console.log(`   Hotel: ${hotel.name}`);

  // Add knowledge
  const knowledgeItems = [
    { category: "amenities", content: "Free WiFi throughout the hotel. Password: WelcomeGrandOslo. Gym open 06:00-22:00. Sauna open 15:00-21:00." },
    { category: "policies", content: "Check-in from 15:00. Check-out before 11:00. Late check-out available for 500 NOK. Pets allowed for 300 NOK/night." },
    { category: "local_area", content: "We are located at Karl Johans gate, 5 min walk to the Royal Palace, 10 min to the National Gallery." },
    { category: "general", content: "Front desk is staffed 24/7. For urgent matters, dial 0 from your room phone." },
  ];

  for (const item of knowledgeItems) {
    await prisma.knowledgeEntry.create({
      data: { ...item, hotelId: hotel.id },
    });
  }
  console.log(`   Knowledge entries: ${knowledgeItems.length}`);

  // Add menu items
  const menuItems = [
    { name: "Grilled Salmon", description: "With seasonal vegetables and dill sauce", price: 34900, category: "mains" },
    { name: "Beef Tenderloin", description: "200g with truffle mashed potatoes", price: 42900, category: "mains" },
    { name: "Caesar Salad", description: "Romaine, parmesan, croutons, chicken", price: 24900, category: "mains" },
    { name: "Bruschetta", description: "Tomato, basil, mozzarella on sourdough", price: 15900, category: "starters" },
    { name: "French Onion Soup", description: "Gruyère gratinée", price: 17900, category: "starters" },
    { name: "Chocolate Fondant", description: "With vanilla ice cream", price: 18900, category: "desserts" },
    { name: "Sauvignon Blanc", description: "Marlborough, New Zealand — glass", price: 14900, category: "drinks" },
    { name: "Sparkling Water", description: "750ml", price: 6900, category: "drinks" },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.create({
      data: { ...item, hotelId: hotel.id },
    });
  }
  console.log(`   Menu items: ${menuItems.length}`);

  // Add services
  const services = [
    { name: "Airport Transfer", description: "Tesla Model Y from Gardermoen", durationMin: 45, price: 99500 },
    { name: "Spa Treatment", description: "60 min full body massage", durationMin: 60, price: 120000 },
    { name: "Breakfast Buffet", description: "06:30-10:00 in the restaurant", durationMin: 60, price: 29500 },
  ];

  for (const service of services) {
    await prisma.service.create({
      data: { ...service, hotelId: hotel.id },
    });
  }
  console.log(`   Services: ${services.length}`);

  console.log("✅ Seed complete!");
  console.log("\n   Login with:");
  console.log("   Email:    demo@hotelconcierge.dev");
  console.log("   Password: demo1234");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
