import { useState, type FormEvent } from 'react';

import type { CreateUniversityRequest, University, UpdateUniversityRequest } from '@/apis/university/entity';

interface UniversityFormProps {
  editingUniversity: University | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onCreate: (request: CreateUniversityRequest) => Promise<void>;
  onUpdate: (universityId: number, request: UpdateUniversityRequest) => Promise<void>;
}

export default function UniversityForm({
  editingUniversity,
  isSubmitting,
  onCancel,
  onCreate,
  onUpdate,
}: UniversityFormProps) {
  const [code, setCode] = useState(editingUniversity?.code ?? '');
  const [name, setName] = useState(editingUniversity?.name ?? '');
  const [active, setActive] = useState(editingUniversity?.active ?? true);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editingUniversity) {
      await onUpdate(editingUniversity.id, { name: name.trim(), active });
      return;
    }

    await onCreate({ code: code.trim().toUpperCase(), name: name.trim() });
    setCode('');
    setName('');
    setActive(true);
  };

  return (
    <form className="university-form" onSubmit={handleSubmit}>
      <div className="form-heading">
        <div>
          <p className="eyebrow">University profile</p>
          <h2>{editingUniversity ? '대학교 정보 수정' : '새 대학교 등록'}</h2>
        </div>
        {editingUniversity && (
          <button className="text-button" type="button" onClick={onCancel}>
            취소
          </button>
        )}
      </div>

      <label htmlFor="university-code">대학교 코드</label>
      <input
        id="university-code"
        maxLength={20}
        placeholder="예: SAHMYOOK"
        required
        value={code}
        disabled={Boolean(editingUniversity)}
        onChange={(event) => setCode(event.target.value)}
      />

      <label htmlFor="university-name">대학교명</label>
      <input
        id="university-name"
        maxLength={100}
        placeholder="예: 삼육대학교"
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
      />

      {editingUniversity && (
        <label className="toggle-row" htmlFor="university-active">
          <span>
            <strong>사용 상태</strong>
            <small>비활성화된 대학은 검증 대상에서 제외됩니다.</small>
          </span>
          <input
            id="university-active"
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
        </label>
      )}

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? '저장 중…' : editingUniversity ? '변경사항 저장' : '대학교 등록'}
      </button>
    </form>
  );
}
