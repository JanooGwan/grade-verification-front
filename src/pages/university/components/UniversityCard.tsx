import type { University } from '@/apis/university/entity';

interface UniversityCardProps {
  university: University;
  isDeleting: boolean;
  onDelete: (universityId: number) => void;
  onEdit: (university: University) => void;
}

export default function UniversityCard({ university, isDeleting, onDelete, onEdit }: UniversityCardProps) {
  return (
    <article className="university-card">
      <div className="university-card__top">
        <span className="university-code">{university.code}</span>
        <span className={`status-chip ${university.active ? 'is-active' : 'is-inactive'}`}>
          {university.active ? '사용 중' : '비활성'}
        </span>
      </div>
      <h3>{university.name}</h3>
      <p>성적 검증 규칙과 모집 전형을 이 대학 단위로 관리합니다.</p>
      <div className="card-actions">
        <button className="secondary-button" type="button" onClick={() => onEdit(university)}>
          수정
        </button>
        <button className="danger-button" type="button" disabled={isDeleting} onClick={() => onDelete(university.id)}>
          {isDeleting ? '삭제 중…' : '삭제'}
        </button>
      </div>
    </article>
  );
}
