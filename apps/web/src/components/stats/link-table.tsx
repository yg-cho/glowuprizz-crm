'use client';

import { useState } from 'react';
import { Copy, ExternalLink, Trash2 } from 'lucide-react';
import { ConfirmButton } from '@/components/confirm-button';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChannelBadge } from '@/components/channel-badge';
import { cn } from '@/lib/utils';
import { pct, fmtNum, fmtDay } from '@/lib/format';
import type { LinkStats } from '@/lib/api';

/** 배포 링크별 단계 수. 같은 채널 안에서도 게시 위치별로 비교. 표본 있는 링크 중 전환 최저만 색. */
export function LinkTable({ rows, publicOrigin, showForm, onDelete }: { rows: LinkStats[]; publicOrigin: string; showForm?: boolean; onDelete?: (link: LinkStats) => void | Promise<void> }) {
  const [copied, setCopied] = useState<string | null>(null);
  const withData = rows.filter((r) => r.VIEW >= 10);
  const worst = withData.length >= 2 ? withData.reduce((a, b) => (b.conversionRate < a.conversionRate ? b : a)).linkId : null;
  const copy = async (r: LinkStats) => { await navigator.clipboard.writeText(`${publicOrigin}/l/${r.code}`); setCopied(r.linkId); setTimeout(() => setCopied(null), 1500); };
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>링크</TableHead><TableHead>채널</TableHead>
          <TableHead className="text-right">클릭</TableHead><TableHead className="text-right">작성</TableHead><TableHead className="text-right">신청</TableHead><TableHead className="text-right">전환</TableHead><TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">배포 링크가 없습니다.</TableCell></TableRow>}
        {rows.map((r) => (
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
              <Button size="xs" variant="ghost" onClick={() => copy(r)}><Copy /> {copied === r.linkId ? '복사됨' : '복사'}</Button>
              <a href={`${publicOrigin}/l/${r.code}`} target="_blank" rel="noopener noreferrer"><Button size="icon-xs" variant="ghost" aria-label="열기"><ExternalLink /></Button></a>
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
