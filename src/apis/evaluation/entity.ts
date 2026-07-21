export type SubjectCategory = 'KOREAN' | 'MATH' | 'ENGLISH' | 'SOCIAL' | 'SCIENCE' | 'OTHER';
export type SelectionStrategy = 'ALL_COURSES' | 'TOP_N_COURSES' | 'TOP_N_COURSES_PER_SUBJECT' | 'CORE_SCIENCE_TOP_N' | 'CORE_PLUS_BEST_CREDIT_OPTIONAL_TOP_N' | 'TOP_N_SEMESTERS' | 'TOP_N_SUBJECTS' | 'BEST_SEMESTER_PER_GRADE';
export type ScoreAggregation = 'COURSE_SCORE_AVERAGE' | 'AVERAGE_GRADE_THEN_SCORE';
export type AchievementConversion = 'DIRECT_TABLE' | 'Z_SCORE' | 'EXCLUDE';
export type AchievementLevel = 'A' | 'B' | 'C' | 'D' | 'E';
export type RoundingMode = 'HALF_UP' | 'DOWN' | 'UP' | 'FLOOR' | 'CEILING';
export type EvaluationRuleStatus = 'DRAFT' | 'VERIFIED' | 'PUBLISHED' | 'RETIRED';
export type RuleExtractionStatus = 'EXTRACTED' | 'DRAFT_CREATED';

export interface EvaluationRule {
  id: number;
  universityId: number;
  universityName: string;
  name: string;
  admissionYear: number;
  admissionType: string;
  recruitmentUnit: string;
  version: number;
  gradeWeights: number[];
  subjectWeights: number[];
  gradeScores: number[];
  selectionStrategy: SelectionStrategy;
  selectionCount: number;
  achievementSelectionCount: number;
  minimumCourseCount: number;
  scoreAggregation: ScoreAggregation;
  achievementConversion: AchievementConversion;
  includeThirdYearSecondSemester: boolean;
  includeThirdYearSecondSemesterForGraduates: boolean;
  includeProfessionalCourses: boolean;
  applyGradeWeights: boolean;
  normalizeGradeWeights: boolean;
  intermediateScale: number;
  intermediateRounding: RoundingMode;
  finalScale: number;
  finalRounding: RoundingMode;
  scoreMultiplier: number;
  achievementGrades: number[];
  achievementScores: number[];
  subjectPriorities: number[];
  sourceDocument: string | null;
  sourcePages: string | null;
  interpretationNote: string | null;
  changeSummary: string | null;
  extractionId: number | null;
  active: boolean;
  status: EvaluationRuleStatus;
  reviewer: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  publishedBy: string | null;
  publicationNote: string | null;
  publishedAt: string | null;
  retiredBy: string | null;
  retireNote: string | null;
  retiredAt: string | null;
}

export type CreateEvaluationRuleRequest = Omit<EvaluationRule,
  'id' | 'universityName' | 'active' | 'status' | 'reviewer' | 'reviewNote' | 'reviewedAt'
  | 'publishedBy' | 'publicationNote' | 'publishedAt' | 'retiredBy' | 'retireNote' | 'retiredAt' | 'extractionId'>;

export interface RuleExtraction {
  extractionId: number;
  universityId: number;
  universityName: string;
  admissionYear: number;
  originalFileName: string;
  fileSha256: string;
  pageCount: number;
  textPageCount: number;
  status: RuleExtractionStatus;
  draftRuleId: number | null;
  overallConfidence: number;
  candidate: {
    selectionStrategy: SelectionStrategy | null;
    selectionCount: number | null;
    gradeWeights: number[];
    applyGradeWeights: boolean | null;
    gradeScores: number[];
    achievementScores: number[];
    subjectCategories: SubjectCategory[];
    includeThirdYearSecondSemester: boolean | null;
    roundingMode: RoundingMode | null;
    sourcePages: string | null;
  };
  missingFields: string[];
  warnings: string[];
  evidence: Array<{
    fieldKey: string;
    pageNumber: number;
    excerpt: string;
    confidence: number;
  }>;
  createdAt: string;
}

export interface RuleExtractionSummary {
  extractionId: number;
  universityId: number;
  universityName: string;
  admissionYear: number;
  originalFileName: string;
  fileSha256: string;
  pageCount: number;
  textPageCount: number;
  status: RuleExtractionStatus;
  draftRuleId: number | null;
  overallConfidence: number;
  missingFieldCount: number;
  warningCount: number;
  createdAt: string;
}

export interface RuleExtractionComparison {
  left: RuleExtraction;
  right: RuleExtraction;
  differences: Array<{ field: string; leftValue: string; rightValue: string }>;
}

export interface EvaluationRuleActionRequest {
  actor: string;
  note: string;
}

export interface CourseGrade {
  schoolYear: number;
  semester: number;
  subjectCategory: SubjectCategory;
  courseName: string;
  grade: number | null;
  achievement: AchievementLevel | null;
  rawScore: number | null;
  meanScore: number | null;
  standardDeviation: number | null;
  studentCount: number | null;
  careerSubject: boolean;
  professionalCourse: boolean;
  credits: number;
}

export interface GradeVerification {
  ruleId: number;
  ruleName: string;
  ruleVersion: number;
  universityName: string;
  admissionType: string;
  recruitmentUnit: string;
  finalScore: number;
  baseScore: number;
  averageGrade: number;
  selectionStrategy: SelectionStrategy;
  scoreAggregation: ScoreAggregation;
  sourceDocument: string | null;
  sourcePages: string | null;
  includedCourseCount: number;
  excludedCourseCount: number;
  calculationSummary: CalculationSummary | null;
  calculations: Array<CourseGrade & {
    appliedSubjectCategory: SubjectCategory | null;
    convertedScore: number | null;
    effectiveGrade: number | null;
    gradeWeight: number;
    subjectWeight: number;
    appliedWeight: number;
    weightedScore: number;
    included: boolean;
    exclusionReason: string | null;
  }>;
  warnings: string[];
}

export interface CalculationSummary {
  formula: string;
  gradeTimesCreditsSum: number;
  convertedScoreTimesCreditsSum: number;
  gradeTimesWeightSum: number;
  convertedScoreTimesWeightSum: number;
  totalAppliedWeight: number;
  totalIncludedCredits: number;
  averageGrade: number;
  baseScore: number;
  scoreMultiplier: number;
  scoreBeforeFinalRounding: number;
  intermediateScale: number;
  intermediateRounding: RoundingMode;
  finalScale: number;
  finalRounding: RoundingMode;
  yearWeightDenominators: Record<string, number>;
}
