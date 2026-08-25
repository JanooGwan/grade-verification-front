import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/apis/client';
import { exportSavedVerificationBatch, exportStoredTranscriptVerification, getTranscriptImportResultExcel, importSyuSourceExcel, importTranscriptExcel, persistStoredTranscriptVerification, verifyStoredTranscript } from '@/apis/transcript';
import type { TranscriptImportHistory, TranscriptImportMode } from '@/apis/transcript/entity';
import { transcriptQueries, transcriptQueryKeys } from '@/apis/transcript/queries';
import { universityQueries } from '@/apis/university/queries';

const SELECTED_UNIVERSITY_STORAGE_KEY = 'student-transcript-selected-university-id';

function storedUniversityId() {
  const value = Number(window.localStorage.getItem(SELECTED_UNIVERSITY_STORAGE_KEY));
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

function rememberUniversityId(universityId: number) {
  if (universityId > 0) {
    window.localStorage.setItem(SELECTED_UNIVERSITY_STORAGE_KEY, String(universityId));
  } else {
    window.localStorage.removeItem(SELECTED_UNIVERSITY_STORAGE_KEY);
  }
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.response?.message ?? error.message;
  return error instanceof Error ? error.message : 'Excel 파일을 처리하지 못했습니다.';
}

function number(value: number | null) {
  return value == null ? '-' : value.toLocaleString('ko-KR', { maximumFractionDigits: 6 });
}

function ExcelFilePicker({
  id,
  label,
  file,
  hint,
  onChange,
}: {
  id: string;
  label: string;
  file: File | null;
  hint?: string;
  onChange: (file: File | null) => void;
}) {
  const labelId = `${id}-label`;

  return (
    <div className="transcript-file-field">
      <span id={labelId}>{label}</span>
      <div className="transcript-file-control">
        <input
          id={id}
          className="transcript-file-input"
          type="file"
          accept=".xlsx,.xls"
          aria-labelledby={labelId}
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
        <label className="transcript-file-button" htmlFor={id}>
          {file ? '파일 변경' : 'Excel 선택'}
        </label>
        <span className="transcript-file-name" title={file?.name}>
          {file?.name ?? '선택된 파일 없음'}
        </span>
      </div>
      {hint && <small>{hint}</small>}
    </div>
  );
}

export default function TranscriptImportPanel({
  admissionYear,
  onAdmissionYearChange,
}: {
  admissionYear: number;
  onAdmissionYearChange: (year: number) => void;
}) {
  const queryClient = useQueryClient();
  const importSubmittingRef = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [schoolInfoFile, setSchoolInfoFile] = useState<File | null>(null);
  const [mode, setMode] = useState<TranscriptImportMode>('ALL_OR_NOTHING');
  const [rememberedUniversityId, setRememberedUniversityId] = useState(storedUniversityId);
  const universities = useQuery(universityQueries.list());
  const selectedUniversity = universities.data?.find(
    (item) => item.id === rememberedUniversityId && item.active,
  );
  const universityId = selectedUniversity?.id ?? 0;
  const history = useQuery({ ...transcriptQueries.imports(universityId), refetchInterval: 3000 });
  const hasActiveImport = history.data?.some(
    (item) => item.status === 'QUEUED' || item.status === 'PROCESSING',
  ) ?? false;

  useEffect(() => {
    if (!universities.data || rememberedUniversityId === 0 || selectedUniversity) return;

    rememberUniversityId(0);
  }, [rememberedUniversityId, selectedUniversity, universities.data]);

  const isSyuSource = Boolean(
    file
      && selectedUniversity?.name.includes('삼육')
      && (file.size > 40 * 1024 * 1024 || file.name.includes('데이터전달')),
  );
  const verification = useMutation({
    mutationFn: () => verifyStoredTranscript(universityId, admissionYear),
  });
  const exporter = useMutation({
    mutationFn: () => exportStoredTranscriptVerification(universityId, admissionYear),
    onSuccess: (result) => {
      const url = URL.createObjectURL(result);
      const link = document.createElement('a');
      const baseName = file?.name.replace(/\.[^.]+$/, '') || '가져오기';
      link.href = url;
      link.download = `${baseName}-검증결과.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
  });
  const persistence = useMutation({
    mutationFn: () => persistStoredTranscriptVerification(universityId, admissionYear),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: transcriptQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['operations', 'dashboard'] }),
      ]);
    },
  });
  const importer = useMutation({
    mutationFn: () => importTranscriptExcel(admissionYear, universityId, mode, file as File, schoolInfoFile),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: transcriptQueryKeys.all });
      verification.mutate();
    },
    onSettled: () => {
      importSubmittingRef.current = false;
    },
  });
  const sourceImporter = useMutation({
    mutationFn: () => importSyuSourceExcel(admissionYear, universityId, file as File),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: transcriptQueryKeys.all });
    },
    onSettled: () => {
      importSubmittingRef.current = false;
    },
  });
  const historyExporter = useMutation({
    mutationFn: (item: TranscriptImportHistory) => item.sourceFormat === 'SYU_SOURCE_WORKBOOK_V1'
      ? getTranscriptImportResultExcel(item.importId)
      : exportSavedVerificationBatch(item.importId),
    onSuccess: (result, item) => {
      const baseName = item.originalFileName.replace(/\.[^.]+$/, '') || `가져오기-${item.importId}`;
      const url = URL.createObjectURL(result);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseName}-${item.sourceFormat === 'SYU_SOURCE_WORKBOOK_V1' ? '환산결과' : '검증결과'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
  });

  const submitImport = (event: FormEvent) => {
    event.preventDefault();
    if (!file || importSubmittingRef.current || importer.isPending || sourceImporter.isPending) return;
    importSubmittingRef.current = true;
    verification.reset();
    persistence.reset();
    exporter.reset();
    if (isSyuSource) sourceImporter.mutate();
    else importer.mutate();
  };
  const error = sourceImporter.error ?? verification.error ?? persistence.error ?? exporter.error ?? importer.error ?? historyExporter.error ?? universities.error ?? history.error;
  const verificationResult = verification.data?.verification;

  return (
    <section className="transcript-import-panel transcript-import-panel--primary">
      <header className="transcript-import-heading">
        <h2>검증 파일</h2>
      </header>

      <form className="transcript-import-form" onSubmit={submitImport}>
        <div className="transcript-import-main">
          <label htmlFor="transcript-admission-year">
            검증 기준연도
            <input
              id="transcript-admission-year"
              type="number"
              min="2000"
              max="2100"
              value={admissionYear}
              onChange={(event) => {
                onAdmissionYearChange(Number(event.target.value));
                verification.reset();
                persistence.reset();
                exporter.reset();
                importer.reset();
                sourceImporter.reset();
              }}
            />
          </label>
          <label htmlFor="transcript-university">
            대학교
            <select
              id="transcript-university"
              value={universityId || ''}
              disabled={importer.isPending}
              onChange={(event) => {
                const nextUniversityId = Number(event.target.value);
                setRememberedUniversityId(nextUniversityId);
                rememberUniversityId(nextUniversityId);
                verification.reset();
                persistence.reset();
                exporter.reset();
                importer.reset();
                sourceImporter.reset();
              }}
            >
              <option value="">선택</option>
              {universities.data
                ?.filter((item) => item.active)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
          <ExcelFilePicker
            id="transcript-file"
            label="성적 파일"
            file={file}
            onChange={(selectedFile) => {
              setFile(selectedFile);
              verification.reset();
              persistence.reset();
              exporter.reset();
              importer.reset();
              sourceImporter.reset();
            }}
          />
          <button disabled={!file || !universityId || importer.isPending || sourceImporter.isPending}>
            {sourceImporter.isPending
              ? '업로드 중…'
              : importer.isPending
                ? '저장 중…'
                : isSyuSource
                  ? '대용량 DB 저장'
                  : 'DB 저장'}
          </button>
        </div>

        <details className="transcript-import-options">
          <summary>추가 설정</summary>
          <div>
            <label htmlFor="transcript-import-mode">
              저장 정책
              <select
                id="transcript-import-mode"
                value={mode}
                onChange={(event) => setMode(event.target.value as TranscriptImportMode)}
              >
                <option value="ALL_OR_NOTHING">오류 시 전체 취소</option>
                <option value="VALID_ROWS_ONLY">정상 행만 저장</option>
              </select>
            </label>
            <ExcelFilePicker
              id="transcript-school-info-file"
              label="추가정보 파일"
              file={schoolInfoFile}
              hint="출신고교 유형 판정이 필요한 경우에만 추가합니다."
              onChange={(selectedFile) => {
                setSchoolInfoFile(selectedFile);
                verification.reset();
                persistence.reset();
                exporter.reset();
                importer.reset();
              }}
            />
          </div>
        </details>
      </form>

      {error && (
        <div className="error-banner" role="alert">
          {errorMessage(error)}
        </div>
      )}

      {isSyuSource && !sourceImporter.data && (
        <p className="warning">
          삼육대 대용량 원천 파일은 미리보기 없이 백그라운드에서 처리됩니다. 파일의 입학연도와 달라도 되며,
          선택한 검증 기준연도의 모집요강을 적용합니다. 파일 내부에 여러 입학연도가 섞여 있으면 저장되지 않습니다.
        </p>
      )}

      {sourceImporter.data && (
        <div className="import-success">
          <strong>가져오기 #{sourceImporter.data.importId} 작업을 시작했습니다.</strong>
          <p>{sourceImporter.data.message}</p>
        </div>
      )}

      <div className="stored-verification-control">
        <span>
          <strong>DB 성적검증</strong>
          <small>선택한 대학·검증 기준연도의 최신 완료 저장본과 평가 규칙을 사용합니다.</small>
        </span>
        <button
          className="primary-action"
          type="button"
          disabled={!universityId || hasActiveImport || verification.isPending || importer.isPending || sourceImporter.isPending}
          onClick={() => {
            persistence.reset();
            verification.mutate();
          }}
        >
          {hasActiveImport ? '저장 처리 중…' : verification.isPending ? '검증 중…' : '성적 검증'}
        </button>
      </div>

      {verification.data && (
        <div className="import-preview">
          <div className="import-preview-heading">
            <div>
              <h2>DB 성적검증 결과</h2>
              <small>
                {verification.data.sourceFormat === 'SYU_SOURCE_WORKBOOK_V1'
                  ? '삼육대 전형·모집단위별 가상 시나리오 (화면 미리보기는 학교장추천 일반학과)'
                  : verification.data.sourceFormat === 'HANSHIN_MULTI_SHEET_V1'
                    ? '한신대 전달양식'
                    : '표준 성적양식'}
              </small>
            </div>
            <div className="import-preview-actions">
              <button
                className="primary-action"
                type="button"
                disabled={persistence.isPending}
                onClick={() => persistence.mutate()}
              >
                {persistence.isPending ? '저장 중…' : '검증 결과 DB 저장'}
              </button>
              <button type="button" disabled={exporter.isPending} onClick={() => exporter.mutate()}>
                {exporter.isPending ? '계산 중…' : '결과 다운로드'}
              </button>
            </div>
          </div>
          {persistence.data && (
            <div className="import-success">
              <strong>검증 결과 {persistence.data.savedResults.toLocaleString()}건을 DB에 저장했습니다.</strong>
              <p>
                업로드 #{persistence.data.sourceImportId} 기준 · 실패 {persistence.data.failedResults.toLocaleString()}건
                {persistence.data.replacedResults > 0
                  ? ` · 기존 결과 ${persistence.data.replacedResults.toLocaleString()}건 교체`
                  : ''}
              </p>
            </div>
          )}
          <div className="import-preview-summary">
            <span>
              <small>지원정보</small>
              <b>{verification.data.applicationRows.toLocaleString()}</b>
            </span>
            <span>
              <small>전체 성적</small>
              <b>{verification.data.totalRows.toLocaleString()}</b>
            </span>
            <span>
              <small>DB 저장</small>
              <b>{verification.data.validRows.toLocaleString()}</b>
            </span>
            <span className={verification.data.invalidRows ? 'has-error' : ''}>
              <small>오류</small>
              <b>{verification.data.invalidRows.toLocaleString()}</b>
            </span>
            <span>
              <small>제외</small>
              <b>{verification.data.skippedRows.toLocaleString()}</b>
            </span>
          </div>

          {verification.data.warnings.map((warning) => (
            <p className="warning" key={warning}>
              {warning}
            </p>
          ))}
          {verification.data.errors.length > 0 && (
            <div className="import-errors">
              {verification.data.errors.slice(0, 20).map((item) => (
                <p key={`${item.rowNumber}-${item.reason}`}>
                  <b>{item.rowNumber}행</b> {item.reason}
                </p>
              ))}
            </div>
          )}

          {verificationResult && (
            <section className="verification-preview" aria-labelledby="verification-preview-title">
              <div className="verification-preview__heading">
                <h2 id="verification-preview-title">최종 환산 결과</h2>
                <p>
                  전체 {verificationResult.totalApplications.toLocaleString()}건 · 성공{' '}
                  <b>{verificationResult.successfulApplications.toLocaleString()}</b>건 · 실패{' '}
                  <b>{verificationResult.failedApplications.toLocaleString()}</b>건
                </p>
              </div>
              {verificationResult.sampleResults.length > 0 ? (
                <div className="verification-result-table">
                  <div className="verification-result-row verification-result-row--head">
                    <b>지원정보 행</b>
                    <b>수험번호</b>
                    <b>전형명</b>
                    <b>모집단위명</b>
                    <b>반영 과목</b>
                    <b>평균등급</b>
                    <b>최종 환산점수</b>
                  </div>
                  {verificationResult.sampleResults.map((result) => (
                    <div
                      className="verification-result-row"
                      key={`${result.applicationRowNumber}-${result.applicantNumber}`}
                    >
                      <span>{result.applicationRowNumber.toLocaleString()}</span>
                      <span>
                        <strong>{result.applicantNumber}</strong>
                        <small>{result.studentName}</small>
                      </span>
                      <span>{result.admissionTrackName}</span>
                      <span>{result.recruitmentUnitName}</span>
                      <span>{result.includedCourseCount.toLocaleString()}개</span>
                      <span>{number(result.averageGrade)}</span>
                      <strong className="verification-final-score">{number(result.finalScore)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state verification-empty-state">
                  <strong>성공한 결과가 없습니다.</strong>
                  <span>실패 내용은 결과 파일에서 확인할 수 있습니다.</span>
                </div>
              )}
              {verificationResult.successfulApplications > verificationResult.sampleResults.length && (
                <p className="verification-preview__note">처음 {verificationResult.sampleResults.length}건만 표시됩니다.</p>
              )}
            </section>
          )}
        </div>
      )}

      {importer.data && (
        <div
          className={`import-success${importer.data.status === 'COMPLETED_WITH_ERRORS' ? ' import-success--partial' : ''}`}
        >
          <p>
            가져오기 #{importer.data.importId}: 학생 {importer.data.createdStudents}명 생성, 지원정보{' '}
            {importer.data.createdApplications}건 생성·{importer.data.deletedApplications}건 삭제, 과목{' '}
            {importer.data.createdCourses}건 생성·{importer.data.updatedCourses}건 수정·
            {importer.data.deletedCourses}건 삭제, {importer.data.skippedRows}건 제외
          </p>
          {importer.data.status === 'COMPLETED_WITH_ERRORS' && (
            <>
              <strong>일부 행을 가져오지 못했습니다. 실패 {importer.data.failedRows}건</strong>
              <div className="import-errors">
                {importer.data.errors.map((item) => (
                  <p key={`${item.rowNumber}-${item.reason}`}>
                    <b>{item.rowNumber}행</b> {item.reason}
                  </p>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="import-history">
        <strong>
          최근 가져오기
          {universityId > 0 && (
            <small>{history.isLoading ? '불러오는 중…' : `${history.data?.length ?? 0}건`}</small>
          )}
        </strong>
        {universityId === 0 && (
          <p className="import-history-empty">대학교를 선택하면 해당 대학의 최근 가져오기 이력을 확인할 수 있습니다.</p>
        )}
        {universityId > 0 && !history.isLoading && history.data?.length === 0 && (
          <p className="import-history-empty">선택한 대학의 가져오기 이력이 없습니다.</p>
        )}
        {history.data?.slice(0, 8).map((item) => (
          <span key={item.importId}>
            <b>
              #{item.importId} {item.originalFileName}
            </b>
            <small>
              {item.status === 'QUEUED' ? '대기 중' : item.status === 'PROCESSING' ? '처리 중' : item.status}
              {item.sourceFormat === 'SYU_SOURCE_WORKBOOK_V1' && item.sourceAdmissionYear
                ? ` · ${item.sourceAdmissionYear} 데이터 → ${item.admissionYear} 규칙`
                : ` · ${item.admissionYear}학년도`}
              {' · '}{item.importedRows.toLocaleString()}/{item.totalRows.toLocaleString()}행 · 오류{' '}
              {item.failedRows.toLocaleString()} ·{' '}
              {new Date(item.createdAt).toLocaleString()}
            </small>
            {item.errorMessage && <small>{item.errorMessage}</small>}
            {(item.status === 'COMPLETED' || item.status === 'COMPLETED_WITH_ERRORS')
              && (item.sourceFormat === 'SYU_SOURCE_WORKBOOK_V1' || item.hasSavedVerificationResults) && (
              <button
                className="import-history-download"
                type="button"
                disabled={historyExporter.isPending}
                onClick={() => historyExporter.mutate(item)}
              >
                {historyExporter.isPending && historyExporter.variables?.importId === item.importId
                  ? '내보내는 중…'
                  : '엑셀 내보내기'}
              </button>
            )}
            {(item.status === 'COMPLETED' || item.status === 'COMPLETED_WITH_ERRORS')
              && item.sourceFormat !== 'SYU_SOURCE_WORKBOOK_V1'
              && !item.hasSavedVerificationResults && (
              <small className="import-history-verification-pending">
                검증 결과를 DB에 저장하면 내보낼 수 있습니다.
              </small>
            )}
          </span>
        ))}
      </div>
    </section>
  );
}
