import { apiClient } from '@/apis/client';
import type { ActiveJobs, LightDataStatus, OperationsDashboard, RuleChangeEntry } from './entity';

export const getOperationsDashboard = () =>
  apiClient.get<OperationsDashboard>('/api/operations/dashboard');

export const getLightDataStatus = () => apiClient.get<LightDataStatus[]>('/api/operations/data-status');
export const getActiveJobs = () => apiClient.get<ActiveJobs>('/api/operations/active-jobs');
export const getRuleChangeHistory = () => apiClient.get<RuleChangeEntry[]>('/api/operations/rule-change-history');
