import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/apis/client', () => ({
  ApiError: class ApiError extends Error {
    constructor(readonly status: number, message: string) { super(message); }
  },
  apiClient: { postForm: vi.fn(), post: vi.fn(), get: vi.fn() },
}));

import { ApiError, apiClient } from '@/apis/client';
import { getSavedVerificationResults, importMjcSingleCsv, importMjcSourceExcel, importMjcSourceZip, prepareSavedVerificationExport, runStoredTranscriptVerification } from './index';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

it('requests the review filter only when explicitly selected', () => {
  getSavedVerificationResults(41, '', 0);
  expect(vi.mocked(apiClient.get).mock.calls.at(-1)![0]).not.toContain('reviewOnly');
  getSavedVerificationResults(41, '합성', 1, 50, true);
  const url=vi.mocked(apiClient.get).mock.calls.at(-1)![0];
  expect(url).toContain('reviewOnly=true');
  expect(url).toContain('page=1');
});

describe('성적검증 진행 상태', () => {
  it('저장 처리 중 상태를 전달하고 완료 후에만 결과를 조회한다', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', { setTimeout });
    const job = { jobId: 'synthetic-job', universityId: 1, admissionYear: 2027, status: 'PROCESSING',
      message: null, startedAt: '2026-10-28T00:00:00Z', completedAt: null, result: null };
    const saving = { ...job, progress: { stage: 'VERIFYING_AND_SAVING', totalApplications: 1000, savedResults: 200, failedResults: 0 } };
    const completed = { ...job, status: 'COMPLETED', result: { sourceImportId: 41, totalApplications: 1000,
      savedResults: 999, failedResults: 1, replacedResults: 0, savedAt: '2026-10-28T00:00:10' } };
    vi.mocked(apiClient.post).mockResolvedValue(job);
    vi.mocked(apiClient.get).mockResolvedValueOnce(saving).mockResolvedValueOnce(completed).mockResolvedValueOnce({ items: [] });
    const onProgress = vi.fn();
    const running = runStoredTranscriptVerification(1, 2027, onProgress);
    await vi.advanceTimersByTimeAsync(3000);
    expect(onProgress).toHaveBeenLastCalledWith(saving);
    expect(apiClient.get).not.toHaveBeenCalledWith(expect.stringContaining('saved-verifications?'));
    await vi.advanceTimersByTimeAsync(3000);
    expect((await running).job).toEqual(completed);
    expect(onProgress).toHaveBeenLastCalledWith(completed);
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.get).toHaveBeenLastCalledWith(expect.stringContaining('sourceImportId=41'));
  });

  it('작업 상태가 사라지면 저장 결과 확인을 안내하고 자동 재실행하지 않는다', async () => {
    vi.useFakeTimers(); vi.stubGlobal('window', { setTimeout });
    vi.mocked(apiClient.post).mockResolvedValue({ jobId: 'lost', status: 'PROCESSING' });
    vi.mocked(apiClient.get).mockRejectedValue(new ApiError(404, '찾을 수 없습니다'));
    const running=runStoredTranscriptVerification(1,2027);
    const rejected=expect(running).rejects.toThrow('저장된 결과를 확인');
    await vi.advanceTimersByTimeAsync(3000); await rejected;
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  it('인증 오류는 연결 실패로 바꾸지 않고 즉시 전달한다', async () => {
    vi.useFakeTimers(); vi.stubGlobal('window', { setTimeout });
    vi.mocked(apiClient.post).mockResolvedValue({ jobId: 'auth', status: 'PROCESSING' });
    const failure=new ApiError(401,'인증이 필요합니다'); vi.mocked(apiClient.get).mockRejectedValue(failure);
    const running=runStoredTranscriptVerification(1,2027);
    const rejected=expect(running).rejects.toBe(failure);
    await vi.advanceTimersByTimeAsync(3000); await rejected;
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  it('일시적인 연결 실패 후 완료 상태를 다시 확인한다', async () => {
    vi.useFakeTimers(); vi.stubGlobal('window', { setTimeout });
    vi.mocked(apiClient.post).mockResolvedValue({jobId:'retry',status:'PROCESSING'});
    vi.mocked(apiClient.get).mockRejectedValueOnce(new TypeError('network')).mockResolvedValueOnce({jobId:'retry',status:'COMPLETED',result:{sourceImportId:41}}).mockResolvedValueOnce({items:[]});
    const running=runStoredTranscriptVerification(1,2027);
    await vi.advanceTimersByTimeAsync(6000);
    expect((await running).job.status).toBe('COMPLETED');
    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });

  it('Excel 생성 작업이 사라지면 다시 다운로드하도록 안내한다', async () => {
    vi.useFakeTimers(); vi.stubGlobal('window', { setTimeout });
    vi.mocked(apiClient.post).mockResolvedValue({exportId:'lost-export',status:'PROCESSING'});
    vi.mocked(apiClient.get).mockRejectedValue(new ApiError(404,'찾을 수 없습니다'));
    const running=prepareSavedVerificationExport(41);
    const rejected=expect(running).rejects.toThrow('다시 다운로드');
    await vi.advanceTimersByTimeAsync(2000); await rejected;
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });
});

describe('명지전문대 원자료 업로드', () => {
  it('단일 CSV와 대학·학년도를 CSV 전용 API에 전달한다', () => {
    const file = new File(['synthetic csv'], 'synthetic.csv', { type: 'text/csv' });
    importMjcSingleCsv(2027, 1, file);
    const [endpoint, form] = vi.mocked(apiClient.postForm).mock.calls.at(-1)!;
    expect(endpoint).toBe('/api/transcripts/imports/source/mjc/single-csv');
    expect(form.get('admissionYear')).toBe('2027');
    expect(form.get('universityId')).toBe('1');
    expect(form.get('file')).toBe(file);
  });
  it('ZIP 파일과 대학·학년도를 ZIP 전용 API에 전달한다', () => {
    const file = new File(['synthetic archive'], 'synthetic.zip', { type: 'application/zip' });
    importMjcSourceZip(2027, 1, file);
    const [endpoint, form] = vi.mocked(apiClient.postForm).mock.calls.at(-1)!;
    expect(endpoint).toBe('/api/transcripts/imports/source/mjc/zip');
    expect(form.get('admissionYear')).toBe('2027');
    expect(form.get('universityId')).toBe('1');
    expect(form.get('file')).toBe(file);
  });

  it('기존 통합 Excel은 기존 API로 보낸다', () => {
    const file = new File(['synthetic workbook'], 'synthetic.xlsx');
    importMjcSourceExcel(2026, 1, file);
    const [endpoint, form] = vi.mocked(apiClient.postForm).mock.calls.at(-1)!;
    expect(endpoint).toBe('/api/transcripts/imports/source/mjc/excel');
    expect(form.get('file')).toBe(file);
  });
});
