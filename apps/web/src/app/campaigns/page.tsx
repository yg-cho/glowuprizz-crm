'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Shell, PageTitle } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { api, ApiError, Campaign } from '@/lib/api';
import { fmtDate } from '@/lib/utils';

export default function CampaignsPage() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<Campaign[]>('/campaigns').then(setItems);
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    try {
      await api.post('/campaigns', { name, description: description || undefined });
      setName(''); setDescription(''); await load();
    } catch (err) { setError(err instanceof ApiError ? err.message : '생성 실패'); }
  };

  return (
    <Shell>
      <PageTitle title="캠페인 · 폼" desc="캠페인을 만들고, 캠페인 안에서 HTML 템플릿 기반 신청 폼과 채널별 배포 링크를 만듭니다." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>새 캠페인</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={create} className="flex flex-col gap-3">
              <div><Label htmlFor="camp-name">이름</Label><Input id="camp-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="예) 9월 무료 PT 체험" /></div>
              <div><Label htmlFor="camp-desc">설명 (선택)</Label><Input id="camp-desc" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <Button type="submit"><Plus className="h-4 w-4" /> 생성</Button>
            </form>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>캠페인 목록</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>이름</TableHead><TableHead className="text-right">폼</TableHead><TableHead>생성일</TableHead></TableRow></TableHeader>
              <TableBody>
                {items.length === 0 && <TableRow><TableCell colSpan={3} className="py-8 text-center text-gray-400">아직 없습니다.</TableCell></TableRow>}
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell><Link href={`/campaigns/${c.id}`} className="font-medium hover:underline">{c.name}</Link>{c.description && <div className="text-xs text-gray-500">{c.description}</div>}</TableCell>
                    <TableCell className="text-right tabular-nums">{c._count?.forms ?? 0}</TableCell>
                    <TableCell className="text-gray-500">{fmtDate(c.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
