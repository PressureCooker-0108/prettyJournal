export interface ThemeValues {
  background: string;
  cardBackground: string;
  ink: string;
  fontFamily: string;
}

export const CANVAS_THEMES = {
  cream: {
    background: "#FDFBF7",
    cardBackground: "#F5F2EB",
  },
  sage: {
    background: "#F4F6F0",
    cardBackground: "#EAEFE2",
  },
  lavender: {
    background: "#F7F5F8",
    cardBackground: "#EFEAEF",
  },
};

export const INK_THEMES = {
  espresso: "#2A2421",
  slate: "#2C302E",
  plum: "#2E272F",
};

export const TYPOGRAPHY_THEMES = {
  novelist: "var(--font-lora), var(--font-inter), serif",
  modernist: "var(--font-jakarta), var(--font-inter), sans-serif",
  logbook: "var(--font-mono), monospace",
};

export interface UserPreferencesType {
  canvas: "cream" | "sage" | "lavender";
  ink: "espresso" | "slate" | "plum";
  typography: "novelist" | "modernist" | "logbook";
}
