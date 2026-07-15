import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/apis/client';
import type { SubjectCategory } from '@/apis/evaluation/entity';
import type { StudentTranscript } from '@/apis/transcript/entity';
import { transcriptQueries } from '@/apis/transcript/queries';
import StudentApplicationPanel from './StudentApplicationPanel';
import TranscriptImportPanel from './TranscriptImportPanel';
import StudentDataEditor from './StudentDataEditor';

const subjectLabels: Record<SubjectCategory, string> = {
  KOREAN: '국어',
  MATH: '수학',
  ENGLISH: '영어',
  SOCIAL: '사회',
  SCIENCE: '과학',
  OTHER: '기타',
};

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.response?.message ?? error.message;
  return error instanceof Error ? error.message : '학생 데이터를 불러오지 못했습니다.';
}

export default function StudentPage({ onVerify }: {
  onVerify: (transcript: StudentTranscript) => void;
}) {
  const [admissionYear, setAdmissionYear] = useState(2027);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [selectedApplicant, setSelectedApplicant] = useState('');
  const params = { admissionYear, keyword, page, size: 15 };
  const studentsQuery = useQuery(transcriptQueries.students(params));
  const detailQuery = useQuery(transcriptQueries.detail(admissionYear, selectedApplicant));

  const search = (event: FormEvent) => {
    event.preventDefault();
    setKeyword(keywordInput.trim());
    setPage(0);
    setSelectedApplicant('');
  };

  const transcript = detailQuery.data;
  const requestError = studentsQuery.error ?? detailQuery.error;

  return (
    <main className="student-page">
      <header className="page-header student-header">
        <div className="brand-mark">ST</div>
        <div>
          <p className="eyebrow">Applicant transcript</p>
          <h1>학생 데이터 조회</h1>
          <p className="page-description">지원자를 검색하고 학년·학기별 학생부 성적을 확인한 뒤 성적 검증으로 연결합니다.</p>
        </div>
      </header>

      <section className="summary-grid student-summary-grid">
        <article className="summary-card"><span>검색된 지원자</span><strong>{studentsQuery.data?.totalElements ?? 0}</strong><small>{admissionYear}학년도</small></article>
        <article className="summary-card"><span>현재 페이지</span><strong>{studentsQuery.data ? studentsQuery.data.page + 1 : 1}</strong><small>총 {studentsQuery.data?.totalPages ?? 0}페이지</small></article>
        <article className="summary-card summary-card--accent"><span>선택 학생</span><strong>{transcript?.name ?? '미선택'}</strong><small>{transcript ? `${transcript.courses.length}개 과목` : '목록에서 학생을 선택하세요'}</small></article>
      </section>

      <TranscriptImportPanel admissionYear={admissionYear} />

      <form className="student-search" onSubmit={search}>
        <label>모집연도
          <input type="number" min="2000" max="2100" value={admissionYear} onChange={(event) => {
            setAdmissionYear(Number(event.target.value));
            setPage(0);
            setSelectedApplicant('');
          }} />
        </label>
        <label>통합 검색
          <input value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} placeholder="지원번호, 학생명, 고등학교명" maxLength={100} />
        </label>
        <button type="submit">검색</button>
      </form>

      {requestError && <div className="error-banner" role="alert">{errorMessage(requestError)}</div>}

      <section className="student-workspace">
        <div className="student-list-panel">
          <div className="list-heading">
            <div><p className="section-step">STUDENTS</p><h2>지원자 목록</h2></div>
            {studentsQuery.isFetching && <span className="loading-label">조회 중…</span>}
          </div>
          <div className="student-list">
            {studentsQuery.data?.content.map((student) => (
              <button
                className={`student-list-item ${selectedApplicant === student.applicantNumber ? 'is-selected' : ''}`}
                type="button"
                key={student.studentId}
                onClick={() => setSelectedApplicant(student.applicantNumber)}
              >
                <span className="student-avatar">{student.name.slice(-2)}</span>
                <span className="student-list-copy">
                  <strong>{student.name}</strong>
                  <small>{student.applicantNumber}</small>
                  <small>{student.highSchoolName || '고등학교 미등록'} · {student.graduationYear || '-'}</small>
                </span>
                <span className="student-list-metric"><strong>{student.averageGrade ?? '-'}</strong><small>평균등급</small><small>{student.courseCount}과목</small></span>
              </button>
            ))}
            {!studentsQuery.isLoading && studentsQuery.data?.content.length === 0 && (
              <div className="empty-state"><strong>검색 결과가 없습니다.</strong><span>모집연도 또는 검색어를 확인해 주세요.</span></div>
            )}
          </div>
          <div className="pagination">
            <button type="button" disabled={studentsQuery.data?.first ?? true} onClick={() => setPage((value) => Math.max(0, value - 1))}>이전</button>
            <span>{studentsQuery.data ? `${studentsQuery.data.page + 1} / ${Math.max(studentsQuery.data.totalPages, 1)}` : '1 / 1'}</span>
            <button type="button" disabled={studentsQuery.data?.last ?? true} onClick={() => setPage((value) => value + 1)}>다음</button>
          </div>
        </div>

        <div className="student-detail-panel">
          {!selectedApplicant && <div className="student-detail-empty"><span>STUDENT RECORD</span><strong>학생을 선택해 주세요</strong><p>지원자별 학기 성적과 진로선택과목을 한 화면에서 확인할 수 있습니다.</p></div>}
          {selectedApplicant && detailQuery.isLoading && <div className="student-detail-empty"><strong>학생부를 불러오는 중입니다…</strong></div>}
          {transcript && (
            <>
              <div className="student-detail-heading">
                <div>
                  <p className="section-step">TRANSCRIPT DETAIL</p>
                  <h2>{transcript.name}</h2>
                  <p>{transcript.applicantNumber} · {transcript.highSchoolName || '고등학교 미등록'} · {transcript.graduationYear || '-'}년 졸업</p>
                </div>
                <button type="button" onClick={() => onVerify(transcript)}>수동 검증 화면</button>
              </div>
              <StudentDataEditor transcript={transcript} onDeleted={() => setSelectedApplicant('')} />
              <StudentApplicationPanel key={transcript.studentId} transcript={transcript} />
              <div className="semester-sections">
                {[1, 2, 3].flatMap((schoolYear) => [1, 2].map((semester) => {
                  const courses = transcript.courses.filter((course) => course.schoolYear === schoolYear && course.semester === semester);
                  if (courses.length === 0) return null;
                  return (
                    <section className="semester-card" key={`${schoolYear}-${semester}`}>
                      <div><strong>{schoolYear}학년 {semester}학기</strong><span>{courses.length}과목</span></div>
                      <div className="transcript-table">
                        <div className="transcript-row transcript-row--head"><span>교과</span><span>과목명</span><span>등급</span><span>성취도</span><span>단위</span><span>원점수</span><span>구분</span></div>
                        {courses.map((course) => (
                          <div className="transcript-row" key={course.id}>
                            <span>{subjectLabels[course.subjectCategory]}</span>
                            <strong>{course.courseName}</strong>
                            <span>{course.grade ?? '-'}</span>
                            <span>{course.achievement ?? '-'}</span>
                            <span>{course.credits}</span>
                            <span>{course.rawScore ?? '-'}</span>
                            <span>{course.careerSubject ? '진로' : course.professionalCourse ? '전문' : '일반'}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                }))}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
