"use client";

import React from "react";
import { Sparkles } from "lucide-react";

export const ExtractingLoader: React.FC = () => {
  return (
    <div className="flex-1 w-full bg-white rounded-2xl border border-slate-200/70 flex flex-col items-center justify-center p-8 select-none">
      {/* Animated Sparkles Cluster */}
      <div className="relative mb-6 flex items-center justify-center">
        {/* Glow backdrop */}
        <div className="absolute w-24 h-24 rounded-full bg-orange-500/10 blur-xl animate-pulse" />

        {/* Central main 4-point star / sparkles */}
        <div className="relative animate-bounce duration-1000">
          <svg
            className="w-16 h-16 text-orange-500"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <path d="M50 0 C50 30 70 50 100 50 C70 50 50 70 50 100 C50 70 30 50 0 50 C30 50 50 30 50 0 Z" />
          </svg>
        </div>

        {/* Small sparkle top right */}
        <div className="absolute -top-1 -right-3 text-orange-400 animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>

        {/* Small sparkle bottom left */}
        <div className="absolute -bottom-2 -left-3 text-orange-400 animate-pulse delay-300">
          <Sparkles className="w-4 h-4" />
        </div>
      </div>

      {/* Title & Subtitle */}
      <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
        Extracting...
      </h2>
      <p className="text-xs text-neutral-400 mt-1 font-medium">
        This may take a while
      </p>
    </div>
  );
};
