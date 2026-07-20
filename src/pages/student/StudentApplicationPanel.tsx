import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createStudentApplication,
  deleteStudentApplication,
  getVerificationHistoryDetail,
  verifyStudentApplication,
} from '@/apis/admission';
import type {
  StudentApplication,
} from '@/apis/admission/entity';
import { admissionQueries, admissionQueryKeys } from '@/apis/admission/queries';
import { ApiError } from '@/apis/client';
import type { GradeVerification, SubjectCategory } from '@/apis/evaluation/entity';
import type { StudentTranscript } from '@/apis/transcript/entity';
import { universityQueries } from '@/apis/university/queries';
import ConfirmDialog from '@/components/ConfirmDialog';

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
  return error instanceof Error ? error.message : '지원 정보를 처리하지 못했습니다.';
}

export default function StudentApplicationPanel({ transcript }: { transcript: StudentTranscript }) {
  const queryClient = useQueryClient();
  const [universityId, setUniversityId] = useState(0);
  const [trackId, setTrackId] = useState(0);
  const [unitId, setUnitId] = useState(0);
  const [verification, setVerification] = useState<GradeVerification | null>(null);
  const [applicationPendingDelete, setApplicationPendingDelete] = useState<number | null>(null);
  const universitiesQuery = useQuery(universityQueries.list());
  const tracksQuery = useQuery({
    ...admissionQueries.tracks(universityId, transcript.admissionYear),
    enabled: universityId > 0,
  });
  const applicationsQuery = useQuery(admissionQueries.applications(transcript.studentId));
  const historyQuery = useQuery(admissionQueries.verifications(transcript.studentId));
  const selectedTrack = tracksQuery.data?.find((track) => track.id === trackId);
  const activeUnits = selectedTrack?.recruitmentUnits.filter((unit) => unit.active) ?? [];

  const createMutation = useMutation({
    mutationFn: () => createStudentApplication(transcript.studentId, unitId),
    onSuccess: async () => {
      setUnitId(0);
      setVerification(null);
      await queryClient.invalidateQueries({
        queryKey: admissionQueryKeys.applications(transcript.studentId),
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (applicationId: number) =>
      deleteStudentApplication(transcript.studentId, applicationId),
    onSuccess: async () => {
      setVerification(null);
      setApplicationPendingDelete(null);
      await queryClient.invalidateQueries({
        queryKey: admissionQueryKeys.applications(transcript.studentId),
      });
    },
  });
  const verifyMutation = useMutation({
    mutationFn: (applicationId: number) =>
      verifyStudentApplication(transcript.studentId, applicationId),
    onSuccess: async (response) => {
      setVerification(response.verification);
      await queryClient.invalidateQueries({ queryKey: admissionQueryKeys.verifications(transcript.studentId) });
    },
  });
  const historyDetailMutation = useMutation({
    mutationFn: (runId: number) => getVerificationHistoryDetail(transcript.studentId, runId),
    onSuccess: (response) => setVerification(response.verification),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (unitId > 0) createMutation.mutate();
  };

  const removeApplication = (applicationId: number) => {
    setApplicationPendingDelete(applicationId);
  };

  const requestError = createMutation.error ?? deleteMutation.error ?? verifyMutation.error ?? historyDetailMutation.error
    ?? applicationsQuery.error ?? tracksQuery.error;

  return (
    <section className="application-workspace">
      <div className="application-heading">
        <div>
          <p className="section-step">APPLICATION & RULE MATCH</p>
          <h3>지원 정보와 자동 규칙 연결</h3>
          <p>지원 대학·전형·모집단위를 등록하면 게시된 규칙을 자동으로 찾아 계산합니다.</p>
        </div>
        <span>{applicationsQuery.data?.length ?? 0}건 지원</span>
      </div>

      <form className="application-form" onSubmit={submit}>
        <label>지원 대학
          <select value={universityId} onChange={(event) => {
            setUniversityId(Number(event.target.value));
            setTrackId(0);
            setUnitId(0);
          }}>
            <option value={0}>대학 선택</option>
            {universitiesQuery.data?.filter((university) => university.active).map((university) => (
              <option key={university.id} value={university.id}>{university.name}</option>
            ))}
          </select>
        </label>
        <label>전형
          <select disabled={!universityId} value={trackId} onChange={(event) => {
            setTrackId(Number(event.target.value));
            setUnitId(0);
          }}>
            <option value={0}>전형 선택</option>
            {tracksQuery.data?.filter((track) => track.active).map((track) => (
              <option key={track.id} value={track.id}>{track.name}</option>
            ))}
          </select>
        </label>
        <label>모집단위
          <select disabled={!trackId} value={unitId} onChange={(event) => setUnitId(Number(event.target.value))}>
            <option value={0}>모집단위 선택</option>
            {activeUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={!unitId || createMutation.isPending}>
          {createMutation.isPending ? '등록 중…' : '지원 등록'}
        </button>
      </form>

      {universityId > 0 && !tracksQuery.isLoading && tracksQuery.data?.length === 0 && (
        <p className="application-notice">이 대학의 {transcript.admissionYear}학년도 전형이 없습니다. 먼저 규칙 또는 전형을 등록해 주세요.</p>
      )}
      {requestError && <div className="error-banner" role="alert">{errorMessage(requestError)}</div>}

      <div className="application-list">
        {applicationsQuery.data?.map((application) => (
          <ApplicationCard
            key={application.id}
            application={application}
            studentId={transcript.studentId}
            verifying={verifyMutation.isPending && verifyMutation.variables === application.id}
            deleting={deleteMutation.isPending && deleteMutation.variables === application.id}
            onVerify={(applicationId) => verifyMutation.mutate(applicationId)}
            onDelete={removeApplication}
          />
        ))}
        {!applicationsQuery.isLoading && applicationsQuery.data?.length === 0 && (
          <div className="application-empty">등록된 지원 정보가 없습니다. 위에서 지원 대학과 모집단위를 선택해 주세요.</div>
        )}
      </div>

      {historyQuery.data && historyQuery.data.length > 0 && <details className="verification-history">
        <summary>성적 검증 이력 {historyQuery.data.length}건</summary>
        <div>{historyQuery.data.map((run) => <button type="button" key={run.verificationRunId} onClick={() => historyDetailMutation.mutate(run.verificationRunId)}><span>{run.universityName} · {run.recruitmentUnit}</span><b>{run.finalScore}점</b><small>v{run.ruleVersion} · {new Date(run.createdAt).toLocaleString()}</small></button>)}</div>
      </details>}
      {verification && <VerificationDetail result={verification} />}
      <ConfirmDialog
        open={applicationPendingDelete !== null}
        title="지원 정보를 삭제할까요?"
        description="이 학생의 대학·전형·모집단위 연결이 삭제됩니다. 학생부 성적은 유지됩니다."
        confirmLabel="지원 정보 삭제"
        pending={deleteMutation.isPending}
        danger
        onCancel={() => setApplicationPendingDelete(null)}
        onConfirm={() => {
          if (applicationPendingDelete !== null) deleteMutation.mutate(applicationPendingDelete);
        }}
      />
    </section>
  );
}

function ApplicationCard({ application, studentId, verifying, deleting, onVerify, onDelete }: {
  application: StudentApplication;
  studentId: number;
  verifying: boolean;
  deleting: boolean;
  onVerify: (applicationId: number) => void;
  onDelete: (applicationId: number) => void;
}) {
  const matchQuery = useQuery(admissionQueries.ruleMatch(studentId, application.id));
  const match = matchQuery.data;
  const status = match?.status ?? 'LOADING';
  const statusLabel = status === 'MATCHED' ? '규칙 연결됨'
    : status === 'NOT_FOUND' ? '규칙 없음'
      : status === 'CONFLICT' ? '중복 충돌' : '확인 중';

  return (
    <article className="application-item">
      <div className="application-item-main">
        <span className={`rule-match-badge rule-match-badge--${status.toLowerCase()}`}>{statusLabel}</span>
        <strong>{application.universityName} · {application.recruitmentUnitName}</strong>
        <p>{application.admissionYear}학년도 · {application.admissionTrackName}</p>
        {match && <small>{match.message}</small>}
        {match?.candidates.map((candidate) => (
          <small key={candidate.ruleId}>
            적용 후보: {candidate.name} v{candidate.version}
            {candidate.sourceDocument && ` · ${candidate.sourceDocument}`}
            {candidate.sourcePages && ` p.${candidate.sourcePages}`}
          </small>
        ))}
      </div>
      <div className="application-actions">
        <button
          type="button"
          disabled={match?.status !== 'MATCHED' || verifying}
          onClick={() => onVerify(application.id)}
        >
          {verifying ? '계산 중…' : '자동 성적 검증'}
        </button>
        <button className="application-delete" type="button" disabled={deleting} onClick={() => onDelete(application.id)}>
          삭제
        </button>
      </div>
    </article>
  );
}

function VerificationDetail({ result }: { result: GradeVerification }) {
  const [showExcluded, setShowExcluded] = useState(true);
  const calculations = showExcluded ? result.calculations : result.calculations.filter((course) => course.included);
  return (
    <section className="student-verification-result">
      <div className="verification-result-heading">
        <div>
          <p className="section-step">VERIFICATION RESULT</p>
          <h3>{result.universityName} 최종 환산 결과</h3>
          <p>{result.admissionType} · {result.recruitmentUnit} · {result.ruleName} v{result.ruleVersion}</p>
        </div>
        <div className="verification-score"><small>최종 점수</small><strong>{result.finalScore}</strong><span>평균등급 {result.averageGrade}</span></div>
      </div>
      <div className="verification-facts">
        <span><b>{result.includedCourseCount}</b>개 반영</span>
        <span><b>{result.excludedCourseCount}</b>개 제외</span>
        <span>근거: {result.sourceDocument || '미등록'} {result.sourcePages && `p.${result.sourcePages}`}</span>
      </div>
      {result.warnings.map((warning) => <p className="verification-warning" key={warning}>⚠ {warning}</p>)}
      <div className="calculation-heading">
        <strong>과목별 계산 근거</strong>
        <label><input type="checkbox" checked={showExcluded} onChange={(event) => setShowExcluded(event.target.checked)} />제외 과목 함께 보기</label>
      </div>
      <div className="student-calculation-table">
        <div className="student-calculation-row student-calculation-row--head">
          <span>학년/학기</span><span>교과·과목</span><span>입력</span><span>환산점수</span><span>학년×교과×단위</span><span>결과</span>
        </div>
        {calculations.map((course, index) => (
          <div className={`student-calculation-row ${course.included ? 'is-included' : 'is-excluded'}`} key={`${course.courseName}-${course.schoolYear}-${course.semester}-${index}`}>
            <span>{course.schoolYear}-{course.semester}</span>
            <span><b>{subjectLabels[course.subjectCategory]}</b>{course.courseName}{course.appliedSubjectCategory && course.subjectCategory !== course.appliedSubjectCategory && <small>→ {subjectLabels[course.appliedSubjectCategory]} 반영</small>}</span>
            <span>{course.grade ? `${course.grade}등급` : course.achievement ?? '-'}</span>
            <span>{course.convertedScore ?? '-'}</span>
            <span>{course.gradeWeight} × {course.subjectWeight} × {course.credits}<small>적용 {course.appliedWeight}</small></span>
            <span>{course.included ? <b>반영 {course.weightedScore}</b> : <em>{course.exclusionReason}</em>}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
