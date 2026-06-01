"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { CANVAS_THEMES, INK_THEMES, TYPOGRAPHY_THEMES, UserPreferencesType } from "@/lib/themes";
import { getUserPreferences, saveUserPreferences } from "@/app/actions";

interface ThemeContextType {
  preferences: UserPreferencesType;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferencesType>>;
  updatePreference: (key: keyof UserPreferencesType, value: any) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  const [preferences, setPreferences] = useState<UserPreferencesType>({
    canvas: "cream",
    ink: "espresso",
    typography: "novelist",
  });

  // Load preferences from server if signed in, or from localStorage for guests
  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      getUserPreferences().then((res) => {
        if (res.success && res.data) {
          const loaded = res.data as UserPreferencesType;
          setPreferences({
            canvas: loaded.canvas || "cream",
            ink: loaded.ink || "espresso",
            typography: loaded.typography || "novelist",
          });
        }
      });
    } else {
      const local = localStorage.getItem("patchwork_theme_prefs");
      if (local) {
        try {
          setPreferences(JSON.parse(local));
        } catch (e) {
          console.error("Failed to parse local theme settings:", e);
        }
      }
    }
  }, [isSignedIn, isLoaded]);

  // Apply theme settings to DOM when preferences change
  useEffect(() => {
    const canvasTheme = CANVAS_THEMES[preferences.canvas] || CANVAS_THEMES.cream;
    const inkColor = INK_THEMES[preferences.ink] || INK_THEMES.espresso;
    const fontTheme = TYPOGRAPHY_THEMES[preferences.typography] || TYPOGRAPHY_THEMES.novelist;

    // Apply color values to custom properties on document element
    const root = document.documentElement;
    root.style.setProperty("--background", canvasTheme.background);
    root.style.setProperty("--card", canvasTheme.cardBackground);
    root.style.setProperty("--foreground", inkColor);
    root.style.setProperty("--primary", inkColor);
    
    // Set custom typography values
    root.style.setProperty("--font-family-custom", fontTheme);
  }, [preferences]);

  // Update a single theme key optimistically, then persist
  const updatePreference = (key: keyof UserPreferencesType, value: any) => {
    const nextPrefs = { ...preferences, [key]: value };
    setPreferences(nextPrefs);

    if (isSignedIn) {
      // Persist preferences (Next.js server action with DB write)
      saveUserPreferences(nextPrefs).then((res) => {
        if (!res.success) {
          console.error("Failed to persist user preferences:", res.error);
        }
      });
    } else {
      // Local storage fallback for guests
      localStorage.setItem("patchwork_theme_prefs", JSON.stringify(nextPrefs));
    }
  };

  return (
    <ThemeContext.Provider value={{ preferences, setPreferences, updatePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}
