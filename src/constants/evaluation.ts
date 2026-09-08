import type { RoundingMode } from '@/apis/evaluation/entity';

export const roundingLabels: Record<RoundingMode, string> = {
  HALF_UP: '반올림',
  DOWN: '절사',
  UP: '올림',
  FLOOR: '내림',
  CEILING: '천장값',
};
