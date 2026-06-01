export interface Habit {
  id: string;
  name: string;
}

export interface JournalEntry {
  date: string; // Format: YYYY-MM-DD
  mood: 'cream' | 'off-white' | 'pink';
  content: string;
  habitsCompleted: string[]; // Array of Habit IDs
}
