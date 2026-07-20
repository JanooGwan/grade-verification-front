import { useState } from 'react';
import EvaluationPage from '@/pages/evaluation/EvaluationPage';
import RulesPage from '@/pages/rules/RulesPage';
import StudentPage from '@/pages/student/StudentPage';
import UniversityPage from '@/pages/university/UniversityPage';
import type { StudentTranscript } from '@/apis/transcript/entity';
import OperationsPage from '@/pages/operation/OperationsPage';

export default function App() {
  const [page, setPage] = useState<'rules' | 'evaluation' | 'students' | 'university' | 'operations'>('evaluation');
  const [verificationStudent, setVerificationStudent] = useState<StudentTranscript | null>(null);
  return (
    <>
      <nav className="app-nav" aria-label="주요 메뉴">
        <strong>Grade Lab</strong>
        <div>
          <button className={page === 'rules' ? 'is-current' : ''} onClick={() => setPage('rules')}>규칙 관리</button>
          <button className={page === 'evaluation' ? 'is-current' : ''} onClick={() => setPage('evaluation')}>성적 검증</button>
          <button className={page === 'students' ? 'is-current' : ''} onClick={() => setPage('students')}>학생 관리</button>
          <button className={page === 'university' ? 'is-current' : ''} onClick={() => setPage('university')}>대학교 관리</button>
          <button className={page === 'operations' ? 'is-current' : ''} onClick={() => setPage('operations')}>운영 현황</button>
        </div>
      </nav>
      {page === 'rules' && <RulesPage />}
      {page === 'evaluation' && (
        <EvaluationPage
          key={verificationStudent ? `${verificationStudent.studentId}-${verificationStudent.courses.length}` : 'manual'}
          initialTranscript={verificationStudent}
        />
      )}
      {page === 'students' && <StudentPage onVerify={(transcript) => {
        setVerificationStudent(transcript);
        setPage('evaluation');
      }} />}
      {page === 'university' && <UniversityPage />}
      {page === 'operations' && <OperationsPage />}
    </>
  );
}
