import type { GradeVerification } from '@/apis/evaluation/entity';

export interface RecruitmentUnit {
  id: number;
  admissionTrackId: number;
  code: string | null;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdmissionTrack {
  id: number;
  universityId: number;
  universityName: string;
  admissionYear: number;
  name: string;
  active: boolean;
  recruitmentUnits: RecruitmentUnit[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentApplication {
  id: number;
  studentId: number;
  universityId: number;
  universityName: string;
  admissionTrackId: number;
  admissionTrackName: string;
  admissionYear: number;
  recruitmentUnitId: number;
  recruitmentUnitCode: string | null;
  recruitmentUnitName: string;
  createdAt: string;
}

export type RuleMatchStatus = 'MATCHED' | 'NOT_FOUND' | 'CONFLICT';

export interface RuleMatch {
  status: RuleMatchStatus;
  message: string;
  matchedRuleId: number | null;
  candidates: Array<{
    ruleId: number;
    name: string;
    version: number;
    admissionType: string;
    recruitmentUnit: string;
    sourceDocument: string | null;
    sourcePages: string | null;
  }>;
}

export interface ApplicationVerification {
  verificationRunId: number;
  createdAt: string;
  application: StudentApplication;
  verification: GradeVerification;
}

export type EducationBackground = 'DOMESTIC_HIGH_SCHOOL' | 'GED' | 'FOREIGN_HIGH_SCHOOL';
export type ApplicationScoreStatus = 'COMPLETE' | 'QUALITATIVE_PENDING' | 'INELIGIBLE';

export interface CalculateApplicationScoreRequest {
  educationBackground: EducationBackground;
  gedAverageScore: number | null;
  unexcusedAbsenceDays: number | null;
  unexcusedTardyCount: number | null;
  unexcusedEarlyLeaveCount: number | null;
  unexcusedClassAbsenceCount: number | null;
  schoolViolenceAction: number;
  essayScore: number | null;
  practicalScore: number | null;
}

export interface ApplicationScore {
  scoreRunId: number;
  createdAt: string;
  applicationId: number;
  ruleId: number;
  ruleVersion: number;
  universityName: string;
  admissionYear: number;
  admissionTrackName: string;
  recruitmentUnitName: string;
  educationBackground: EducationBackground;
  status: ApplicationScoreStatus;
  academicBaseScore: number;
  academicScore: number;
  equivalentAbsenceDays: number | null;
  attendanceScore: number | null;
  additionalScore: number | null;
  schoolViolenceDeduction: number;
  quantitativeSubtotal: number;
  scoreAfterDeduction: number;
  finalScore: number | null;
  maximumQuantitativeScore: number;
  maximumTotalScore: number;
  pendingComponents: string[];
  ineligibilityReasons: string[];
  warnings: string[];
  gradeVerification: GradeVerification | null;
}

export interface VerificationHistory {
  verificationRunId: number;
  applicationId: number | null;
  ruleId: number;
  ruleName: string;
  ruleVersion: number;
  universityName: string;
  admissionType: string;
  recruitmentUnit: string;
  finalScore: number;
  averageGrade: number;
  includedCourseCount: number;
  excludedCourseCount: number;
  createdAt: string;
}

export interface VerificationHistoryDetail {
  verificationRunId: number;
  studentId: number;
  applicationId: number | null;
  createdAt: string;
  verification: GradeVerification;
}
