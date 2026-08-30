"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { UploadView } from "@/components/upload/UploadView";
import { ExtractingLoader } from "@/components/processing/ExtractingLoader";
import { QuestionList } from "@/components/results/QuestionList";
import { AnswerSheetViewer } from "@/components/results/AnswerSheetViewer";
import {
  AppFlowState,
  AssessmentGradingResponse,
  AssessmentMappingResponse,
  IngestionJobResponse,
  QuestionItem,
  SubQuestion,
  UnmatchedAnswerItemBackend,
  UploadedFileMeta,
} from "@/types/assessment";
import { INITIAL_QUESTIONS } from "@/data/mockAssessment";

export default function AssessmentPage() {
  // Navigation & Layout State
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [appState, setAppState] = useState<AppFlowState>("upload-empty");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Uploaded Files State
  const [questionPaper, setQuestionPaper] = useState<UploadedFileMeta | null>(null);
  const [answerSheet, setAnswerSheet] = useState<UploadedFileMeta | null>(null);
  const [ingestionJob, setIngestionJob] = useState<IngestionJobResponse | null>(null);
  const [mappingData, setMappingData] = useState<AssessmentMappingResponse | null>(null);
  const [gradingData, setGradingData] = useState<AssessmentGradingResponse | null>(null);

  // Results & Highlighting State
  const [questions, setQuestions] = useState<QuestionItem[]>(INITIAL_QUESTIONS);
  const [activeQuestionId, setActiveQuestionId] = useState<string>("q2");
  const [selectedUnmatched, setSelectedUnmatched] = useState<UnmatchedAnswerItemBackend | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8100";

  // File Upload Handlers with Client-Side Validation
  const validateUploadedFile = (file: File): boolean => {
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMessage(`File "${file.name}" exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      return false;
    }
    const validExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      setErrorMessage(`Invalid file type for "${file.name}". Supported: PDF, PNG, JPG, WEBP.`);
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const handleUploadQP = (file: File) => {
    if (!validateUploadedFile(file)) return;
    const meta: UploadedFileMeta = {
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)}MB`,
      pages: 0,
      rawFile: file,
    };
    setQuestionPaper(meta);
    if (answerSheet) setAppState("upload-filled");
    else setAppState("upload-empty");
  };

  const handleUploadAS = (file: File) => {
    if (!validateUploadedFile(file)) return;
    const meta: UploadedFileMeta = {
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)}MB`,
      pages: 0,
      rawFile: file,
    };
    setAnswerSheet(meta);
    if (questionPaper) setAppState("upload-filled");
    else setAppState("upload-empty");
  };

  const handleRemoveQP = () => {
    setQuestionPaper(null);
    setErrorMessage(null);
    setAppState("upload-empty");
  };

  const handleRemoveAS = () => {
    setAnswerSheet(null);
    setErrorMessage(null);
    setAppState("upload-empty");
  };

  // Sample files quick filler for demo
  const handleUseSampleFiles = () => {
    setErrorMessage(null);
    setQuestionPaper({
      name: "Class_10_maths_unit_test.pdf",
      size: "2MB",
      pages: 2,
    });
    setAnswerSheet({
      name: "student_1_answer_sheet.pdf",
      size: "8MB",
      pages: 6,
    });
    setAppState("upload-filled");
  };

  // End-to-end Ingestion -> Extraction -> Mapping -> Grading Pipeline
  const handleStartMapping = async () => {
    setAppState("processing");
    setErrorMessage(null);
    setSelectedUnmatched(null);

    try {
      if (questionPaper?.rawFile && answerSheet?.rawFile) {
        // 1. Upload Documents
        const formData = new FormData();
        formData.append("question_paper", questionPaper.rawFile);
        formData.append("answer_sheet", answerSheet.rawFile);

        const response = await fetch(`${apiUrl}/api/documents/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ detail: "Upload failed" }));
          throw new Error(errData.detail || `Server error (${response.status})`);
        }

        const data: IngestionJobResponse = await response.json();
        setIngestionJob(data);

        setQuestionPaper((prev) => prev ? { ...prev, pages: data.question_paper.total_pages } : null);
        setAnswerSheet((prev) => prev ? { ...prev, pages: data.answer_sheet.total_pages } : null);

        // 2. Run Question <-> Answer Mapping
        let currentMapData: AssessmentMappingResponse | null = null;
        try {
          const mappingRes = await fetch(`${apiUrl}/api/documents/${data.job_id}/map-qa`, {
            method: "POST",
          });
          if (mappingRes.ok) {
            currentMapData = await mappingRes.json();
            setMappingData(currentMapData);
          }
        } catch (mapErr) {
          console.warn("Question-Answer Mapping error:", mapErr);
        }

        // 3. Run AI Grading & Feedback Engine
        let currentGradeData: AssessmentGradingResponse | null = null;
        try {
          const gradeRes = await fetch(`${apiUrl}/api/documents/${data.job_id}/grade`, {
            method: "POST",
          });
          if (gradeRes.ok) {
            currentGradeData = await gradeRes.json();
            setGradingData(currentGradeData);
          }
        } catch (gradeErr) {
          console.warn("AI Grading error:", gradeErr);
        }

        // 4. Assemble complete QuestionItem tree with mapping + grading data
        if (currentMapData?.mappings && currentMapData.mappings.length > 0) {
          const gradesMap = new Map(currentGradeData?.grades?.map((g) => [g.question_id, g]) || []);
          const parentMap: Map<number, QuestionItem> = new Map();

          for (const m of currentMapData.mappings) {
            const isSub = Boolean(m.sub_label);
            const qNum = m.question_number;
            const gradeItem = gradesMap.get(m.question_id);

            const primaryLoc = m.answer?.locations?.[0];
            const mappedPage = primaryLoc?.page_number || 1;
            const highlightBox = primaryLoc?.bounding_box;

            const obtainedMarks = gradeItem ? gradeItem.obtained_marks : (m.status === "mapped" ? (m.allocated_marks || 2) : 0);
            const verdict = gradeItem?.verdict || (m.status === "mapped" ? "correct" : "unanswered");
            const feedback = gradeItem?.feedback || (m.status === "unanswered" ? "No answer was provided by the student." : undefined);

            if (!parentMap.has(qNum)) {
              parentMap.set(qNum, {
                id: isSub ? `q${qNum}` : m.question_id,
                number: qNum,
                text: m.question_text,
                maxMarks: m.allocated_marks || 2,
                obtainedMarks: obtainedMarks,
                mappedPage: mappedPage,
                highlightBox: highlightBox,
                status: m.status,
                mappingMethod: m.mapping_method,
                extractedAnswer: m.answer,
                verdict: verdict,
                aiFeedback: feedback,
                subQuestions: isSub ? [] : undefined,
              });
            }

            if (isSub) {
              const parent = parentMap.get(qNum)!;
              const subItem: SubQuestion = {
                id: m.question_id,
                subLabel: m.sub_label || "a.",
                text: m.question_text,
                maxMarks: m.allocated_marks || 2,
                obtainedMarks: obtainedMarks,
                mappedPage: mappedPage,
                highlightBox: highlightBox,
                status: m.status,
                mappingMethod: m.mapping_method,
                verdict: verdict,
                aiFeedback: feedback,
              };
              if (!parent.subQuestions) parent.subQuestions = [];
              parent.subQuestions.push(subItem);
            }
          }

          const resultQuestions = Array.from(parentMap.values()).sort((a, b) => a.number - b.number);
          setQuestions(resultQuestions);
          if (resultQuestions.length > 0) {
            setActiveQuestionId(resultQuestions[0].id);
            if (resultQuestions[0].status === "mapped") {
              setCurrentPage(resultQuestions[0].mappedPage);
            }
          }
        }
      }
    } catch (err: unknown) {
      console.warn("Backend pipeline error:", err);
    } finally {
      // Transition to results screen
      setTimeout(() => {
        setAppState("results");
        setSidebarCollapsed(true);
      }, 1500);
    }
  };

  const activeQuestion = questions.find((q) => q.id === activeQuestionId);

  const handleSelectQuestion = (q: QuestionItem) => {
    setActiveQuestionId(q.id);
    setSelectedUnmatched(null);
    if (q.status === "mapped" && q.mappedPage) {
      setCurrentPage(q.mappedPage);
    }
  };

  const handleSelectSubQuestion = (subQ: SubQuestion, parentQ: QuestionItem) => {
    setActiveQuestionId(subQ.id);
    setSelectedUnmatched(null);
    if (subQ.status === "mapped" && subQ.mappedPage) {
      setCurrentPage(subQ.mappedPage);
    }
  };

  const handleSelectUnmatched = (unmatched: UnmatchedAnswerItemBackend) => {
    setSelectedUnmatched(unmatched);
    if (unmatched.locations?.[0]?.page_number) {
      setCurrentPage(unmatched.locations[0].page_number);
    }
  };

  const handleHeaderBack = () => {
    if (appState === "results") {
      setAppState("upload-filled");
      setSidebarCollapsed(false);
      setSelectedUnmatched(null);
    } else if (appState === "upload-filled") {
      setAppState("upload-empty");
      setQuestionPaper(null);
      setAnswerSheet(null);
      setSelectedUnmatched(null);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#f1f3f5] p-3 gap-3 overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-3 h-full overflow-hidden">
        {/* Top Header */}
        <Header
          showBack={appState !== "upload-empty"}
          onBack={handleHeaderBack}
        />

        {/* View States */}
        {appState === "upload-empty" && (
          <UploadView
            questionPaper={questionPaper}
            answerSheet={answerSheet}
            onUploadQP={handleUploadQP}
            onRemoveQP={handleRemoveQP}
            onUploadAS={handleUploadAS}
            onRemoveAS={handleRemoveAS}
            onStartMapping={handleStartMapping}
            onUseSampleFiles={handleUseSampleFiles}
            errorMessage={errorMessage}
          />
        )}

        {appState === "upload-filled" && (
          <UploadView
            questionPaper={questionPaper}
            answerSheet={answerSheet}
            onUploadQP={handleUploadQP}
            onRemoveQP={handleRemoveQP}
            onUploadAS={handleUploadAS}
            onRemoveAS={handleRemoveAS}
            onStartMapping={handleStartMapping}
            errorMessage={errorMessage}
          />
        )}

        {appState === "processing" && <ExtractingLoader />}

        {appState === "results" && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 h-full overflow-hidden">
            {/* Extracted Questions List */}
            <div className="h-full overflow-hidden flex flex-col">
              <QuestionList
                questions={questions}
                activeQuestionId={activeQuestionId}
                onSelectQuestion={handleSelectQuestion}
                onSelectSubQuestion={handleSelectSubQuestion}
                unmatchedAnswers={mappingData?.unmatched_answers || []}
                selectedUnmatchedId={selectedUnmatched?.answer_id}
                onSelectUnmatched={handleSelectUnmatched}
              />
            </div>

            {/* Answer Sheet Viewer */}
            <div className="h-full overflow-hidden flex flex-col">
              <AnswerSheetViewer
                currentPage={currentPage}
                totalPages={ingestionJob?.answer_sheet?.total_pages || 4}
                zoomLevel={zoomLevel}
                onPageChange={setCurrentPage}
                onZoomChange={setZoomLevel}
                activeQuestion={activeQuestion}
                answerSheetDoc={ingestionJob?.answer_sheet}
                apiBaseUrl={apiUrl}
                selectedUnmatchedAnswer={selectedUnmatched}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
