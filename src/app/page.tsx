"use client";

import React, { useState, useEffect, useRef, useOptimistic, startTransition } from "react";
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
import { useEncryption } from "@/components/EncryptionContext";
import { encryptJournalContent, decryptJournalContent } from "@/lib/crypto";
import { useTheme } from "@/components/ThemeProvider";
import { Paintbrush } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Home() {
  const { isSignedIn, isLoaded: isAuthLoaded } = useUser();

  // Database States
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<Record<string, JournalEntry>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // React 19 useOptimistic configuration for habits checklist/dots
  const [optimisticHabits, setOptimisticHabits] = useOptimistic(
    habits,
    (
      state,
      action:
        | { type: "toggle"; habitId: string; date: string; checked: boolean }
        | { type: "delete"; habitId: string }
        | { type: "add"; habit: Habit }
    ) => {
      if (action.type === "toggle") {
        return state.map((h) => {
          if (h.id === action.habitId) {
            const completedDates = [...h.completedDates];
            return {
              ...h,
              completedDates: action.checked
                ? [...completedDates, action.date]
                : completedDates.filter((d) => d !== action.date),
            };
          }
          return h;
        });
      } else if (action.type === "delete") {
        return state.filter((h) => h.id !== action.habitId);
      } else if (action.type === "add") {
        return [...state, action.habit];
      }
      return state;
    }
  );

  // React 19 useOptimistic configuration for grid cells mood colors
  const [optimisticEntries, setOptimisticEntries] = useOptimistic(
    entries,
    (
      state,
      action:
        | { type: "upsert"; date: string; mood: "cream" | "off-white" | "pink"; content: string }
        | { type: "delete"; date: string }
    ) => {
      if (action.type === "upsert") {
        return {
          ...state,
          [action.date]: {
            id: state[action.date]?.id || "temp-id",
            userId: "current-user",
            date: action.date,
            mood: action.mood,
            content: action.content,
          },
        };
      } else if (action.type === "delete") {
        const next = { ...state };
        delete next[action.date];
        return next;
      }
      return state;
    }
  );

  // Calendar Date State (tracks the month currently viewed)
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Sidebar State for new habits
  const [newHabitName, setNewHabitName] = useState("");

  // Editor Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string>("");
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  
  // Drawer draft state (used only for new entries before clicking "Save")
  const [draftContent, setDraftContent] = useState("");
  const [draftMood, setDraftMood] = useState<"cream" | "off-white" | "pink">("cream");
  
  // Ref for auto-resizing textarea & debounced autosave
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "">("");

  // Autofocus text area when drawer opens
  useEffect(() => {
    if (isDrawerOpen && textareaRef.current) {
      const t = setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
      return () => clearTimeout(t);
    }
  }, [isDrawerOpen]);

  // Toast automatic dismissal
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

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
        fetchedEntries.forEach((entry: any) => {
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
      const tempId = `temp-${Date.now()}`;
      const tempHabit: Habit = { id: tempId, userId: "current-user", name, completedDates: [] };
      
      startTransition(async () => {
        setOptimisticHabits({ type: "add", habit: tempHabit });
        try {
          const res = await addHabitAction(name);
          if (res.success && res.data) {
            setHabits((prev) => [...prev, res.data as Habit]);
          } else {
            setToast({ message: res.error || "Failed to add habit", type: "error" });
          }
        } catch (err) {
          console.error("Error adding habit:", err);
          setToast({ message: "Network error adding habit", type: "error" });
        }
      });
    }
  };

  // Delete Habit Handler
  const handleDeleteHabit = async (habitId: string) => {
    if (!isSignedIn) return;
    startTransition(async () => {
      setOptimisticHabits({ type: "delete", habitId });
      try {
        const res = await deleteHabitAction(habitId);
        if (res.success) {
          setHabits((prev) => prev.filter((h) => h.id !== habitId));
        } else {
          setToast({ message: res.error || "Failed to delete habit", type: "error" });
        }
      } catch (err) {
        console.error("Error deleting habit:", err);
        setToast({ message: "Network error deleting habit", type: "error" });
      }
    });
  };

  const { cryptoKey, encryptionStatus, disableEncryption } = useEncryption();
  const { preferences, updatePreference } = useTheme();

  // Open Drawer Handler for a date
  const handleOpenDrawer = async (dateStr: string) => {
    setSelectedDateStr(dateStr);
    const existingEntry = optimisticEntries[dateStr];
    
    if (existingEntry) {
      setDraftMood(existingEntry.mood);
      
      // Decrypt if encryption is enabled, otherwise use plain text directly
      if (encryptionStatus === "enabled") {
        if (cryptoKey) {
          try {
            if (existingEntry.content.includes(":")) {
              const dec = await decryptJournalContent(existingEntry.content, cryptoKey);
              setDraftContent(dec);
            } else {
              setDraftContent(existingEntry.content);
            }
          } catch (e) {
            console.error("Decryption failed:", e);
            setDraftContent("🔒 Decryption failed. Please check your vault passphrase.");
          }
        } else {
          setDraftContent("🔒 Vault locked.");
        }
      } else {
        // Plain text fallback (could be legacy encrypted too, but if E2EE disabled we display as-is)
        setDraftContent(existingEntry.content);
      }
    } else {
      setDraftContent("");
      setDraftMood("cream");
    }
    
    setSaveStatus("");
    setIsDrawerOpen(true);
  };

  // Check if current draft exists as a permanent entry in global state
  const isExistingEntry = !!optimisticEntries[selectedDateStr];

  // Helper for real-time debounced saving (existing entries) - 1500ms debounce
  const triggerAutoSave = (content: string, mood: "cream" | "off-white" | "pink") => {
    if (!isExistingEntry || !isSignedIn) return;
    if (encryptionStatus === "enabled" && !cryptoKey) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    setSaveStatus("saving");
    debounceTimeoutRef.current = setTimeout(() => {
      startTransition(async () => {
        // Enforce decryption-failed read-only state checks
        if (content === "🔒 Decryption failed. Please check your vault passphrase.") {
          setSaveStatus("");
          return;
        }

        try {
          // Encrypt plain text only if E2EE is enabled
          const finalContent = encryptionStatus === "enabled" && cryptoKey
            ? await encryptJournalContent(content, cryptoKey)
            : content;

          // Perform local state update first before awaiting database to ensure persistent local caching
          setEntries((prev) => ({
            ...prev,
            [selectedDateStr]: {
              id: prev[selectedDateStr]?.id || "temp-id",
              userId: "current-user",
              date: selectedDateStr,
              mood,
              content: finalContent
            }
          }));

          setOptimisticEntries({ type: "upsert", date: selectedDateStr, mood, content: finalContent });
          const res = await upsertJournalEntry(selectedDateStr, mood, finalContent);
          if (res.success && res.data) {
            setEntries((prev) => ({
              ...prev,
              [selectedDateStr]: {
                id: res.data.id,
                userId: res.data.userId,
                date: res.data.date,
                mood: res.data.mood as "cream" | "off-white" | "pink",
                content: res.data.content
              }
            }));
            setSaveStatus("saved");
          } else {
            setSaveStatus("");
            setToast({ message: res.error || "Failed to auto-save entry", type: "error" });
          }
        } catch (e) {
          console.error("Auto-save failed:", e);
          setSaveStatus("");
          setToast({ message: "Network or encryption error: failed to auto-save", type: "error" });
        }
      });
    }, 1500); // 1500ms debounce
  };

  // Habit toggling inside Drawer (secured and database integrated with useOptimistic)
  const handleToggleHabitInDrawer = async (habitId: string, checked: boolean) => {
    if (!isSignedIn) return;

    setSaveStatus("saving");
    startTransition(async () => {
      setOptimisticHabits({ type: "toggle", habitId, date: selectedDateStr, checked });
      try {
        const res = await toggleHabitCompletionAction(habitId, selectedDateStr, checked);
        if (res.success && res.data) {
          setHabits((prev) =>
            prev.map((h) => (h.id === habitId ? (res.data as Habit) : h))
          );
          setSaveStatus("saved");
        } else {
          setSaveStatus("");
          setToast({ message: res.error || "Failed to toggle habit", type: "error" });
        }
      } catch (err) {
        console.error("Failed to toggle habit:", err);
        setSaveStatus("");
        setToast({ message: "Network error: toggle failed", type: "error" });
      }
    });
  };

  // Mood selection inside Drawer
  const handleSelectMoodInDrawer = async (mood: "cream" | "off-white" | "pink") => {
    setDraftMood(mood);
    
    if (isExistingEntry && isSignedIn) {
      startTransition(async () => {
        try {
          const finalContent = encryptionStatus === "enabled" && cryptoKey
            ? await encryptJournalContent(draftContent, cryptoKey)
            : draftContent;
          setOptimisticEntries({ type: "upsert", date: selectedDateStr, mood, content: finalContent });
          triggerAutoSave(draftContent, mood);
        } catch (e) {
          console.error("Encryption failed:", e);
        }
      });
    }
  };

  // Textarea input changes
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDraftContent(val);
    
    if (isExistingEntry && isSignedIn) {
      startTransition(async () => {
        try {
          const finalContent = encryptionStatus === "enabled" && cryptoKey
            ? await encryptJournalContent(val, cryptoKey)
            : val;
          setOptimisticEntries({ type: "upsert", date: selectedDateStr, mood: draftMood, content: finalContent });
          triggerAutoSave(val, draftMood);
        } catch (e) {
          console.error("Encryption failed:", e);
        }
      });
    }
  };

  // Explicit Save for NEW entries
  const handleSaveNewEntry = async () => {
    if (!isSignedIn) return;
    if (encryptionStatus === "enabled" && !cryptoKey) return;
    setSaveStatus("saving");
    startTransition(async () => {
      try {
        const finalContent = encryptionStatus === "enabled" && cryptoKey
          ? await encryptJournalContent(draftContent, cryptoKey)
          : draftContent;
        setOptimisticEntries({ type: "upsert", date: selectedDateStr, mood: draftMood, content: finalContent });
        const res = await upsertJournalEntry(selectedDateStr, draftMood, finalContent);
        if (res.success && res.data) {
          setEntries((prev) => ({
            ...prev,
            [selectedDateStr]: {
              id: res.data.id,
              userId: res.data.userId,
              date: res.data.date,
              mood: res.data.mood as "cream" | "off-white" | "pink",
              content: res.data.content
            }
          }));
          setSaveStatus("saved");
          setIsDrawerOpen(false);
        } else {
          setSaveStatus("");
          setToast({ message: res.error || "Failed to save entry", type: "error" });
        }
      } catch (err) {
        console.error("Error creating entry in Neon:", err);
        setSaveStatus("");
        setToast({ message: "Network error: failed to save entry", type: "error" });
      }
    });
  };

  // Reset Entry to Empty (deletes from database)
  const handleResetToEmpty = async () => {
    if (!isSignedIn) return;
    setSaveStatus("saving");
    startTransition(async () => {
      setOptimisticEntries({ type: "delete", date: selectedDateStr });
      try {
        const res = await resetJournalEntry(selectedDateStr);
        if (res.success) {
          setEntries((prev) => {
            const next = { ...prev };
            delete next[selectedDateStr];
            return next;
          });
          setSaveStatus("saved");
          setIsDrawerOpen(false);
        } else {
          setSaveStatus("");
          setToast({ message: res.error || "Failed to reset entry", type: "error" });
        }
      } catch (err) {
        console.error("Error deleting entry:", err);
        setSaveStatus("");
        setToast({ message: "Network error: failed to delete entry", type: "error" });
      }
    });
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
    <div className="flex flex-col md:flex-row min-h-[100dvh] bg-[#FDFBF7] text-[#2A2421] font-sans antialiased selection:bg-[#FCE7E9] overscroll-contain">
      
      {/* MOBILE HEADER - Top navigation bar for smartphone viewports */}
      <header className="flex items-center justify-between py-3.5 px-5 bg-[#F5F2EB]/90 backdrop-blur-md border-b border-[#706661]/10 sticky top-0 z-30 md:hidden shrink-0">
        <div className="flex items-center gap-2 select-none">
          <BookOpen className="w-5 h-5 text-[#706661]" />
          <span className="font-serif font-bold text-lg text-[#2A2421] tracking-tight">Patchwork</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCustomizerOpen(true)}
            className="p-2 hover:bg-[#FDFBF7] rounded-lg transition-all text-[#706661] hover:text-[#2A2421] cursor-pointer"
            title="Stationery Options"
          >
            <Paintbrush className="w-4.5 h-4.5" />
          </button>
          <Show when="signed-in">
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="text-xs font-semibold bg-[#2A2421] text-[#FDFBF7] py-1.5 px-3.5 rounded-lg cursor-pointer hover:bg-[#2A2421]/90 transition-all select-none">
                Sign In
              </button>
            </SignInButton>
          </Show>
        </div>
      </header>

      {/* DESKTOP SIDEBAR - Hidden on mobile screens */}
      <aside className="hidden md:flex w-full md:w-80 border-b md:border-b-0 md:border-r border-[#706661]/10 bg-[#F5F2EB]/50 p-6 lg:p-8 flex-col gap-8 shrink-0 md:sticky md:top-0 md:h-[100dvh] md:overflow-y-auto">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#706661]" />
              <h1 className="text-2xl font-serif font-bold tracking-tight text-[#2A2421]">
                Patchwork
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCustomizerOpen(true)}
                className="p-1.5 hover:bg-[#FDFBF7] rounded-lg transition-all text-[#706661] hover:text-[#2A2421] cursor-pointer"
                title="Stationery Options"
              >
                <Paintbrush className="w-4 h-4" />
              </button>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
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
              {optimisticHabits.length === 0 ? (
                <li className="text-xs text-[#706661]/60 italic font-sans py-2">
                  No habits added yet.
                </li>
              ) : (
                optimisticHabits.map((habit, index) => (
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

        <div className="mt-auto pt-6 border-t border-[#706661]/10 flex flex-col gap-2">
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

          {/* Encryption status configuration button in Sidebar */}
          {isSignedIn && (
            <div className="mt-4 p-3 bg-[#F5F2EB] border border-[#706661]/10 rounded-lg text-xs flex flex-col gap-2">
              <div className="font-semibold flex items-center justify-between text-[#2A2421]">
                <span>Vault Security:</span>
                <span className={encryptionStatus === "enabled" ? "text-green-700 font-bold" : "text-neutral-500 font-medium"}>
                  {encryptionStatus === "enabled" ? "🔒 Encrypted" : "🔓 Plain Text"}
                </span>
              </div>
              {encryptionStatus === "disabled" ? (
                <button
                  onClick={() => {
                    const pass = prompt("Choose a private passphrase to secure your vault:");
                    if (pass) {
                      useEncryption().enableEncryption(pass).then((success) => {
                        if (success) alert("End-to-End Encryption enabled successfully!");
                      });
                    }
                  }}
                  className="w-full text-center py-1.5 bg-[#E08D93] text-white rounded font-medium hover:bg-[#D57B82] cursor-pointer"
                >
                  Enable E2EE
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to disable E2EE? Your vault will save new entries in plain text, but existing encrypted entries will remain encrypted until manually re-saved.")) {
                      disableEncryption();
                    }
                  }}
                  className="w-full text-center py-1.5 border border-[#706661]/25 text-[#706661] rounded hover:bg-[#FDFBF7] cursor-pointer"
                >
                  Switch to Plain Text
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow p-4 md:p-10 flex flex-col gap-5 md:gap-6 max-w-6xl w-full mx-auto overflow-y-auto pb-24 md:pb-10 overscroll-contain">
        
        {/* CALENDAR NAVIGATION BAR */}
        <header className="flex items-center justify-between border-b border-[#706661]/10 pb-4">
          <h2 className="text-xl md:text-3xl font-serif font-semibold text-[#2A2421] select-none">
            {monthLabel}
          </h2>
          
          <div className="flex items-center gap-1.5 md:gap-2 bg-[#F5F2EB]/80 border border-[#706661]/10 rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="hover:bg-[#FDFBF7] text-[#2A2421] w-8 h-8 cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => setCurrentDate(new Date())}
              className="text-[10px] md:text-xs px-2 md:px-2.5 py-1 hover:bg-[#FDFBF7] text-[#2A2421] font-semibold cursor-pointer"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="hover:bg-[#FDFBF7] text-[#2A2421] w-8 h-8 cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* WEEKDAYS HEADER */}
        <div className="grid grid-cols-7 gap-1 md:gap-3 text-center text-[10px] md:text-xs font-semibold uppercase tracking-wider text-[#706661] pb-1 font-sans select-none">
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
              const entry = optimisticEntries[cell.dateStr];
              
              // Faded style for surrounding months
              if (!cell.isActive) {
                return (
                  <div
                    key={`inactive-${index}`}
                    className="aspect-square min-h-[48px] md:min-h-0 bg-[#FDFBF7]/30 border border-[#706661]/5 rounded-lg flex flex-col justify-between p-2 text-xs font-semibold text-[#706661]/30 opacity-40 select-none pointer-events-none"
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
                  className={`aspect-square min-h-[48px] md:min-h-0 flex flex-col justify-between p-2 lg:p-3 rounded-lg relative cursor-pointer select-none hover-scale-trigger ${bgClass} ${textClass}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs lg:text-sm font-semibold">{cell.dayNum}</span>
                    {entry?.content && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2A2421]/20"></span>
                    )}
                  </div>

                  {/* Micro-Dot Matrix for Habits completed dates */}
                  <div className="flex flex-wrap gap-[3px] mt-auto w-full pt-1.5">
                    {optimisticHabits.map((habit) => {
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

        {/* MOBILE HABITS ACCESS CONTAINER - Renders at bottom of home feed on mobile */}
        <div className="flex flex-col gap-4 mt-6 pt-6 border-t border-[#706661]/10 md:hidden pb-12">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#706661] font-sans">
            Habits Tracker
          </h3>
          <form onSubmit={handleAddHabitSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Add new habit..."
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              disabled={!isSignedIn}
              className="flex-1 bg-[#FDFBF7] border border-[#706661]/20 rounded-md py-1.5 px-3 text-base text-[#2A2421] placeholder-[#706661]/40 focus:outline-none focus:ring-2 focus:ring-[#FCE7E9] focus:border-transparent transition-all disabled:opacity-50"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!isSignedIn}
              className="bg-[#2A2421] text-[#FDFBF7] hover:bg-[#2A2421]/90 rounded-md shrink-0 w-10 h-10 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </form>

          {isLoadingData && isSignedIn ? (
            <HabitSkeleton />
          ) : (
            <ul className="flex flex-col gap-2 mt-1">
              {!isSignedIn ? (
                <li className="text-xs text-[#706661]/50 italic font-sans py-2 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Sign in to manage habits.
                </li>
              ) : optimisticHabits.length === 0 ? (
                <li className="text-xs text-[#706661]/60 italic font-sans py-2">
                  No habits added yet.
                </li>
              ) : (
                optimisticHabits.map((habit, index) => (
                  <li 
                    key={habit.id} 
                    className="flex items-center justify-between py-2 px-3.5 bg-[#F5F2EB]/50 border border-[#706661]/10 rounded-lg text-sm select-none"
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
                      className="text-[#706661]/50 hover:text-red-600 transition-all p-1.5 cursor-pointer shrink-0"
                      title={`Delete "${habit.name}"`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </main>

      {/* EDITOR DRAWER (Responsive Bottom Sheet / Desktop Drawer) */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent 
          side={isMobile ? "bottom" : "right"} 
          className="w-full md:max-w-md bg-[#FDFBF7] border-t md:border-t-0 md:border-l border-[#706661]/15 text-[#2A2421] flex flex-col p-6 overflow-y-auto max-md:h-[85dvh] max-md:rounded-t-2xl max-md:border-t max-md:border-l-0 overscroll-contain"
        >
          {/* Subtle drag handle bar at the top of the mobile sheet */}
          <div className="w-12 h-1 bg-[#706661]/25 rounded-full mx-auto mb-2 shrink-0 md:hidden cursor-pointer" />

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
              <SheetHeader className="p-0 pb-4 border-b border-[#706661]/10 gap-1 shrink-0">
                <div className="flex justify-between items-start w-full gap-2">
                  <SheetTitle className="text-lg md:text-xl font-serif font-semibold text-[#2A2421]">
                    {isExistingEntry ? "Journal Entry" : "New Journal Entry"}
                  </SheetTitle>
                  
                  {/* Phase 2: Debouncer Status Indicator in the corner of the drawer */}
                  {saveStatus && (
                    <div className="text-[10px] md:text-[11px] text-[#706661]/80 font-serif flex items-center gap-1.5 select-none animate-fade-in bg-[#F5F2EB] px-2.5 py-1 rounded-md border border-[#706661]/10 shrink-0">
                      {saveStatus === "saving" ? (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse shrink-0"></span>
                      ) : (
                        <Check className="w-3.5 h-3.5 text-green-700 shrink-0 inline" />
                      )}
                      {saveStatus === "saving" ? "Saving..." : "Changes saved"}
                    </div>
                  )}
                </div>
                <SheetDescription className="text-xs text-[#706661]">
                  {formatDateLabel(selectedDateStr)}
                </SheetDescription>
              </SheetHeader>

              {/* SECTION 1: HABIT TRACKER CHECKLIST - Optimized Touch Targets for Mobile */}
              <div className="flex flex-col gap-3 py-4 border-b border-[#706661]/10 shrink-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#706661] font-sans">
                  Daily Habits Checklist
                </h3>
                {optimisticHabits.length === 0 ? (
                  <p className="text-xs text-[#706661]/50 italic py-1">
                    Add habits in the sidebar to track them here.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {optimisticHabits.map((habit) => {
                      const isChecked = habit.completedDates.includes(selectedDateStr);
                      return (
                        <label 
                          key={habit.id} 
                          className="flex items-center gap-2.5 text-sm text-[#2A2421] cursor-pointer bg-[#F5F2EB]/40 hover:bg-[#F5F2EB] py-2.5 px-3.5 md:py-1.5 md:px-3 rounded-md transition-all select-none border border-[#706661]/5"
                        >
                          <Checkbox
                            id={`habit-${habit.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => handleToggleHabitInDrawer(habit.id, !!checked)}
                            className="border-[#706661]/40 data-checked:bg-[#2A2421] data-checked:border-[#2A2421] w-4.5 h-4.5 md:w-4 md:h-4 rounded cursor-pointer shrink-0"
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
              <div className="flex flex-col gap-3 py-4 border-b border-[#706661]/10 shrink-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#706661] font-sans">
                  Watercolour Mood Color
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelectMoodInDrawer("cream")}
                    className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all border cursor-pointer select-none ${
                      draftMood === "cream"
                        ? "bg-[#FDFBF7] border-[#2A2421] border-2 shadow-xs font-semibold"
                        : "bg-[#FDFBF7] border-[#706661]/20 hover:border-[#706661]/40"
                    }`}
                  >
                    Cream
                  </button>
                  <button
                    onClick={() => handleSelectMoodInDrawer("off-white")}
                    className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all border cursor-pointer select-none ${
                      draftMood === "off-white"
                        ? "bg-[#F5F2EB] border-[#2A2421] border-2 shadow-xs font-semibold"
                        : "bg-[#F5F2EB] border-[#706661]/15 hover:border-[#706661]/40"
                    }`}
                  >
                    Off-White
                  </button>
                  <button
                    onClick={() => handleSelectMoodInDrawer("pink")}
                    className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all border cursor-pointer select-none ${
                      draftMood === "pink"
                        ? "bg-[#FCE7E9] border-[#2A2421] border-2 shadow-xs font-semibold"
                        : "bg-[#FCE7E9] border-[#FCE7E9]/40 hover:border-transparent hover:ring-1 hover:ring-[#FCE7E9]"
                    }`}
                  >
                    Sakura Pink
                  </button>
                </div>
              </div>

              {/* SECTION 3: TEXT EDITOR - preventing default iOS focus zoom via text-base */}
              <div className="flex-1 flex flex-col gap-3 py-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#706661] font-sans">
                  Journal Content
                </h3>
                <div className="flex-grow min-h-[150px] flex flex-col bg-[#FDFBF7]">
                  <textarea
                    ref={textareaRef}
                    disabled={encryptionStatus === "enabled" && (!cryptoKey || draftContent === "🔒 Decryption failed. Please check your vault passphrase.")}
                    placeholder={encryptionStatus === "enabled" && !cryptoKey ? "Please unlock your vault to write." : "Write down your reflections, thoughts, or daily experiences..."}
                    value={draftContent}
                    onChange={handleTextareaChange}
                    rows={8}
                    className="w-full flex-1 resize-none bg-transparent py-2 border-0 text-base md:text-sm font-serif leading-relaxed text-[#2A2421] placeholder-[#706661]/35 focus:outline-none focus:ring-2 focus:ring-[#FCE7E9] focus:rounded-md px-2 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* SECTION 4: ACTIONS */}
              <div className="pt-4 border-t border-[#706661]/10 flex flex-col gap-3 shrink-0">
                {!isExistingEntry ? (
                  <Button
                    onClick={handleSaveNewEntry}
                    className="w-full bg-[#2A2421] text-[#FDFBF7] hover:bg-[#2A2421]/95 transition-all py-2.5 rounded-lg text-sm font-medium font-sans cursor-pointer select-none"
                  >
                    Save Journal Entry
                  </Button>
                ) : (
                  <Button
                    onClick={handleResetToEmpty}
                    variant="ghost"
                    className="w-full text-[#706661] hover:text-red-700 hover:bg-red-50/50 border border-[#706661]/10 hover:border-red-200 transition-all py-2.5 rounded-lg text-xs font-medium font-sans flex items-center justify-center gap-1.5 cursor-pointer select-none"
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

      {/* Floating centerpiece button and Sticky Nav Bar on Mobile viewport */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-[#F5F2EB]/95 backdrop-blur-md border border-[#706661]/15 rounded-full shadow-lg py-2 px-6 flex items-center justify-between z-40 md:hidden select-none">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevMonth}
          className="text-[#2A2421] w-10 h-10 hover:bg-[#FDFBF7]/50 rounded-full shrink-0 cursor-pointer"
          title="Previous Month"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {/* Centerpiece Pink Plus action button for quick thumb access */}
        <button
          onClick={() => handleOpenDrawer(new Date().toISOString().split("T")[0])}
          className="w-12 h-12 rounded-full bg-[#FCE7E9] text-[#2A2421] shadow-md flex items-center justify-center hover:scale-105 transition-all cursor-pointer hover:bg-[#FCE7E9]/90 focus:outline-none focus:ring-2 focus:ring-[#FCE7E9] focus:ring-offset-2 shrink-0 relative -top-3 border border-[#706661]/10"
          title="New Journal Entry"
        >
          <Plus className="w-6 h-6" />
        </button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          className="text-[#2A2421] w-10 h-10 hover:bg-[#FDFBF7]/50 rounded-full shrink-0 cursor-pointer"
          title="Next Month"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Stationery Options Customizer Drawer */}
      <Sheet open={isCustomizerOpen} onOpenChange={setIsCustomizerOpen}>
        <SheetContent 
          side={isMobile ? "bottom" : "right"} 
          className="bg-[#FDFBF7] text-[#2A2421] border-[#706661]/10 flex flex-col h-[75vh] md:h-full max-h-[90vh] md:max-h-full rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none px-6 py-6 overflow-y-auto"
        >
          {isMobile && (
            <div className="mx-auto w-12 h-1.5 rounded-full bg-[#706661]/15 mb-2 shrink-0 select-none" />
          )}

          <SheetHeader className="p-0 pb-4 border-b border-[#706661]/10 gap-1 shrink-0">
            <SheetTitle className="text-lg md:text-xl font-serif font-semibold text-[#2A2421]">
              Stationery Options
            </SheetTitle>
            <SheetDescription className="text-xs text-[#706661]">
              Customize your canvas background stock, ink tones, and typography styles.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 flex flex-col gap-6 py-6">
            {/* PAPER STOCK THEME SELECTION */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#706661] font-sans">
                Paper Stock
              </h3>
              <div className="flex gap-4">
                <button
                  onClick={() => updatePreference("canvas", "cream")}
                  className={`flex flex-col items-center gap-1.5 cursor-pointer focus:outline-none`}
                >
                  <div className={`w-10 h-10 rounded-full bg-[#FDFBF7] border-2 transition-all ${preferences.canvas === "cream" ? "border-[#2A2421] ring-2 ring-[#FCE7E9]" : "border-[#706661]/10"}`} />
                  <span className="text-[10px] font-sans font-medium text-[#706661]">Cream</span>
                </button>

                <button
                  onClick={() => updatePreference("canvas", "sage")}
                  className={`flex flex-col items-center gap-1.5 cursor-pointer focus:outline-none`}
                >
                  <div className={`w-10 h-10 rounded-full bg-[#F4F6F0] border-2 transition-all ${preferences.canvas === "sage" ? "border-[#2A2421] ring-2 ring-[#EAEFE2]" : "border-[#706661]/10"}`} />
                  <span className="text-[10px] font-sans font-medium text-[#706661]">Sage</span>
                </button>

                <button
                  onClick={() => updatePreference("canvas", "lavender")}
                  className={`flex flex-col items-center gap-1.5 cursor-pointer focus:outline-none`}
                >
                  <div className={`w-10 h-10 rounded-full bg-[#F7F5F8] border-2 transition-all ${preferences.canvas === "lavender" ? "border-[#2A2421] ring-2 ring-[#EFEAEF]" : "border-[#706661]/10"}`} />
                  <span className="text-[10px] font-sans font-medium text-[#706661]">Lavender</span>
                </button>
              </div>
            </div>

            {/* INK TONES SELECTION */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#706661] font-sans">
                Ink Tones
              </h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => updatePreference("ink", "espresso")}
                  className={`w-full text-left py-2 px-3 text-xs font-medium rounded-lg border transition-all cursor-pointer select-none flex items-center justify-between ${
                    preferences.ink === "espresso" ? "bg-[#2A2421]/5 border-[#2A2421] font-semibold" : "bg-transparent border-[#706661]/15"
                  }`}
                >
                  <span style={{ color: "#2A2421" }}>Espresso Brown</span>
                  {preferences.ink === "espresso" && <Check className="w-3.5 h-3.5 text-[#2A2421]" />}
                </button>

                <button
                  onClick={() => updatePreference("ink", "slate")}
                  className={`w-full text-left py-2 px-3 text-xs font-medium rounded-lg border transition-all cursor-pointer select-none flex items-center justify-between ${
                    preferences.ink === "slate" ? "bg-[#2C302E]/5 border-[#2C302E] font-semibold" : "bg-transparent border-[#706661]/15"
                  }`}
                >
                  <span style={{ color: "#2C302E" }}>Slate Charcoal</span>
                  {preferences.ink === "slate" && <Check className="w-3.5 h-3.5 text-[#2C302E]" />}
                </button>

                <button
                  onClick={() => updatePreference("ink", "plum")}
                  className={`w-full text-left py-2 px-3 text-xs font-medium rounded-lg border transition-all cursor-pointer select-none flex items-center justify-between ${
                    preferences.ink === "plum" ? "bg-[#2E272F]/5 border-[#2E272F] font-semibold" : "bg-transparent border-[#706661]/15"
                  }`}
                >
                  <span style={{ color: "#2E272F" }}>Muted Plum</span>
                  {preferences.ink === "plum" && <Check className="w-3.5 h-3.5 text-[#2E272F]" />}
                </button>
              </div>
            </div>

            {/* TYPOGRAPHY SELECTION */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#706661] font-sans">
                Typography Type
              </h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => updatePreference("typography", "novelist")}
                  className={`w-full text-left py-2 px-3 text-xs font-medium rounded-lg border transition-all cursor-pointer select-none flex items-center justify-between font-serif ${
                    preferences.typography === "novelist" ? "bg-black/5 border-[#2A2421] font-semibold" : "bg-transparent border-[#706661]/15"
                  }`}
                >
                  <span>Novelist (Lora & Inter)</span>
                  {preferences.typography === "novelist" && <Check className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => updatePreference("typography", "modernist")}
                  className={`w-full text-left py-2 px-3 text-xs font-medium rounded-lg border transition-all cursor-pointer select-none flex items-center justify-between font-sans ${
                    preferences.typography === "modernist" ? "bg-black/5 border-[#2A2421] font-semibold" : "bg-transparent border-[#706661]/15"
                  }`}
                >
                  <span>Modernist (Jakarta Sans)</span>
                  {preferences.typography === "modernist" && <Check className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => updatePreference("typography", "logbook")}
                  className={`w-full text-left py-2 px-3 text-xs font-medium rounded-lg border transition-all cursor-pointer select-none flex items-center justify-between font-mono ${
                    preferences.typography === "logbook" ? "bg-black/5 border-[#2A2421] font-semibold" : "bg-transparent border-[#706661]/15"
                  }`}
                >
                  <span>Logbook (Monospace)</span>
                  {preferences.typography === "logbook" && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Floating minimalist soft toast alert container for revert notifications */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#2A2421] text-[#FDFBF7] py-3.5 px-5 rounded-lg shadow-xl text-sm flex items-center gap-3.5 border border-[#706661]/25 animate-fade-in z-50 font-sans">
          <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <span className="font-medium text-xs tracking-wide">{toast.message}</span>
          <button 
            onClick={() => setToast(null)}
            className="text-xs text-[#FCE7E9] hover:underline font-semibold cursor-pointer border-l border-[#706661]/30 pl-3.5 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
