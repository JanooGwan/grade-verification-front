import { queryOptions } from '@tanstack/react-query';
import { getAdmissionTracks, getApplicationRuleMatch, getStudentApplications, getVerificationHistory } from '@/apis/admission';

export const admissionQueryKeys = {
  all: ['admission'] as const,
  tracks: (universityId: number, admissionYear: number) =>
    [...admissionQueryKeys.all, 'tracks', universityId, admissionYear] as const,
  applications: (studentId: number) => [...admissionQueryKeys.all, 'applications', studentId] as const,
  ruleMatch: (studentId: number, applicationId: number) =>
    [...admissionQueryKeys.all, 'rule-match', studentId, applicationId] as const,
  verifications: (studentId: number) => [...admissionQueryKeys.all, 'verifications', studentId] as const,
};

export const admissionQueries = {
  tracks: (universityId: number, admissionYear: number) => queryOptions({
    queryKey: admissionQueryKeys.tracks(universityId, admissionYear),
    queryFn: () => getAdmissionTracks(universityId, admissionYear),
  }),
  applications: (studentId: number) => queryOptions({
    queryKey: admissionQueryKeys.applications(studentId),
    queryFn: () => getStudentApplications(studentId),
  }),
  ruleMatch: (studentId: number, applicationId: number) => queryOptions({
    queryKey: admissionQueryKeys.ruleMatch(studentId, applicationId),
    queryFn: () => getApplicationRuleMatch(studentId, applicationId),
  }),
  verifications: (studentId: number) => queryOptions({
    queryKey: admissionQueryKeys.verifications(studentId),
    queryFn: () => getVerificationHistory(studentId),
  }),
};
