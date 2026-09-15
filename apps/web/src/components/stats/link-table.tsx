'use client';

import { Copy, ExternalLink, Trash2 } from 'lucide-react';
import { MIN_SAMPLE } from '@glowuprizz/shared';
import { EmptyRow } from '@/components/empty-row';
import { useCopy } from '@/lib/use-copy';
import { ConfirmButton } from '@/components/confirm-button';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChannelBadge } from '@/components/channel-badge';
import { cn } from '@/lib/utils';
import { pct, fmtNum, fmtDay } from '@/lib/format';
import type { LinkStats } from '@/lib/api';

/** 배포 링크별 단계 수. 같은 채널 안에서도 게시 위치별로 비교. 표본 있는 링크 중 전환 최저만 색. */
export function LinkTable({ rows, publicOrigin, showForm, onDelete }: { rows: LinkStats[] | null; publicOrigin: string; showForm?: boolean; onDelete?: (link: LinkStats) => void | Promise<void> }) {
  const { copied, copy } = useCopy();
  const list = rows ?? [];
  const withData = list.filter((r) => r.VIEW >= MIN_SAMPLE);
  const worst = withData.length >= 2 ? withData.reduce((a, b) => (b.conversionRate < a.conversionRate ? b : a)).linkId : null;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>링크</TableHead><TableHead>채널</TableHead>
          <TableHead className="text-right">클릭</TableHead><TableHead className="text-right">작성</TableHead><TableHead className="text-right">신청</TableHead><TableHead className="text-right">전환</TableHead><TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.length === 0 && <EmptyRow colSpan={7} loading={rows === null}>배포 링크가 없습니다.</EmptyRow>}
        {list.map((r) => (
          <TableRow key={r.linkId}>
            <TableCell>
              <code className="text-xs">/l/{r.code}</code>
              <div className="text-xs text-muted-foreground">{showForm && <>{r.form.name} · </>}{fmtDay(r.createdAt)}</div>
            </TableCell>
            <TableCell><ChannelBadge channel={r.channel} /></TableCell>
            <TableCell className="text-right tabular-nums">{fmtNum(r.VIEW)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtNum(r.FORM_START)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtNum(r.SUBMIT_SUCCESS)}</TableCell>
            <TableCell className={cn('text-right tabular-nums', worst === r.linkId && 'text-destructive')}>{pct(r.conversionRate)}</TableCell>
            <TableCell className="whitespace-nowrap text-right">
              <Button size="xs" variant="ghost" disabled={!publicOrigin} onClick={() => copy(r.linkId, `${publicOrigin}/l/${r.code}`)}><Copy /> {copied === r.linkId ? '복사됨' : '복사'}</Button>
              <Button size="icon-xs" variant="ghost" asChild><a href={`${publicOrigin}/l/${r.code}`} target="_blank" rel="noopener noreferrer" aria-label="열기"><ExternalLink /></a></Button>
              {onDelete && (
                <ConfirmButton size="icon-xs" variant="ghost" aria-label="삭제" title="배포 링크를 삭제할까요?" description="기존 방문·신청 데이터는 채널 없음으로 남습니다." onConfirm={() => onDelete(r)}><Trash2 /></ConfirmButton>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
