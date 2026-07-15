import { apiClient } from '@/apis/client';
import type { StudentPage, StudentTranscript, TranscriptImportHistory, TranscriptImportMode, TranscriptImportResult, TranscriptPreview, TranscriptCourse, UpdateStudentRequest, UpsertTranscriptCourseRequest } from './entity';

export interface StudentSearchParams {
  admissionYear: number;
  keyword: string;
  page: number;
  size: number;
}

export const getStudents = ({ admissionYear, keyword, page, size }: StudentSearchParams) => {
  const params = new URLSearchParams({
    admissionYear: String(admissionYear),
    page: String(page),
    size: String(size),
  });
  if (keyword.trim()) params.set('keyword', keyword.trim());
  return apiClient.get<StudentPage>(`/api/transcripts/students?${params.toString()}`);
};

export const getStudentTranscript = (admissionYear: number, applicantNumber: string) =>
  apiClient.get<StudentTranscript>(
    `/api/transcripts/students/${encodeURIComponent(applicantNumber)}?admissionYear=${admissionYear}`,
  );

export const previewTranscriptExcel = (admissionYear: number, file: File) => {
  const form = new FormData();
  form.append('admissionYear', String(admissionYear));
  form.append('file', file);
  return apiClient.postForm<TranscriptPreview>('/api/transcripts/imports/excel/preview', form);
};

export const importTranscriptExcel = (admissionYear: number, mode: TranscriptImportMode, file: File) => {
  const form = new FormData();
  form.append('admissionYear', String(admissionYear));
  form.append('mode', mode);
  form.append('file', file);
  return apiClient.postForm<TranscriptImportResult>('/api/transcripts/imports/excel', form);
};

export const getTranscriptImports = () => apiClient.get<TranscriptImportHistory[]>('/api/transcripts/imports');
export const updateStudent = (studentId: number, request: UpdateStudentRequest) => apiClient.put<StudentTranscript>(`/api/transcripts/students/${studentId}`, request);
export const deleteStudent = (studentId: number) => apiClient.delete(`/api/transcripts/students/${studentId}`);
export const createTranscriptCourse = (studentId: number, request: UpsertTranscriptCourseRequest) => apiClient.post<TranscriptCourse>(`/api/transcripts/students/${studentId}/courses`, request);
export const updateTranscriptCourse = (studentId: number, courseId: number, request: UpsertTranscriptCourseRequest) => apiClient.put<TranscriptCourse>(`/api/transcripts/students/${studentId}/courses/${courseId}`, request);
export const deleteTranscriptCourse = (studentId: number, courseId: number) => apiClient.delete(`/api/transcripts/students/${studentId}/courses/${courseId}`);
