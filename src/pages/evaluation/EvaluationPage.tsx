import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/apis/client';
import {
  createDraftEvaluationRules,
  createEvaluationRule,
  createEvaluationRuleFromExtraction,
  compareRuleExtractions,
  extractEvaluationRuleFromPdf,
  publishEvaluationRule,
  retireEvaluationRule,
  reviewEvaluationRule,
  verifyGrades,
} from '@/apis/evaluation';
import type {
  AchievementLevel,
  CourseGrade,
  CreateEvaluationRuleRequest,
  EvaluationRule,
  EvaluationRuleStatus,
  GradeVerification,
  RuleExtraction,
  SelectionStrategy,
  SubjectCategory,
} from '@/apis/evaluation/entity';
import { evaluationQueries, evaluationQueryKeys } from '@/apis/evaluation/queries';
import { universityQueries } from '@/apis/university/queries';
import { toCourseGrade, type StudentTranscript } from '@/apis/transcript/entity';
import ConfirmDialog from '@/components/ConfirmDialog';
import CalculationTrace from '@/components/CalculationTrace';
import StatusPanel from '@/components/StatusPanel';

const subjects: Array<[SubjectCategory, string]> = [
  ['KOREAN', '국어'],
  ['MATH', '수학'],
  ['ENGLISH', '영어'],
  ['SOCIAL', '사회'],
  ['SCIENCE', '과학'],
  ['OTHER', '기타'],
];

const strategyLabels: Record<SelectionStrategy, string> = {
  ALL_COURSES: '지정 교과 전 과목',
  TOP_N_COURSES: '전체 상위 N과목',
  TOP_N_COURSES_PER_SUBJECT: '교과별 상위 N과목',
  CORE_SCIENCE_TOP_N: '국·영·수·과 교과별 상위과목',
  CORE_PLUS_BEST_CREDIT_OPTIONAL_TOP_N: '국·영·수 + 사회/과학 이수단위 우수 교과',
  TOP_N_SEMESTERS: '우수 N개 학기',
  TOP_N_SUBJECTS: '우수 N개 교과',
  BEST_SEMESTER_PER_GRADE: '학년별 우수 학기',
};

const emptyCourse = (): CourseGrade => ({
  schoolYear: 1,
  semester: 1,
  subjectCategory: 'KOREAN',
  courseName: '',
  grade: 1,
  achievement: null,
  rawScore: null,
  meanScore: null,
  standardDeviation: null,
  studentCount: null,
  careerSubject: false,
  professionalCourse: false,
  credits: 3,
});

const baseRule: CreateEvaluationRuleRequest = {
  universityId: 0,
  name: '',
  admissionYear: 2027,
  admissionType: '학생부교과',
  recruitmentUnit: '',
  version: 1,
  gradeWeights: [33.3333, 33.3333, 33.3334],
  subjectWeights: [1, 1, 1, 1, 1, 0],
  gradeScores: [100, 99, 98, 97, 96, 95, 94, 80, 50],
  selectionStrategy: 'ALL_COURSES',
  selectionCount: 0,
  achievementSelectionCount: 0,
  minimumCourseCount: 0,
  scoreAggregation: 'COURSE_SCORE_AVERAGE',
  achievementConversion: 'DIRECT_TABLE',
  includeThirdYearSecondSemester: false,
  includeThirdYearSecondSemesterForGraduates: false,
  includeProfessionalCourses: false,
  normalizeGradeWeights: false,
  intermediateScale: 4,
  intermediateRounding: 'HALF_UP',
  finalScale: 4,
  finalRounding: 'HALF_UP',
  scoreMultiplier: 1,
  achievementGrades: [1, 3, 5],
  achievementScores: [100, 99, 98],
  subjectPriorities: [3, 2, 4, 5, 1, 6],
  sourceDocument: '',
  sourcePages: '',
  interpretationNote: '',
  changeSummary: '',
};

