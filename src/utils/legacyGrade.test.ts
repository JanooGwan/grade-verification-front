import { describe, expect, it } from 'vitest';
import { legacyAchievementGrade, percentileGrade, rankPercentile } from './legacyGrade';

describe('구교육과정 입력 사전 검증', () => {
  it('모집요강의 석차백분율 예제를 재현한다', () => {
    expect(rankPercentile(30, null, 126, 5)).toBe(23.80952);
    expect(rankPercentile(21, null, 385, 5)).toBe(5.45455);
    expect(percentileGrade(4)).toBe(1);
    expect(percentileGrade(4.00001)).toBe(2);
  });

  it('동석차 범위와 수우미양가 기본 환산을 검증한다', () => {
    expect(() => rankPercentile(99, 3, 100, 5)).toThrow();
    expect(['SU', 'WOO', 'MI', 'YANG', 'GA'].map((value) =>
      legacyAchievementGrade(value as 'SU' | 'WOO' | 'MI' | 'YANG' | 'GA'))).toEqual([1, 3, 5, 7, 9]);
  });

  it('유한한 백분율과 0 이상의 정수 자릿수만 허용한다', () => {
    expect(() => percentileGrade(Number.NaN)).toThrow();
    expect(() => percentileGrade(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => rankPercentile(1, null, 10, -1)).toThrow();
    expect(() => rankPercentile(1, null, 10, 1.5)).toThrow();
  });
});
