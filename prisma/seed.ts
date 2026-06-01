async function main() {
  // Override with local TCP string to bypass HTTP protocol issue with prisma dev and local client
  process.env.DATABASE_URL = "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";
  
  const { db: prisma } = await import("../src/lib/db");
  const dummyUserId = "user_dev_seed_12345";
  console.log(`=== STARTING DATABASE SEEDING FOR DUMMY USER: ${dummyUserId} ===`);

  // 1. Clean up existing data for the dummy user to ensure clean seed re-runs
  console.log("-> Cleaning old dummy user data...");
  await prisma.journalEntry.deleteMany({ where: { userId: dummyUserId } });
  await prisma.habit.deleteMany({ where: { userId: dummyUserId } });

  // 2. Create the mock habit "Exercise Daily"
  console.log("-> Seeding mock habit: 'Exercise Daily'...");
  
  // We'll collect the completed dates from the 30 continuous entries
  const completedDates: string[] = [];
  
  // 3. Generate 30 continuous calendar entries starting from 30 days ago
  console.log("-> Seeding 30 continuous journal entries...");
  const moods = ["cream", "pink", "off-white"] as const;
  const mockContents = [
    "Had a quiet morning walk. Really enjoyed the cool breeze.",
    "Felt highly productive today, finished two major project tasks.",
    "A bit tired, but meditated for 15 minutes in the evening.",
    "Great session at the gym. Feeling energized!",
    "Had lunch with an old colleague. Nice catching up.",
    "Reflected on some personal goals. Writing down future plans.",
    "Rainy day. Spent most of the time reading a good book.",
    "Productive brainstorming session. Lots of clean ideas.",
    "Spent time cooking a nice meal. Off-white mood fits well.",
    "Felt a bit overwhelmed, but took breaks to stay mindful."
  ];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  for (let i = 0; i < 30; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    // Format date as YYYY-MM-DD
    const dateStr = currentDate.toISOString().split("T")[0];
    const mood = moods[Math.floor(Math.random() * moods.length)];
    const content = mockContents[i % mockContents.length] + ` (Day ${i + 1}/30 of seeded grid)`;

    // Seed journal entry
    await prisma.journalEntry.create({
      data: {
        userId: dummyUserId,
        date: dateStr,
        mood,
        content,
      },
    });

    // Randomly mark the habit as completed for this date (e.g., 60% probability)
    if (Math.random() > 0.4) {
      completedDates.push(dateStr);
    }
  }

  // Create mock habit
  await prisma.habit.create({
    data: {
      userId: dummyUserId,
      name: "Exercise Daily",
      completedDates,
    },
  });

  console.log(`-> Seed complete! Created 30 entries and 1 habit with ${completedDates.length} completions.`);
  console.log("=== DATABASE SEEDING COMPLETED SUCCESSFULLY ===");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    const { db } = await import("../src/lib/db");
    await db.$disconnect();
  });
