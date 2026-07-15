import { queryOptions } from '@tanstack/react-query';
import { getStudents, getStudentTranscript, getTranscriptImports, type StudentSearchParams } from '@/apis/transcript';

export const transcriptQueryKeys = {
  all: ['transcripts'] as const,
  students: (params: StudentSearchParams) => [...transcriptQueryKeys.all, 'students', params] as const,
  detail: (admissionYear: number, applicantNumber: string) =>
    [...transcriptQueryKeys.all, 'student', admissionYear, applicantNumber] as const,
  imports: () => [...transcriptQueryKeys.all, 'imports'] as const,
};

export const transcriptQueries = {
  students: (params: StudentSearchParams) => queryOptions({
    queryKey: transcriptQueryKeys.students(params),
    queryFn: () => getStudents(params),
  }),
  detail: (admissionYear: number, applicantNumber: string) => queryOptions({
    queryKey: transcriptQueryKeys.detail(admissionYear, applicantNumber),
    queryFn: () => getStudentTranscript(admissionYear, applicantNumber),
    enabled: Boolean(applicantNumber),
  }),
  imports: () => queryOptions({ queryKey: transcriptQueryKeys.imports(), queryFn: getTranscriptImports }),
};
