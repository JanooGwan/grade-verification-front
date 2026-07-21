import type { CalculationSummary, ScoreAggregation } from '@/apis/evaluation/entity';
import { roundingLabels } from '@/constants/evaluation';

function display(value: number, scale?: number) {
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: scale,
    maximumFractionDigits: scale ?? 8,
  });
}

export default function CalculationTrace({ summary, aggregation }: {
  summary: CalculationSummary | null;
  aggregation: ScoreAggregation;
}) {
  if (!summary) return null;
  const usesAverageGrade = aggregation === 'AVERAGE_GRADE_THEN_SCORE';
  const primaryNumerator = usesAverageGrade
    ? summary.gradeTimesWeightSum
    : summary.convertedScoreTimesWeightSum;
  const yearDenominators = Object.entries(summary.yearWeightDenominators)
    .sort(([left], [right]) => Number(left) - Number(right));

  return (
    <section className="calculation-trace" aria-label="성적 계산 중간값">
      <header>
        <div><strong>계산 중간값</strong><small>오차가 발생한 합계와 반올림 단계를 확인할 수 있습니다.</small></div>
        <code>{summary.formula}</code>
      </header>
      <div className="calculation-trace-grid">
        <span><small>Σ(등급 × 이수단위)</small><b>{display(summary.gradeTimesCreditsSum)}</b></span>
        <span><small>Σ(환산점수 × 이수단위)</small><b>{display(summary.convertedScoreTimesCreditsSum)}</b></span>
        <span><small>Σ(반영 이수단위)</small><b>{display(summary.totalIncludedCredits)}</b></span>
        <span><small>Σ(등급 × 적용가중치)</small><b>{display(summary.gradeTimesWeightSum)}</b></span>
        <span><small>Σ(환산점수 × 적용가중치)</small><b>{display(summary.convertedScoreTimesWeightSum)}</b></span>
        <span><small>Σ(적용가중치)</small><b>{display(summary.totalAppliedWeight)}</b></span>
      </div>
      <div className="calculation-equation">
        <span><small>{usesAverageGrade ? '등급 가중합' : '환산점수 가중합'}</small><b>{display(primaryNumerator)}</b></span>
        <i>÷</i>
        <span><small>적용가중치 합</small><b>{display(summary.totalAppliedWeight)}</b></span>
        <i>=</i>
        <span><small>{usesAverageGrade ? '평균등급' : '기초점수'}</small><b>{display(usesAverageGrade ? summary.averageGrade : summary.baseScore, summary.intermediateScale)}</b></span>
        {usesAverageGrade && <><i>→</i><span><small>등급 환산표 적용</small><b>{display(summary.baseScore)}</b></span></>}
        <i>×</i>
        <span><small>점수 배율</small><b>{display(summary.scoreMultiplier)}</b></span>
        <i>=</i>
        <span><small>최종 처리 전</small><b>{display(summary.scoreBeforeFinalRounding)}</b></span>
      </div>
      <footer>
        <span>중간값: 소수 {summary.intermediateScale + 1}째 자리에서 {roundingLabels[summary.intermediateRounding]}하여 {summary.intermediateScale}째 자리까지</span>
        <span>최종값: 소수 {summary.finalScale + 1}째 자리에서 {roundingLabels[summary.finalRounding]}하여 {summary.finalScale}째 자리까지</span>
        {yearDenominators.map(([year, denominator]) => (
          <span key={year}>{year}학년 정규화 분모 {display(denominator)}</span>
        ))}
      </footer>
    </section>
  );
}
