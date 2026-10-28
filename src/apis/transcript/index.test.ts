import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/apis/client', () => ({ apiClient: { postForm: vi.fn(), post: vi.fn(), get: vi.fn() } }));

import { apiClient } from '@/apis/client';
import { importMjcSourceExcel, importMjcSourceZip, runStoredTranscriptVerification } from './index';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

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
});

describe('명지전문대 원자료 업로드', () => {
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
