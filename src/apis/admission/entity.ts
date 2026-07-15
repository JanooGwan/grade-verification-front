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
