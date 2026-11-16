import type { StoredVerificationJob } from '@/apis/transcript/entity';

const STAGE_LABELS: Record<string, string> = {
  QUEUED: '검증 대기 중',
  LOADING_INPUTS: '검증 자료 불러오는 중',
  PREPARING_SAVE: '기존 결과 교체 준비 중',
  VERIFYING_AND_SAVING: '성적 산출 및 결과 저장 중',
  VERIFYING_SCENARIOS: '성적 산출 및 결과 저장 중',
  FINALIZING: '미산출 사유 정리 중',
  COMMITTING: '저장 결과 확정 중',
  COMPLETED: '검증 완료 · 결과 목록 불러오는 중',
};

export default function StoredVerificationProgress({ job }: { job: StoredVerificationJob | null }) {
  const progress = job?.progress;
  const total = progress?.totalApplications ?? 0;
  const saved = progress?.savedResults ?? 0;
  const failed = progress?.failedResults ?? 0;
  const stage = progress?.stage ?? (job?.status === 'PROCESSING' ? 'PROCESSING' : 'QUEUED');
  return (
    <div className="stored-verification-progress" role="status" aria-live="polite">
      <strong>{STAGE_LABELS[stage] ?? '성적 검증 처리 중'}</strong>
      <progress
        aria-label="검증 결과 처리 건수"
        max={total > 0 ? total : undefined}
        value={total > 0 ? Math.min(total, saved + failed) : undefined}
      />
      {total > 0 && <span>
        전체 {total.toLocaleString()}명 · 결과 저장 처리 {saved.toLocaleString()}건
        {failed > 0 && ` · 미산출 ${failed.toLocaleString()}건`}
      </span>}
      <small>저장 처리 건수 기준입니다. 미산출 건수와 최종 결과는 작업이 끝나야 확정됩니다.</small>
    </div>
  );
}
