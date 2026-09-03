import { apiClient } from '@/apis/client';
import type { SavedVerificationBatch, SavedVerificationDetail, SavedVerificationExportJob, SavedVerificationPage, SourceImportStartResult, StoredVerificationPersistenceResult, StudentPage, StudentTranscript, TranscriptImportHistory, TranscriptImportMode, TranscriptImportResult, TranscriptPreview, TranscriptCourse, UpdateStudentCommonDataRequest, UpdateStudentRequest, UpsertTranscriptCourseRequest } from './entity';

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

export const verifyStoredTranscript = (universityId: number, admissionYear: number) =>
  apiClient.get<TranscriptPreview>(
    `/api/transcripts/verifications?universityId=${universityId}&admissionYear=${admissionYear}`,
  );

export const persistStoredTranscriptVerification = (universityId: number, admissionYear: number) =>
  apiClient.post<StoredVerificationPersistenceResult>(
    `/api/transcripts/verifications/persist?universityId=${universityId}&admissionYear=${admissionYear}`,
    {},
  );

export const getSavedVerificationBatches = (universityId: number, admissionYear: number) =>
  apiClient.get<SavedVerificationBatch[]>(
    `/api/transcripts/saved-verifications/batches?universityId=${universityId}&admissionYear=${admissionYear}`,
  );

export const getSavedVerificationResults = (
  sourceImportId: number,
  keyword: string,
  page: number,
  size = 50,
) => {
  const params = new URLSearchParams({
    sourceImportId: String(sourceImportId),
    page: String(page),
    size: String(size),
  });
  if (keyword.trim()) params.set('keyword', keyword.trim());
  return apiClient.get<SavedVerificationPage>(`/api/transcripts/saved-verifications?${params.toString()}`);
};

export const getSavedVerificationDetail = (verificationRunId: number) =>
  apiClient.get<SavedVerificationDetail>(`/api/transcripts/saved-verifications/${verificationRunId}`);

const startSavedVerificationExport = (sourceImportId: number) =>
  apiClient.post<SavedVerificationExportJob>(
    `/api/transcripts/saved-verifications/batches/${sourceImportId}/exports`,
    {},
  );

const getSavedVerificationExport = (exportId: string) =>
  apiClient.get<SavedVerificationExportJob>(`/api/transcripts/saved-verifications/exports/${exportId}`);

export const prepareSavedVerificationExport = async (sourceImportId: number) => {
  let job = await startSavedVerificationExport(sourceImportId);
  const deadline = Date.now() + 20 * 60 * 1000;
  while (job.status === 'PROCESSING' && Date.now() < deadline) {
    await new Promise((resolve) => window.setTimeout(resolve, 2000));
    job = await getSavedVerificationExport(job.exportId);
  }
  if (job.status === 'FAILED') {
    throw new Error(job.message ?? 'Excel 파일을 생성하지 못했습니다.');
  }
  if (job.status !== 'READY') {
    throw new Error('Excel 파일 생성 시간이 초과되었습니다.');
  }
  return job;
};

export const downloadPreparedSavedVerificationExport = (exportId: string, fileName: string) =>
  apiClient.download(`/api/transcripts/saved-verifications/exports/${exportId}/file`, fileName);

export const importTranscriptExcel = (
  admissionYear: number,
  universityId: number,
  mode: TranscriptImportMode,
  file: File,
  schoolInfoFile?: File | null,
  vocationalTrainingFile?: File | null,
) => {
  const form = new FormData();
  form.append('admissionYear', String(admissionYear));
  form.append('mode', mode);
  form.append('universityId', String(universityId));
  form.append('file', file);
  if (schoolInfoFile) form.append('schoolInfoFile', schoolInfoFile);
  if (vocationalTrainingFile) form.append('vocationalTrainingFile', vocationalTrainingFile);
  return apiClient.postForm<TranscriptImportResult>('/api/transcripts/imports/excel', form);
};

export const getTranscriptImports = (universityId: number) =>
  apiClient.get<TranscriptImportHistory[]>(`/api/transcripts/imports?universityId=${universityId}`);

export const downloadTranscriptImportResultExcel = (importId: number, fileName: string) =>
  apiClient.download(`/api/transcripts/imports/${importId}/result`, fileName);

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
