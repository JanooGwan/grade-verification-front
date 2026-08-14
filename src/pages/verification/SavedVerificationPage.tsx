import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { ApiError } from '@/apis/client';
import {
  exportSavedVerificationBatch,
  getSavedVerificationBatches,
  getSavedVerificationDetail,
  getSavedVerificationResults,
} from '@/apis/transcript';
import { universityQueries } from '@/apis/university/queries';
import VerificationDetail from '@/components/VerificationDetail';

const SELECTED_UNIVERSITY_STORAGE_KEY = 'student-transcript-selected-university-id';

function initialUniversityId() {
  const value = Number(window.localStorage.getItem(SELECTED_UNIVERSITY_STORAGE_KEY));
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.response?.message ?? error.message;
  return error instanceof Error ? error.message : '저장된 검증 결과를 불러오지 못했습니다.';
}

function number(value: number | null) {
  return value === null ? '-' : value.toLocaleString('ko-KR', { maximumFractionDigits: 8 });
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

export default function SavedVerificationPage() {
  const [universityId, setUniversityId] = useState(initialUniversityId);
  const [admissionYear, setAdmissionYear] = useState(2027);
  const [sourceImportId, setSourceImportId] = useState(0);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [verificationRunId, setVerificationRunId] = useState(0);
  const universities = useQuery(universityQueries.list());
  const batches = useQuery({
    queryKey: ['saved-verifications', 'batches', universityId, admissionYear],
    queryFn: () => getSavedVerificationBatches(universityId, admissionYear),
    enabled: universityId > 0,
  });
  const effectiveSourceImportId = batches.data?.some((batch) => batch.sourceImportId === sourceImportId)
    ? sourceImportId
    : batches.data?.[0]?.sourceImportId ?? 0;
  const selectedBatch = batches.data?.find((batch) => batch.sourceImportId === effectiveSourceImportId);
  const results = useQuery({
    queryKey: ['saved-verifications', 'results', effectiveSourceImportId, keyword, page],
    queryFn: () => getSavedVerificationResults(effectiveSourceImportId, keyword, page),
    enabled: effectiveSourceImportId > 0,
  });
  const detail = useQuery({
    queryKey: ['saved-verifications', 'detail', verificationRunId],
    queryFn: () => getSavedVerificationDetail(verificationRunId),
    enabled: verificationRunId > 0,
  });
  const exporter = useMutation({
    mutationFn: () => exportSavedVerificationBatch(selectedBatch?.sourceImportId ?? 0),
    onSuccess: (result) => {
      if (!selectedBatch) return;
      const baseName = selectedBatch.originalFileName.replace(/\.[^.]+$/, '');
      const url = URL.createObjectURL(result);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseName}-검증결과.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
  });

  const resetSelection = () => {
    setSourceImportId(0);
    setVerificationRunId(0);
    setKeywordInput('');
    setKeyword('');
    setPage(0);
    exporter.reset();
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setKeyword(keywordInput.trim());
    setPage(0);
    setVerificationRunId(0);
  };

  const requestError = universities.error ?? batches.error ?? results.error ?? detail.error ?? exporter.error;

  return (
    <main className="saved-verification-page">
      <header className="page-header">
        <div className="brand-mark">VR</div>
        <div>
          <p className="eyebrow">Saved verification results</p>
          <h1>저장된 검증 결과</h1>
          <p className="page-description">DB에 저장한 계산 결과를 다시 검증하지 않고 언제든 조회합니다.</p>
        </div>
      </header>

      <section className="saved-verification-filter" aria-label="조회 조건">
        <label htmlFor="saved-verification-university">
          대학교
          <select
            id="saved-verification-university"
            value={universityId || ''}
            onChange={(event) => {
              const nextUniversityId = Number(event.target.value);
              setUniversityId(nextUniversityId);
              if (nextUniversityId > 0) {
                window.localStorage.setItem(SELECTED_UNIVERSITY_STORAGE_KEY, String(nextUniversityId));
              }
              resetSelection();
            }}
          >
            <option value="">대학 선택</option>
            {universities.data?.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name}{university.active ? '' : ' (비활성)'}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="saved-verification-year">
          모집연도
          <input
            id="saved-verification-year"
            type="number"
            min="2000"
            max="2100"
            value={admissionYear}
            onChange={(event) => {
              setAdmissionYear(Number(event.target.value));
              resetSelection();
            }}
          />
        </label>
        <div className="saved-verification-filter__status">
          <small>저장 회차</small>
          <strong>{batches.data?.length.toLocaleString() ?? 0}건</strong>
          <span>{selectedBatch ? `최근 검증 완료 ${dateTime(selectedBatch.savedAt)}` : '조회 조건을 선택해 주세요.'}</span>
        </div>
      </section>

      {requestError && <div className="error-banner" role="alert">{errorMessage(requestError)}</div>}

      {universityId > 0 && (
        <section className="saved-verification-batches" aria-labelledby="saved-verification-batches-title">
          <div className="saved-verification-section-heading">
            <div>
              <p className="section-step">SAVED BATCHES</p>
              <h2 id="saved-verification-batches-title">저장 회차</h2>
            </div>
            {batches.isFetching && <span>불러오는 중…</span>}
          </div>
          <div className="saved-verification-batch-list">
            {batches.data?.map((batch) => (
              <button
                type="button"
                key={batch.sourceImportId}
                className={batch.sourceImportId === effectiveSourceImportId ? 'is-selected' : ''}
                onClick={() => {
                  setSourceImportId(batch.sourceImportId);
                  setVerificationRunId(0);
                  setKeywordInput('');
                  setKeyword('');
                  setPage(0);
                }}
              >
                <span>업로드 #{batch.sourceImportId}</span>
                <strong>{batch.originalFileName}</strong>
                <small>검증 완료 {dateTime(batch.savedAt)} · 결과 {batch.resultCount.toLocaleString()}건</small>
              </button>
            ))}
          </div>
          {!batches.isLoading && batches.data?.length === 0 && (
            <div className="saved-verification-empty">
              <strong>저장된 검증 결과가 없습니다.</strong>
              <span>학생 검증 페이지에서 성적검증 후 ‘검증 결과 DB 저장’을 실행해 주세요.</span>
            </div>
          )}
        </section>
      )}

      {selectedBatch && (
        <section className="saved-verification-results" aria-labelledby="saved-verification-results-title">
          <div className="saved-verification-section-heading">
            <div>
              <p className="section-step">RESULTS</p>
              <h2 id="saved-verification-results-title">지원자별 검증 결과</h2>
              <p>
                {selectedBatch.originalFileName} · 총{' '}
                {results.data?.totalElements.toLocaleString() ?? selectedBatch.resultCount.toLocaleString()}건 · 검증 완료{' '}
                {dateTime(selectedBatch.savedAt)}
              </p>
            </div>
            <div className="saved-verification-result-actions">
              <button
                className="saved-verification-export"
                type="button"
                disabled={exporter.isPending}
                onClick={() => exporter.mutate()}
              >
                {exporter.isPending ? '내보내는 중…' : '엑셀 내보내기'}
              </button>
              <form className="saved-verification-search" onSubmit={submitSearch}>
                <input
                  aria-label="저장 결과 검색"
                  value={keywordInput}
                  onChange={(event) => setKeywordInput(event.target.value)}
                  placeholder="수험번호·이름·전형·모집단위 검색"
                />
                <button type="submit">검색</button>
              </form>
            </div>
          </div>

          <div className="saved-verification-table">
            <table>
              <thead>
                <tr>
                  <th>수험번호 / 이름</th>
                  <th>전형</th>
                  <th>모집단위</th>
                  <th>반영 / 제외</th>
                  <th>평균등급</th>
                  <th>최종 환산점수</th>
                  <th aria-label="상세 조회" />
                </tr>
              </thead>
              <tbody>
                {results.data?.content.map((result) => (
                  <tr key={result.verificationRunId} className={verificationRunId === result.verificationRunId ? 'is-selected' : ''}>
                    <td><strong>{result.applicantNumber}</strong><small>{result.studentName}</small></td>
                    <td><span>{result.admissionTrackName}</span><small>{result.ruleName} v{result.ruleVersion}</small></td>
                    <td>{result.recruitmentUnitName}</td>
                    <td>{result.includedCourseCount.toLocaleString()} / {result.excludedCourseCount.toLocaleString()}</td>
                    <td>{number(result.averageGrade)}</td>
                    <td><b>{number(result.finalScore)}</b></td>
                    <td><button type="button" onClick={() => setVerificationRunId(result.verificationRunId)}>상세</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {results.isLoading && <div className="saved-verification-empty">저장 결과를 불러오는 중입니다.</div>}
            {!results.isLoading && results.data?.content.length === 0 && (
              <div className="saved-verification-empty">검색 조건에 맞는 저장 결과가 없습니다.</div>
            )}
          </div>

          {results.data && results.data.totalPages > 1 && (
            <div className="saved-verification-pagination">
              <button type="button" disabled={results.data.first} onClick={() => setPage((current) => current - 1)}>이전</button>
              <span>{results.data.page + 1} / {results.data.totalPages} 페이지</span>
              <button type="button" disabled={results.data.last} onClick={() => setPage((current) => current + 1)}>다음</button>
            </div>
          )}
        </section>
      )}

      {verificationRunId > 0 && (
        <section className="saved-verification-detail" aria-labelledby="saved-verification-detail-title">
          <div className="saved-verification-section-heading">
            <div>
              <p className="section-step">STORED DETAIL</p>
              <h2 id="saved-verification-detail-title">저장 결과 상세</h2>
              {detail.data && <p>{detail.data.applicantNumber} · {detail.data.studentName} · 검증 시각 {dateTime(detail.data.savedAt)}</p>}
            </div>
            <button type="button" onClick={() => setVerificationRunId(0)}>상세 닫기</button>
          </div>
          {detail.isLoading && <div className="saved-verification-empty">과목별 계산 결과를 불러오는 중입니다.</div>}
          {detail.data && <VerificationDetail result={detail.data.verification} />}
        </section>
      )}
    </main>
  );
}
