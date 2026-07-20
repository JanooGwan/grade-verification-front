import { useEffect, useRef, useState, type MouseEvent } from 'react';
import EvaluationPage from '@/pages/evaluation/EvaluationPage';
import RulesPage from '@/pages/rules/RulesPage';
import StudentPage from '@/pages/student/StudentPage';
import UniversityPage from '@/pages/university/UniversityPage';
import type { StudentTranscript } from '@/apis/transcript/entity';
import OperationsPage from '@/pages/operation/OperationsPage';
import AssistantPage from '@/pages/assistant/AssistantPage';

type Page = 'rules' | 'evaluation' | 'students' | 'university' | 'operations' | 'assistant';

const navigation: Array<{ page: Page; path: string; label: string; description: string }> = [
  { page: 'rules', path: '/rules', label: '규칙 관리', description: 'PDF·검수' },
  { page: 'evaluation', path: '/evaluation', label: '성적 검증', description: '환산 계산' },
  { page: 'students', path: '/students', label: '학생 관리', description: '지원자·학생부' },
  { page: 'university', path: '/universities', label: '대학교 관리', description: '기준정보' },
  { page: 'operations', path: '/operations', label: '운영 현황', description: '상태·로그' },
  { page: 'assistant', path: '/assistant', label: 'AI 도우미', description: 'DB 질의·답변' },
];

function pageFromPath(pathname: string): Page {
  return navigation.find((item) => item.path === pathname)?.page ?? 'evaluation';
}

export default function App() {
  const [page, setPage] = useState<Page>(() => pageFromPath(window.location.pathname));
  const [verificationStudent, setVerificationStudent] = useState<StudentTranscript | null>(null);
  const currentNavigationRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (!navigation.some((item) => item.path === window.location.pathname)) {
      window.history.replaceState({}, '', '/evaluation');
    }
    const handlePopState = () => setPage(pageFromPath(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    currentNavigationRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [page]);

  const navigate = (nextPage: Page) => {
    const target = navigation.find((item) => item.page === nextPage);
    if (!target || nextPage === page) return;
    window.history.pushState({}, '', target.path);
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigation = (event: MouseEvent<HTMLAnchorElement>, nextPage: Page) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(nextPage);
  };

  return (
    <div className="app-shell">
      <aside className="app-nav">
        <div className="app-brand">
          <span aria-hidden="true">GL</span>
          <div><strong>Grade Lab</strong><small>Admission workspace</small></div>
        </div>
        <nav aria-label="주요 메뉴">
          {navigation.map((item, index) => (
            <a
              key={item.page}
              href={item.path}
              ref={page === item.page ? currentNavigationRef : undefined}
              className={page === item.page ? 'is-current' : ''}
              aria-current={page === item.page ? 'page' : undefined}
              onClick={(event) => handleNavigation(event, item.page)}
            >
              <span className="app-nav__index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <span><b>{item.label}</b><small>{item.description}</small></span>
            </a>
          ))}
        </nav>
        <p className="app-nav__footer">2027 admissions · internal</p>
      </aside>
      <div className="app-content">
        {page === 'rules' && <RulesPage />}
        {page === 'evaluation' && (
          <EvaluationPage
            key={verificationStudent ? `${verificationStudent.studentId}-${verificationStudent.courses.length}` : 'manual'}
            initialTranscript={verificationStudent}
          />
        )}
        {page === 'students' && <StudentPage onVerify={(transcript) => {
          setVerificationStudent(transcript);
          navigate('evaluation');
        }} />}
        {page === 'university' && <UniversityPage />}
        {page === 'operations' && <OperationsPage />}
        {page === 'assistant' && <AssistantPage />}
      </div>
    </div>
  );
}
