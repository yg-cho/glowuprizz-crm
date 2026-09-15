import { TableCell, TableRow } from '@/components/ui/table';

/** 표의 빈 상태 한 줄. rows 가 null(로딩) 이면 "불러오는 중", [] 이면 안내 문구. */
export function EmptyRow({ colSpan, loading, children }: { colSpan: number; loading?: boolean; children: React.ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-muted-foreground">{loading ? '불러오는 중…' : children}</TableCell>
    </TableRow>
  );
}
