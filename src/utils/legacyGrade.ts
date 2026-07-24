const percentileLimits = [4, 11, 23, 40, 60, 77, 89, 96, 100];

export function rankPercentile(rank: number, tiedRankCount: number | null, cohortSize: number, scale: number) {
  if (!Number.isInteger(scale) || scale < 0) {
    throw new Error('반올림 자릿수는 0 이상의 정수여야 합니다.');
  }
  const tied = tiedRankCount ?? 1;
  if (!Number.isInteger(rank) || !Number.isInteger(tied) || !Number.isInteger(cohortSize)
    || rank < 1 || tied < 1 || cohortSize < 1 || rank + tied - 1 > cohortSize) {
    throw new Error('석차·동석차 범위가 재적수를 초과합니다.');
  }
  const factor = 10 ** scale;
  return Math.round((((rank + (tied - 1) / 2) / cohortSize) * 100 + Number.EPSILON) * factor) / factor;
}

export function percentileGrade(percentile: number) {
  if (!Number.isFinite(percentile) || percentile < 0 || percentile > 100) {
    throw new Error('석차백분율은 0~100이어야 합니다.');
  }
  return percentileLimits.findIndex((limit) => percentile <= limit) + 1;
}

export function legacyAchievementGrade(value: 'SU' | 'WOO' | 'MI' | 'YANG' | 'GA') {
  return { SU: 1, WOO: 3, MI: 5, YANG: 7, GA: 9 }[value];
}
