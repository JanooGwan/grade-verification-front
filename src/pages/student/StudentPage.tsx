import { useState } from 'react';

import TranscriptImportPanel from './TranscriptImportPanel';

export default function StudentPage() {
  const [admissionYear, setAdmissionYear] = useState(2027);

  return (
    <main className="student-page student-import-page">
      <header className="page-header student-header">
        <div className="brand-mark">ST</div>
        <div>
          <p className="eyebrow">Applicant transcript</p>
          <h1>학생 성적 일괄 검증</h1>
          <p className="page-description">
            지원정보와 과목별 성적이 담긴 Excel 파일을 분석하고, 지원정보별 최종 환산점수를 확인합니다.
          </p>
        </div>
      </header>

      <TranscriptImportPanel
        admissionYear={admissionYear}
        onAdmissionYearChange={setAdmissionYear}
      />
    </main>
  );
}
