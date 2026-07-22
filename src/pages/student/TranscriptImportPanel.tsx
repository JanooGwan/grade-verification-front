import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { exportTranscriptValidationExcel, importTranscriptExcel, previewTranscriptExcel } from '@/apis/transcript';
import type { TranscriptImportMode } from '@/apis/transcript/entity';
import { transcriptQueries, transcriptQueryKeys } from '@/apis/transcript/queries';
import { ApiError } from '@/apis/client';
import { universityQueries } from '@/apis/university/queries';

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.response?.message ?? error.message;
  return error instanceof Error ? error.message : 'Excel 파일을 처리하지 못했습니다.';
}

export default function TranscriptImportPanel({ admissionYear }: { admissionYear: number }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<TranscriptImportMode>('ALL_OR_NOTHING');
  const [universityId, setUniversityId] = useState(0);
  const universities = useQuery(universityQueries.list());
  const history = useQuery(transcriptQueries.imports());
  const preview = useMutation({ mutationFn: () => previewTranscriptExcel(admissionYear, universityId, file as File) });
  const exporter = useMutation({
    mutationFn: () => exportTranscriptValidationExcel(admissionYear, universityId, file as File),
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
    mutationFn: () => importTranscriptExcel(admissionYear, universityId, mode, file as File),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: transcriptQueryKeys.all });
    },
  });
  const submitPreview = (event: FormEvent) => {
    event.preventDefault();
    if (file) preview.mutate();
  };
  const error = preview.error ?? exporter.error ?? importer.error ?? history.error;
  return (
    <details className="transcript-import-panel">
      <summary><span><b>Excel 학생·성적 가져오기</b><small>저장 전에 오류 행과 샘플을 확인합니다.</small></span><i>최근 {history.data?.length ?? 0}건</i></summary>
      <form className="transcript-import-form" onSubmit={submitPreview}>
        <label>모집연도<input type="number" value={admissionYear} disabled /></label>
        <label>대상 대학교<select value={universityId || ''} onChange={(event) => setUniversityId(Number(event.target.value))}><option value="">선택</option>{universities.data?.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Excel 파일<input type="file" accept=".xlsx,.xls" onChange={(event) => { setFile(event.target.files?.[0] ?? null); preview.reset(); exporter.reset(); importer.reset(); }} /></label>
        <label>저장 정책<select value={mode} onChange={(event) => setMode(event.target.value as TranscriptImportMode)}><option value="ALL_OR_NOTHING">오류 시 전체 취소</option><option value="VALID_ROWS_ONLY">정상 행만 저장</option></select></label>
        <button disabled={!file || !universityId || preview.isPending}>{preview.isPending ? '분석 중…' : '미리보기'}</button>
        <a href="/api/transcripts/imports/template">양식 다운로드</a>
      </form>
      {error && <div className="error-banner">{errorMessage(error)}</div>}
      {preview.data && <div className="import-preview">
        <div className="import-preview-summary"><span>형식 <b>{preview.data.sourceFormat === 'HANSHIN_MULTI_SHEET_V1' ? '한신대 전달양식' : '표준 성적양식'}</b></span><span>지원정보 <b>{preview.data.applicationRows}</b></span><span>전체 성적 <b>{preview.data.totalRows}</b></span><span>정상 <b>{preview.data.validRows}</b></span><span>제외 <b>{preview.data.skippedRows}</b></span><span className={preview.data.invalidRows ? 'has-error' : ''}>오류 <b>{preview.data.invalidRows}</b></span><button type="button" disabled={exporter.isPending} onClick={() => exporter.mutate()}>{exporter.isPending ? '성적 계산 중…' : '성적 검증 결과 Excel'}</button><button type="button" disabled={importer.isPending || (mode === 'ALL_OR_NOTHING' && preview.data.invalidRows > 0)} onClick={() => importer.mutate()}>{importer.isPending ? '저장 중…' : 'DB 저장'}</button></div>
        {preview.data.warnings.map((warning) => <p className="warning" key={warning}>{warning}</p>)}
        {preview.data.errors.length > 0 && <div className="import-errors">{preview.data.errors.slice(0, 20).map((item) => <p key={`${item.rowNumber}-${item.reason}`}><b>{item.rowNumber}행</b> {item.reason}</p>)}</div>}
        <div className="import-sample-table"><div><b>행</b><b>지원자</b><b>학기</b><b>교과·과목</b><b>성적</b></div>{preview.data.sampleRows.slice(0, 10).map((row) => <div key={row.rowNumber}><span>{row.rowNumber}</span><span>{row.studentName}<small>{row.applicantNumber}</small></span><span>{row.schoolYear}-{row.semester}</span><span>{row.subjectCategory} · {row.courseName}</span><span>{row.grade ? `${row.grade}등급` : row.achievement}</span></div>)}</div>
      </div>}
      {importer.data && <p className="import-success">가져오기 #{importer.data.importId}: 학생 {importer.data.createdStudents}명 생성, 지원정보 {importer.data.createdApplications}건 생성, 과목 {importer.data.createdCourses}건 생성·{importer.data.updatedCourses}건 수정, {importer.data.skippedRows}건 제외</p>}
      <div className="import-history"><strong>최근 가져오기</strong>{history.data?.slice(0, 8).map((item) => <span key={item.importId}><b>#{item.importId} {item.originalFileName}</b><small>{item.importedRows}/{item.totalRows}행 · 오류 {item.failedRows} · {new Date(item.createdAt).toLocaleString()}</small></span>)}</div>
    </details>
  );
}
