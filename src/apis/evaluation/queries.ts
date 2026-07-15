import { queryOptions } from '@tanstack/react-query';
import { getAdminEvaluationRules, getEvaluationRules, getRuleExtractions } from '@/apis/evaluation';
import type { EvaluationRuleStatus } from '@/apis/evaluation/entity';

export const evaluationQueryKeys = {
  all: ['evaluation'] as const,
  rules: () => ['evaluation', 'rules'] as const,
  adminRules: (status?: EvaluationRuleStatus) => ['evaluation', 'rules', 'admin', status ?? 'ALL'] as const,
  extractions: () => ['evaluation', 'rule-extractions'] as const,
};
export const evaluationQueries = {
  rules: () => queryOptions({ queryKey: evaluationQueryKeys.rules(), queryFn: getEvaluationRules }),
  adminRules: (status?: EvaluationRuleStatus) => queryOptions({
    queryKey: evaluationQueryKeys.adminRules(status),
    queryFn: () => getAdminEvaluationRules(status),
  }),
  extractions: () => queryOptions({ queryKey: evaluationQueryKeys.extractions(), queryFn: getRuleExtractions }),
};
