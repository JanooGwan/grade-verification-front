import { useState } from 'react';

import TranscriptImportPanel from './TranscriptImportPanel';

export default function StudentPage() {
  const [admissionYear, setAdmissionYear] = useState(2027);

  return (
    <main className="student-page student-import-page">
      <header className="page-header student-header">
        <h1>학생 성적 검증</h1>
      </header>

      <TranscriptImportPanel admissionYear={admissionYear} onAdmissionYearChange={setAdmissionYear} />
    </main>
  );
}
