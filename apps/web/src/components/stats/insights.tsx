import type { Insight } from '@/lib/api';

/** 규칙 기반 주목점. 없으면 렌더하지 않음. */
export function Insights({ items }: { items: Insight[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-3 space-y-1 border-t pt-3 text-xs text-muted-foreground">
      {items.map((n, i) => <li key={i}><span className="mr-1 text-foreground">{n.level === 'warn' ? '주의' : '참고'}</span>{n.text}</li>)}
    </ul>
  );
}
