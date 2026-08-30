export interface BoundingBox {
  x: number; // percentage [0, 100]
  y: number; // percentage [0, 100]
  width: number; // percentage [0, 100]
  height: number; // percentage [0, 100]
  confidence?: number;
}

export interface TextBlock {
  id: string;
  text: string;
  box: BoundingBox;
  page_number: number;
}

export interface PageInfo {
  page_number: number;
  width: number;
  height: number;
  image_url?: string;
}

export interface DocumentInfo {
  document_id: string;
  filename: string;
  content_type: string;
  file_size: number;
  total_pages: number;
  pages: PageInfo[];
}

export interface IngestionJobResponse {
  job_id: string;
  status: string;
  question_paper: DocumentInfo;
  answer_sheet: DocumentInfo;
  created_at: string;
}

export interface ExtractedSubQuestionBackend {
  id: string;
  sub_label: string;
  text: string;
  marks?: number;
  page_number: number;
  bounding_box: BoundingBox;
}

export interface ExtractedQuestionBackend {
  id: string;
  number: number;
  text: string;
  marks?: number;
  page_number: number;
  bounding_box: BoundingBox;
  sub_questions?: ExtractedSubQuestionBackend[];
}

export interface QuestionExtractionResponse {
  job_id: string;
  status: string;
  total_questions: number;
  questions: ExtractedQuestionBackend[];
  extracted_at: string;
}

export interface AnswerPageLocation {
  page_number: number;
  bounding_box: BoundingBox;
  is_continuation: boolean;
}

export interface ExtractedAnswerBackend {
  id: string;
  detected_label?: string;
  question_number?: number;
  sub_label?: string;
  transcribed_text: string;
  locations: AnswerPageLocation[];
  confidence: number;
  is_unmatched: boolean;
  is_multi_page: boolean;
}

export interface AnswerExtractionResponse {
  job_id: string;
  status: string;
  total_answers: number;
  answers: ExtractedAnswerBackend[];
  extracted_at: string;
}

export interface MappedQuestionAnswerBackend {
  question_id: string;
  question_number: number;
  sub_label?: string;
  question_text: string;
  allocated_marks?: number;
  question_page_number: number;
  question_bounding_box: BoundingBox;
  status: 'mapped' | 'unanswered';
  mapping_method?: 'label' | 'semantic';
  mapping_confidence: number;
  answer?: ExtractedAnswerBackend;
}

export interface UnmatchedAnswerItemBackend {
  answer_id: string;
  detected_label?: string;
  transcribed_text: string;
  locations: AnswerPageLocation[];
  confidence: number;
  reason: string;
}

export interface AssessmentMappingResponse {
  job_id: string;
  status: string;
  total_questions: number;
  mapped_count: number;
  unanswered_count: number;
  unmatched_answers_count: number;
  mappings: MappedQuestionAnswerBackend[];
  unmatched_answers: UnmatchedAnswerItemBackend[];
  mapped_at: string;
}

export interface QuestionGradeBackend {
  question_id: string;
  question_number: number;
  sub_label?: string;
  max_marks: number;
  obtained_marks: number;
  verdict: 'correct' | 'partial' | 'incorrect' | 'unanswered';
  feedback: string;
  confidence: number;
  answer_text?: string;
}

export interface AssessmentGradingResponse {
  job_id: string;
  status: string;
  total_max_marks: number;
  total_obtained_marks: number;
  percentage: number;
  correct_count: number;
  partial_count: number;
  incorrect_count: number;
  unanswered_count: number;
  overall_summary: string;
  grades: QuestionGradeBackend[];
  graded_at: string;
}

export interface SubQuestion {
  id: string;
  subLabel: string;
  text: string;
  maxMarks: number;
  obtainedMarks?: number;
  mappedPage?: number;
  highlightBox?: BoundingBox;
  status?: 'mapped' | 'unanswered';
  mappingMethod?: string;
  verdict?: 'correct' | 'partial' | 'incorrect' | 'unanswered';
  aiFeedback?: string;
}

export interface QuestionItem {
  id: string;
  number: number;
  text: string;
  maxMarks: number;
  obtainedMarks?: number;
  aiFeedback?: string;
  mappedPage: number;
  highlightBox?: BoundingBox;
  subQuestions?: SubQuestion[];
  extractedAnswer?: ExtractedAnswerBackend;
  status?: 'mapped' | 'unanswered';
  mappingMethod?: string;
  verdict?: 'correct' | 'partial' | 'incorrect' | 'unanswered';
}

export interface UploadedFileMeta {
  name: string;
  size: string;
  pages: number;
  rawFile?: File;
  documentInfo?: DocumentInfo;
}

export type AppFlowState = 'upload-empty' | 'upload-filled' | 'processing' | 'results';
