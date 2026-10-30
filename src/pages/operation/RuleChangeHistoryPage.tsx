import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRuleChangeHistory } from '@/apis/operation';

export default function RuleChangeHistoryPage() {
  const history = useQuery({ queryKey: ['operations', 'rule-change-history'], queryFn: getRuleChangeHistory });
  const [school, setSchool] = useState('ALL');
  const entries = history.data ?? [];
  const schools = [...new Set(entries.map((entry) => entry.university))].sort();
  const visible = school === 'ALL' ? entries : entries.filter((entry) => entry.university === school);
  return <main className="operations-page">
    <header className="page-header"><div className="brand-mark">기록</div><div>
      <h1>성적 로직 변경 이력</h1><p className="page-description">코드의 변경 기록에서 확인한 내용을 보여줍니다.</p>
    </div></header>
    {history.isError && <div className="error-banner" role="alert">변경 이력을 불러오지 못했습니다.</div>}
    <section className="ops-panel"><div className="ops-panel-heading ops-data-heading"><h2>기록된 변경</h2>
      <label>대학교 <select value={school} onChange={(event) => setSchool(event.target.value)}>
        <option value="ALL">전체</option>{schools.map((value) => <option key={value}>{value}</option>)}
      </select></label></div>
      {history.isLoading && <p>불러오는 중입니다.</p>}
      {!history.isLoading && visible.length === 0 && <p>표시할 기록이 없습니다.</p>}
      {visible.map((entry) => <article className="active-job" key={`${entry.commit ?? entry.changedAt}-${entry.university}-${entry.summary}`}>
        <h3>{entry.university} · {entry.summary}</h3>
        <p>{new Date(entry.changedAt).toLocaleString('ko-KR')}{entry.commit ? ` · 코드 커밋 ${entry.commit}` : ' · 코드 기록'}</p>
        <small>변경 이유: {entry.reason || '기존 코드 기록에 별도로 남아 있지 않음'}</small>
      </article>)}
      <p className="ops-data-note">선별해 코드에 기록한 이력입니다. 날짜는 코드 커밋 기준이며 실제 배포 시각과 다릅니다. 과거 변경이 모두 포함된 감사 기록은 아닙니다.</p>
    </section>
  </main>;
}
