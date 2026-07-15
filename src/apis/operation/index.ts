import { apiClient } from '@/apis/client';
import type { OperationsDashboard } from './entity';

export const getOperationsDashboard = () =>
  apiClient.get<OperationsDashboard>('/api/operations/dashboard');
