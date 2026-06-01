"use client";

import React from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-grow flex flex-col items-center justify-center min-h-[400px] bg-[#FDFBF7] text-[#2A2421] p-6 text-center font-sans">
      <div className="max-w-md w-full bg-[#F5F2EB]/50 border border-[#706661]/10 rounded-xl p-8 shadow-sm flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-[#FCE7E9] flex items-center justify-center text-red-600">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-serif font-semibold text-[#2A2421]">
            Something went wrong
          </h1>
          <p className="text-xs text-[#706661] leading-relaxed">
            An unexpected error occurred while loading your watercolor journal page.
          </p>
          {error.message && (
            <p className="text-[11px] bg-[#706661]/5 text-[#706661] py-2 px-3 rounded font-mono break-all max-h-24 overflow-y-auto mt-2">
              {error.message}
            </p>
          )}
        </div>
        <Button
          onClick={() => reset()}
          className="bg-[#2A2421] text-[#FDFBF7] hover:bg-[#2A2421]/95 px-6 py-2 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
