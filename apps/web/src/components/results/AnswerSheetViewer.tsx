"use client";

import React, { useState } from "react";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, AlertCircle, FileQuestion } from "lucide-react";
import { DocumentInfo, QuestionItem, UnmatchedAnswerItemBackend } from "@/types/assessment";

interface AnswerSheetViewerProps {
  currentPage: number;
  totalPages: number;
  zoomLevel: number;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  activeQuestion?: QuestionItem;
  answerSheetDoc?: DocumentInfo | null;
  apiBaseUrl?: string;
  selectedUnmatchedAnswer?: UnmatchedAnswerItemBackend | null;
}

export const AnswerSheetViewer: React.FC<AnswerSheetViewerProps> = ({
  currentPage,
  totalPages,
  zoomLevel,
  onPageChange,
  onZoomChange,
  activeQuestion,
  answerSheetDoc,
  apiBaseUrl = "http://localhost:8100",
  selectedUnmatchedAnswer,
}) => {
  const [imageLoadFailed, setImageLoadFailed] = useState<boolean>(false);

  const handleZoomIn = () => onZoomChange(Math.min(zoomLevel + 10, 200));
  const handleZoomOut = () => onZoomChange(Math.max(zoomLevel - 10, 50));

  // Determine active answer locations on this page
  const answerLocationsOnCurrentPage = (
    activeQuestion?.extractedAnswer?.locations?.filter((loc) => loc.page_number === currentPage) || []
  );

  // If question has no subquestions and had a mappedPage/highlightBox
  const hasDirectHighlight = (
    activeQuestion &&
    activeQuestion.status !== "unanswered" &&
    activeQuestion.mappedPage === currentPage &&
    activeQuestion.highlightBox &&
    answerLocationsOnCurrentPage.length === 0
  );

  // Unmatched highlight on current page
  const unmatchedLocationsOnCurrentPage = (
    selectedUnmatchedAnswer?.locations?.filter((loc) => loc.page_number === currentPage) || []
  );

  const isUnanswered = activeQuestion?.status === "unanswered";

  // Check if real rendered image exists for this page
  const pageMeta = answerSheetDoc?.pages?.find((p) => p.page_number === currentPage);
  const imageUrl = pageMeta?.image_url ? `${apiBaseUrl}${pageMeta.image_url}` : null;

  // Clamping helper to prevent out-of-bounds rendering
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(val, max));

  return (
    <div className="flex-1 flex flex-col h-full bg-white rounded-2xl border border-slate-200/70 overflow-hidden shadow-xs select-none">
      {/* Viewer Header / Toolbar */}
      <div className="w-full h-11 bg-neutral-800 text-white px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-neutral-200">Answer Sheet</span>
          {activeQuestion && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-neutral-700 text-neutral-300">
              {activeQuestion.status === "unanswered"
                ? "Unanswered"
                : `Q${activeQuestion.number}${activeQuestion.subQuestions ? " (Subparts)" : ""} Mapped`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom Controls */}
          <div className="flex items-center bg-neutral-700/80 rounded-lg px-2 py-1 text-xs text-neutral-200 gap-2">
            <button
              onClick={handleZoomOut}
              className="hover:text-white transition disabled:opacity-40"
              disabled={zoomLevel <= 50}
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] min-w-[36px] text-center font-medium">
              {zoomLevel}%
            </span>
            <button
              onClick={handleZoomIn}
              className="hover:text-white transition disabled:opacity-40"
              disabled={zoomLevel >= 200}
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center bg-neutral-700/80 rounded-lg px-1.5 py-1 text-xs text-neutral-200 gap-1.5">
            <button
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage <= 1}
              className="p-0.5 hover:text-white transition disabled:opacity-30"
              title="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-medium px-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="p-0.5 hover:text-white transition disabled:opacity-30"
              title="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Answer Sheet Canvas / Scroll Area */}
      <div className="flex-1 overflow-auto bg-neutral-200/60 p-4 flex justify-center items-start relative">
        <div
          className="relative notebook-paper w-full max-w-[620px] rounded-lg shadow-md border border-neutral-300 transition-transform duration-150 origin-top overflow-hidden bg-white"
          style={{
            transform: `scale(${zoomLevel / 100})`,
            minHeight: "780px",
          }}
        >
          {/* Unanswered Overlay Banner if student skipped question */}
          {isUnanswered && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-500/90 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 backdrop-blur-xs">
              <FileQuestion className="w-4 h-4" />
              <span>No student answer written for Question {activeQuestion?.number} (Unanswered)</span>
            </div>
          )}

          {/* Real Backend Rendered PNG Page Image */}
          {imageUrl && !imageLoadFailed ? (
            <div className="relative w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`Answer Sheet Page ${currentPage}`}
                className="w-full h-auto object-contain block"
                onError={() => setImageLoadFailed(true)}
              />
            </div>
          ) : (
            /* Fallback to Lined Paper Canvas matching Figma */
            <>
              <div className="absolute top-2 right-4 text-[10px] font-mono text-neutral-400">
                Page {currentPage}
              </div>

              {currentPage === 1 && (
                <div className="pt-6 pl-16 pr-6 space-y-6 text-slate-800 font-sans text-xs select-text">
                  <div className="relative">
                    <span className="absolute -left-12 font-serif font-bold text-neutral-700">Q1.</span>
                    <p className="leading-7 tracking-wide font-serif text-slate-800 text-[13px]">
                      Photosynthesis is the process used by green plants and some other organisms to convert light energy into chemical energy.
                    </p>
                    <div className="my-3 mx-auto w-fit border border-neutral-700/80 px-4 py-1.5 text-center font-serif text-[12px] bg-white/60 rounded-xs">
                      6CO₂ + 6H₂O  <span className="mx-2 text-[10px]">⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯→<br/><span className="text-[9px]">Light / Chlorophyll</span></span>  C₆H₁₂O₆ + 6O₂
                    </div>
                    <div className="flex flex-col items-center justify-center my-3 text-[11px] text-neutral-600 font-serif">
                      <div className="flex items-center gap-2">
                        <span>☀ Sunlight</span>
                      </div>
                      <div className="flex items-center gap-6 my-1">
                        <span>Carbon dioxide →</span>
                        <div className="w-12 h-16 border-b-2 border-dashed border-neutral-800 flex items-center justify-center text-xl">
                          🌿
                        </div>
                        <span>→ Oxygen</span>
                      </div>
                      <span className="text-[10px] text-neutral-500">⇣ Water</span>
                    </div>
                  </div>

                  <div className="relative mt-8">
                    <span className="absolute -left-12 font-serif font-bold text-neutral-700">Q2.</span>
                    <p className="leading-7 tracking-wide font-serif text-slate-800 text-[13px]">
                      The process mainly occurs in the chloroplast of the plant cell. It has two main stages:
                      <br />
                      1. Light reaction – Captures light energy.
                      <br />
                      2. Dark reaction – Uses energy to make glucose.
                    </p>
                  </div>
                </div>
              )}

              {currentPage === 2 && (
                <div className="pt-6 pl-16 pr-6 space-y-6 text-slate-800 font-sans text-xs select-text">
                  <div className="relative">
                    <span className="absolute -left-12 font-serif font-bold text-neutral-700">Q4.</span>
                    <p className="leading-7 tracking-wide font-serif text-slate-800 text-[13px]">
                      Blood from the body enters the right atrium via the vena cava, passes through the tricuspid valve into the right ventricle, and is pumped into the pulmonary artery through the pulmonary valve.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Precision Real Bounding Box Highlighting: Locations on this page */}
          {!isUnanswered && answerLocationsOnCurrentPage.map((loc, idx) => {
            const x = clamp(loc.bounding_box.x, 0, 95);
            const y = clamp(loc.bounding_box.y, 0, 95);
            const width = clamp(loc.bounding_box.width, 2, 100 - x);
            const height = clamp(loc.bounding_box.height, 2, 100 - y);

            return (
              <div
                key={idx}
                className="absolute border-2 border-emerald-500 bg-emerald-500/10 rounded-lg pointer-events-none transition-all duration-300 z-10"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                }}
              >
                <div className="absolute -top-3.5 left-2 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center justify-center">
                  Q{activeQuestion?.number} {loc.is_continuation ? "(Cont.)" : ""}
                </div>
              </div>
            );
          })}

          {/* Single Direct Highlight Fallback */}
          {!isUnanswered && hasDirectHighlight && activeQuestion.highlightBox && (
            <div
              className="absolute border-2 border-emerald-500 bg-emerald-500/10 rounded-lg pointer-events-none transition-all duration-300 z-10"
              style={{
                left: `${clamp(activeQuestion.highlightBox.x, 0, 95)}%`,
                top: `${clamp(activeQuestion.highlightBox.y, 0, 95)}%`,
                width: `${clamp(activeQuestion.highlightBox.width, 2, 100 - activeQuestion.highlightBox.x)}%`,
                height: `${clamp(activeQuestion.highlightBox.height, 2, 100 - activeQuestion.highlightBox.y)}%`,
              }}
            >
              <div className="absolute -top-3.5 left-2 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center justify-center">
                Q{activeQuestion.number}
              </div>
            </div>
          )}

          {/* Unmatched Answer Highlights (Amber / Dashed) */}
          {unmatchedLocationsOnCurrentPage.map((loc, idx) => {
            const x = clamp(loc.bounding_box.x, 0, 95);
            const y = clamp(loc.bounding_box.y, 0, 95);
            const width = clamp(loc.bounding_box.width, 2, 100 - x);
            const height = clamp(loc.bounding_box.height, 2, 100 - y);

            return (
              <div
                key={`unmatched-${idx}`}
                className="absolute border-2 border-dashed border-amber-500 bg-amber-500/10 rounded-lg pointer-events-none transition-all duration-300 z-10"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                }}
              >
                <div className="absolute -top-3.5 left-2 bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center justify-center">
                  Unmatched Notes
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
