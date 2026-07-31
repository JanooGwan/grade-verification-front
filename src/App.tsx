import { useEffect, useRef, useState, type MouseEvent } from 'react';
import RulesPage from '@/pages/rules/RulesPage';
import StudentPage from '@/pages/student/StudentPage';
import UniversityPage from '@/pages/university/UniversityPage';
import OperationsPage from '@/pages/operation/OperationsPage';
import AssistantPage from '@/pages/assistant/AssistantPage';

type Page = 'rules' | 'students' | 'university' | 'operations' | 'assistant';

const navigation: Array<{ page: Page; path: string; label: string }> = [
  { page: 'rules', path: '/rules', label: '대학별 반영 기준' },
  { page: 'students', path: '/students', label: '학생 검증' },
  { page: 'university', path: '/universities', label: '대학' },
  { page: 'operations', path: '/operations', label: '운영' },
  { page: 'assistant', path: '/assistant', label: 'AI 도우미' },
];

function pageFromPath(pathname: string): Page {
  return navigation.find((item) => item.path === pathname)?.page ?? 'students';
}

export default function App() {
  const [page, setPage] = useState<Page>(() => pageFromPath(window.location.pathname));
  const currentNavigationRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (!navigation.some((item) => item.path === window.location.pathname)) {
      window.history.replaceState({}, '', '/students');
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
          <strong>성적 검증</strong>
        </div>
        <nav aria-label="주요 메뉴">
          {navigation.map((item) => (
            <a
              key={item.page}
              href={item.path}
              ref={page === item.page ? currentNavigationRef : undefined}
              className={page === item.page ? 'is-current' : ''}
              aria-current={page === item.page ? 'page' : undefined}
              onClick={(event) => handleNavigation(event, item.page)}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <div className="app-content">
        {page === 'rules' && <RulesPage />}
        {page === 'students' && <StudentPage />}
        {page === 'university' && <UniversityPage />}
        {page === 'operations' && <OperationsPage />}
        {page === 'assistant' && <AssistantPage />}
      </div>
    </div>
  );
}
