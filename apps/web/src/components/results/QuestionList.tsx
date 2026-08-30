"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { QuestionItem, SubQuestion, UnmatchedAnswerItemBackend } from "@/types/assessment";

interface QuestionListProps {
  questions: QuestionItem[];
  activeQuestionId: string;
  onSelectQuestion: (question: QuestionItem) => void;
  onSelectSubQuestion?: (subQ: SubQuestion, parentQ: QuestionItem) => void;
  unmatchedAnswers?: UnmatchedAnswerItemBackend[];
  selectedUnmatchedId?: string | null;
  onSelectUnmatched?: (unmatched: UnmatchedAnswerItemBackend) => void;
}

export const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  activeQuestionId,
  onSelectQuestion,
  onSelectSubQuestion,
  unmatchedAnswers = [],
  selectedUnmatchedId,
  onSelectUnmatched,
}) => {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    q2: true,
  });

  const allExpanded = questions.every((q) => expandedIds[q.id]);

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedIds({});
    } else {
      const all: Record<string, boolean> = {};
      questions.forEach((q) => (all[q.id] = true));
      setExpandedIds(all);
    }
  };

  const toggleQuestion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getMarksBadgeStyle = (obtained?: number, max?: number, status?: string, verdict?: string) => {
    if (status === "unanswered" || verdict === "unanswered") {
      return "bg-neutral-100 text-neutral-500 border border-neutral-200";
    }
    if (obtained === undefined || max === undefined) return "bg-neutral-100 text-neutral-600";
    if (obtained === max || verdict === "correct") return "bg-emerald-100 text-emerald-700";
    if (obtained === 0 || verdict === "incorrect") return "bg-rose-100 text-rose-700";
    return "bg-amber-100 text-amber-700";
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden select-none pr-1">
      {/* Header with Title and Expand All Button */}
      <div className="flex items-center justify-between py-2 px-1 mb-2">
        <h2 className="text-xs font-bold text-neutral-800 tracking-tight">
          Extracted <span className="font-bold">Questions (from question paper)</span>
        </h2>
        <button
          onClick={toggleExpandAll}
          className="px-3 py-1 bg-white hover:bg-neutral-50 rounded-full border border-neutral-200 text-[11px] font-semibold text-neutral-700 shadow-2xs transition cursor-pointer"
        >
          {allExpanded ? "Collapse All" : "Expand All"}
        </button>
      </div>

      {/* Scrollable Questions Column */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 pb-8">
        {questions.map((q) => {
          const isActive = activeQuestionId === q.id && !selectedUnmatchedId;
          const isExpanded = Boolean(expandedIds[q.id] || isActive);

          // Subquestions handling (e.g. Q11a, Q11b)
          if (q.subQuestions && q.subQuestions.length > 0) {
            return (
              <div key={q.id} className="space-y-2">
                {q.subQuestions.map((subQ) => {
                  const isSubActive = activeQuestionId === subQ.id && !selectedUnmatchedId;
                  const isSubUnanswered = subQ.status === "unanswered";
                  const isSubExpanded = Boolean(expandedIds[subQ.id] || isSubActive);

                  return (
                    <div
                      key={subQ.id}
                      onClick={() => {
                        onSelectQuestion(q);
                        if (onSelectSubQuestion) onSelectSubQuestion(subQ, q);
                      }}
                      className={`w-full rounded-2xl p-3.5 bg-white border transition-all cursor-pointer shadow-xs ${
                        isSubActive
                          ? "border-orange-500 ring-1 ring-orange-500/20"
                          : "border-neutral-200/80 hover:border-neutral-300"
                      } ${isSubUnanswered ? "opacity-80 bg-neutral-50/50" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-neutral-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {q.number}
                          </div>
                          <span className="font-bold text-xs text-neutral-700 mt-1 shrink-0">
                            {subQ.subLabel}
                          </span>
                          <p className="text-xs text-neutral-800 leading-relaxed font-normal">
                            {subQ.text}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${getMarksBadgeStyle(
                              subQ.obtainedMarks,
                              subQ.maxMarks,
                              subQ.status,
                              subQ.verdict
                            )}`}
                          >
                            {isSubUnanswered
                              ? "Unanswered"
                              : subQ.obtainedMarks !== undefined
                              ? `${subQ.obtainedMarks}/${subQ.maxMarks}`
                              : `${subQ.maxMarks}m`}
                          </span>
                          <button
                            onClick={(e) => toggleQuestion(subQ.id, e)}
                            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700"
                          >
                            {isSubExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Subquestion AI Feedback Card */}
                      {isSubExpanded && subQ.aiFeedback && (
                        <div className="mt-3 pt-3 border-t border-neutral-100">
                          <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-3">
                            <span className="text-[11px] font-bold text-neutral-900 block mb-1">
                              AI Feedback
                            </span>
                            <p className="text-xs text-neutral-600 leading-relaxed">
                              {subQ.aiFeedback}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }

          const isUnanswered = q.status === "unanswered";

          return (
            <div
              key={q.id}
              onClick={() => onSelectQuestion(q)}
              className={`w-full rounded-2xl p-3.5 bg-white border transition-all cursor-pointer shadow-xs ${
                isActive
                  ? "border-orange-500 ring-1 ring-orange-500/20"
                  : "border-neutral-200/80 hover:border-neutral-300"
              } ${isUnanswered ? "opacity-80 bg-neutral-50/50" : ""}`}
            >
              {/* Question Row Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                      isActive
                        ? "bg-orange-500 text-white shadow-xs"
                        : isUnanswered
                        ? "bg-neutral-400 text-white"
                        : "bg-neutral-700 text-white"
                    }`}
                  >
                    {q.number}
                  </div>
                  <p className="text-xs text-neutral-800 leading-relaxed font-normal">
                    {q.text}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getMarksBadgeStyle(
                      q.obtainedMarks,
                      q.maxMarks,
                      q.status,
                      q.verdict
                    )}`}
                  >
                    {isUnanswered
                      ? "Unanswered"
                      : q.obtainedMarks !== undefined
                      ? `${q.obtainedMarks}/${q.maxMarks}`
                      : `${q.maxMarks}m`}
                  </span>
                  <button
                    onClick={(e) => toggleQuestion(q.id, e)}
                    className="p-1 rounded-md text-neutral-400 hover:text-neutral-700"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Details / AI Feedback */}
              {isExpanded && q.aiFeedback && (
                <div className="mt-3 pt-3 border-t border-neutral-100">
                  <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-3">
                    <span className="text-[11px] font-bold text-neutral-900 block mb-1">
                      AI Feedback
                    </span>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {q.aiFeedback}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Optional Unmatched Answers Section */}
        {unmatchedAnswers.length > 0 && onSelectUnmatched && (
          <div className="mt-6 pt-4 border-t border-neutral-200/80">
            <h3 className="text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider px-1">
              Unmatched Student Writing ({unmatchedAnswers.length})
            </h3>
            <div className="space-y-2">
              {unmatchedAnswers.map((u) => {
                const isSelected = selectedUnmatchedId === u.answer_id;
                return (
                  <div
                    key={u.answer_id}
                    onClick={() => onSelectUnmatched(u)}
                    className={`w-full rounded-2xl p-3 bg-amber-50/50 border transition-all cursor-pointer shadow-2xs ${
                      isSelected
                        ? "border-amber-500 ring-1 ring-amber-500/20"
                        : "border-amber-200/70 hover:border-amber-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-800 shrink-0">
                          {u.detected_label || "Notes"}
                        </span>
                        <p className="text-xs text-neutral-700 truncate font-mono">
                          {u.transcribed_text}
                        </p>
                      </div>
                      <span className="text-[10px] text-neutral-400 shrink-0">
                        Page {u.locations[0]?.page_number}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
