import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getActiveJobs } from '@/apis/operation';
import { universityQueries } from '@/apis/university/queries';
import StoredVerificationProgress from '@/pages/student/StoredVerificationProgress';

function elapsed(startedAt: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  if (!Number.isFinite(seconds)) return '시간 확인 중';
  return `${Math.floor(seconds / 3600)}시간 ${Math.floor(seconds % 3600 / 60)}분 ${seconds % 60}초`;
}

export default function ActiveJobsPage() {
  const jobs = useQuery({ queryKey: ['operations', 'active-jobs'], queryFn: getActiveJobs, refetchInterval: 3000 });
  const universities = useQuery(universityQueries.list());
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  const name = (id: number) => universities.data?.find((item) => item.id === id)?.name ?? `대학 #${id}`;
  const data = jobs.data;
  const count = (data?.verifications.length ?? 0) + (data?.exports.length ?? 0) + (data?.imports.length ?? 0);
  return <main className="operations-page">
    <header className="page-header"><div className="brand-mark">↻</div><div><h1>진행 중인 작업</h1>
      <p className="page-description">서버에서 처리 중인 저장, 성적 검증, 파일 생성을 확인합니다.</p></div></header>
    {jobs.isError && <div className="error-banner" role="alert">작업 상태를 불러오지 못했습니다. 서버 연결을 확인해 주세요.</div>}
    <section className="ops-panel"><div className="ops-panel-heading"><h2>작업 목록</h2>
      <button type="button" onClick={() => jobs.refetch()} disabled={jobs.isFetching}>새로고침</button></div>
      {jobs.isLoading && <p>작업 상태 확인 중입니다.</p>}
      {!jobs.isLoading && !jobs.isError && count === 0 && <p>진행 중인 작업이 없습니다.</p>}
      {data?.verifications.map((job) => <article className="active-job" key={job.jobId}>
        <h3>성적 검증 · {name(job.universityId)} · {job.admissionYear}학년도</h3>
        <p>접수 {new Date(job.startedAt).toLocaleString('ko-KR')} · 경과 {elapsed(job.startedAt, now)}</p>
        <StoredVerificationProgress job={job} />
      </article>)}
      {data?.imports.map((job) => <article className="active-job" key={`import-${job.importId}`}>
        <h3>파일 저장 · {name(job.universityId)} · {job.admissionYear}학년도</h3>
        <p>{job.status === 'QUEUED' ? '대기 중' : '처리 중'} · 경과 {elapsed(job.startedAt, now)}</p>
        <progress aria-label="파일 저장 진행 상황 확인 중" /><small>단계별 진행률은 제공되지 않습니다.</small>
      </article>)}
      {data?.exports.map((job) => <article className="active-job" key={job.exportId}>
        <h3>검증 결과 파일 생성 · {job.universityId === null ? `업로드 #${job.sourceImportId}` : name(job.universityId)}{job.admissionYear === null ? '' : ` · ${job.admissionYear}학년도`}</h3>
        <p>처리 중 · 경과 {elapsed(job.startedAt, now)}</p>
        <progress aria-label="파일 생성 진행 상황 확인 중" /><small>단계별 진행률은 제공되지 않습니다.</small>
      </article>)}
      <p className="ops-data-note">서버가 접수한 명지전문대·삼육대 비동기 원자료 저장, 일괄 검증 및 결과 파일 생성 작업입니다. 브라우저에서 파일을 전송하는 동안에는 표시되지 않으며, 서버가 재시작되면 목록은 초기화됩니다.</p>
    </section>
  </main>;
}
