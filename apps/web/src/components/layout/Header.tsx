"use client";

import React from "react";
import {
  ArrowLeft,
  ClipboardList,
  HelpCircle,
  Bell,
  Sparkles,
  ChevronDown,
} from "lucide-react";

interface HeaderProps {
  onBack?: () => void;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onBack, showBack = true }) => {
  return (
    <header className="w-full h-14 bg-white rounded-2xl shadow-sm border border-slate-200/70 px-4 flex items-center justify-between select-none">
      {/* Left: Back button & Breadcrumb */}
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
        )}
        <div className="flex items-center gap-2 text-neutral-700 font-medium text-xs">
          <ClipboardList className="w-4 h-4 text-neutral-400" />
          <span>Exams</span>
        </div>
      </div>

      {/* Right: Actions and User Profile */}
      <div className="flex items-center gap-3">
        {/* Help Circle */}
        <button className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition">
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Notifications with red dot badge */}
        <button className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full ring-2 ring-white"></span>
        </button>

        {/* Sparkle Action */}
        <button className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition">
          <Sparkles className="w-4 h-4" />
        </button>

        {/* User Profile Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-neutral-200 cursor-pointer hover:opacity-90 transition">
          <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center overflow-hidden border border-neutral-200">
            <span className="text-white text-xs font-bold">MR</span>
          </div>
          <span className="text-xs font-semibold text-neutral-800">Madhur Rastogi</span>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
        </div>
      </div>
    </header>
  );
};
