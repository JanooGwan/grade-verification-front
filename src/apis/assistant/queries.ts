export const assistantKeys = {
  all: ['assistant'] as const,
  conversation: (conversationId: string) => [...assistantKeys.all, 'conversation', conversationId] as const,
};
