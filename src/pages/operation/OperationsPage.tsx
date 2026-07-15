import { useQuery } from '@tanstack/react-query';
import { getOperationsDashboard } from '@/apis/operation';
import { ApiError } from '@/apis/client';

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.response?.message ?? error.message;
  return error instanceof Error ? error.message : '운영 현황을 불러오지 못했습니다.';
}

export default function OperationsPage() {
  const dashboard = useQuery({
    queryKey: ['operations', 'dashboard'],
    queryFn: getOperationsDashboard,
    refetchInterval: 10_000,
  });
  const data = dashboard.data;
  const errorRate = data?.http.totalRequests
    ? ((data.http.errorRequests / data.http.totalRequests) * 100).toFixed(1) : '0.0';
  return (
    <main className="operations-page">
      <header className="page-header">
        <div className="brand-mark">OP</div>
        <div><p className="eyebrow">Operations dashboard</p><h1>운영 현황</h1><p className="page-description">데이터 적재 현황과 API 요청·오류·응답시간을 10초마다 갱신합니다.</p></div>
      </header>
      {dashboard.error && <div className="error-banner">{errorMessage(dashboard.error)}</div>}
      <section className="ops-metric-grid">
        <Metric label="학생" value={data?.students} detail={`${data?.transcriptCourses ?? 0}개 과목`} />
        <Metric label="지원" value={data?.studentApplications} detail={`${data?.verificationRuns ?? 0}회 검증`} />
        <Metric label="모집요강" value={data?.ruleExtractions} detail={`${data?.rules.published ?? 0}개 게시 규칙`} />
        <Metric label="API 요청" value={data?.http.totalRequests} detail={`오류율 ${errorRate}%`} accent />
      </section>
      <section className="ops-panels">
        <article className="ops-panel">
          <div className="ops-panel-heading"><div><p className="section-step">RULE STATUS</p><h2>규칙 상태</h2></div></div>
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

function Metric({ label, value, detail, accent = false }: { label: string; value?: number; detail: string; accent?: boolean }) {
  return <article className={`ops-metric ${accent ? 'is-accent' : ''}`}><span>{label}</span><strong>{value ?? 0}</strong><small>{detail}</small></article>;
}
