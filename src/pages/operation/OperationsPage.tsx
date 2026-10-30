import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLightDataStatus } from '@/apis/operation';
import type { TranscriptImportStatus } from '@/apis/operation/entity';

const statusLabels: Record<TranscriptImportStatus, string> = {
  QUEUED: '대기 중', PROCESSING: '처리 중', COMPLETED: '완료',
  COMPLETED_WITH_ERRORS: '일부 오류 완료', FAILED: '실패',
};

function time(value: string | null) {
  return value ? new Date(value).toLocaleString('ko-KR') : '-';
}

export default function OperationsPage() {
  const [year, setYear] = useState('ALL');
  const query = useQuery({ queryKey: ['operations', 'data-status'], queryFn: getLightDataStatus, refetchInterval: 60_000 });
  const rows = query.data ?? [];
  const years = [...new Set(rows.flatMap((row) => row.admissionYear === null ? [] : [row.admissionYear]))].sort((a, b) => b - a);
  const shown = year === 'ALL' ? rows : rows.filter((row) => row.admissionYear === Number(year));
  return <main className="operations-page">
    <header className="page-header"><div className="brand-mark">DB</div><div>
      <h1>데이터 현황</h1><p className="page-description">대학과 모집연도별 저장 여부와 최근 처리 시각을 확인합니다.</p>
    </div></header>
    {query.isError && <div className="error-banner" role="alert">데이터 현황을 불러오지 못했습니다.</div>}
    <section className="ops-panel ops-data-status">
      <div className="ops-panel-heading ops-data-heading"><h2>대학별 저장 현황</h2><div className="ops-data-controls">
        <label htmlFor="operations-admission-year">모집연도</label>
        <select id="operations-admission-year" value={year} onChange={(event) => setYear(event.target.value)}>
          <option value="ALL">전체</option>{years.map((value) => <option key={value} value={value}>{value}학년도</option>)}
        </select>
        <button type="button" onClick={() => query.refetch()} disabled={query.isFetching}>새로고침</button>
      </div></div>
      <div className="ops-data-table"><table><thead><tr>
        <th>대학교</th><th>모집연도</th><th>학생 데이터</th><th>최근 저장 처리</th><th>저장된 일괄 점수</th>
      </tr></thead><tbody>{shown.map((row) => <tr key={`${row.universityId}-${row.admissionYear ?? 'none'}`}>
        <td className="ops-university-cell"><strong>{row.universityName}</strong><small>{row.universityCode}{row.active ? '' : ' · 비활성'}</small></td>
        <td>{row.admissionYear ? `${row.admissionYear}학년도` : '-'}</td>
        <td><span className={`ops-status-badge ${row.studentDataPresent ? 'is-ready' : 'is-empty'}`}>{row.studentDataPresent ? '있음' : '없음'}</span></td>
        <td>{row.latestImportStatus ? statusLabels[row.latestImportStatus] : '이력 없음'}<small>{time(row.latestImportAt)}</small></td>
        <td><span className={`ops-status-badge ${row.verificationDataPresent ? 'is-ready' : 'is-empty'}`}>{row.verificationDataPresent ? '있음' : '없음'}</span><small>{time(row.latestVerificationAt)}</small></td>
      </tr>)}</tbody></table>
      {query.isLoading && <div className="ops-data-empty">확인 중입니다.</div>}
      {!query.isLoading && shown.length === 0 && <div className="ops-data-empty">해당 데이터가 없습니다.</div>}</div>
      <p className="ops-data-note">검증 결과는 업로드에 연결된 일괄 검증 저장 결과 기준입니다. 개별 검증은 포함하지 않습니다. 1분마다 갱신합니다.</p>
    </section>
  </main>;
}
