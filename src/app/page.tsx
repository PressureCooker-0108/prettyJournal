"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  RotateCcw,
  BookOpen,
  Sparkles,
  Check,
  Lock
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import {
  getJournalEntries,
  upsertJournalEntry,
  resetJournalEntry,
  getHabits,
  addHabitAction,
  deleteHabitAction,
  toggleHabitCompletionAction
} from "@/app/actions";
import { Habit, JournalEntry } from "@/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";

export default function Home() {
  const { isSignedIn, isLoaded: isAuthLoaded } = useUser();

  // Database States
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<Record<string, JournalEntry>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Calendar Date State (tracks the month currently viewed)
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Sidebar State for new habits
  const [newHabitName, setNewHabitName] = useState("");

  // Editor Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string>("");
  
  // Drawer draft state (used only for new entries before clicking "Save")
  const [draftContent, setDraftContent] = useState("");
  const [draftMood, setDraftMood] = useState<"cream" | "off-white" | "pink">("cream");
  
  // Ref for auto-resizing textarea & debounced autosave
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "">("");

  // Load database data if authenticated
  useEffect(() => {
    if (!isAuthLoaded) return;

    if (!isSignedIn) {
      setHabits([]);
      setEntries({});
      setIsLoadingData(false);
      return;
    }

    async function loadData() {
      try {
        setIsLoadingData(true);
        const [fetchedHabits, fetchedEntries] = await Promise.all([
          getHabits(),
          getJournalEntries()
        ]);
        
        setHabits(fetchedHabits);
        
        const entriesRecord: Record<string, JournalEntry> = {};
        fetchedEntries.forEach((entry) => {
          entriesRecord[entry.date] = {
            id: entry.id,
            userId: entry.userId,
            date: entry.date,
            mood: entry.mood as "cream" | "off-white" | "pink",
            content: entry.content
          };
        });
        setEntries(entriesRecord);
      } catch (error) {
        console.error("Error loading data from Neon:", error);
      } finally {
        setIsLoadingData(false);
      }
    }

    loadData();
  }, [isSignedIn, isAuthLoaded]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Auto-resize the textarea when content changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [draftContent, isDrawerOpen]);

  // --- CALENDAR GRID CALCULATIONS (Monday-aligned) ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthLabel = `${monthNames[month]} ${year}`;
  
  // Total days in the current month
  const totalDays = new Date(year, month + 1, 0).getDate();
  
  // 1st of month index (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  
  // Calculate offset to align by Monday:
  const startOffset = (firstDayOfWeek + 6) % 7;
  
  // Previous month details for filling leading cells
  const prevMonthDate = new Date(year, month, 0);
  const prevMonthTotalDays = prevMonthDate.getDate();
  
  // Assemble cells
  const cells: { dateStr: string; dayNum: number; isActive: boolean }[] = [];
  
  // Leading cells (Previous Month)
  for (let i = startOffset - 1; i >= 0; i--) {
    const dayNum = prevMonthTotalDays - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    cells.push({ dateStr, dayNum, isActive: false });
  }

  // Active cells (Current Month)
  for (let i = 1; i <= totalDays; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    cells.push({ dateStr, dayNum: i, isActive: true });
  }

  // Trailing cells (Next Month) to fill grid rows of 7
  const totalGridCells = Math.ceil(cells.length / 7) * 7;
  const trailingCount = totalGridCells - cells.length;
  for (let i = 1; i <= trailingCount; i++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    cells.push({ dateStr, dayNum: i, isActive: false });
  }

  // Navigation Handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Add Custom Habit Handler
  const handleAddHabitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) return;
    if (newHabitName.trim()) {
      const name = newHabitName.trim();
      setNewHabitName("");
      try {
        const created = await addHabitAction(name);
        setHabits((prev) => [...prev, created as Habit]);
      } catch (err) {
        console.error("Error adding habit:", err);
      }
    }
  };

  // Delete Habit Handler
  const handleDeleteHabit = async (habitId: string) => {
    if (!isSignedIn) return;
    try {
      await deleteHabitAction(habitId);
      setHabits((prev) => prev.filter((h) => h.id !== habitId));
    } catch (err) {
      console.error("Error deleting habit:", err);
    }
  };

  // Open Drawer Handler for a date
  const handleOpenDrawer = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    const existingEntry = entries[dateStr];
    
    if (existingEntry) {
      setDraftContent(existingEntry.content);
      setDraftMood(existingEntry.mood);
    } else {
      setDraftContent("");
      setDraftMood("cream");
    }
    
    setSaveStatus("");
    setIsDrawerOpen(true);
  };

  // Check if current draft exists as a permanent entry in global state
  const isExistingEntry = !!entries[selectedDateStr];

  // Helper for real-time debounced saving (existing entries)
  const triggerAutoSave = (content: string, mood: "cream" | "off-white" | "pink") => {
    if (!isExistingEntry || !isSignedIn) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    setSaveStatus("saving");
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        await upsertJournalEntry(selectedDateStr, mood, content);
        setSaveStatus("saved");
      } catch (e) {
        console.error("Auto-save failed:", e);
        setSaveStatus("");
      }
    }, 500); // 500ms debounce
  };

  // Habit toggling inside Drawer (secured and database integrated)
  const handleToggleHabitInDrawer = async (habitId: string, checked: boolean) => {
    if (!isSignedIn) return;

    // Optimistically update habits local state
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id === habitId) {
          const completedDates = [...h.completedDates];
          return {
            ...h,
            completedDates: checked
              ? [...completedDates, selectedDateStr]
              : completedDates.filter((d) => d !== selectedDateStr)
          };
        }
        return h;
      })
    );

    setSaveStatus("saving");
    try {
      await toggleHabitCompletionAction(habitId, selectedDateStr, checked);
      setSaveStatus("saved");
    } catch (err) {
      console.error("Failed to toggle habit in database:", err);
      setSaveStatus("");
      // Revert local state on error
      const refreshedHabits = await getHabits();
      setHabits(refreshedHabits);
    }
  };

  // Mood selection inside Drawer
  const handleSelectMoodInDrawer = async (mood: "cream" | "off-white" | "pink") => {
    setDraftMood(mood);
    
    if (isExistingEntry && isSignedIn) {
      // Optimistically update local entries state
      setEntries((prev) => ({
        ...prev,
        [selectedDateStr]: {
          ...prev[selectedDateStr],
          mood
        }
      }));
      
      triggerAutoSave(draftContent, mood);
    }
  };

  // Textarea input changes
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDraftContent(val);
    
    if (isExistingEntry && isSignedIn) {
      // Optimistically update local entries state
      setEntries((prev) => ({
        ...prev,
        [selectedDateStr]: {
          ...prev[selectedDateStr],
          content: val
        }
      }));
      
      triggerAutoSave(val, draftMood);
    }
  };

  // Explicit Save for NEW entries
  const handleSaveNewEntry = async () => {
    if (!isSignedIn) return;
    try {
      const created = await upsertJournalEntry(selectedDateStr, draftMood, draftContent);
      setEntries((prev) => ({
        ...prev,
        [selectedDateStr]: {
          id: created.id,
          userId: created.userId,
          date: created.date,
          mood: created.mood as "cream" | "off-white" | "pink",
          content: created.content
        }
      }));
      setSaveStatus("saved");
      setIsDrawerOpen(false);
    } catch (err) {
      console.error("Error creating entry in Neon:", err);
    }
  };

  // Reset Entry to Empty (deletes from database)
  const handleResetToEmpty = async () => {
    if (!isSignedIn) return;
    try {
      await resetJournalEntry(selectedDateStr);
      setEntries((prev) => {
        const next = { ...prev };
        delete next[selectedDateStr];
        return next;
      });
      setIsDrawerOpen(false);
    } catch (err) {
      console.error("Error deleting entry:", err);
    }
  };

  // Helper to format date labels for display
  const formatDateLabel = (dateString: string) => {
    if (!dateString) return "";
    const [y, m, d] = dateString.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-US", { 
      weekday: "long", 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    });
  };

  // Skeletons
  const HabitSkeleton = () => (
    <div className="flex flex-col gap-2 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-9 w-full bg-[#706661]/10 rounded-md" />
      ))}
    </div>
  );

  const GridSkeleton = () => (
    <div className="grid grid-cols-7 gap-1.5 md:gap-3 flex-1 auto-rows-fr">
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="aspect-square bg-[#706661]/5 border border-[#706661]/10 rounded-lg animate-pulse flex flex-col justify-between p-2 lg:p-3">
          <div className="w-4 h-4 bg-[#706661]/15 rounded" />
          <div className="flex gap-[3px] mt-auto">
            <div className="w-1.5 h-1.5 bg-[#706661]/15 rounded-full" />
            <div className="w-1.5 h-1.5 bg-[#706661]/15 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#FDFBF7] text-[#2A2421] font-sans antialiased selection:bg-[#FCE7E9]">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-[#706661]/10 bg-[#F5F2EB]/50 p-6 lg:p-8 flex flex-col gap-8 shrink-0 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#706661]" />
              <h1 className="text-2xl font-serif font-bold tracking-tight text-[#2A2421]">
                Patchwork
              </h1>
            </div>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
          <p className="text-sm text-[#706661] leading-relaxed">
            A quiet space to record your thoughts, track daily habits, and watch your months bloom into watercolor patches.
          </p>
        </div>

        <Show when="signed-out">
          <div className="flex flex-col gap-3 p-4 bg-[#FCE7E9]/40 border border-[#FCE7E9]/30 rounded-lg animate-fade-in">
            <p className="text-xs text-[#706661] leading-relaxed">
              Sign in to secure your daily logs and personalize your dashboard.
            </p>
            <div className="flex gap-2 w-full mt-1">
              <SignInButton mode="modal">
                <Button className="flex-1 text-xs bg-[#2A2421] text-[#FDFBF7] hover:bg-[#2A2421]/90 py-1.5 h-8 cursor-pointer">
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button variant="ghost" className="flex-1 text-xs text-[#2A2421] border border-[#706661]/25 hover:bg-[#FDFBF7] py-1.5 h-8 cursor-pointer">
                  Sign Up
                </Button>
              </SignUpButton>
            </div>
          </div>
        </Show>

        {/* HABITS MANAGEMENT PANEL */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#706661] font-sans">
            Habits Tracker
          </h2>

          <form onSubmit={handleAddHabitSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Add new habit..."
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              disabled={!isSignedIn}
              className="flex-1 bg-[#FDFBF7] border border-[#706661]/20 rounded-md py-1.5 px-3 text-sm text-[#2A2421] placeholder-[#706661]/40 focus:outline-none focus:ring-2 focus:ring-[#FCE7E9] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!isSignedIn}
              className="bg-[#2A2421] text-[#FDFBF7] hover:bg-[#2A2421]/90 rounded-md shrink-0 w-9 h-9 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </form>

          {isLoadingData && isSignedIn ? (
            <HabitSkeleton />
          ) : (
            <ul className="flex flex-col gap-2 mt-2">
              {!isSignedIn ? (
                <li className="text-xs text-[#706661]/50 italic font-sans py-2 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Sign in to manage habits.
                </li>
              ) : habits.length === 0 ? (
                <li className="text-xs text-[#706661]/60 italic font-sans py-2">
                  No habits added yet.
                </li>
              ) : (
                habits.map((habit, index) => (
                  <li 
                    key={habit.id} 
                    className="flex items-center justify-between py-1.5 px-3 bg-[#F5F2EB] border border-[#706661]/10 rounded-md text-sm group animate-fade-in"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-xs font-mono text-[#706661]/50 w-4">
                        {index + 1}.
                      </span>
                      <span className="truncate text-[#2A2421] font-medium font-sans">
                        {habit.name}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteHabit(habit.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#706661]/50 hover:text-red-600 transition-all focus:opacity-100 p-1 cursor-pointer"
                      title={`Delete "${habit.name}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <div className="mt-auto pt-6 border-t border-[#706661]/10 hidden lg:flex flex-col gap-2">
          <div className="flex gap-1.5 items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FDFBF7] border border-[#706661]/25"></span>
            <span className="text-xs text-[#706661]">Cream (Default Mood)</span>
          </div>
          <div className="flex gap-1.5 items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F5F2EB] border border-[#706661]/10"></span>
            <span className="text-xs text-[#706661]">Off-White (Reflective)</span>
          </div>
          <div className="flex gap-1.5 items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FCE7E9]"></span>
            <span className="text-xs text-[#706661]">Sakura Pink (Joyful)</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 lg:p-10 flex flex-col gap-6 max-w-6xl w-full mx-auto">
        
        {/* CALENDAR NAVIGATION BAR */}
        <header className="flex items-center justify-between border-b border-[#706661]/10 pb-4">
          <div className="flex items-center gap-1">
            <h2 className="text-2xl lg:text-3xl font-serif font-semibold text-[#2A2421]">
              {monthLabel}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 bg-[#F5F2EB]/80 border border-[#706661]/10 rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="hover:bg-[#FDFBF7] text-[#2A2421] w-8 h-8"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => setCurrentDate(new Date())}
              className="text-xs px-2.5 py-1 hover:bg-[#FDFBF7] text-[#2A2421] font-medium"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="hover:bg-[#FDFBF7] text-[#2A2421] w-8 h-8"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* WEEKDAYS HEADER */}
        <div className="grid grid-cols-7 gap-1.5 md:gap-3 text-center text-xs font-semibold uppercase tracking-wider text-[#706661] pb-1 font-sans">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>

        {/* CALENDAR PATCHWORK GRID */}
        {isLoadingData && isSignedIn ? (
          <GridSkeleton />
        ) : (
          <div className="grid grid-cols-7 gap-1.5 md:gap-3 flex-1 auto-rows-fr">
            {cells.map((cell, index) => {
              const entry = entries[cell.dateStr];
              
              // Faded style for surrounding months
              if (!cell.isActive) {
                return (
                  <div
                    key={`inactive-${index}`}
                    className="aspect-square bg-[#FDFBF7]/30 border border-[#706661]/5 rounded-lg flex flex-col justify-between p-2 text-xs font-semibold text-[#706661]/30 opacity-40 select-none pointer-events-none"
                  >
                    <span>{cell.dayNum}</span>
                  </div>
                );
              }

              // Styling variables based on entry status & mood
              let bgClass = "bg-[#FDFBF7] border border-dashed border-[#706661]/20 hover:border-[#706661]/40";
              let textClass = "text-[#706661]/60";
              
              if (entry) {
                if (entry.mood === "cream") {
                  bgClass = "bg-[#FDFBF7] border border-solid border-[#706661]/25 shadow-xs";
                  textClass = "text-[#2A2421]";
                } else if (entry.mood === "off-white") {
                  bgClass = "bg-[#F5F2EB] border border-solid border-[#706661]/15 shadow-xs";
                  textClass = "text-[#2A2421]";
                } else if (entry.mood === "pink") {
                  bgClass = "bg-[#FCE7E9] border border-solid border-[#FCE7E9]/20 shadow-xs";
                  textClass = "text-[#2A2421]";
                }
              }

              return (
                <div
                  key={`active-${cell.dateStr}`}
                  onClick={() => handleOpenDrawer(cell.dateStr)}
                  className={`aspect-square flex flex-col justify-between p-2 lg:p-3 rounded-lg relative cursor-pointer select-none transition-all duration-300 hover:scale-105 hover:shadow-md ${bgClass} ${textClass}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs lg:text-sm font-semibold">{cell.dayNum}</span>
                    {entry?.content && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2A2421]/20"></span>
                    )}
                  </div>

                  {/* Micro-Dot Matrix for Habits completed dates */}
                  <div className="flex flex-wrap gap-[3px] mt-auto w-full pt-1.5">
                    {habits.map((habit) => {
                      const isCompleted = habit.completedDates.includes(cell.dateStr);
                      return (
                        <div
                          key={habit.id}
                          className={`w-1 h-1 rounded-full shrink-0 transition-all duration-300 ${
                            isCompleted 
                              ? "bg-[#2A2421] scale-110" 
                              : "border border-[#706661]/35 bg-transparent"
                          }`}
                          title={habit.name}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* EDITOR DRAWER (Radix/Shadcn Sheet) */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-md bg-[#FDFBF7] border-l border-[#706661]/10 text-[#2A2421] flex flex-col p-6 overflow-y-auto"
        >
          {!isSignedIn ? (
            /* CENTERED SIGN-IN PROMPT FOR SIGNED-OUT USERS */
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 p-4">
              <div className="w-12 h-12 rounded-full bg-[#FCE7E9] flex items-center justify-center text-[#2A2421]">
                <Lock className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-serif font-semibold text-[#2A2421]">
                  Secure Journal
                </h3>
                <p className="text-sm text-[#706661] max-w-xs leading-relaxed">
                  Sign in or create an account to record your thoughts, track daily habits, and save logs securely.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full mt-2">
                <SignInButton mode="modal">
                  <Button className="w-full bg-[#2A2421] text-[#FDFBF7] hover:bg-[#2A2421]/95 text-sm font-medium py-2 rounded-lg cursor-pointer">
                    Sign In to Account
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button variant="ghost" className="w-full border border-[#706661]/20 text-[#2A2421] hover:bg-[#F5F2EB] text-sm py-2 rounded-lg cursor-pointer">
                    Create New Account
                  </Button>
                </SignUpButton>
              </div>
            </div>
          ) : (
            /* AUTHENTICATED USER DRAWER CONTROLS */
            <>
              <SheetHeader className="p-0 pb-4 border-b border-[#706661]/10 gap-1">
                <SheetTitle className="text-xl font-serif font-semibold text-[#2A2421]">
                  {isExistingEntry ? "Journal Entry" : "New Journal Entry"}
                </SheetTitle>
                <SheetDescription className="text-xs text-[#706661]">
                  {formatDateLabel(selectedDateStr)}
                </SheetDescription>
                {saveStatus && (
                  <div className="text-[10px] text-[#706661]/70 font-mono flex items-center gap-1 mt-1 animate-fade-in">
                    {saveStatus === "saving" ? (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#706661] animate-ping"></span>
                    ) : (
                      <Check className="w-3.5 h-3.5 text-green-700 inline" />
                    )}
                    {saveStatus === "saving" ? "Auto-saving..." : "Saved to Postgres Database"}
                  </div>
                )}
              </SheetHeader>

              {/* SECTION 1: HABIT TRACKER CHECKLIST */}
              <div className="flex flex-col gap-3 py-4 border-b border-[#706661]/10">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#706661] font-sans">
                  Daily Habits Checklist
                </h3>
                {habits.length === 0 ? (
                  <p className="text-xs text-[#706661]/50 italic py-1">
                    Add habits in the sidebar to track them here.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {habits.map((habit) => {
                      const isChecked = habit.completedDates.includes(selectedDateStr);
                      return (
                        <label 
                          key={habit.id} 
                          className="flex items-center gap-2 text-sm text-[#2A2421] cursor-pointer bg-[#F5F2EB]/40 hover:bg-[#F5F2EB] py-1.5 px-3 rounded-md transition-all select-none border border-[#706661]/5"
                        >
                          <Checkbox
                            id={`habit-${habit.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => handleToggleHabitInDrawer(habit.id, !!checked)}
                            className="border-[#706661]/40 data-checked:bg-[#2A2421] data-checked:border-[#2A2421] w-4 h-4 rounded cursor-pointer"
                          />
                          <span className="truncate text-xs font-sans font-medium">
                            {habit.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 2: MOOD SELECTION */}
              <div className="flex flex-col gap-3 py-4 border-b border-[#706661]/10">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#706661] font-sans">
                  Watercolour Mood Color
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelectMoodInDrawer("cream")}
                    className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all border cursor-pointer ${
                      draftMood === "cream"
                        ? "bg-[#FDFBF7] border-[#2A2421] border-2 shadow-xs font-semibold"
                        : "bg-[#FDFBF7] border-[#706661]/20 hover:border-[#706661]/40"
                    }`}
                  >
                    Cream
                  </button>
                  <button
                    onClick={() => handleSelectMoodInDrawer("off-white")}
                    className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all border cursor-pointer ${
                      draftMood === "off-white"
                        ? "bg-[#F5F2EB] border-[#2A2421] border-2 shadow-xs font-semibold"
                        : "bg-[#F5F2EB] border-[#706661]/15 hover:border-[#706661]/40"
                    }`}
                  >
                    Off-White
                  </button>
                  <button
                    onClick={() => handleSelectMoodInDrawer("pink")}
                    className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all border cursor-pointer ${
                      draftMood === "pink"
                        ? "bg-[#FCE7E9] border-[#2A2421] border-2 shadow-xs font-semibold"
                        : "bg-[#FCE7E9] border-[#FCE7E9]/40 hover:border-transparent hover:ring-1 hover:ring-[#FCE7E9]"
                    }`}
                  >
                    Sakura Pink
                  </button>
                </div>
              </div>

              {/* SECTION 3: TEXT EDITOR */}
              <div className="flex-1 flex flex-col gap-3 py-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#706661] font-sans">
                  Journal Content
                </h3>
                <div className="flex-1 min-h-[200px] flex flex-col bg-[#FDFBF7]">
                  <textarea
                    ref={textareaRef}
                    placeholder="Write down your reflections, thoughts, or daily experiences..."
                    value={draftContent}
                    onChange={handleTextareaChange}
                    rows={8}
                    className="w-full flex-1 resize-none bg-transparent py-2 border-0 text-sm font-serif leading-relaxed text-[#2A2421] placeholder-[#706661]/35 focus:outline-none focus:ring-2 focus:ring-[#FCE7E9] focus:rounded-md px-2"
                  />
                </div>
              </div>

              {/* SECTION 4: ACTIONS */}
              <div className="pt-4 border-t border-[#706661]/10 flex flex-col gap-3">
                {!isExistingEntry ? (
                  <Button
                    onClick={handleSaveNewEntry}
                    className="w-full bg-[#2A2421] text-[#FDFBF7] hover:bg-[#2A2421]/95 transition-all py-2 rounded-lg text-sm font-medium font-sans cursor-pointer"
                  >
                    Save Journal Entry
                  </Button>
                ) : (
                  <Button
                    onClick={handleResetToEmpty}
                    variant="ghost"
                    className="w-full text-[#706661] hover:text-red-700 hover:bg-red-50/50 border border-[#706661]/10 hover:border-red-200 transition-all py-2 rounded-lg text-xs font-medium font-sans flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to Empty Cell
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
