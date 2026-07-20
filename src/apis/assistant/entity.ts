export interface AssistantMessageRequest {
  question: string;
  conversationId?: string;
}

export interface AssistantMessageResponse {
  answer: string;
  blocked: boolean;
  sourceTables: string[];
  rowCount: number;
  conversationId: string;
}
