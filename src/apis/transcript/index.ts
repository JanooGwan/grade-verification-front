import { apiClient } from '@/apis/client';
import type { SourceImportStartResult, StudentPage, StudentTranscript, TranscriptImportHistory, TranscriptImportMode, TranscriptImportResult, TranscriptPreview, TranscriptCourse, UpdateStudentCommonDataRequest, UpdateStudentRequest, UpsertTranscriptCourseRequest } from './entity';

export interface StudentSearchParams {
  universityId: number;
  admissionYear: number;
  keyword: string;
  page: number;
  size: number;
}

export const getStudents = ({ universityId, admissionYear, keyword, page, size }: StudentSearchParams) => {
  const params = new URLSearchParams({
    universityId: String(universityId),
    admissionYear: String(admissionYear),
    page: String(page),
    size: String(size),
  });
  if (keyword.trim()) params.set('keyword', keyword.trim());
  return apiClient.get<StudentPage>(`/api/transcripts/students?${params.toString()}`);
};

export const getStudentTranscript = (universityId: number, admissionYear: number, applicantNumber: string) =>
  apiClient.get<StudentTranscript>(
    `/api/transcripts/students/${encodeURIComponent(applicantNumber)}?universityId=${universityId}&admissionYear=${admissionYear}`,
  );

export const previewTranscriptExcel = (
  admissionYear: number,
  universityId: number,
  file: File,
  schoolInfoFile?: File | null,
) => {
  const form = new FormData();
  form.append('admissionYear', String(admissionYear));
  form.append('universityId', String(universityId));
  form.append('file', file);
  if (schoolInfoFile) form.append('schoolInfoFile', schoolInfoFile);
  return apiClient.postForm<TranscriptPreview>('/api/transcripts/imports/excel/preview', form);
};

export const exportTranscriptValidationExcel = (
  admissionYear: number,
  universityId: number,
  file: File,
  schoolInfoFile?: File | null,
) => {
  const form = new FormData();
  form.append('admissionYear', String(admissionYear));
  form.append('universityId', String(universityId));
  form.append('file', file);
  if (schoolInfoFile) form.append('schoolInfoFile', schoolInfoFile);
  return apiClient.postFormBlob('/api/transcripts/imports/excel/preview/export', form);
};

export const importTranscriptExcel = (
  admissionYear: number,
  universityId: number,
  mode: TranscriptImportMode,
  file: File,
  schoolInfoFile?: File | null,
) => {
  const form = new FormData();
  form.append('admissionYear', String(admissionYear));
  form.append('mode', mode);
  form.append('universityId', String(universityId));
  form.append('file', file);
  if (schoolInfoFile) form.append('schoolInfoFile', schoolInfoFile);
  return apiClient.postForm<TranscriptImportResult>('/api/transcripts/imports/excel', form);
};

export const getTranscriptImports = (universityId: number) =>
  apiClient.get<TranscriptImportHistory[]>(`/api/transcripts/imports?universityId=${universityId}`);

export const getTranscriptImportResultExcel = (importId: number) =>
  apiClient.getBlob(`/api/transcripts/imports/${importId}/result`);

export const importSyuSourceExcel = (admissionYear: number, universityId: number, file: File) => {
  const form = new FormData();
  form.append('admissionYear', String(admissionYear));
  form.append('universityId', String(universityId));
  form.append('file', file);
  return apiClient.postForm<SourceImportStartResult>('/api/transcripts/imports/source/syu', form);
};
export const updateStudent = (studentId: number, request: UpdateStudentRequest) => apiClient.put<StudentTranscript>(`/api/transcripts/students/${studentId}`, request);
export const updateStudentCommonData = (studentId: number, request: UpdateStudentCommonDataRequest) => apiClient.put<StudentTranscript>(`/api/transcripts/students/${studentId}/common-data`, request);
export const deleteStudent = (studentId: number) => apiClient.delete(`/api/transcripts/students/${studentId}`);
export const createTranscriptCourse = (studentId: number, request: UpsertTranscriptCourseRequest) => apiClient.post<TranscriptCourse>(`/api/transcripts/students/${studentId}/courses`, request);
export const updateTranscriptCourse = (studentId: number, courseId: number, request: UpsertTranscriptCourseRequest) => apiClient.put<TranscriptCourse>(`/api/transcripts/students/${studentId}/courses/${courseId}`, request);
export const deleteTranscriptCourse = (studentId: number, courseId: number) => apiClient.delete(`/api/transcripts/students/${studentId}/courses/${courseId}`);
