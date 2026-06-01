"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { deriveJournalKey, getSaltFromUserId } from "@/lib/crypto";

// "enabled" means encryption is active and required
// "disabled" means user opted out of encryption
// "undecided" means we show the choice screen
type EncryptionStatus = "enabled" | "disabled" | "undecided";

interface EncryptionContextType {
  cryptoKey: CryptoKey | null;
  setCryptoKey: (key: CryptoKey | null) => void;
  isUnlocked: boolean;
  passphraseError: string | null;
  unlockVault: (passphrase: string) => Promise<boolean>;
  encryptionStatus: EncryptionStatus;
  enableEncryption: (passphrase: string) => Promise<boolean>;
  disableEncryption: () => void;
}

const EncryptionContext = createContext<EncryptionContextType | undefined>(undefined);

export function useEncryption() {
  const context = useContext(EncryptionContext);
  if (!context) {
    throw new Error("useEncryption must be used within an EncryptionProvider");
  }
  return context;
}

export function EncryptionProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [passphraseInput, setPassphraseInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deriving, setDeriving] = useState(false);

  // Read status from localStorage (keyed by user ID once loaded)
  const [encryptionStatus, setEncryptionStatus] = useState<EncryptionStatus>("undecided");

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const savedStatus = localStorage.getItem(`e2ee_status_${user.id}`);
      if (savedStatus === "enabled" || savedStatus === "disabled") {
        setEncryptionStatus(savedStatus);
      } else {
        setEncryptionStatus("undecided");
      }
    } else {
      setEncryptionStatus("undecided");
      setCryptoKey(null);
    }
  }, [isLoaded, isSignedIn, user]);

  const unlockVault = async (passphrase: string): Promise<boolean> => {
    if (!user || !user.id) return false;
    setDeriving(true);
    setErrorMsg(null);
    try {
      const salt = await getSaltFromUserId(user.id);
      const key = await deriveJournalKey(passphrase, salt);
      setCryptoKey(key);
      setDeriving(false);
      return true;
    } catch (err: any) {
      setErrorMsg("Failed to derive encryption key. Please try again.");
      setDeriving(false);
      return false;
    }
  };

  const enableEncryption = async (passphrase: string): Promise<boolean> => {
    const success = await unlockVault(passphrase);
    if (success && user) {
      localStorage.setItem(`e2ee_status_${user.id}`, "enabled");
      setEncryptionStatus("enabled");
    }
    return success;
  };

  const disableEncryption = () => {
    if (user) {
      localStorage.setItem(`e2ee_status_${user.id}`, "disabled");
      setEncryptionStatus("disabled");
      setCryptoKey(null);
      setErrorMsg(null);
    }
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphraseInput.trim()) {
      setErrorMsg("Passphrase cannot be empty");
      return;
    }
    const success = await unlockVault(passphraseInput);
    if (success) {
      setPassphraseInput("");
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphraseInput.trim()) {
      setErrorMsg("Passphrase cannot be empty");
      return;
    }
    const success = await enableEncryption(passphraseInput);
    if (success) {
      setPassphraseInput("");
    }
  };

  const isUnlocked = cryptoKey !== null || encryptionStatus === "disabled";

  return (
    <EncryptionContext.Provider
      value={{
        cryptoKey,
        setCryptoKey,
        isUnlocked,
        passphraseError: errorMsg,
        unlockVault,
        encryptionStatus,
        enableEncryption,
        disableEncryption,
      }}
    >
      {/* If signed in, but undecided, show the Choice Screen */}
      {isLoaded && isSignedIn && encryptionStatus === "undecided" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FDFBF7] p-4 text-[#2E1A1A]">
          <div className="w-full max-w-md rounded-2xl border border-[#FCE7E9] bg-white p-6 shadow-xl sm:p-8">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FCE7E9] text-[#E08D93]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                  />
                </svg>
              </div>
              <h2 className="font-lora text-2xl font-bold tracking-tight text-[#2E1A1A]">
                Secure Your Journal
              </h2>
              <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
                Choose if you want to enable zero-knowledge, client-side End-to-End Encryption (E2EE) using a private passphrase.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <button
                onClick={() => setEncryptionStatus("enabled")}
                className="w-full rounded-lg bg-[#E08D93] py-3 font-semibold text-white transition-all hover:bg-[#D57B82] focus:outline-none focus:ring-2 focus:ring-[#E08D93] cursor-pointer"
              >
                🔒 Enable End-to-End Encryption
              </button>
              <button
                onClick={disableEncryption}
                className="w-full rounded-lg border border-[#706661]/20 py-3 font-medium text-[#2E1A1A] hover:bg-[#FDFBF7] transition-all focus:outline-none cursor-pointer text-sm"
              >
                Use Plain Text (Standard Security)
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* If signed in, E2EE enabled, but vault is locked, show Passphrase Prompt */}
      {isLoaded && isSignedIn && encryptionStatus === "enabled" && !cryptoKey ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FDFBF7] p-4 text-[#2E1A1A]">
          <div className="w-full max-w-md rounded-2xl border border-[#FCE7E9] bg-white p-6 shadow-xl sm:p-8">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FCE7E9] text-[#E08D93]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                  />
                </svg>
              </div>
              <h2 className="font-lora text-2xl font-bold tracking-tight text-[#2E1A1A]">
                Unlock Your Vault
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Enter your private Journal Passphrase to encrypt/decrypt entries locally. 
                Our database never sees your plain-text or passphrase.
              </p>
            </div>

            <form onSubmit={handleUnlockSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Private Passphrase
                </label>
                <input
                  type="password"
                  required
                  disabled={deriving}
                  value={passphraseInput}
                  onChange={(e) => setPassphraseInput(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="mt-1 block w-full rounded-lg border border-[#FCE7E9] bg-[#FDFBF7] px-3 py-2 text-[#2E1A1A] placeholder-neutral-300 focus:border-[#E08D93] focus:outline-none focus:ring-1 focus:ring-[#E08D93]"
                />
              </div>

              {errorMsg && (
                <div className="rounded-lg bg-[#FFF0F1] p-3 text-sm text-[#D9414B]">
                  {errorMsg}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={deriving}
                  className="w-full rounded-lg bg-[#E08D93] py-2.5 font-medium text-white transition-all hover:bg-[#D57B82] focus:outline-none focus:ring-2 focus:ring-[#E08D93] focus:ring-offset-2 disabled:opacity-50 cursor-pointer"
                >
                  {deriving ? "Deriving Secure Key..." : "Unlock Vault"}
                </button>
                <button
                  type="button"
                  onClick={disableEncryption}
                  className="text-xs text-neutral-400 hover:text-[#D9414B] underline transition-all py-1 cursor-pointer"
                >
                  Disable encryption on this vault (Plain Text mode)
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* If status is "enabled" but they need to set it up initially */}
      {isLoaded && isSignedIn && encryptionStatus === "enabled" && !cryptoKey && false ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FDFBF7] p-4 text-[#2E1A1A]">
          <div className="w-full max-w-md rounded-2xl border border-[#FCE7E9] bg-white p-6 shadow-xl sm:p-8">
            <div className="text-center">
              <h2 className="font-lora text-2xl font-bold tracking-tight text-[#2E1A1A]">
                Create Your Passphrase
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Choose a strong passphrase to encrypt your journal. Save it somewhere safe.
              </p>
            </div>
            <form onSubmit={handleSetupSubmit} className="mt-6 space-y-4">
              <input
                type="password"
                required
                value={passphraseInput}
                onChange={(e) => setPassphraseInput(e.target.value)}
                placeholder="Choose Passphrase"
                className="block w-full rounded-lg border border-[#FCE7E9] bg-[#FDFBF7] px-3 py-2 text-[#2E1A1A]"
              />
              <button type="submit" className="w-full rounded-lg bg-[#E08D93] py-2.5 text-white">
                Set Passphrase
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {children}
    </EncryptionContext.Provider>
  );
}
