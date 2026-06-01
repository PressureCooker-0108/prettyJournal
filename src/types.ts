export interface Habit {
  id: string;
  userId: string;
  name: string;
  completedDates: string[]; // Dates (YYYY-MM-DD) on which this habit was completed
}

export interface JournalEntry {
  id: string;
  userId: string;
  date: string; // Format: YYYY-MM-DD
  mood: "cream" | "off-white" | "pink";
  content: string;
}
