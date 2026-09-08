import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/apis/client';
import { getOperationsDashboard } from '@/apis/operation';
import type { TranscriptImportStatus, UniversityDataStatus } from '@/apis/operation/entity';

const importStatusLabels: Record<TranscriptImportStatus, string> = {
  QUEUED: '대기 중',
  PROCESSING: '처리 중',
  COMPLETED: '완료',
  COMPLETED_WITH_ERRORS: '일부 오류 완료',
  FAILED: '실패',
};

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.response?.message ?? error.message;
  return error instanceof Error ? error.message : '운영 현황을 불러오지 못했습니다.';
}

function dateTime(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function importStatusClass(status: TranscriptImportStatus | null) {
  if (status === 'COMPLETED' || status === 'COMPLETED_WITH_ERRORS') return 'is-ready';
  if (status === 'QUEUED' || status === 'PROCESSING') return 'is-pending';
  if (status === 'FAILED') return 'is-error';
  return 'is-empty';
}

export default function OperationsPage() {
  const [year, setYear] = useState('ALL');
  const dashboard = useQuery({
    queryKey: ['operations', 'dashboard'],
    queryFn: getOperationsDashboard,
    refetchInterval: 10_000,
  });
  const data = dashboard.data;
  const statuses = data?.universityDataStatuses ?? [];
  const years = [...new Set(statuses.flatMap((status) => (
    status.admissionYear === null ? [] : [status.admissionYear]
  )))].sort((first, second) => second - first);
  const visibleStatuses = year === 'ALL'
    ? statuses
    : statuses.filter((status) => status.admissionYear === Number(year));
  const uploadedCount = statuses.filter((status) => status.studentDataPresent).length;
  const verifiedCount = statuses.filter((status) => status.verificationDataPresent).length;
  const errorRate = data?.http.totalRequests
    ? ((data.http.errorRequests / data.http.totalRequests) * 100).toFixed(1) : '0.0';

  return (
    <main className="operations-page">
      <header className="page-header">
        <div className="brand-mark">DB</div>
        <div>
          <p className="eyebrow">Database status</p>
          <h1>데이터베이스 현황</h1>
          <p className="page-description">대학별 학생 업로드와 검증 결과 저장 상태를 10초마다 갱신합니다.</p>
        </div>
      </header>
      {dashboard.error && <div className="error-banner">{errorMessage(dashboard.error)}</div>}

      <section className="ops-panel ops-data-status" aria-labelledby="university-data-status-title">
        <div className="ops-panel-heading ops-data-heading">
          <div>
            <p className="section-step">UNIVERSITY DATA</p>
            <h2 id="university-data-status-title">대학별 적재·검증 상태</h2>
            <p>학생 데이터 {uploadedCount}건 · 검증 결과 저장 {verifiedCount}건</p>
          </div>
          <div className="ops-data-controls">
            <label htmlFor="operations-admission-year">모집연도</label>
            <select id="operations-admission-year" value={year} onChange={(event) => setYear(event.target.value)}>
              <option value="ALL">전체</option>
              {years.map((admissionYear) => (
                <option key={admissionYear} value={admissionYear}>{admissionYear}학년도</option>
              ))}
            </select>
            <button type="button" disabled={dashboard.isFetching} onClick={() => dashboard.refetch()}>
              {dashboard.isFetching ? '갱신 중…' : '새로고침'}
            </button>
          </div>
        </div>
        <div className="ops-data-table">
          <table>
            <thead>
              <tr>
                <th>대학교</th>
                <th>모집연도</th>
                <th>학생 데이터</th>
                <th>최근 업로드</th>
                <th>검증 결과 데이터</th>
              </tr>
            </thead>
            <tbody>
              {visibleStatuses.map((status) => (
                <UniversityStatusRow
                  key={`${status.universityId}-${status.admissionYear ?? 'empty'}`}
                  status={status}
                />
              ))}
            </tbody>
          </table>
          {!dashboard.isLoading && visibleStatuses.length === 0 && (
            <div className="ops-data-empty">선택한 모집연도의 데이터가 없습니다.</div>
          )}
          {dashboard.isLoading && <div className="ops-data-empty">데이터 상태를 확인하는 중입니다.</div>}
        </div>
        <p className="ops-data-note">검증 결과는 실제 DB의 검증 이력 저장 건수 기준입니다. 엑셀을 내려받은 횟수와는 다릅니다.</p>
      </section>

      <section className="ops-metric-grid" aria-label="전체 데이터 요약">
        <Metric label="학생" value={data?.students} detail={`${data?.transcriptCourses ?? 0}개 과목`} />
        <Metric label="지원" value={data?.studentApplications} detail={`${data?.verificationRuns ?? 0}건 검증 저장`} />
        <Metric label="모집요강" value={data?.ruleExtractions} detail={`${data?.rules.published ?? 0}개 게시 기준`} />
        <Metric label="API 요청" value={data?.http.totalRequests} detail={`오류율 ${errorRate}%`} accent />
      </section>
      <section className="ops-panels">
        <article className="ops-panel">
          <div className="ops-panel-heading"><div><p className="section-step">RULE STATUS</p><h2>반영 기준 상태</h2></div></div>
          <div className="ops-rule-bars">
            {data && Object.entries(data.rules).map(([status, count]) => <div key={status}><span>{status.toUpperCase()}</span><b>{count}</b></div>)}
          </div>
        </article>
        <article className="ops-panel">
          <div className="ops-panel-heading"><div><p className="section-step">HTTP HEALTH</p><h2>요청 성능</h2></div><span>기동 {data?.http.startedAt ? new Date(data.http.startedAt).toLocaleString() : '-'}</span></div>
          <div className="ops-http-summary"><span>평균 <b>{data?.http.averageDurationMillis ?? 0}ms</b></span><span>최대 <b>{data?.http.maxDurationMillis ?? 0}ms</b></span><span>오류 <b>{data?.http.errorRequests ?? 0}</b></span></div>
        </article>
      </section>
      <section className="ops-panel ops-endpoints">
        <div className="ops-panel-heading"><div><p className="section-step">TOP ENDPOINTS</p><h2>API별 요청 현황</h2></div>{dashboard.isFetching && <span>갱신 중…</span>}</div>
        <div className="ops-endpoint-row ops-endpoint-row--head"><span>API</span><span>요청</span><span>오류</span><span>평균 응답</span></div>
        {data?.http.endpoints.map((endpoint) => <div className="ops-endpoint-row" key={endpoint.endpoint}><strong>{endpoint.endpoint}</strong><span>{endpoint.requests}</span><span>{endpoint.errors}</span><span>{endpoint.averageDurationMillis}ms</span></div>)}
      </section>
    </main>
  );
}

function UniversityStatusRow({ status }: { status: UniversityDataStatus }) {
  return (
    <tr>
      <td className="ops-university-cell">
        <strong>{status.universityName}</strong>
        <small>{status.universityCode}{status.active ? '' : ' · 비활성'}</small>
      </td>
      <td>{status.admissionYear ? `${status.admissionYear}학년도` : '-'}</td>
      <td>
        <span className={`ops-status-badge ${status.studentDataPresent ? 'is-ready' : 'is-empty'}`}>
          {status.studentDataPresent ? '업로드됨' : '데이터 없음'}
        </span>
        {status.studentDataPresent && (
          <small>학생 {status.studentCount.toLocaleString()}명 · 과목 {status.transcriptCourseCount.toLocaleString()}건 · 지원 {status.applicationCount.toLocaleString()}건</small>
        )}
      </td>
      <td>
        <span className={`ops-status-badge ${importStatusClass(status.latestImportStatus)}`}>
          {status.latestImportStatus ? importStatusLabels[status.latestImportStatus] : '이력 없음'}
        </span>
        <small>{dateTime(status.latestImportAt)}</small>
        {status.latestImportFileName && <small title={status.latestImportFileName}>{status.latestImportFileName}</small>}
      </td>
      <td>
        <span className={`ops-status-badge ${status.verificationDataPresent ? 'is-ready' : 'is-empty'}`}>
          {status.verificationDataPresent ? 'DB 저장됨' : '저장 결과 없음'}
        </span>
        {status.verificationDataPresent && <small>{status.verificationResultCount.toLocaleString()}건 · 최근 {dateTime(status.latestVerificationAt)}</small>}
      </td>
    </tr>
  );
}

function Metric({ label, value, detail, accent = false }: { label: string; value?: number; detail: string; accent?: boolean }) {
  return <article className={`ops-metric ${accent ? 'is-accent' : ''}`}><span>{label}</span><strong>{value ?? 0}</strong><small>{detail}</small></article>;
}
