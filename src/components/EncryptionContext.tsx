"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { deriveJournalKey, getSaltFromUserId } from "@/lib/crypto";

interface EncryptionContextType {
  cryptoKey: CryptoKey | null;
  setCryptoKey: (key: CryptoKey | null) => void;
  isUnlocked: boolean;
  passphraseError: string | null;
  unlockVault: (passphrase: string) => Promise<boolean>;
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

  // Clear key on sign out
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setCryptoKey(null);
    }
  }, [isSignedIn, isLoaded]);

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

  const handleSubmit = async (e: React.FormEvent) => {
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

  const isUnlocked = cryptoKey !== null;

  return (
    <EncryptionContext.Provider
      value={{
        cryptoKey,
        setCryptoKey,
        isUnlocked,
        passphraseError: errorMsg,
        unlockVault,
      }}
    >
      {/* If signed in but not unlocked, show overlay password modal */}
      {isLoaded && isSignedIn && !isUnlocked ? (
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

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

              <button
                type="submit"
                disabled={deriving}
                className="w-full rounded-lg bg-[#E08D93] py-2.5 font-medium text-white transition-all hover:bg-[#D57B82] focus:outline-none focus:ring-2 focus:ring-[#E08D93] focus:ring-offset-2 disabled:opacity-50"
              >
                {deriving ? "Deriving Secure Key..." : "Unlock Vault"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
      {children}
    </EncryptionContext.Provider>
  );
}
