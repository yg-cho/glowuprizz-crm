import { Button } from '@/components/ui/button';

/** 이전/다음 페이지. 한 페이지면 렌더하지 않음. */
export function Pager({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (n: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-sm">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>이전</Button>
      <span className="text-muted-foreground">{page} / {pages}</span>
      <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onChange(page + 1)}>다음</Button>
    </div>
  );
}
