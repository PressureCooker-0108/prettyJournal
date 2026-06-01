import { z } from "zod";

// Validates YYYY-MM-DD format
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const EntrySchema = z.object({
  date: z.string().regex(dateRegex, {
    message: "Date must be in YYYY-MM-DD format",
  }),
  mood: z.enum(["cream", "off-white", "pink"]),
  content: z.string().transform((val) => {
    // Simple sanitization: escape HTML tags
    return val
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }),
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
