import { useState } from 'react';

import type { GradeVerification, SubjectCategory } from '@/apis/evaluation/entity';
import CalculationTrace from '@/components/CalculationTrace';

const subjectLabels: Record<SubjectCategory, string> = {
  KOREAN: '국어',
  MATH: '수학',
  ENGLISH: '영어',
  SOCIAL: '사회',
  SCIENCE: '과학',
  OTHER: '기타',
};

function score(value: number | null) {
  return value === null ? '-' : value.toLocaleString('ko-KR', { maximumFractionDigits: 8 });
}

export default function VerificationDetail({ result, exporting = false, onExport }: {
  result: GradeVerification;
  exporting?: boolean;
  onExport?: () => void;
}) {
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
        <div className="verification-result-actions">
          {onExport && <button type="button" disabled={exporting} onClick={onExport}>
            {exporting ? 'Excel 생성 중…' : '검증 결과 Excel'}
          </button>}
          <div className="verification-score">
            <small>최종 점수</small>
            <strong>{score(result.finalScore)}</strong>
            <span>평균등급 {score(result.averageGrade)}</span>
          </div>
        </div>
      </div>
      <div className="verification-facts">
        <span><b>{result.includedCourseCount}</b>개 반영</span>
        <span><b>{result.excludedCourseCount}</b>개 제외</span>
        <span>근거: {result.sourceDocument || '미등록'} {result.sourcePages && `p.${result.sourcePages}`}</span>
      </div>
      <CalculationTrace summary={result.calculationSummary} aggregation={result.scoreAggregation} />
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
            <span>{course.gradeWeight} × {course.subjectWeight} × {course.appliedCredits}<small>{course.appliedCredits !== course.credits && `원 이수단위 ${course.credits} · `}적용 {course.appliedWeight}</small></span>
            <span>{course.included ? <b>반영 {course.weightedScore}</b> : <em>{course.exclusionReason}</em>}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
