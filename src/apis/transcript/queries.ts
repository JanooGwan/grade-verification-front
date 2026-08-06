import { queryOptions } from '@tanstack/react-query';
import { getStudents, getStudentTranscript, getTranscriptImports, type StudentSearchParams } from '@/apis/transcript';

export const transcriptQueryKeys = {
  all: ['transcripts'] as const,
  students: (params: StudentSearchParams) => [...transcriptQueryKeys.all, 'students', params] as const,
  detail: (universityId: number, admissionYear: number, applicantNumber: string) =>
    [...transcriptQueryKeys.all, 'student', universityId, admissionYear, applicantNumber] as const,
  imports: (universityId: number) => [...transcriptQueryKeys.all, 'imports', universityId] as const,
};

export const transcriptQueries = {
  students: (params: StudentSearchParams) => queryOptions({
    queryKey: transcriptQueryKeys.students(params),
    queryFn: () => getStudents(params),
  }),
  detail: (universityId: number, admissionYear: number, applicantNumber: string) => queryOptions({
    queryKey: transcriptQueryKeys.detail(universityId, admissionYear, applicantNumber),
    queryFn: () => getStudentTranscript(universityId, admissionYear, applicantNumber),
    enabled: Boolean(universityId && applicantNumber),
  }),
  imports: (universityId: number) => queryOptions({
    queryKey: transcriptQueryKeys.imports(universityId),
    queryFn: () => getTranscriptImports(universityId),
    enabled: universityId > 0,
  }),
};
