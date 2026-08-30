"use client";

import React from "react";
import {
  Sparkles,
  LayoutGrid,
  Users,
  FileText,
  ClipboardList,
  PieChart,
  Settings,
  PanelLeftClose,
  ChevronsRight,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const navItems = [
    { label: "Home", icon: LayoutGrid, active: false },
    { label: "My Classroom", icon: Users, active: false },
    { label: "Assignments", icon: FileText, active: false },
    { label: "Exams", icon: ClipboardList, active: true },
    { label: "My Library", icon: PieChart, active: false },
  ];

  return (
    <aside
      className={`h-full bg-white transition-all duration-300 flex flex-col justify-between p-3 rounded-2xl shadow-sm border border-slate-200/70 select-none ${
        collapsed ? "w-[72px] items-center" : "w-[240px]"
      }`}
    >
      {/* Top Section */}
      <div className="flex flex-col gap-4 w-full">
        {/* Brand Logo & Collapse Icon */}
        <div className="flex items-center justify-between px-2 pt-1 pb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-white font-black text-xl shadow-sm">
              V
            </div>
            {!collapsed && (
              <span className="text-xl font-bold tracking-tight text-neutral-900">
                VedaAI
              </span>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              className="text-neutral-400 hover:text-neutral-700 transition p-1 rounded-md hover:bg-neutral-100"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* AI Teacher's Toolkit Pill Button */}
        <div className="w-full">
          {collapsed ? (
            <button
              onClick={onToggleCollapse}
              className="w-10 h-10 mx-auto rounded-full bg-gradient-to-r from-neutral-800 to-neutral-900 border-2 border-orange-500/80 flex items-center justify-center text-white shadow-md hover:scale-105 transition"
              title="AI Teacher's Toolkit"
            >
              <Sparkles className="w-4 h-4 text-orange-400" />
            </button>
          ) : (
            <button className="w-full h-11 rounded-full bg-gradient-to-r from-neutral-800 to-neutral-900 border-2 border-orange-500/80 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-sm hover:brightness-110 transition">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>AI Teacher&apos;s Toolkit</span>
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 w-full mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  item.active
                    ? "bg-neutral-100/90 text-neutral-900 font-semibold"
                    : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                } ${collapsed ? "justify-center px-0 w-10 h-10 mx-auto" : "w-full"}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 ${item.active ? "text-neutral-900" : "text-neutral-400"}`} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Settings & School Info */}
      <div className="flex flex-col gap-2 w-full pt-4">
        {!collapsed && (
          <button className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition w-full">
            <Settings className="w-4 h-4 text-neutral-400" />
            <span>Settings</span>
          </button>
        )}

        {/* School Footer Card */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-200/80 p-1.5 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] text-emerald-800 font-bold border border-emerald-300">
                DPS
              </div>
            </div>
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
              title="Expand Sidebar"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="w-full rounded-xl bg-neutral-100/80 border border-neutral-200/70 p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 p-1 flex items-center justify-center shrink-0">
              <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-[8px] text-emerald-800 font-bold border border-emerald-300">
                DPS
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-neutral-900 truncate">
                Delhi Public School
              </span>
              <span className="text-[10px] text-neutral-400 truncate">
                Bokaro Steel City
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
