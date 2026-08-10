export interface OperationsDashboard {
  universities: number;
  students: number;
  transcriptCourses: number;
  transcriptImports: number;
  studentApplications: number;
  verificationRuns: number;
  ruleExtractions: number;
  rules: { draft: number; verified: number; published: number; retired: number };
  universityDataStatuses: UniversityDataStatus[];
  http: {
    startedAt: string;
    totalRequests: number;
    errorRequests: number;
    averageDurationMillis: number;
    maxDurationMillis: number;
    endpoints: Array<{ endpoint: string; requests: number; errors: number; averageDurationMillis: number }>;
  };
}

export type TranscriptImportStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';

export interface UniversityDataStatus {
  universityId: number;
  universityCode: string;
  universityName: string;
  active: boolean;
  admissionYear: number | null;
  studentDataPresent: boolean;
  studentCount: number;
  transcriptCourseCount: number;
  applicationCount: number;
  latestImportStatus: TranscriptImportStatus | null;
  latestImportFileName: string | null;
  latestImportAt: string | null;
  verificationDataPresent: boolean;
  verificationResultCount: number;
  latestVerificationAt: string | null;
}
