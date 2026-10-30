import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { askAssistant } from '@/apis/assistant';
import { ApiError } from '@/apis/client';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  blocked?: boolean;
  sourceTables?: string[];
  rowCount?: number;
}

const suggestions = [
  '현재 등록된 대학과 활성화된 반영 기준 수를 알려줘',
  '2027학년도 전형별 지원자 수를 요약해줘',
  '최근 성적 검증 결과를 대학별로 정리해줘',
];

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '입학관리 DB의 내용을 바탕으로 궁금한 점에 답해드릴게요. 조회만 가능하며 데이터는 변경하지 않습니다.',
};

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.response?.message ?? error.message;
  return error instanceof Error ? error.message : 'AI 도우미 요청을 처리하지 못했습니다.';
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [question, setQuestion] = useState('');
  const [conversationId, setConversationId] = useState<string>();
  const mutation = useMutation({
    mutationFn: askAssistant,
    onSuccess: (response) => {
      setConversationId(response.conversationId);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.answer,
          blocked: response.blocked,
          sourceTables: response.sourceTables,
          rowCount: response.rowCount,
        },
      ]);
    },
    onError: (error) => {
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'assistant', content: errorMessage(error) },
      ]);
    },
  });

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending) return;
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: 'user', content: trimmed },
    ]);
    setQuestion('');
    mutation.mutate({ question: trimmed, conversationId });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(question);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit(question);
    }
  };

  const resetConversation = () => {
    setMessages([welcomeMessage]);
    setConversationId(undefined);
    setQuestion('');
    mutation.reset();
  };

  return (
    <main className="assistant-page">
      <header className="page-header assistant-header">
        <div className="brand-mark">AI</div>
        <div>
          <p className="eyebrow">Read-only data assistant</p>
          <h1>AI 데이터 도우미</h1>
          <p className="page-description">입학관리 데이터에서 필요한 내용을 찾아 근거와 함께 답변합니다.</p>
        </div>
        <div className="assistant-status"><span aria-hidden="true" />DB 조회 전용</div>
      </header>

      <section className="assistant-workspace">
        <aside className="assistant-guide">
          <p className="section-step">SAFE BY DESIGN</p>
          <h2>조회만 가능한 도우미</h2>
          <p>테이블 설명을 먼저 살펴보고 필요한 범위만 조회합니다. 답변은 실제 조회 결과에만 근거합니다.</p>
          <ul>
            <li><b>01</b><span>DB 데이터 추가·수정·삭제 불가</span></li>
            <li><b>02</b><span>최대 100행, 짧은 조회 시간 제한</span></li>
            <li><b>03</b><span>비밀번호·키·접속정보 질문 차단</span></li>
          </ul>
          <div className="assistant-suggestions">
            <strong>이렇게 물어보세요</strong>
            {suggestions.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => submit(suggestion)} disabled={mutation.isPending}>
                {suggestion}<span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="assistant-chat" aria-label="AI 데이터 도우미 대화">
          <div className="assistant-chat-heading">
            <div><span className="assistant-avatar">AI</span><div><strong>데이터 도우미</strong><small>Claude Haiku · 읽기 전용</small></div></div>
            <button type="button" onClick={resetConversation}>새 대화</button>
          </div>
          <div className="assistant-messages" aria-live="polite">
            {messages.map((message) => (
              <article key={message.id} className={`assistant-message assistant-message--${message.role} ${message.blocked ? 'is-blocked' : ''}`}>
                <span>{message.role === 'assistant' ? 'AI' : '나'}</span>
                <div>
                  <p>{message.content}</p>
                  {message.sourceTables && message.sourceTables.length > 0 && (
                    <footer>
                      <small>근거 테이블</small>
                      {message.sourceTables.map((table) => <code key={table}>{table}</code>)}
                      <em>{message.rowCount}행 조회</em>
                    </footer>
                  )}
                </div>
              </article>
            ))}
            {mutation.isPending && (
              <article className="assistant-message assistant-message--assistant assistant-thinking">
                <span>AI</span><div><i /><i /><i /><small>관련 테이블을 확인하고 있어요</small></div>
              </article>
            )}
          </div>
          <form className="assistant-composer" onSubmit={handleSubmit}>
            <label htmlFor="assistant-question">데이터에 대해 질문하기</label>
            <div>
              <textarea
                id="assistant-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={4000}
                rows={2}
                placeholder="예: 올해 대학별 지원자 수를 알려줘"
                disabled={mutation.isPending}
              />
              <button type="submit" disabled={!question.trim() || mutation.isPending} aria-label="질문 보내기">↑</button>
            </div>
            <small>Enter로 전송 · Shift+Enter로 줄바꿈</small>
          </form>
        </section>
      </section>
    </main>
  );
}
