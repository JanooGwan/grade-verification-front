import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/apis/client';
import {
  exportTranscriptValidationExcel,
  importTranscriptExcel,
  previewTranscriptExcel,
} from '@/apis/transcript';
import type { TranscriptImportMode } from '@/apis/transcript/entity';
import { transcriptQueries, transcriptQueryKeys } from '@/apis/transcript/queries';
import { universityQueries } from '@/apis/university/queries';

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.response?.message ?? error.message;
  return error instanceof Error ? error.message : 'Excel 파일을 처리하지 못했습니다.';
}

function number(value: number | null) {
  return value == null ? '-' : value.toLocaleString('ko-KR', { maximumFractionDigits: 6 });
}

export default function TranscriptImportPanel({
  admissionYear,
  onAdmissionYearChange,
}: {
  admissionYear: number;
  onAdmissionYearChange: (year: number) => void;
}) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [schoolInfoFile, setSchoolInfoFile] = useState<File | null>(null);
  const [mode, setMode] = useState<TranscriptImportMode>('ALL_OR_NOTHING');
  const [universityId, setUniversityId] = useState(0);
  const universities = useQuery(universityQueries.list());
  const history = useQuery(transcriptQueries.imports());
  const preview = useMutation({
    mutationFn: () => previewTranscriptExcel(
      admissionYear, universityId, file as File, schoolInfoFile,
    ),
  });
  const exporter = useMutation({
    mutationFn: () => exportTranscriptValidationExcel(
      admissionYear, universityId, file as File, schoolInfoFile,
    ),
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
  const importer = useMutation({
    mutationFn: () => importTranscriptExcel(
      admissionYear, universityId, mode, file as File, schoolInfoFile,
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: transcriptQueryKeys.all });
    },
  });

  const submitPreview = (event: FormEvent) => {
    event.preventDefault();
    if (file) preview.mutate();
  };
  const error = preview.error ?? exporter.error ?? importer.error ?? universities.error ?? history.error;
  const verification = preview.data?.verification;

  return (
    <section className="transcript-import-panel transcript-import-panel--primary">
      <header className="transcript-import-heading">
        <span>
          <b>Excel 학생·성적 검증</b>
          <small>파일을 저장하기 전에 검증 결과와 지원정보별 최종 환산점수를 확인합니다.</small>
        </span>
        <i>최근 {history.data?.length ?? 0}건</i>
      </header>

      <form className="transcript-import-form" onSubmit={submitPreview}>
        <label htmlFor="transcript-admission-year">
          모집연도
          <input
            id="transcript-admission-year"
            type="number"
            min="2000"
            max="2100"
            value={admissionYear}
            onChange={(event) => {
              onAdmissionYearChange(Number(event.target.value));
              preview.reset();
              exporter.reset();
              importer.reset();
            }}
          />
          <small>검증할 모집요강 연도입니다. 과거 지원자 파일을 검증할 때는 원본 입학연도와 달라도 됩니다.</small>
        </label>
        <label htmlFor="transcript-university">
          대상 대학교
          <select
            id="transcript-university"
            value={universityId || ''}
            disabled={importer.isPending}
            onChange={(event) => {
              setUniversityId(Number(event.target.value));
              preview.reset();
              exporter.reset();
              importer.reset();
            }}
          >
            <option value="">선택</option>
            {universities.data?.filter((item) => item.active).map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label htmlFor="transcript-file">
          Excel 파일
          <input
            id="transcript-file"
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              preview.reset();
              exporter.reset();
              importer.reset();
            }}
          />
        </label>
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
        <label htmlFor="transcript-school-info-file">
          지원자 추가정보 Excel (선택)
          <input
            id="transcript-school-info-file"
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) => {
              setSchoolInfoFile(event.target.files?.[0] ?? null);
              preview.reset();
              exporter.reset();
              importer.reset();
            }}
          />
          <small>특성화고·종합고 전문계열·학력인정 시설의 출신고교 유형을 판정합니다.</small>
        </label>
        <button disabled={!file || !universityId || preview.isPending}>
          {preview.isPending ? '분석 중…' : '미리보기'}
        </button>
        <a href="/api/transcripts/imports/template">양식 다운로드</a>
      </form>

      {error && <div className="error-banner" role="alert">{errorMessage(error)}</div>}

      {preview.data && (
        <div className="import-preview">
          <div className="import-preview-summary">
            <span>형식 <b>{preview.data.sourceFormat === 'HANSHIN_MULTI_SHEET_V1' ? '한신대 전달양식' : '표준 성적양식'}</b></span>
            <span>지원정보 <b>{preview.data.applicationRows}</b></span>
            <span>전체 성적 <b>{preview.data.totalRows}</b></span>
            <span>정상 <b>{preview.data.validRows}</b></span>
            <span>제외 <b>{preview.data.skippedRows}</b></span>
            <span className={preview.data.invalidRows ? 'has-error' : ''}>오류 <b>{preview.data.invalidRows}</b></span>
            <button type="button" disabled={exporter.isPending} onClick={() => exporter.mutate()}>
              {exporter.isPending ? '성적 계산 중…' : '성적 검증 결과 Excel'}
            </button>
            <button
              type="button"
              disabled={importer.isPending || (mode === 'ALL_OR_NOTHING' && preview.data.invalidRows > 0)}
              onClick={() => importer.mutate()}
            >
              {importer.isPending ? '저장 중…' : 'DB 저장'}
            </button>
          </div>

          {preview.data.warnings.map((warning) => <p className="warning" key={warning}>{warning}</p>)}
          {preview.data.errors.length > 0 && (
            <div className="import-errors">
              {preview.data.errors.slice(0, 20).map((item) => (
                <p key={`${item.rowNumber}-${item.reason}`}><b>{item.rowNumber}행</b> {item.reason}</p>
              ))}
            </div>
          )}

          {verification && (
            <section className="verification-preview" aria-labelledby="verification-preview-title">
              <div className="verification-preview__heading">
                <div>
                  <p className="section-step">VERIFICATION RESULT</p>
                  <h2 id="verification-preview-title">지원정보별 최종 성적 검증 결과</h2>
                </div>
                <p>
                  전체 {verification.totalApplications.toLocaleString()}건 · 성공{' '}
                  <b>{verification.successfulApplications.toLocaleString()}</b>건 · 실패{' '}
                  <b>{verification.failedApplications.toLocaleString()}</b>건
                </p>
              </div>
              {verification.sampleResults.length > 0 ? (
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
                  {verification.sampleResults.map((result) => (
                    <div className="verification-result-row" key={`${result.applicationRowNumber}-${result.applicantNumber}`}>
                      <span>{result.applicationRowNumber.toLocaleString()}</span>
                      <span><strong>{result.applicantNumber}</strong><small>{result.studentName}</small></span>
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
                  <strong>표시할 성공 결과가 없습니다.</strong>
                  <span>실패 상세 내용은 ‘성적 검증 결과 Excel’에서 확인할 수 있습니다.</span>
                </div>
              )}
              {verification.successfulApplications > verification.sampleResults.length && (
                <p className="verification-preview__note">
                  화면에는 처음 {verification.sampleResults.length}건만 표시됩니다. 전체 결과는 Excel로 내려받아 확인하세요.
                </p>
              )}
            </section>
          )}
        </div>
      )}

      {importer.data && (
        <div className={`import-success${importer.data.status === 'COMPLETED_WITH_ERRORS' ? ' import-success--partial' : ''}`}>
          <p>
            가져오기 #{importer.data.importId}: 학생 {importer.data.createdStudents}명 생성, 지원정보{' '}
            {importer.data.createdApplications}건 생성, 과목 {importer.data.createdCourses}건 생성·
            {importer.data.updatedCourses}건 수정, {importer.data.skippedRows}건 제외
          </p>
          {importer.data.status === 'COMPLETED_WITH_ERRORS' && (
            <>
              <strong>일부 행을 가져오지 못했습니다. 실패 {importer.data.failedRows}건</strong>
              <div className="import-errors">
                {importer.data.errors.map((item) => (
                  <p key={`${item.rowNumber}-${item.reason}`}><b>{item.rowNumber}행</b> {item.reason}</p>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="import-history">
        <strong>최근 가져오기</strong>
        {history.data?.slice(0, 8).map((item) => (
          <span key={item.importId}>
            <b>#{item.importId} {item.originalFileName}</b>
            <small>
              {item.importedRows}/{item.totalRows}행 · 오류 {item.failedRows} ·{' '}
              {new Date(item.createdAt).toLocaleString()}
            </small>
          </span>
        ))}
      </div>
    </section>
  );
}