const presets: Array<{ label: string; values: Partial<CreateEvaluationRuleRequest> }> = [
  {
    label: '삼육대 일반학과 전 과목',
    values: {
      selectionStrategy: 'ALL_COURSES',
      selectionCount: 0,
      gradeWeights: [33.3333, 33.3333, 33.3334],
      subjectWeights: [1, 1, 1, 1, 1, 0],
      gradeScores: [100, 100, 99, 99, 98, 90, 90, 70, 70],
      achievementGrades: [1, 3, 5],
      achievementScores: [100, 99, 98],
      sourceDocument: '(수시)2027학년도 삼육대 수시 모집요강.pdf',
      sourcePages: '53-54',
    },
  },
  {
    label: '삼육대 예체능 상위 2교과',
    values: {
      selectionStrategy: 'TOP_N_SUBJECTS',
      selectionCount: 2,
      gradeWeights: [33.3333, 33.3333, 33.3334],
      subjectWeights: [1, 1, 1, 1, 1, 0],
      gradeScores: [100, 100, 99, 99, 98, 90, 90, 70, 70],
      achievementGrades: [1, 3, 5],
      achievementScores: [100, 99, 98],
      sourceDocument: '(수시)2027학년도 삼육대 수시 모집요강.pdf',
      sourcePages: '53-54',
    },
  },
  {
    label: '삼육대 약학과 전 과목',
    values: {
      selectionStrategy: 'ALL_COURSES',
      selectionCount: 0,
      gradeWeights: [33.3333, 33.3333, 33.3334],
      subjectWeights: [1, 1, 1, 1, 1, 0],
      gradeScores: [100, 99, 98, 96.5, 95, 92, 85, 60, 0],
      achievementGrades: [1, 3, 5],
      achievementScores: [100, 99, 98],
      sourceDocument: '(수시)2027학년도 삼육대 수시 모집요강.pdf',
      sourcePages: '53-54',
    },
  },
  {
    label: '한국공학대 공학계열 교과별 상위과목',
    values: {
      selectionStrategy: 'CORE_SCIENCE_TOP_N',
      selectionCount: 4,
      achievementSelectionCount: 2,
      includeThirdYearSecondSemesterForGraduates: true,
      gradeWeights: [33.3333, 33.3333, 33.3334],
      subjectWeights: [1, 1, 1, 0, 1, 0],
      gradeScores: [100, 99, 98, 97, 96, 94, 80, 60, 25],
      achievementGrades: [1, 2, 4],
      achievementScores: [100, 99, 97],
      subjectPriorities: [3, 4, 5, 1, 2, 6],
      sourceDocument: '(수시)2027학년도 한국공학대 수시 모집요강.pdf',
      sourcePages: '34-35',
    },
  },
  {
    label: '한국공학대 경영학부 교과별 상위과목',
    values: {
      selectionStrategy: 'CORE_PLUS_BEST_CREDIT_OPTIONAL_TOP_N',
      selectionCount: 4,
      achievementSelectionCount: 2,
      includeThirdYearSecondSemesterForGraduates: true,
      gradeWeights: [33.3333, 33.3333, 33.3334],
      gradeScores: [100, 99, 98, 97, 96, 94, 80, 60, 25],
      achievementGrades: [1, 2, 4],
      achievementScores: [100, 99, 97],
      subjectPriorities: [3, 4, 5, 1, 2, 6],
      sourceDocument: '(수시)2027학년도 한국공학대 수시 모집요강.pdf',
      sourcePages: '34-35',
    },
  },
  {
    label: '한신대 교과100% 상위 12과목',
    values: {
      selectionStrategy: 'TOP_N_COURSES',
      selectionCount: 12,
      minimumCourseCount: 12,
      achievementSelectionCount: 0,
      achievementConversion: 'EXCLUDE',
      includeThirdYearSecondSemester: false,
      includeThirdYearSecondSemesterForGraduates: true,
      includeProfessionalCourses: false,
      gradeWeights: [33.3333, 33.3333, 33.3334],
      subjectWeights: [1, 1, 1, 1, 1, 0],
      gradeScores: [100, 99, 98, 97, 96, 95, 94, 80, 50],
      scoreMultiplier: 10,
      intermediateScale: 3,
      intermediateRounding: 'HALF_UP',
      finalScale: 2,
      finalRounding: 'HALF_UP',
      sourceDocument: '(수시)2027학년도 한신대 수시 모집요강.pdf',
      sourcePages: '36-38',
      interpretationNote: '국어·수학·영어·사회·과학(한국사 포함) 중 석차등급 우수 12과목. 동석차등급은 이수단위가 큰 과목 우선. 진로선택과목 제외. 졸업예정자는 3학년 1학기까지, 졸업자는 전 학년 반영.',
    },
  },
  {
    label: '경복대 우수 2개 학기',
    values: {
      selectionStrategy: 'TOP_N_SEMESTERS',
      selectionCount: 2,
      scoreAggregation: 'AVERAGE_GRADE_THEN_SCORE',
      gradeWeights: [33.3333, 33.3333, 33.3334],
      gradeScores: [100, 87.5, 75, 62.5, 50, 37.5, 25, 12.5, 0],
      achievementGrades: [1, 3, 5],
      intermediateScale: 1,
      intermediateRounding: 'DOWN',
      finalScale: 2,
      sourceDocument: '2026학년도 수시 및 정시 모집요강_경복대학교.pdf',
      sourcePages: '45-46',
    },
  },
  {
    label: '명지전문대 학년별 우수학기',
    values: {
      selectionStrategy: 'BEST_SEMESTER_PER_GRADE',
      selectionCount: 0,
      gradeWeights: [30, 30, 40],
      subjectWeights: [1, 1, 1, 1, 1, 1],
      gradeScores: [100, 90, 80, 70, 60, 50, 40, 30, 20],
      scoreMultiplier: 10,
      normalizeGradeWeights: true,
      intermediateScale: 5,
      finalScale: 2,
      sourceDocument: '(MJC)_2027학년도_신입학_수시_모집요강.pdf',
      sourcePages: '19, 21, 35-38',
    },
  },
];

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.response?.message ?? error.message;
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.';
}

