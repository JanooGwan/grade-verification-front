import { describe, expect, it, vi } from 'vitest';

vi.mock('@/apis/client', () => ({ apiClient: { postForm: vi.fn() } }));

import { apiClient } from '@/apis/client';
import { importMjcSourceExcel, importMjcSourceZip } from './index';

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
