"use client";

import React, { useRef } from "react";
import { Upload, X, ArrowRight, AlertCircle } from "lucide-react";
import { UploadedFileMeta } from "@/types/assessment";

interface UploadViewProps {
  questionPaper: UploadedFileMeta | null;
  answerSheet: UploadedFileMeta | null;
  onUploadQP: (file: File) => void;
  onRemoveQP: () => void;
  onUploadAS: (file: File) => void;
  onRemoveAS: () => void;
  onStartMapping: () => void;
  onUseSampleFiles?: () => void;
  errorMessage?: string | null;
}

export const UploadView: React.FC<UploadViewProps> = ({
  questionPaper,
  answerSheet,
  onUploadQP,
  onRemoveQP,
  onUploadAS,
  onRemoveAS,
  onStartMapping,
  onUseSampleFiles,
  errorMessage,
}) => {
  const qpInputRef = useRef<HTMLInputElement>(null);
  const asInputRef = useRef<HTMLInputElement>(null);

  const bothUploaded = Boolean(questionPaper && answerSheet);

  return (
    <div className="flex-1 w-full bg-gradient-to-b from-white via-white to-slate-100/60 rounded-2xl border border-slate-200/70 p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center relative overflow-y-auto select-none">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={qpInputRef}
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            onUploadQP(e.target.files[0]);
          }
        }}
      />
      <input
        type="file"
        ref={asInputRef}
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            onUploadAS(e.target.files[0]);
          }
        }}
      />

      <div className="w-full max-w-2xl flex flex-col items-center my-auto">
        {/* Title with Orange Highlight */}
        <div className="text-center mb-1 px-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight leading-tight">
            Upload{" "}
            <span className="relative inline-block bg-orange-100/90 text-orange-600 px-2 py-0.5 rounded-md font-extrabold mt-1 sm:mt-0">
              Question Paper & Answer Sheets
            </span>
          </h1>
          <p className="text-xs text-neutral-500 mt-2 font-medium">
            Upload both files to get started
          </p>
        </div>

        {/* Central Illustrated Female Teacher Avatar Badge */}
        <div className="my-4 sm:my-6 relative">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-orange-100 to-orange-200/70 p-1 flex items-center justify-center shadow-inner relative">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center overflow-hidden border border-orange-200">
              <div className="w-full h-full flex flex-col items-center justify-center bg-orange-50/50">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-neutral-800 flex items-center justify-center text-white text-[9px] sm:text-[10px] font-bold">
                  👩‍🏫
                </div>
                <div className="w-7 sm:w-8 h-3 sm:h-3.5 bg-neutral-700 rounded-t-lg mt-0.5" />
              </div>
            </div>
            {/* Small icon satellites around avatar */}
            <div className="absolute -top-1 right-1 w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[8px] shadow">
              ⏱
            </div>
            <div className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[8px] shadow">
              📝
            </div>
            <div className="absolute top-1/2 -right-2 w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[8px] shadow">
              ✨
            </div>
          </div>
        </div>

        {/* Optional Error Alert */}
        {errorMessage && (
          <div className="mb-4 w-full rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Dual Upload Cards / Dropzones */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-2">
          {/* Question Paper Card */}
          <div className="h-32 sm:h-36 rounded-2xl border-2 border-dashed border-neutral-200 bg-white/70 p-3 sm:p-4 flex flex-col items-center justify-center transition hover:border-neutral-300">
            {questionPaper ? (
              <div className="w-full h-full bg-neutral-50/90 rounded-xl p-3 flex items-center justify-between border border-neutral-200/80 shadow-xs relative">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-8 h-9 sm:w-9 sm:h-10 rounded-lg bg-rose-500 text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
                    <span className="text-[7px] font-black uppercase">
                      {questionPaper.name.toLowerCase().endsWith(".pdf") ? "PDF" : "IMG"}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-neutral-800 truncate" title={questionPaper.name}>
                      {questionPaper.name}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      {questionPaper.size} {questionPaper.pages > 0 ? `• ${questionPaper.pages} Pages` : ""}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onRemoveQP}
                  className="w-5 h-5 rounded-full bg-neutral-700 hover:bg-neutral-900 text-white flex items-center justify-center transition shrink-0 ml-2 cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-3 h-3 stroke-[3]" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => qpInputRef.current?.click()}
                className="w-full h-full flex flex-col items-center justify-center cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-neutral-100 group-hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition mb-1.5 sm:mb-2">
                  <Upload className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="text-xs font-bold text-neutral-800 text-center">
                  Upload <span className="text-orange-600 font-bold">Question Paper</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-medium mt-0.5">
                  Max 10MB
                </span>
              </div>
            )}
          </div>

          {/* Answer Sheet Card */}
          <div className="h-32 sm:h-36 rounded-2xl border-2 border-dashed border-neutral-200 bg-white/70 p-3 sm:p-4 flex flex-col items-center justify-center transition hover:border-neutral-300">
            {answerSheet ? (
              <div className="w-full h-full bg-neutral-50/90 rounded-xl p-3 flex items-center justify-between border border-neutral-200/80 shadow-xs relative">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-8 h-9 sm:w-9 sm:h-10 rounded-lg bg-rose-500 text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
                    <span className="text-[7px] font-black uppercase">
                      {answerSheet.name.toLowerCase().endsWith(".pdf") ? "PDF" : "IMG"}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-neutral-800 truncate" title={answerSheet.name}>
                      {answerSheet.name}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      {answerSheet.size} {answerSheet.pages > 0 ? `• ${answerSheet.pages} Pages` : ""}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onRemoveAS}
                  className="w-5 h-5 rounded-full bg-neutral-700 hover:bg-neutral-900 text-white flex items-center justify-center transition shrink-0 ml-2 cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-3 h-3 stroke-[3]" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => asInputRef.current?.click()}
                className="w-full h-full flex flex-col items-center justify-center cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-neutral-100 group-hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition mb-1.5 sm:mb-2">
                  <Upload className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="text-xs font-bold text-neutral-800 text-center">
                  Upload <span className="text-orange-600 font-bold">Answer Sheet</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-medium mt-0.5">
                  Max 10MB
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Start Mapping Action Button */}
        <div className="mt-6 sm:mt-8 flex flex-col items-center gap-2 w-full px-2">
          <button
            onClick={onStartMapping}
            disabled={!bothUploaded}
            className={`w-full sm:w-auto h-10 px-6 rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              bothUploaded
                ? "bg-neutral-900 hover:bg-black text-white shadow-md hover:scale-105 cursor-pointer"
                : "bg-neutral-400/80 text-neutral-200 cursor-not-allowed"
            }`}
          >
            <span>Start Mapping</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
          <span className="text-[10px] sm:text-[11px] text-neutral-400 font-medium text-center">
            Once both files are uploaded, you&apos;ll able to map answers with questions
          </span>

          {/* Quick Demo Fill Shortcut */}
          {!bothUploaded && onUseSampleFiles && (
            <button
              onClick={onUseSampleFiles}
              className="mt-1 sm:mt-2 text-[11px] text-orange-600 hover:text-orange-700 underline font-medium cursor-pointer text-center"
            >
              (Click to auto-fill sample Figma test files)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
