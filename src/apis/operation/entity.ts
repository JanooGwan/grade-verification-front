export interface OperationsDashboard {
  universities: number;
  students: number;
  transcriptCourses: number;
  transcriptImports: number;
  studentApplications: number;
  verificationRuns: number;
  ruleExtractions: number;
  rules: { draft: number; verified: number; published: number; retired: number };
  http: {
    startedAt: string;
    totalRequests: number;
    errorRequests: number;
    averageDurationMillis: number;
    maxDurationMillis: number;
    endpoints: Array<{ endpoint: string; requests: number; errors: number; averageDurationMillis: number }>;
  };
}
