import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  danger = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelButtonRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !pending) onCancel();
      }}
    >
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <span className={`dialog-icon ${danger ? 'is-danger' : ''}`} aria-hidden="true">{danger ? '!' : '?'}</span>
        <div>
          <h2 id="confirm-dialog-title">{title}</h2>
          <p>{description}</p>
        </div>
        <div className="dialog-actions">
          <button ref={cancelButtonRef} type="button" disabled={pending} onClick={onCancel}>취소</button>
          <button className={danger ? 'is-danger' : ''} type="button" disabled={pending} onClick={onConfirm}>
            {pending ? '처리 중…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