export function RuleManagementPage() {
  const queryClient = useQueryClient();
  const universitiesQuery = useQuery(universityQueries.list());
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [rulePrefill, setRulePrefill] = useState<Partial<CreateEvaluationRuleRequest>>({});
  const [sourceExtractionId, setSourceExtractionId] = useState<number | null>(null);
  const ruleMutation = useMutation({
    mutationFn: ({ request, extractionId }: { request: CreateEvaluationRuleRequest; extractionId: number | null }) =>
      extractionId === null
        ? createEvaluationRule(request)
        : createEvaluationRuleFromExtraction(extractionId, request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: evaluationQueryKeys.all });
      setShowRuleForm(false);
      setRulePrefill({});
      setSourceExtractionId(null);
    },
  });

  const openManualRuleForm = () => {
    setShowRuleForm((value) => !value);
    setRulePrefill({});
    setSourceExtractionId(null);
  };

  return (
    <main className="evaluation-page rules-page">
      <header className="evaluation-header">
        <div>
          <p className="eyebrow">Rule workspace</p>
          <h1>규칙 관리</h1>
          <p className="page-description">모집요강 PDF에서 규칙 초안을 추출하고 근거를 검수한 뒤 게시 상태를 관리합니다.</p>
        </div>
        <button className="outline-button" type="button" aria-expanded={showRuleForm} onClick={openManualRuleForm}>
          {showRuleForm ? '규칙 등록 닫기' : '+ 반영 규칙 등록'}
        </button>
      </header>

      {showRuleForm && (
        <RuleForm
          key={sourceExtractionId ?? 'manual'}
          universities={universitiesQuery.data ?? []}
          pending={ruleMutation.isPending}
          initialValues={rulePrefill}
          onSubmit={(request) => ruleMutation.mutate({ request, extractionId: sourceExtractionId })}
        />
      )}

      {(universitiesQuery.isError || ruleMutation.isError) && (
        <div className="error-banner" role="alert">
          {errorMessage(ruleMutation.error ?? universitiesQuery.error)}
        </div>
      )}

      <RuleLifecyclePanel
        universities={universitiesQuery.data ?? []}
        onApplyExtraction={(extractionId, values) => {
          setSourceExtractionId(extractionId);
          setRulePrefill(values);
          setShowRuleForm(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </main>
  );
}

export default function EvaluationPage({ initialTranscript }: { initialTranscript: StudentTranscript | null }) {
  const rulesQuery = useQuery(evaluationQueries.rules());
  const [ruleId, setRuleId] = useState(0);
  const importedCourses = initialTranscript?.courses.map(toCourseGrade) ?? [];
  const [courses, setCourses] = useState<CourseGrade[]>(
    importedCourses.length > 0 ? importedCourses : [emptyCourse(), emptyCourse(), emptyCourse()],
  );
  const [result, setResult] = useState<GradeVerification | null>(null);
  const [error, setError] = useState('');
  const selectedRule = rulesQuery.data?.find((rule) => rule.id === ruleId);
  const verifyMutation = useMutation({ mutationFn: () => verifyGrades(ruleId, courses) });

  const updateCourse = (index: number, patch: Partial<CourseGrade>) => {
    setCourses((current) => current.map((course, courseIndex) => courseIndex === index ? { ...course, ...patch } : course));
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setResult(null);
    if (!ruleId) {
      setError('먼저 성적 반영 규칙을 선택해 주세요.');
      return;
    }
    try {
      setResult(await verifyMutation.mutateAsync());
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  return (
    <main className="evaluation-page">
      <header className="evaluation-header">
        <div>
          <p className="eyebrow">Transcript workspace</p>
          <h1>성적 검증</h1>
          <p className="page-description">대학별 모집요강의 과목 선택, 환산표, 반올림 기준까지 적용해 계산 근거를 검증합니다.</p>
        </div>
      </header>

      {initialTranscript && (
        <div className="student-loaded-banner">
          <div><strong>{initialTranscript.name}</strong><span>{initialTranscript.applicantNumber} · {initialTranscript.courses.length}개 과목을 불러왔습니다.</span></div>
          <span>학생 관리에서 선택됨</span>
        </div>
      )}

      {(error || rulesQuery.isError) && (
        <div className="error-banner" role="alert">{error || errorMessage(rulesQuery.error)}</div>
      )}

      <form onSubmit={handleVerify}>
        <section className="evaluation-card rule-picker">
          <div><p className="section-step">STEP 1</p><h2>적용할 모집요강 규칙</h2></div>
          <select aria-label="성적 반영 규칙" value={ruleId} onChange={(event) => setRuleId(Number(event.target.value))} disabled={rulesQuery.isLoading} required>
            <option value={0}>{rulesQuery.isLoading ? '규칙을 불러오는 중…' : '규칙을 선택하세요'}</option>
            {rulesQuery.data?.map((rule) => (
              <option key={rule.id} value={rule.id}>{rule.universityName} · {rule.admissionYear} · {rule.admissionType} · {rule.recruitmentUnit} (v{rule.version})</option>
            ))}
          </select>
          {selectedRule && <RuleSummary rule={selectedRule} />}
          {!rulesQuery.isLoading && rulesQuery.data?.length === 0 && (
            <div className="rule-summary"><small>게시된 규칙이 없습니다. 규칙 관리에서 검수와 게시를 먼저 완료해 주세요.</small></div>
          )}
        </section>

        <section className="evaluation-card">
          <div className="table-heading">
            <div><p className="section-step">STEP 2</p><h2>학생부 교과 성적 입력</h2></div>
            <button className="outline-button" type="button" onClick={() => setCourses((current) => [...current, emptyCourse()])}>+ 과목 추가</button>
          </div>
          <div className="grade-table" role="table">
            <div className="grade-row grade-row--head" role="row">
              <span>학년</span><span>학기</span><span>교과</span><span>과목명</span><span>평가</span><span>등급/성취도</span><span>단위</span><span>구분</span><span />
            </div>
            {courses.map((course, index) => (
              <CourseRow key={index} index={index} course={course} count={courses.length} rule={selectedRule}
                onChange={(patch) => updateCourse(index, patch)}
                onRemove={() => setCourses((current) => current.filter((_, courseIndex) => courseIndex !== index))} />
            ))}
          </div>
          <button className="verify-button" disabled={verifyMutation.isPending}>{verifyMutation.isPending ? '계산 중…' : '환산점수 검증하기'}</button>
        </section>
      </form>

      {result && <ResultPanel result={result} />}
    </main>
  );
}

function RuleSummary({ rule }: { rule: EvaluationRule }) {
  return (
    <div className="rule-summary">
      <span>{strategyLabels[rule.selectionStrategy]}{rule.selectionCount > 0 ? ` ${rule.selectionCount}개` : ''}</span>
      <span>{rule.scoreAggregation === 'AVERAGE_GRADE_THEN_SCORE' ? '평균등급 후 환산' : '과목별 환산 후 평균'}</span>
      <span>최종 × {rule.scoreMultiplier}</span>
      {rule.sourceDocument && <small>근거: {rule.sourceDocument} {rule.sourcePages && `p.${rule.sourcePages}`}</small>}
    </div>
  );
}

const statusLabels: Record<EvaluationRuleStatus, string> = {
  DRAFT: '초안',
  VERIFIED: '검수 완료',
  PUBLISHED: '게시 중',
  RETIRED: '폐기',
};

type RuleAction = 'review' | 'publish' | 'retire';

function RuleLifecyclePanel({ universities, onApplyExtraction }: {
  universities: Array<{ id: number; name: string }>;
  onApplyExtraction: (extractionId: number, values: Partial<CreateEvaluationRuleRequest>) => void;
}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<EvaluationRuleStatus | ''>('');
  const [actor, setActor] = useState('');
  const [note, setNote] = useState('');
  const [bulkJson, setBulkJson] = useState('');
  const [panelError, setPanelError] = useState('');
  const [pdfUniversityId, setPdfUniversityId] = useState(0);
  const [pdfAdmissionYear, setPdfAdmissionYear] = useState(2027);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [previewPage, setPreviewPage] = useState(1);
  const [extraction, setExtraction] = useState<RuleExtraction | null>(null);
  const [compareIds, setCompareIds] = useState<[number, number]>([0, 0]);
  const [expandedRuleId, setExpandedRuleId] = useState<number | null>(null);
  const [rulePendingRetirement, setRulePendingRetirement] = useState<EvaluationRule | null>(null);
  const adminRulesQuery = useQuery(evaluationQueries.adminRules(status || undefined));
  const extractionsQuery = useQuery(evaluationQueries.extractions());
  const refreshRules = () => queryClient.invalidateQueries({ queryKey: evaluationQueryKeys.all });
  const actionMutation = useMutation({
    mutationFn: ({ ruleId, action }: { ruleId: number; action: RuleAction }) => {
      const request = { actor, note };
      if (action === 'review') return reviewEvaluationRule(ruleId, request);
      if (action === 'publish') return publishEvaluationRule(ruleId, request);
      return retireEvaluationRule(ruleId, request);
    },
    onSuccess: async () => {
      setRulePendingRetirement(null);
      await refreshRules();
    },
  });
  const bulkMutation = useMutation({
    mutationFn: createDraftEvaluationRules,
    onSuccess: async () => {
      setBulkJson('');
      await refreshRules();
    },
  });
  const extractionMutation = useMutation({
    mutationFn: () => extractEvaluationRuleFromPdf(pdfUniversityId, pdfAdmissionYear, pdfFile as File),
    onSuccess: async (result) => {
      setExtraction(result);
      await queryClient.invalidateQueries({ queryKey: evaluationQueryKeys.extractions() });
    },
  });
  const comparisonMutation = useMutation({
    mutationFn: () => compareRuleExtractions(compareIds[0], compareIds[1]),
  });

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  const selectPdfFile = (file: File | null) => {
    setPdfFile(file);
    setPdfPreviewUrl(file ? URL.createObjectURL(file) : '');
    setPreviewPage(1);
    setExtraction(null);
  };

  const extractPdf = (event: FormEvent) => {
    event.preventDefault();
    setPanelError('');
    setExtraction(null);
    if (!pdfUniversityId || !pdfFile) {
      setPanelError('대학과 모집요강 PDF를 선택해 주세요.');
      return;
    }
    extractionMutation.mutate();
  };

  const applyExtraction = () => {
    if (!extraction) return;
    const candidate = extraction.candidate;
    const warningText = [
      ...extraction.missingFields.map((field) => `미확정: ${field}`),
      ...extraction.warnings,
    ].join('\n').slice(0, 1000);
    const values: Partial<CreateEvaluationRuleRequest> = {
      universityId: extraction.universityId,
      admissionYear: extraction.admissionYear,
      name: `${extraction.admissionYear} 모집요강 추출 규칙`,
      sourceDocument: extraction.originalFileName,
      sourcePages: candidate.sourcePages ?? '',
      interpretationNote: warningText,
      changeSummary: '모집요강 PDF 자동 추출 초안',
    };
    if (candidate.subjectCategories.length > 0) {
      values.subjectWeights = subjects.map(([category]) => candidate.subjectCategories.includes(category) ? 1 : 0);
    }
    if (candidate.selectionStrategy) values.selectionStrategy = candidate.selectionStrategy;
    if (candidate.selectionCount !== null) values.selectionCount = candidate.selectionCount;
    if (candidate.gradeWeights.length === 3) values.gradeWeights = candidate.gradeWeights;
    if (candidate.gradeScores.length === 9) values.gradeScores = candidate.gradeScores;
    if (candidate.achievementScores.length === 3) values.achievementScores = candidate.achievementScores;
    if (candidate.includeThirdYearSecondSemester !== null) {
      values.includeThirdYearSecondSemester = candidate.includeThirdYearSecondSemester;
    }
    if (candidate.roundingMode) {
      values.intermediateRounding = candidate.roundingMode;
      values.finalRounding = candidate.roundingMode;
    }
    onApplyExtraction(extraction.extractionId, values);
  };

  const runAction = (rule: EvaluationRule, action: RuleAction) => {
    setPanelError('');
    if (!actor.trim()) {
      setPanelError('검수자 또는 작업자 이름을 입력해 주세요.');
      return;
    }
    if (action === 'retire') {
      setRulePendingRetirement(rule);
      return;
    }
    actionMutation.mutate({ ruleId: rule.id, action });
  };

  const importJson = () => {
    setPanelError('');
    try {
      const parsed = JSON.parse(bulkJson) as CreateEvaluationRuleRequest[] | { rules?: CreateEvaluationRuleRequest[] };
      const rules = Array.isArray(parsed) ? parsed : parsed.rules;
      if (!rules?.length) throw new Error('규칙 배열이 없습니다.');
      bulkMutation.mutate(rules);
    } catch (jsonError) {
      setPanelError(jsonError instanceof Error ? jsonError.message : 'JSON 형식을 확인해 주세요.');
    }
  };

  const requestError = extractionMutation.error ?? actionMutation.error ?? bulkMutation.error ?? adminRulesQuery.error;

  return (
    <section className="evaluation-card lifecycle-panel">
      <div className="lifecycle-heading">
        <div><p className="section-step">RULE WORKFLOW</p><h2>규칙 검수 및 게시</h2></div>
        <label>상태 필터
          <select value={status} onChange={(event) => setStatus(event.target.value as EvaluationRuleStatus | '')}>
            <option value="">전체</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      <div className="rule-concept">
        <div>
          <strong>‘반영 규칙’이란?</strong>
          <p>한 대학·전형·모집단위가 학생부 성적을 최종 점수로 바꾸는 계산 방법 전체를 뜻합니다.</p>
        </div>
        <ol>
          <li><b>1</b><span>반영할 학년·학기·교과·과목 선택</span></li>
          <li><b>2</b><span>석차등급·성취도를 점수로 환산</span></li>
          <li><b>3</b><span>학년·교과별 가중치 적용</span></li>
          <li><b>4</b><span>소수점 처리 후 최종 점수 산출</span></li>
        </ol>
      </div>

      <form className="pdf-extraction" onSubmit={extractPdf}>
        <div className="pdf-extraction-copy">
          <strong>모집요강에서 규칙 초안 추출</strong>
          <p>PDF 전체를 읽되, 성적 반영 페이지의 근거가 확인된 값만 후보로 채웁니다. 결과는 자동 게시되지 않습니다.</p>
        </div>
        <label>대학교
          <select required value={pdfUniversityId} onChange={(event) => setPdfUniversityId(Number(event.target.value))}>
            <option value={0}>선택</option>
            {universities.map((university) => <option key={university.id} value={university.id}>{university.name}</option>)}
          </select>
        </label>
        <label>모집연도
          <input type="number" min="2000" max="2100" value={pdfAdmissionYear} onChange={(event) => setPdfAdmissionYear(Number(event.target.value))} />
        </label>
        <label>모집요강 PDF
          <input type="file" accept="application/pdf,.pdf" onChange={(event) => selectPdfFile(event.target.files?.[0] ?? null)} />
        </label>
        <button type="submit" disabled={extractionMutation.isPending}>
          {extractionMutation.isPending ? '전체 페이지 분석 중…' : '규칙 후보 추출'}
        </button>
      </form>

      <div className="document-review-workspace">
        <section className="pdf-preview-panel">
          <div className="document-panel-heading">
            <div><p className="section-step">SOURCE DOCUMENT</p><h3>모집요강 원문</h3></div>
            {pdfPreviewUrl && <span>p.{previewPage}</span>}
          </div>
          {pdfPreviewUrl ? (
            <object
              className="pdf-preview-object"
              data={`${pdfPreviewUrl}#page=${previewPage}&view=FitH`}
              type="application/pdf"
              aria-label={`${pdfFile?.name ?? '모집요강'} PDF 원문`}
            >
              <a href={pdfPreviewUrl} target="_blank" rel="noreferrer">PDF를 새 창에서 열기</a>
            </object>
          ) : (
            <StatusPanel tone="empty" title="PDF를 먼저 선택해 주세요" description="선택한 모집요강이 이 영역에 표시됩니다." />
          )}
        </section>

        <section className="extraction-review-panel">
          <div className="document-panel-heading">
            <div><p className="section-step">EXTRACTED RULE</p><h3>추출 결과</h3></div>
          </div>
          {extractionMutation.isPending ? (
            <StatusPanel tone="loading" title="모집요강을 분석하고 있습니다" description="페이지 수에 따라 잠시 시간이 걸릴 수 있습니다." />
          ) : extraction ? (
            <div className="extraction-result">
              <div className="extraction-result-heading">
                <div>
                  <span className={`confidence-chip ${extraction.overallConfidence < 0.75 ? 'is-low' : ''}`}>
                    추출 신뢰도 {Math.round(extraction.overallConfidence * 100)}%
                  </span>
                  <strong>{extraction.originalFileName}</strong>
                  <small>{extraction.pageCount}페이지 중 텍스트 확인 {extraction.textPageCount}페이지</small>
                </div>
                <button type="button" onClick={applyExtraction}>검토 폼으로 가져오기</button>
              </div>
              <div className="candidate-grid">
                <span><small>선택 방식</small>{extraction.candidate.selectionStrategy ? strategyLabels[extraction.candidate.selectionStrategy] : '미확정'}</span>
                <span><small>학년 비율</small>{extraction.candidate.gradeWeights.length ? extraction.candidate.gradeWeights.join(' / ') : '미확정'}</span>
                <span><small>환산표</small>{extraction.candidate.gradeScores.length === 9 ? '1~9등급 확인' : '미확정'}</span>
                <span><small>근거 페이지</small>{extraction.candidate.sourcePages || '미확정'}</span>
              </div>
              {extraction.missingFields.length > 0 && <p className="extraction-warning"><strong>직접 확인 필요:</strong> {extraction.missingFields.join(', ')}</p>}
              {extraction.warnings.map((warning) => <p className="extraction-warning" key={warning}>⚠ {warning}</p>)}
              <details className="evidence-list" open>
                <summary>필드별 원문 근거 {extraction.evidence.length}건</summary>
                {extraction.evidence.map((item, index) => (
                  <article key={`${item.fieldKey}-${item.pageNumber}-${index}`}>
                    <strong>{item.fieldKey}</strong>
                    <button className="evidence-page-button" type="button" onClick={() => setPreviewPage(item.pageNumber)}>p.{item.pageNumber} 원문 보기</button>
                    <span>신뢰도 {Math.round(item.confidence * 100)}%</span>
                    <p>{item.excerpt}</p>
                  </article>
                ))}
              </details>
            </div>
          ) : (
            <StatusPanel tone="empty" title="아직 추출된 규칙이 없습니다" description="대학과 PDF를 선택한 뒤 규칙 후보 추출을 실행해 주세요." />
          )}
        </section>
      </div>

      <details className="extraction-history">
        <summary>모집요강 문서·추출 이력 {extractionsQuery.data?.length ?? 0}건</summary>
        <div className="extraction-compare-controls">
          {[0, 1].map((position) => <select key={position} value={compareIds[position]} onChange={(event) => setCompareIds((current) => position === 0 ? [Number(event.target.value), current[1]] : [current[0], Number(event.target.value)])}><option value={0}>{position === 0 ? '기준 문서' : '비교 문서'}</option>{extractionsQuery.data?.map((item) => <option value={item.extractionId} key={item.extractionId}>#{item.extractionId} {item.universityName} {item.admissionYear} · {item.originalFileName}</option>)}</select>)}
          <button type="button" disabled={!compareIds[0] || !compareIds[1] || compareIds[0] === compareIds[1]} onClick={() => comparisonMutation.mutate()}>추출값 비교</button>
        </div>
        <div className="extraction-history-list">{extractionsQuery.data?.map((item) => <article key={item.extractionId}><span className={`confidence-chip ${item.overallConfidence < .75 ? 'is-low' : ''}`}>{Math.round(item.overallConfidence * 100)}%</span><strong>{item.originalFileName}</strong><small>{item.universityName} · {item.admissionYear} · {item.pageCount}p · 누락 {item.missingFieldCount} · 경고 {item.warningCount}</small><code>{item.fileSha256.slice(0, 12)}</code></article>)}</div>
        {comparisonMutation.data && <div className="extraction-differences"><strong>변경 필드 {comparisonMutation.data.differences.length}개</strong>{comparisonMutation.data.differences.map((item) => <p key={item.field}><b>{item.field}</b><span>{item.leftValue}</span><i>→</i><span>{item.rightValue}</span></p>)}{comparisonMutation.data.differences.length === 0 && <p>추출된 주요 규칙 값이 동일합니다.</p>}</div>}
      </details>

      <div className="review-inputs">
        <label>작업자<input value={actor} onChange={(event) => setActor(event.target.value)} placeholder="검수자 이름" /></label>
        <label>검수·게시 메모<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="확인 내용 또는 게시 사유" /></label>
      </div>

      {(panelError || requestError) && <div className="error-banner" role="alert">{panelError || errorMessage(requestError)}</div>}

      <div className="rule-admin-list">
        {adminRulesQuery.isLoading && (
          <StatusPanel compact tone="loading" title="규칙 목록을 불러오는 중입니다" />
        )}
        {adminRulesQuery.data?.map((rule) => {
          const expanded = expandedRuleId === rule.id;
          return (
            <article className={`rule-admin-item ${expanded ? 'is-expanded' : ''}`} key={rule.id}>
              <div className="rule-admin-item-header">
                <button
                  type="button"
                  className="rule-admin-toggle"
                  aria-expanded={expanded}
                  aria-controls={`rule-detail-${rule.id}`}
                  onClick={() => setExpandedRuleId(expanded ? null : rule.id)}
                >
                  <span className={`status-badge status-badge--${rule.status.toLowerCase()}`}>{statusLabels[rule.status]}</span>
                  <strong>{rule.universityName} · {rule.name} v{rule.version}</strong>
                  <span className="rule-admin-chevron" aria-hidden="true">⌄</span>
                  <span className="rule-admin-meta">{rule.admissionYear} · {rule.admissionType} · {rule.recruitmentUnit}</span>
                  <small>근거: {rule.sourceDocument || '미등록'} {rule.sourcePages && `p.${rule.sourcePages}`}</small>
                </button>
                <div className="rule-admin-actions">
                  {rule.status === 'DRAFT' && <button type="button" onClick={() => runAction(rule, 'review')}>검수 완료</button>}
                  {rule.status === 'VERIFIED' && <button type="button" onClick={() => runAction(rule, 'publish')}>게시</button>}
                  {rule.status !== 'RETIRED' && <button className="danger-action" type="button" onClick={() => runAction(rule, 'retire')}>폐기</button>}
                </div>
              </div>
              {expanded && <RuleDetail rule={rule} id={`rule-detail-${rule.id}`} />}
            </article>
          );
        })}
        {!adminRulesQuery.isLoading && adminRulesQuery.data?.length === 0 && (
          <StatusPanel compact tone="empty" title="해당 상태의 규칙이 없습니다" description="상태 필터를 변경하거나 새 규칙을 등록해 주세요." />
        )}
      </div>

      <details className="bulk-rule-import">
        <summary>AI 추출 규칙 JSON 일괄 등록</summary>
        <p>규칙 배열 또는 <code>{'{ "rules": [...] }'}</code> 형식을 붙여 넣으면 모두 초안으로 저장됩니다.</p>
        <textarea value={bulkJson} onChange={(event) => setBulkJson(event.target.value)} placeholder='[{ "universityId": 1, "name": "2027 규칙", ... }]' />
        <button type="button" disabled={bulkMutation.isPending || !bulkJson.trim()} onClick={importJson}>JSON 초안 등록</button>
      </details>

      <ConfirmDialog
        open={rulePendingRetirement !== null}
        title="규칙을 폐기할까요?"
        description={rulePendingRetirement ? `${rulePendingRetirement.universityName} · ${rulePendingRetirement.name} v${rulePendingRetirement.version} 규칙은 게시 대상으로 다시 사용할 수 없습니다.` : ''}
        confirmLabel="규칙 폐기"
        pending={actionMutation.isPending}
        danger
        onCancel={() => setRulePendingRetirement(null)}
        onConfirm={() => {
          if (rulePendingRetirement) actionMutation.mutate({ ruleId: rulePendingRetirement.id, action: 'retire' });
        }}
      />
    </section>
  );
}

const aggregationLabels: Record<EvaluationRule['scoreAggregation'], string> = {
  COURSE_SCORE_AVERAGE: '과목별 점수를 환산한 뒤 평균',
  AVERAGE_GRADE_THEN_SCORE: '평균 석차등급을 구한 뒤 점수로 환산',
};

const achievementConversionLabels: Record<EvaluationRule['achievementConversion'], string> = {
  DIRECT_TABLE: '성취도 A/B/C를 지정 점수로 직접 환산',
  Z_SCORE: '원점수·평균·표준편차를 이용한 Z점수 환산',
  EXCLUDE: '성취도 과목은 계산에서 제외',
};

const roundingLabels: Record<EvaluationRule['finalRounding'], string> = {
  HALF_UP: '반올림',
  DOWN: '절사',
  UP: '올림',
  FLOOR: '내림',
  CEILING: '천장값',
};

function RuleDetail({ rule, id }: { rule: EvaluationRule; id: string }) {
  const selectedSubjects = subjects
    .map(([, label], index) => ({ label, weight: rule.subjectWeights[index] ?? 0 }))
    .filter(({ weight }) => weight > 0);

  return (
    <div className="rule-detail" id={id}>
      <div className="rule-detail-intro">
        <div>
          <p className="section-step">이 규칙은 이렇게 계산합니다</p>
          <strong>{strategyLabels[rule.selectionStrategy]}{rule.selectionCount > 0 ? ` ${rule.selectionCount}개` : ''}를 선택해 {aggregationLabels[rule.scoreAggregation]}합니다.</strong>
        </div>
        <span>최종 점수 × {rule.scoreMultiplier}</span>
      </div>

      <div className="rule-detail-grid">
        <section>
          <h4>학년별 반영 비율</h4>
          <div className="rule-value-list">
            {rule.gradeWeights.map((weight, index) => <span key={index}><small>{index + 1}학년</small><strong>{weight}%</strong></span>)}
          </div>
          <p>{rule.normalizeGradeWeights ? '학년별 평균을 먼저 계산한 뒤 비율을 적용합니다.' : '각 과목에 학년 비율을 직접 적용합니다.'}</p>
        </section>

        <section>
          <h4>반영 교과</h4>
          <div className="rule-chip-list">
            {selectedSubjects.map(({ label, weight }) => <span key={label}>{label} <b>× {weight}</b></span>)}
            {selectedSubjects.length === 0 && <span>지정 교과 없음</span>}
          </div>
          <p>0으로 설정된 교과는 계산에서 제외됩니다.</p>
        </section>

        <section>
          <h4>과목 선택</h4>
          <strong>{strategyLabels[rule.selectionStrategy]}</strong>
          <p>{rule.selectionCount > 0 ? `일반 과목 ${rule.selectionCount}개` : '조건에 맞는 전 과목'}{rule.achievementSelectionCount > 0 ? ` + 진로선택 ${rule.achievementSelectionCount}개` : ''}</p>
          {rule.minimumCourseCount > 0 && <p>지원자격 최소 {rule.minimumCourseCount}과목</p>}
        </section>

        <section>
          <h4>포함·제외 조건</h4>
          <ul className="rule-condition-list">
            <li className={rule.includeThirdYearSecondSemester ? 'is-included' : 'is-excluded'}>3학년 2학기 {rule.includeThirdYearSecondSemester ? '포함' : '제외'}</li>
            <li className={rule.includeThirdYearSecondSemesterForGraduates ? 'is-included' : 'is-excluded'}>졸업생 3학년 2학기 {rule.includeThirdYearSecondSemesterForGraduates ? '포함' : '일반 규칙 적용'}
            </li>
            <li className={rule.includeProfessionalCourses ? 'is-included' : 'is-excluded'}>전문교과 {rule.includeProfessionalCourses ? '포함' : '제외'}</li>
          </ul>
        </section>
      </div>

      <section className="rule-conversion-section">
        <h4>석차등급 → 환산점수</h4>
        <div className="rule-score-table">
          {rule.gradeScores.map((score, index) => <span key={index}><small>{index + 1}등급</small><strong>{score}점</strong></span>)}
        </div>
      </section>

      <div className="rule-detail-grid rule-detail-grid--lower">
        <section>
          <h4>진로선택 과목 환산</h4>
          <strong>{achievementConversionLabels[rule.achievementConversion]}</strong>
          {rule.achievementConversion === 'DIRECT_TABLE' && (
            <div className="rule-chip-list">
              {rule.achievementScores.map((score, index) => <span key={index}>{String.fromCharCode(65 + index)} → {score}점</span>)}
            </div>
          )}
        </section>
        <section>
          <h4>소수점 처리</h4>
          <p>중간값: 소수 {rule.intermediateScale}자리에서 {roundingLabels[rule.intermediateRounding]}</p>
          <p>최종값: 소수 {rule.finalScale}자리에서 {roundingLabels[rule.finalRounding]}</p>
        </section>
        <section className="rule-source-detail">
          <h4>근거 및 검수 정보</h4>
          <p><b>모집요강:</b> {rule.sourceDocument || '미등록'} {rule.sourcePages && `(p.${rule.sourcePages})`}</p>
          {rule.interpretationNote && <p><b>확인 필요:</b> {rule.interpretationNote}</p>}
          {rule.changeSummary && <p><b>변경 내용:</b> {rule.changeSummary}</p>}
          {rule.reviewer && <p><b>검수:</b> {rule.reviewer}{rule.reviewNote && ` · ${rule.reviewNote}`}</p>}
        </section>
      </div>
    </div>
  );
}

function CourseRow({ index, course, count, rule, onChange, onRemove }: {
  index: number;
  course: CourseGrade;
  count: number;
  rule?: EvaluationRule;
  onChange: (patch: Partial<CourseGrade>) => void;
  onRemove: () => void;
}) {
  const achievementMode = course.grade === null;
  const needsZScore = achievementMode && rule?.achievementConversion === 'Z_SCORE';
  return (
    <div className="course-entry">
      <div className="grade-row" role="row">
        <select aria-label={`${index + 1}행 학년`} value={course.schoolYear} onChange={(event) => onChange({ schoolYear: Number(event.target.value) })}>{[1, 2, 3].map((value) => <option key={value} value={value}>{value}학년</option>)}</select>
        <select aria-label={`${index + 1}행 학기`} value={course.semester} onChange={(event) => onChange({ semester: Number(event.target.value) })}><option value={1}>1학기</option><option value={2}>2학기</option></select>
        <select aria-label={`${index + 1}행 교과`} value={course.subjectCategory} onChange={(event) => onChange({ subjectCategory: event.target.value as SubjectCategory })}>{subjects.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <input aria-label={`${index + 1}행 과목명`} placeholder="예: 미적분" required value={course.courseName} onChange={(event) => onChange({ courseName: event.target.value })} />
        <select aria-label={`${index + 1}행 평가방식`} value={achievementMode ? 'ACHIEVEMENT' : 'GRADE'} onChange={(event) => onChange(event.target.value === 'GRADE' ? { grade: 1, achievement: null } : { grade: null, achievement: 'A' })}><option value="GRADE">석차등급</option><option value="ACHIEVEMENT">성취도</option></select>
        {achievementMode ? (
          <select aria-label={`${index + 1}행 성취도`} value={course.achievement ?? 'A'} onChange={(event) => onChange({ achievement: event.target.value as AchievementLevel })}>{['A', 'B', 'C', 'D', 'E'].map((value) => <option key={value}>{value}</option>)}</select>
        ) : (
          <input aria-label={`${index + 1}행 등급`} type="number" min="1" max="9" required value={course.grade ?? ''} onChange={(event) => onChange({ grade: Number(event.target.value) })} />
        )}
        <input aria-label={`${index + 1}행 단위수`} type="number" min="0.01" step="0.01" required value={course.credits} onChange={(event) => onChange({ credits: Number(event.target.value) })} />
        <div className="course-flags"><label><input type="checkbox" checked={course.careerSubject} onChange={(event) => onChange({ careerSubject: event.target.checked })} />진로</label><label><input type="checkbox" checked={course.professionalCourse} onChange={(event) => onChange({ professionalCourse: event.target.checked })} />전문</label></div>
        <button className="remove-button" type="button" aria-label={`${index + 1}행 삭제`} disabled={count === 1} onClick={onRemove}>×</button>
      </div>
      {needsZScore && (
        <div className="z-score-fields">
          <span>Z점수 환산 입력</span>
          <label>원점수<input type="number" step="0.01" required value={course.rawScore ?? ''} onChange={(event) => onChange({ rawScore: Number(event.target.value) })} /></label>
          <label>과목평균<input type="number" step="0.01" required value={course.meanScore ?? ''} onChange={(event) => onChange({ meanScore: Number(event.target.value) })} /></label>
          <label>표준편차<input type="number" min="0.0001" step="0.01" required value={course.standardDeviation ?? ''} onChange={(event) => onChange({ standardDeviation: Number(event.target.value) })} /></label>
          <label>수강자수<input type="number" min="1" value={course.studentCount ?? ''} onChange={(event) => onChange({ studentCount: Number(event.target.value) })} /></label>
        </div>
      )}
    </div>
  );
}

function RuleForm({ universities, pending, initialValues, onSubmit }: {
  universities: Array<{ id: number; name: string }>;
  pending: boolean;
  initialValues: Partial<CreateEvaluationRuleRequest>;
  onSubmit: (request: CreateEvaluationRuleRequest) => void;
}) {
  const [rule, setRule] = useState<CreateEvaluationRuleRequest>({ ...baseRule, ...initialValues });
  const updateArray = (field: 'gradeWeights' | 'subjectWeights' | 'gradeScores' | 'achievementGrades' | 'achievementScores' | 'subjectPriorities', index: number, value: number) => {
    setRule((current) => ({ ...current, [field]: current[field].map((item, itemIndex) => itemIndex === index ? value : item) }));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(rule);
  };
  return (
    <form className="evaluation-card rule-form" onSubmit={submit}>
      <div className="rule-form-title"><div><p className="section-step">RULE SETUP</p><h2>모집요강 반영 규칙 등록</h2></div><div className="preset-list">{presets.map((preset) => <button type="button" key={preset.label} onClick={() => setRule((current) => ({ ...current, ...preset.values }))}>{preset.label}</button>)}</div></div>
      <div className="rule-fields">
        <label>대학교<select required value={rule.universityId} onChange={(event) => setRule({ ...rule, universityId: Number(event.target.value) })}><option value={0}>선택</option>{universities.map((university) => <option key={university.id} value={university.id}>{university.name}</option>)}</select></label>
        <label>규칙명<input required value={rule.name} onChange={(event) => setRule({ ...rule, name: event.target.value })} placeholder="2027 교과우수자 공학계열" /></label>
        <label>입학년도<input type="number" required value={rule.admissionYear} onChange={(event) => setRule({ ...rule, admissionYear: Number(event.target.value) })} /></label>
        <label>전형<input required value={rule.admissionType} onChange={(event) => setRule({ ...rule, admissionType: event.target.value })} /></label>
        <label>모집단위<input required value={rule.recruitmentUnit} onChange={(event) => setRule({ ...rule, recruitmentUnit: event.target.value })} /></label>
        <label>버전<input type="number" min="1" required value={rule.version} onChange={(event) => setRule({ ...rule, version: Number(event.target.value) })} /></label>
        <label>선택 방식<select value={rule.selectionStrategy} onChange={(event) => setRule({ ...rule, selectionStrategy: event.target.value as SelectionStrategy })}>{Object.entries(strategyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>반영 개수<input type="number" min="0" disabled={rule.selectionStrategy === 'ALL_COURSES' || rule.selectionStrategy === 'BEST_SEMESTER_PER_GRADE'} value={rule.selectionCount} onChange={(event) => setRule({ ...rule, selectionCount: Number(event.target.value) })} /></label>
        <label>진로선택 추가 개수<input type="number" min="0" value={rule.achievementSelectionCount} onChange={(event) => setRule({ ...rule, achievementSelectionCount: Number(event.target.value) })} /></label>
        <label>지원자격 최소 과목<input type="number" min="0" value={rule.minimumCourseCount} onChange={(event) => setRule({ ...rule, minimumCourseCount: Number(event.target.value) })} /></label>
        <label>점수 집계<select value={rule.scoreAggregation} onChange={(event) => setRule({ ...rule, scoreAggregation: event.target.value as CreateEvaluationRuleRequest['scoreAggregation'] })}><option value="COURSE_SCORE_AVERAGE">과목별 환산 후 평균</option><option value="AVERAGE_GRADE_THEN_SCORE">평균등급 산출 후 환산</option></select></label>
        <label>성취도 환산<select value={rule.achievementConversion} onChange={(event) => setRule({ ...rule, achievementConversion: event.target.value as CreateEvaluationRuleRequest['achievementConversion'] })}><option value="DIRECT_TABLE">A/B/C 직접 환산표</option><option value="Z_SCORE">원점수·평균·표준편차 Z점수</option><option value="EXCLUDE">성취도 과목 제외</option></select></label>
        <label>최종점수 배율<input type="number" min="0.0001" step="0.0001" value={rule.scoreMultiplier} onChange={(event) => setRule({ ...rule, scoreMultiplier: Number(event.target.value) })} /></label>
      </div>

      <div className="policy-toggles"><label><input type="checkbox" checked={rule.includeThirdYearSecondSemester} onChange={(event) => setRule({ ...rule, includeThirdYearSecondSemester: event.target.checked })} />3학년 2학기 포함</label><label><input type="checkbox" checked={rule.includeThirdYearSecondSemesterForGraduates} onChange={(event) => setRule({ ...rule, includeThirdYearSecondSemesterForGraduates: event.target.checked })} />졸업생만 3학년 2학기 포함</label><label><input type="checkbox" checked={rule.includeProfessionalCourses} onChange={(event) => setRule({ ...rule, includeProfessionalCourses: event.target.checked })} />전문교과 포함</label><label><input type="checkbox" checked={rule.normalizeGradeWeights} onChange={(event) => setRule({ ...rule, normalizeGradeWeights: event.target.checked })} />학년별 평균 후 비율 적용</label></div>

      <div className="weight-grid"><div><strong>학년 반영 비율 (%)</strong>{rule.gradeWeights.map((value, index) => <label key={index}>{index + 1}학년<input type="number" min="0" step="0.0001" value={value} onChange={(event) => updateArray('gradeWeights', index, Number(event.target.value))} /></label>)}</div><div><strong>교과 가중치 (0은 제외)</strong>{rule.subjectWeights.map((value, index) => <label key={index}>{subjects[index][1]}<input type="number" min="0" step="0.1" value={value} onChange={(event) => updateArray('subjectWeights', index, Number(event.target.value))} /></label>)}</div></div>

      <div className="score-grid"><strong>석차등급 환산점수</strong>{rule.gradeScores.map((value, index) => <label key={index}>{index + 1}등급<input type="number" min="0" step="0.0001" value={value} onChange={(event) => updateArray('gradeScores', index, Number(event.target.value))} /></label>)}</div>
      <div className="achievement-grid"><strong>성취도 환산</strong>{['A', 'B', 'C'].map((level, index) => <div key={level}><span>{level}</span><label>환산등급<input type="number" min="1" max="9" step="0.01" value={rule.achievementGrades[index]} onChange={(event) => updateArray('achievementGrades', index, Number(event.target.value))} /></label><label>환산점수<input type="number" min="0" step="0.0001" value={rule.achievementScores[index]} onChange={(event) => updateArray('achievementScores', index, Number(event.target.value))} /></label></div>)}</div>

      <div className="rule-fields source-fields">
        <label>근거 모집요강<input value={rule.sourceDocument ?? ''} onChange={(event) => setRule({ ...rule, sourceDocument: event.target.value })} placeholder="파일명" /></label>
        <label>근거 페이지<input value={rule.sourcePages ?? ''} onChange={(event) => setRule({ ...rule, sourcePages: event.target.value })} placeholder="예: 34-35" /></label>
        <label>해석 주의사항<textarea value={rule.interpretationNote ?? ''} onChange={(event) => setRule({ ...rule, interpretationNote: event.target.value })} placeholder="담당자가 확인해야 할 각주·예외" /></label>
        <label>이전 버전 변경점<textarea value={rule.changeSummary ?? ''} onChange={(event) => setRule({ ...rule, changeSummary: event.target.value })} placeholder="신규 규칙 또는 변경 내용" /></label>
        <label>중간값 자릿수<input type="number" min="0" max="8" value={rule.intermediateScale} onChange={(event) => setRule({ ...rule, intermediateScale: Number(event.target.value) })} /></label>
        <label>중간값 처리<select value={rule.intermediateRounding} onChange={(event) => setRule({ ...rule, intermediateRounding: event.target.value as CreateEvaluationRuleRequest['intermediateRounding'] })}><option value="HALF_UP">반올림</option><option value="DOWN">절사</option></select></label>
        <label>최종점수 자릿수<input type="number" min="0" max="8" value={rule.finalScale} onChange={(event) => setRule({ ...rule, finalScale: Number(event.target.value) })} /></label>
        <label>최종점수 처리<select value={rule.finalRounding} onChange={(event) => setRule({ ...rule, finalRounding: event.target.value as CreateEvaluationRuleRequest['finalRounding'] })}><option value="HALF_UP">반올림</option><option value="DOWN">절사</option></select></label>
      </div>
      <p className="form-note">교과 우선순위 기본값은 과학 → 수학 → 국어 → 영어 → 사회 → 기타이며, 우수 교과 동점 처리에 사용됩니다.</p>
      <button className="verify-button" disabled={pending}>{pending ? '저장 중…' : '규칙 초안 저장'}</button>
    </form>
  );
}

function ResultPanel({ result }: { result: GradeVerification }) {
  return (
    <section className="result-panel">
      <div className="score-orb"><span>최종 환산점수</span><strong>{result.finalScore}</strong><small>평균등급 {result.averageGrade}</small></div>
      <div className="result-detail"><p className="section-step">CALCULATION RESULT</p><h2>{result.universityName} · {result.recruitmentUnit}</h2><p>{result.admissionType} / {result.ruleName} v{result.ruleVersion}</p><div className="result-counts"><span>반영 <strong>{result.includedCourseCount}</strong>과목</span><span>제외 <strong>{result.excludedCourseCount}</strong>과목</span></div>{result.sourceDocument && <p className="result-source">근거: {result.sourceDocument} {result.sourcePages && `p.${result.sourcePages}`}</p>}{result.warnings.map((warning) => <p className="warning" key={warning}>⚠ {warning}</p>)}</div>
      <CalculationTrace summary={result.calculationSummary} aggregation={result.scoreAggregation} />
      <details><summary>과목별 계산 근거 보기</summary>{result.calculations.map((item, index) => { const appliedSubject = item.appliedSubjectCategory ?? item.subjectCategory; return <div className={`calculation-line ${item.included ? '' : 'is-excluded'}`} key={index}><strong>{item.courseName}</strong><span>{item.effectiveGrade}등급 → {item.convertedScore}점</span><span>{item.subjectCategory !== appliedSubject && `${item.subjectCategory} → ${appliedSubject} · `}학년 {item.gradeWeight} × 교과 {item.subjectWeight} × 단위 {item.credits}</span><span>{item.included ? `가중점수 ${item.weightedScore}` : item.exclusionReason}</span></div>; })}</details>
    </section>
  );
}
