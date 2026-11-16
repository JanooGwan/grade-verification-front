import { describe, expect, it } from 'vitest';
import type { StoredVerificationJob } from '@/apis/transcript/entity';
import { findActiveVerification } from './activeVerification';

describe('진행 중 검증 복원', () => {
  it('선택한 대학·연도의 진행 중 작업만 찾는다', () => {
    const job: StoredVerificationJob = {
      jobId: 'synthetic', universityId: 1, admissionYear: 2027, status: 'PROCESSING',
      message: null, startedAt: '2026-10-30T00:00:00Z', completedAt: null, result: null,
    };
    expect(findActiveVerification([job], 1, 2027)).toEqual(job);
    expect(findActiveVerification([job], 1, 2026)).toBeUndefined();
    expect(findActiveVerification([job], 2, 2027)).toBeUndefined();
    expect(findActiveVerification([{ ...job, status: 'COMPLETED' }], 1, 2027)).toBeUndefined();
  });
});
