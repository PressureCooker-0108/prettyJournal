"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// Helper to authenticate user and return userId
async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

// Fetch all journal entries for the current user
export async function getJournalEntries() {
  const userId = await requireAuth();
  return db.journalEntry.findMany({
    where: { userId }
  });
}

// Create or update a journal entry
export async function upsertJournalEntry(
  date: string,
  mood: "cream" | "off-white" | "pink",
  content: string
) {
  const userId = await requireAuth();
  return db.journalEntry.upsert({
    where: {
      userId_date: {
        userId,
        date
      }
    },
    update: {
      mood,
      content
    },
    create: {
      userId,
      date,
      mood,
      content
    }
  });
}

// Reset/Delete a journal entry
export async function resetJournalEntry(date: string) {
  const userId = await requireAuth();
  try {
    return await db.journalEntry.delete({
      where: {
        userId_date: {
          userId,
          date
        }
      }
    });
  } catch (e) {
    // Return null if record didn't exist
    return null;
  }
}

// Fetch all habits for the current user
export async function getHabits() {
  const userId = await requireAuth();
  return db.habit.findMany({
    where: { userId }
  });
}

// Create a new habit
export async function addHabitAction(name: string) {
  const userId = await requireAuth();
  return db.habit.create({
    data: {
      userId,
      name,
      completedDates: []
    }
  });
}

// Delete a habit
export async function deleteHabitAction(id: string) {
  const userId = await requireAuth();
  return db.habit.deleteMany({
    where: {
      id,
      userId
    }
  });
}

// Toggle habit completion on a specific date
export async function toggleHabitCompletionAction(
  habitId: string,
  date: string,
  isCompleted: boolean
) {
  const userId = await requireAuth();
  
  const habit = await db.habit.findFirst({
    where: { id: habitId, userId }
  });
  
  if (!habit) {
    throw new Error("Habit not found");
  }

  let updatedDates = [...habit.completedDates];
  if (isCompleted) {
    if (!updatedDates.includes(date)) {
      updatedDates.push(date);
    }
  } else {
    updatedDates = updatedDates.filter((d) => d !== date);
  }

  return db.habit.update({
    where: { id: habitId },
    data: {
      completedDates: updatedDates
    }
  });
}
