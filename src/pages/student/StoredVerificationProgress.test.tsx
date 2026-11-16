import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { StoredVerificationJob } from '@/apis/transcript/entity';
import StoredVerificationProgress from './StoredVerificationProgress';

describe('성적검증 진행 표시', () => {
  it('진행 수치를 모르는 동안 퍼센트를 만들지 않는다', () => {
    const html = renderToStaticMarkup(<StoredVerificationProgress job={null} />);
    expect(html).toContain('검증 대기 중');
    expect(html).not.toContain('value=');
  });

  it('전체 대상과 저장 처리 건수를 구분하고 확정 단계도 표시한다', () => {
    const job: StoredVerificationJob = { jobId: 'synthetic', universityId: 1, admissionYear: 2027,
      status: 'PROCESSING', message: null, startedAt: '', completedAt: null, result: null,
      progress: { stage: 'COMMITTING', totalApplications: 1000, savedResults: 999, failedResults: 1 } };
    const html = renderToStaticMarkup(<StoredVerificationProgress job={job} />);
    expect(html).toContain('저장 결과 확정 중');
    expect(html).toContain('1,000');
    expect(html).toContain('999');
    expect(html).toContain('미산출 1건');
    expect(html).toContain('value="1000"');
    expect(html).toContain('role="status"');
    expect(html).not.toContain('검증 완료');
  });

  it('진행 수치가 없는 구버전 서버도 처리 중으로 표시한다', () => {
    const job: StoredVerificationJob = { jobId: 'synthetic', universityId: 1, admissionYear: 2027,
      status: 'PROCESSING', message: null, startedAt: '', completedAt: null, result: null };
    const html = renderToStaticMarkup(<StoredVerificationProgress job={job} />);
    expect(html).toContain('성적 검증 처리 중');
    expect(html).not.toContain('검증 대기 중');
    expect(html).not.toContain('value=');
  });
});
