import { apiClient } from '@/apis/client';
import type { AssistantMessageRequest, AssistantMessageResponse } from './entity';

export const askAssistant = (request: AssistantMessageRequest) =>
  apiClient.post<AssistantMessageResponse>('/api/assistant/messages', request);
