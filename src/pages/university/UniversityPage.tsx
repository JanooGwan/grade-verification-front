import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/apis/client';
import type { CreateUniversityRequest, University, UpdateUniversityRequest } from '@/apis/university/entity';
import { universityQueries } from '@/apis/university/queries';
import UniversityCard from '@/pages/university/components/UniversityCard';
import UniversityForm from '@/pages/university/components/UniversityForm';
import { useUniversityMutations } from '@/pages/university/hooks/useUniversityMutations';

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.response?.message ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '요청 처리 중 알 수 없는 오류가 발생했습니다.';
}

export default function UniversityPage() {
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const universitiesQuery = useQuery(universityQueries.list());
  const { createMutation, deleteMutation, updateMutation } = useUniversityMutations();

  const handleCreate = async (request: CreateUniversityRequest) => {
    setActionError(null);
    try {
      await createMutation.mutateAsync(request);
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };

  const handleUpdate = async (universityId: number, request: UpdateUniversityRequest) => {
    setActionError(null);
    try {
      await updateMutation.mutateAsync({ universityId, ...request });
      setEditingUniversity(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };

  const handleDelete = async (universityId: number) => {
    if (!window.confirm('이 대학교를 삭제하시겠습니까?')) {
      return;
    }

    setActionError(null);
    try {
      await deleteMutation.mutateAsync(universityId);
      if (editingUniversity?.id === universityId) {
        setEditingUniversity(null);
      }
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };

  const universities = universitiesQuery.data ?? [];
  const activeCount = universities.filter((university) => university.active).length;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <main>
      <header className="page-header">
        <div className="brand-mark" aria-hidden="true">
          GV
        </div>
        <div>
          <p className="eyebrow">Grade Validation Console</p>
          <h1>대학교 관리</h1>
          <p className="page-description">성적 검증을 진행할 대학을 등록하고 운영 상태를 관리합니다.</p>
        </div>
      </header>

      <section className="summary-grid" aria-label="대학교 현황">
        <div className="summary-card">
          <span>등록 대학</span>
          <strong>{universities.length}</strong>
        </div>
        <div className="summary-card">
          <span>사용 중</span>
          <strong>{activeCount}</strong>
        </div>
        <div className="summary-card summary-card--accent">
          <span>API 연결</span>
          <strong>{universitiesQuery.isPending ? '확인 중' : universitiesQuery.isError ? '확인 필요' : '정상'}</strong>
        </div>
      </section>

      {(actionError || universitiesQuery.isError) && (
        <div className="error-banner" role="alert">
          {actionError ?? getErrorMessage(universitiesQuery.error)}
        </div>
      )}

      <section className="workspace-grid">
        <UniversityForm
          key={editingUniversity?.id ?? 'new'}
          editingUniversity={editingUniversity}
          isSubmitting={isSubmitting}
          onCancel={() => setEditingUniversity(null)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />

        <div className="university-list-panel">
          <div className="list-heading">
            <div>
              <p className="eyebrow">Registered universities</p>
              <h2>등록된 대학교</h2>
            </div>
            <button className="text-button" type="button" onClick={() => universitiesQuery.refetch()}>
              새로고침
            </button>
          </div>

          {universitiesQuery.isPending ? (
            <div className="empty-state">대학교 목록을 불러오는 중입니다.</div>
          ) : universitiesQuery.isError ? (
            <div className="empty-state">
              <strong>대학교 목록을 불러오지 못했습니다.</strong>
              <span>백엔드 실행 상태를 확인한 뒤 새로고침해 주세요.</span>
            </div>
          ) : universities.length === 0 ? (
            <div className="empty-state">
              <strong>아직 등록된 대학교가 없습니다.</strong>
              <span>왼쪽 양식에서 첫 대학교를 등록해보세요.</span>
            </div>
          ) : (
            <div className="university-list">
              {universities.map((university) => (
                <UniversityCard
                  key={university.id}
                  university={university}
                  isDeleting={deleteMutation.isPending && deleteMutation.variables === university.id}
                  onDelete={handleDelete}
                  onEdit={setEditingUniversity}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
