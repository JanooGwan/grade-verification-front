import { apiClient } from '@/apis/client';
import type { AdmissionTrack, ApplicationScore, ApplicationVerification, CalculateApplicationScoreRequest, RuleMatch, StudentApplication, VerificationHistory, VerificationHistoryDetail } from './entity';

export const getAdmissionTracks = (universityId: number, admissionYear: number) =>
  apiClient.get<AdmissionTrack[]>(
    `/api/admissions/tracks?universityId=${universityId}&admissionYear=${admissionYear}`,
  );

export const getStudentApplications = (studentId: number) =>
  apiClient.get<StudentApplication[]>(`/api/admissions/students/${studentId}/applications`);

export const createStudentApplication = (studentId: number, recruitmentUnitId: number) =>
  apiClient.post<StudentApplication>(`/api/admissions/students/${studentId}/applications`, {
    recruitmentUnitId,
  });

export const deleteStudentApplication = (studentId: number, applicationId: number) =>
  apiClient.delete(`/api/admissions/students/${studentId}/applications/${applicationId}`);

export const getApplicationRuleMatch = (studentId: number, applicationId: number) =>
  apiClient.get<RuleMatch>(
    `/api/admissions/students/${studentId}/applications/${applicationId}/rule-match`,
  );

export const verifyStudentApplication = (studentId: number, applicationId: number) =>
  apiClient.post<ApplicationVerification>(
    `/api/admissions/students/${studentId}/applications/${applicationId}/verify`,
    {},
  );

export const calculateStudentApplicationScore = (
  studentId: number,
  applicationId: number,
  request: CalculateApplicationScoreRequest,
) => apiClient.post<ApplicationScore>(
  `/api/admissions/students/${studentId}/applications/${applicationId}/score`,
  request,
);

export const getVerificationHistory = (studentId: number) =>
  apiClient.get<VerificationHistory[]>(`/api/admissions/students/${studentId}/verifications`);

export const getVerificationHistoryDetail = (studentId: number, runId: number) =>
  apiClient.get<VerificationHistoryDetail>(`/api/admissions/students/${studentId}/verifications/${runId}`);

export const getVerificationResultExcel = (studentId: number, runId: number) =>
  apiClient.getBlob(`/api/admissions/students/${studentId}/verifications/${runId}/excel`);
