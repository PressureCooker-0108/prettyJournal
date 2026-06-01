import { z } from "zod";

// Validates YYYY-MM-DD format
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const EntrySchema = z.object({
  date: z.string().regex(dateRegex, {
    message: "Date must be in YYYY-MM-DD format",
  }),
  mood: z.enum(["cream", "off-white", "pink"]),
  content: z.string(),
});

export const HabitSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Habit name cannot be empty" })
    .max(100, { message: "Habit name cannot exceed 100 characters" })
    .trim(),
});

export const ToggleHabitSchema = z.object({
  habitId: z.string().min(1, { message: "Habit ID is required" }),
  date: z.string().regex(dateRegex, { message: "Date must be YYYY-MM-DD" }),
  isCompleted: z.boolean(),
});

export const DeleteHabitSchema = z.object({
  id: z.string().min(1, { message: "Habit ID is required" }),
});

export const ThemePreferencesSchema = z.object({
  canvas: z.enum(["cream", "sage", "lavender"]),
  ink: z.enum(["espresso", "slate", "plum"]),
  typography: z.enum(["novelist", "modernist", "logbook"]),
});
