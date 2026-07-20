interface StatusPanelProps {
  tone: 'loading' | 'empty' | 'error';
  title: string;
  description?: string;
  compact?: boolean;
}

export default function StatusPanel({ tone, title, description, compact = false }: StatusPanelProps) {
  return (
    <div className={`status-panel status-panel--${tone} ${compact ? 'is-compact' : ''}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className="status-panel__icon" aria-hidden="true">{tone === 'loading' ? '' : tone === 'error' ? '!' : '—'}</span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
    </div>
  );
}
