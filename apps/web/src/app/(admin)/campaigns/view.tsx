'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PageTitle } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/form-field';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ErrorText } from '@/components/error-text';
import { EmptyRow } from '@/components/empty-row';
import { Section } from '@/components/stats/section';
import { useApi, useAction } from '@/lib/use-api';
import { api, Campaign } from '@/lib/api';
import { fmtDate } from '@/lib/format';

export function CampaignsView({ initialCampaigns }: { initialCampaigns: Campaign[] | null }) {
  const list = useApi<Campaign[]>('/campaigns', initialCampaigns);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const create = useAction(async () => {
    await api.post('/campaigns', { name, description: description || undefined });
    setName(''); setDescription(''); list.reload();
  }, '캠페인을 만들지 못했습니다.');

  const items = list.data ?? [];
  return (
    <>
      <PageTitle title="캠페인 · 폼" desc="캠페인을 만들고, 캠페인 안에서 HTML 템플릿 기반 신청 폼과 채널별 배포 링크를 만듭니다." />
      <div className="grid gap-3 lg:grid-cols-3">
        <Section title="새 캠페인">
          <form onSubmit={(e) => { e.preventDefault(); create.run(); }} className="flex flex-col gap-3">
            <FormField htmlFor="camp-name" label="이름"><Input id="camp-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="예) 9월 무료 PT 체험" /></FormField>
            <FormField htmlFor="camp-desc" label="설명 (선택)"><Input id="camp-desc" value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
            <ErrorText>{create.error}</ErrorText>
            <Button type="submit" disabled={create.busy}><Plus /> 생성</Button>
          </form>
        </Section>
        <Section title="캠페인 목록" className="lg:col-span-2" state={list}>
          <Table>
            <TableHeader><TableRow><TableHead>이름</TableHead><TableHead className="text-right">폼</TableHead><TableHead>생성일</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.length === 0 && <EmptyRow colSpan={3} loading={list.data === null}>아직 없습니다.</EmptyRow>}
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><Link href={`/campaigns/${c.id}`} className="font-medium hover:underline">{c.name}</Link>{c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}</TableCell>
                  <TableCell className="text-right tabular-nums">{c._count?.forms ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(c.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      </div>
    </>
  );
}
