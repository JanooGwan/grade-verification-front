import { apiClient } from '@/apis/client';
import type { CourseGrade, CreateEvaluationRuleRequest, EvaluationRule, EvaluationRuleActionRequest, EvaluationRuleStatus, GradeVerification, RuleExtraction, RuleExtractionSummary, RuleExtractionComparison } from './entity';

export const getEvaluationRules = () => apiClient.get<EvaluationRule[]>('/api/evaluations/rules');
export const createEvaluationRule = (request: CreateEvaluationRuleRequest) =>
  apiClient.post<EvaluationRule>('/api/evaluations/rules', request);
export const extractEvaluationRuleFromPdf = (universityId: number, admissionYear: number, file: File) => {
  const formData = new FormData();
  formData.append('universityId', String(universityId));
  formData.append('admissionYear', String(admissionYear));
  formData.append('file', file);
  return apiClient.postForm<RuleExtraction>('/api/evaluations/rule-extractions/pdf', formData);
};
export const createEvaluationRuleFromExtraction = (extractionId: number, request: CreateEvaluationRuleRequest) =>
  apiClient.post<EvaluationRule>(`/api/evaluations/rule-extractions/${extractionId}/draft`, request);
export const createDraftEvaluationRules = (rules: CreateEvaluationRuleRequest[]) =>
  apiClient.post<EvaluationRule[]>('/api/evaluations/rules/drafts/bulk', { rules });
export const getAdminEvaluationRules = (status?: EvaluationRuleStatus) =>
  apiClient.get<EvaluationRule[]>(`/api/evaluations/rules/admin${status ? `?status=${status}` : ''}`);
export const reviewEvaluationRule = (ruleId: number, request: EvaluationRuleActionRequest) =>
  apiClient.patch<EvaluationRule>(`/api/evaluations/rules/${ruleId}/review`, request);
export const publishEvaluationRule = (ruleId: number, request: EvaluationRuleActionRequest) =>
  apiClient.patch<EvaluationRule>(`/api/evaluations/rules/${ruleId}/publish`, request);
export const retireEvaluationRule = (ruleId: number, request: EvaluationRuleActionRequest) =>
  apiClient.patch<EvaluationRule>(`/api/evaluations/rules/${ruleId}/retire`, request);
export const verifyGrades = (ruleId: number, courses: CourseGrade[]) =>
  apiClient.post<GradeVerification>('/api/evaluations/verify', { ruleId, courses });

export const getRuleExtractions = () =>
  apiClient.get<RuleExtractionSummary[]>('/api/evaluations/rule-extractions');

export const compareRuleExtractions = (leftId: number, rightId: number) =>
  apiClient.get<RuleExtractionComparison>(`/api/evaluations/rule-extractions/compare?leftId=${leftId}&rightId=${rightId}`);
