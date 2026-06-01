"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { EntrySchema, HabitSchema, ToggleHabitSchema, DeleteHabitSchema } from "@/lib/schemas";
import { z } from "zod";
import { logger } from "@/lib/logger";

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
  let userId: string | undefined;
  try {
    userId = await requireAuth();
    return db.journalEntry.findMany({
      where: { userId }
    });
  } catch (error) {
    logger.error("Error in getJournalEntries", error, { userId, action: "getJournalEntries" });
    return [];
  }
}

// Create or update a journal entry
export async function upsertJournalEntry(
  date: string,
  mood: "cream" | "off-white" | "pink",
  content: string
) {
  let userId: string | undefined;
  try {
    userId = await requireAuth();
    
    // Zod validation
    const parsed = EntrySchema.safeParse({ date, mood, content });
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map(e => e.message).join(", ");
      return { success: false, error: errorMsg };
    }
    
    const validated = parsed.data;
    
    const data = await db.journalEntry.upsert({
      where: {
        userId_date: {
          userId,
          date: validated.date
        }
      },
      update: {
        mood: validated.mood,
        content: validated.content
      },
      create: {
        userId,
        date: validated.date,
        mood: validated.mood,
        content: validated.content
      }
    });
    logger.info("Successfully upserted journal entry", { userId, date: validated.date, mood: validated.mood, action: "upsertJournalEntry" });
    return { success: true, data };
  } catch (error: any) {
    logger.error("Error in upsertJournalEntry", error, { userId, date, mood, action: "upsertJournalEntry" });
    return { success: false, error: error.message || "Failed to save journal entry" };
  }
}

// Reset/Delete a journal entry
export async function resetJournalEntry(date: string) {
  let userId: string | undefined;
  try {
    userId = await requireAuth();
    
    // Validate date format
    const parsedDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").safeParse(date);
    if (!parsedDate.success) {
      return { success: false, error: "Invalid date format" };
    }

    const data = await db.journalEntry.delete({
      where: {
        userId_date: {
          userId,
          date
        }
      }
    });
    logger.info("Successfully reset journal entry", { userId, date, action: "resetJournalEntry" });
    return { success: true, data };
  } catch (e: any) {
    logger.error("Error in resetJournalEntry", e, { userId, date, action: "resetJournalEntry" });
    // Return null data if record didn't exist or deletion failed
    return { success: false, error: e.message || "Failed to reset journal entry" };
  }
}

// Fetch all habits for the current user
export async function getHabits() {
  let userId: string | undefined;
  try {
    userId = await requireAuth();
    return db.habit.findMany({
      where: { userId }
    });
  } catch (error) {
    logger.error("Error in getHabits", error, { userId, action: "getHabits" });
    return [];
  }
}

// Create a new habit
export async function addHabitAction(name: string) {
  let userId: string | undefined;
  try {
    userId = await requireAuth();
    
    // Zod validation
    const parsed = HabitSchema.safeParse({ name });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    
    const data = await db.habit.create({
      data: {
        userId,
        name: parsed.data.name,
        completedDates: []
      }
    });
    logger.info("Successfully added habit", { userId, habitId: data.id, action: "addHabitAction" });
    return { success: true, data };
  } catch (error: any) {
    logger.error("Error in addHabitAction", error, { userId, habitName: name, action: "addHabitAction" });
    return { success: false, error: error.message || "Failed to create habit" };
  }
}

// Delete a habit
export async function deleteHabitAction(id: string) {
  let userId: string | undefined;
  try {
    userId = await requireAuth();
    
    // Zod validation
    const parsed = DeleteHabitSchema.safeParse({ id });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
 
    const data = await db.habit.deleteMany({
      where: {
        id: parsed.data.id,
        userId
      }
    });
    logger.info("Successfully deleted habit", { userId, habitId: parsed.data.id, action: "deleteHabitAction" });
    return { success: true, data };
  } catch (error: any) {
    logger.error("Error in deleteHabitAction", error, { userId, habitId: id, action: "deleteHabitAction" });
    return { success: false, error: error.message || "Failed to delete habit" };
  }
}

// Toggle habit completion on a specific date
export async function toggleHabitCompletionAction(
  habitId: string,
  date: string,
  isCompleted: boolean
) {
  let userId: string | undefined;
  try {
    userId = await requireAuth();
    
    // Zod validation
    const parsed = ToggleHabitSchema.safeParse({ habitId, date, isCompleted });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues.map(e => e.message).join(", ") };
    }
    
    const validated = parsed.data;

    const habit = await db.habit.findFirst({
      where: { id: validated.habitId, userId }
    });
    
    if (!habit) {
      return { success: false, error: "Habit not found" };
    }

    let updatedDates = [...habit.completedDates];
    if (validated.isCompleted) {
      if (!updatedDates.includes(validated.date)) {
        updatedDates.push(validated.date);
      }
    } else {
      updatedDates = updatedDates.filter((d) => d !== validated.date);
    }

    const data = await db.habit.update({
      where: { id: validated.habitId },
      data: {
        completedDates: updatedDates
      }
    });
    logger.info("Successfully toggled habit completion", { userId, habitId: validated.habitId, date: validated.date, isCompleted: validated.isCompleted, action: "toggleHabitCompletionAction" });
    return { success: true, data };
  } catch (error: any) {
    logger.error("Error in toggleHabitCompletionAction", error, { userId, habitId, date, isCompleted, action: "toggleHabitCompletionAction" });
    return { success: false, error: error.message || "Failed to toggle habit" };
  }
}
