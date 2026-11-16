interface ReviewFilterNoticeProps {
  enabled: boolean;
  applied: boolean | undefined;
}

export default function ReviewFilterNotice({ enabled, applied }: ReviewFilterNoticeProps) {
  if (!enabled || applied === undefined) return null;
  return applied
    ? <p>엑셀 내보내기는 선택한 회차의 전체 결과를 포함합니다.</p>
    : <p role="alert">현재 서버는 동점 검토 필터를 지원하지 않아 전체 결과가 표시됩니다.</p>;
}
