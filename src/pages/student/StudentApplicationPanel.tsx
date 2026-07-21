import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  calculateStudentApplicationScore,
  createStudentApplication,
  deleteStudentApplication,
  getVerificationHistoryDetail,
  verifyStudentApplication,
} from '@/apis/admission';
import type {
  ApplicationScore,
  CalculateApplicationScoreRequest,
  EducationBackground,
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
  const [applicationScore, setApplicationScore] = useState<ApplicationScore | null>(null);
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
  const scoreMutation = useMutation({
    mutationFn: ({ applicationId, request }: {
      applicationId: number;
      request: CalculateApplicationScoreRequest;
    }) => calculateStudentApplicationScore(transcript.studentId, applicationId, request),
    onSuccess: (response) => setApplicationScore(response),
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

  const requestError = createMutation.error ?? deleteMutation.error ?? verifyMutation.error ?? scoreMutation.error ?? historyDetailMutation.error
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
            scoring={scoreMutation.isPending && scoreMutation.variables?.applicationId === application.id}
            onVerify={(applicationId) => verifyMutation.mutate(applicationId)}
            onScore={(applicationId, request) => scoreMutation.mutate({ applicationId, request })}
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
      {applicationScore && <ApplicationScoreDetail result={applicationScore} />}
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

function ApplicationCard({ application, studentId, verifying, deleting, scoring, onVerify, onScore, onDelete }: {
  application: StudentApplication;
  studentId: number;
  verifying: boolean;
  deleting: boolean;
  scoring: boolean;
  onVerify: (applicationId: number) => void;
  onScore: (applicationId: number, request: CalculateApplicationScoreRequest) => void;
  onDelete: (applicationId: number) => void;
}) {
  const matchQuery = useQuery(admissionQueries.ruleMatch(studentId, application.id));
  const match = matchQuery.data;
  const status = match?.status ?? 'LOADING';
  const statusLabel = status === 'MATCHED' ? '규칙 연결됨'
    : status === 'NOT_FOUND' ? '규칙 없음'
      : status === 'CONFLICT' ? '중복 충돌' : '확인 중';
  const supportsQuantitativeScore = application.admissionYear === 2027
    && application.universityName.replaceAll(' ', '').includes('한신');

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
        {match?.status === 'MATCHED' && supportsQuantitativeScore && (
          <ApplicationScoreForm
            application={application}
            pending={scoring}
            onSubmit={(request) => onScore(application.id, request)}
          />
        )}
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

const blankScoreRequest = (): CalculateApplicationScoreRequest => ({
  educationBackground: 'DOMESTIC_HIGH_SCHOOL',
  gedAverageScore: null,
  unexcusedAbsenceDays: 0,
  unexcusedTardyCount: 0,
  unexcusedEarlyLeaveCount: 0,
  unexcusedClassAbsenceCount: 0,
  schoolViolenceAction: 0,
  essayScore: null,
  practicalScore: null,
});

function ApplicationScoreForm({ application, pending, onSubmit }: {
  application: StudentApplication;
  pending: boolean;
  onSubmit: (request: CalculateApplicationScoreRequest) => void;
}) {
  const [request, setRequest] = useState(blankScoreRequest);
  const trackName = application.admissionTrackName.replaceAll(' ', '');
  const needsAttendance = trackName.includes('참인재') && request.educationBackground !== 'GED';
  const needsEssay = trackName.includes('논술');
  const needsPractical = trackName.includes('체육실기');
  const inputId = `application-score-${application.id}`;
  const number = (value: string) => value === '' ? null : Number(value);

  return (
    <details className="application-score-form">
      <summary>검정고시·외국고·출결·학교폭력 포함 총점 계산</summary>
      <div className="application-score-fields">
        <label htmlFor={`${inputId}-background`}>학력 유형</label>
        <select
          id={`${inputId}-background`}
          value={request.educationBackground}
          onChange={(event) => setRequest({
            ...request,
            educationBackground: event.target.value as EducationBackground,
          })}
        >
          <option value="DOMESTIC_HIGH_SCHOOL">국내 고등학교</option>
          <option value="GED">검정고시</option>
          <option value="FOREIGN_HIGH_SCHOOL">외국 고등학교</option>
        </select>

        {request.educationBackground === 'GED' && <>
          <label htmlFor={`${inputId}-ged`}>검정고시 전 과목 평균</label>
          <input id={`${inputId}-ged`} type="number" min="0" max="100" step="0.01" value={request.gedAverageScore ?? ''} onChange={(event) => setRequest({ ...request, gedAverageScore: number(event.target.value) })} />
        </>}

        {needsAttendance && <>
          <label htmlFor={`${inputId}-absence`}>미인정 결석</label>
          <input id={`${inputId}-absence`} type="number" min="0" value={request.unexcusedAbsenceDays ?? ''} onChange={(event) => setRequest({ ...request, unexcusedAbsenceDays: number(event.target.value) })} />
          <label htmlFor={`${inputId}-tardy`}>미인정 지각</label>
          <input id={`${inputId}-tardy`} type="number" min="0" value={request.unexcusedTardyCount ?? ''} onChange={(event) => setRequest({ ...request, unexcusedTardyCount: number(event.target.value) })} />
          <label htmlFor={`${inputId}-early-leave`}>미인정 조퇴</label>
          <input id={`${inputId}-early-leave`} type="number" min="0" value={request.unexcusedEarlyLeaveCount ?? ''} onChange={(event) => setRequest({ ...request, unexcusedEarlyLeaveCount: number(event.target.value) })} />
          <label htmlFor={`${inputId}-class-absence`}>미인정 결과</label>
          <input id={`${inputId}-class-absence`} type="number" min="0" value={request.unexcusedClassAbsenceCount ?? ''} onChange={(event) => setRequest({ ...request, unexcusedClassAbsenceCount: number(event.target.value) })} />
        </>}

        {needsEssay && <>
          <label htmlFor={`${inputId}-essay`}>논술고사 점수(800점)</label>
          <input id={`${inputId}-essay`} type="number" min="0" max="800" value={request.essayScore ?? ''} onChange={(event) => setRequest({ ...request, essayScore: number(event.target.value) })} />
        </>}

        {needsPractical && <>
          <label htmlFor={`${inputId}-practical`}>체육실기 환산점수(550점)</label>
          <input id={`${inputId}-practical`} type="number" min="0" max="550" step="0.01" value={request.practicalScore ?? ''} onChange={(event) => setRequest({ ...request, practicalScore: number(event.target.value) })} />
        </>}

        <label htmlFor={`${inputId}-violence`}>학교폭력 조치</label>
        <select id={`${inputId}-violence`} value={request.schoolViolenceAction} onChange={(event) => setRequest({ ...request, schoolViolenceAction: Number(event.target.value) })}>
          <option value={0}>없음</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((action) => <option key={action} value={action}>{action}호</option>)}
        </select>
      </div>
      <button type="button" disabled={pending} onClick={() => onSubmit(request)}>
        {pending ? '총점 계산 중…' : '전형 총점 계산'}
      </button>
      {trackName.includes('참인재') && <p>면접 400점은 정성평가이므로 교과·출결 정량점수만 계산하고 최종 총점은 보류합니다.</p>}
    </details>
  );
}

function ApplicationScoreDetail({ result }: { result: ApplicationScore }) {
  const statusLabel = result.status === 'COMPLETE' ? '정량평가 계산 완료'
    : result.status === 'QUALITATIVE_PENDING' ? '정성평가 반영 보류'
      : '지원자격 미달';
  return (
    <section className={`application-score-result application-score-result--${result.status.toLowerCase()}`}>
      <header>
        <div><small>APPLICATION SCORE</small><h3>{result.universityName} 전형 총점</h3><p>{result.admissionTrackName} · {result.recruitmentUnitName}</p></div>
        <div><span>{statusLabel}</span><strong>{result.finalScore ?? result.scoreAfterDeduction}</strong><small>/ {result.maximumTotalScore}점</small></div>
      </header>
      <div className="application-score-components">
        <span><small>학생부 기초점수</small><b>{result.academicBaseScore}</b></span>
        <span><small>교과 반영점수</small><b>{result.academicScore}</b></span>
        {result.attendanceScore !== null && <span><small>출결점수{result.equivalentAbsenceDays !== null && ` · 환산결석 ${result.equivalentAbsenceDays}일`}</small><b>{result.attendanceScore}</b></span>}
        {result.additionalScore !== null && <span><small>논술·실기점수</small><b>{result.additionalScore}</b></span>}
        <span><small>학교폭력 감점</small><b>-{result.schoolViolenceDeduction}</b></span>
        <span><small>정량점수</small><b>{result.scoreAfterDeduction} / {result.maximumQuantitativeScore}</b></span>
      </div>
      {result.pendingComponents.map((component) => <p className="verification-warning" key={component}>보류: {component}</p>)}
      {result.ineligibilityReasons.map((reason) => <p className="error-banner" key={reason}>{reason}</p>)}
      {result.warnings.map((warning) => <p className="verification-warning" key={warning}>참고: {warning}</p>)}
      {result.gradeVerification && <VerificationDetail result={result.gradeVerification} />}
    </section>
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
