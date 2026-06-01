import { useState, useEffect } from "react";
import { Habit, JournalEntry } from "@/types";

const LOCAL_STORAGE_HABITS_KEY = "watercolor_journal_habits";
const LOCAL_STORAGE_ENTRIES_KEY = "watercolor_journal_entries";

const DEFAULT_HABITS: Habit[] = [
  { id: "1", name: "Drink Water" },
  { id: "2", name: "Read" },
  { id: "3", name: "Exercise" },
  { id: "4", name: "Meditate" }
];

export function useJournalData() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<Record<string, JournalEntry>>({});
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedHabits = localStorage.getItem(LOCAL_STORAGE_HABITS_KEY);
      const storedEntries = localStorage.getItem(LOCAL_STORAGE_ENTRIES_KEY);

      if (storedHabits) {
        setHabits(JSON.parse(storedHabits));
      } else {
        // Pre-populate with default habits on first launch
        setHabits(DEFAULT_HABITS);
        localStorage.setItem(LOCAL_STORAGE_HABITS_KEY, JSON.stringify(DEFAULT_HABITS));
      }

      if (storedEntries) {
        setEntries(JSON.parse(storedEntries));
      }
    } catch (e) {
      console.error("Error loading data from localStorage", e);
    }
    setIsHydrated(true);
  }, []);

  // Save/Update habits
  const addHabit = (name: string) => {
    if (!name.trim()) return;
    const newHabit: Habit = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      name: name.trim()
    };
    const updatedHabits = [...habits, newHabit];
    setHabits(updatedHabits);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_HABITS_KEY, JSON.stringify(updatedHabits));
    }
  };

  const deleteHabit = (id: string) => {
    const updatedHabits = habits.filter((h) => h.id !== id);
    setHabits(updatedHabits);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_HABITS_KEY, JSON.stringify(updatedHabits));
    }

    // Also clean up this habit from all entries
    const updatedEntries = { ...entries };
    let hasChanges = false;
    Object.keys(updatedEntries).forEach((date) => {
      const entry = updatedEntries[date];
      if (entry.habitsCompleted.includes(id)) {
        updatedEntries[date] = {
          ...entry,
          habitsCompleted: entry.habitsCompleted.filter((hId) => hId !== id)
        };
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setEntries(updatedEntries);
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_ENTRIES_KEY, JSON.stringify(updatedEntries));
      }
    }
  };

  // Save/Update journal entry
  const saveEntry = (date: string, entryData: Omit<JournalEntry, "date">) => {
    const updatedEntries = {
      ...entries,
      [date]: {
        ...entryData,
        date
      }
    };
    setEntries(updatedEntries);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_ENTRIES_KEY, JSON.stringify(updatedEntries));
    }
  };

  // Reset entry to empty
  const resetEntry = (date: string) => {
    const updatedEntries = { ...entries };
    delete updatedEntries[date];
    setEntries(updatedEntries);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_ENTRIES_KEY, JSON.stringify(updatedEntries));
    }
  };

  return {
    habits,
    entries,
    isHydrated,
    addHabit,
    deleteHabit,
    saveEntry,
    resetEntry
  };
}
