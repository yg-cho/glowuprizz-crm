'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Shell, PageTitle } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ChannelBadge, StatusBadge } from '@/components/channel-badge';
import { api, ApiError, Campaign, ChannelStats, Template } from '@/lib/api';
import { pct } from '@/lib/utils';

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [channels, setChannels] = useState<ChannelStats[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [c, t, ch] = await Promise.all([
      api.get<Campaign>(`/campaigns/${id}`),
      api.get<Template[]>('/templates'),
      api.get<ChannelStats[]>(`/stats/channels?range=all&campaignId=${id}`),
    ]);
    setCampaign(c); setTemplates(t); setChannels(ch);
    if (!templateId && t[0]) setTemplateId(t[0].id);
  }, [id, templateId]);
  useEffect(() => { load(); }, [load]);

  const createForm = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    try {
      const f = await api.post<{ id: string }>('/forms', { campaignId: id, templateId, name, slug: slug || undefined });
      router.push(`/forms/${f.id}`);
    } catch (err) { setError(err instanceof ApiError ? err.message : '생성 실패'); }
  };

  const removeCampaign = async () => {
    if (!confirm('캠페인과 하위 폼/링크/신청 데이터가 모두 삭제됩니다. 계속할까요?')) return;
    await api.del(`/campaigns/${id}`);
    router.push('/campaigns');
  };

  return (
    <Shell>
      <PageTitle
        title={campaign?.name ?? '…'}
        desc={campaign?.description ?? undefined}
        right={<Button variant="destructive" size="sm" onClick={removeCampaign}><Trash2 className="h-3.5 w-3.5" /> 캠페인 삭제</Button>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>새 신청 폼</CardTitle><CardDescription>HTML 템플릿을 선택해 이 캠페인의 커스텀 폼을 만듭니다.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={createForm} className="flex flex-col gap-3">
              <div><Label htmlFor="form-name">폼 이름</Label><Input id="form-name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div>
                <Label htmlFor="form-template">HTML 템플릿</Label>
                <Select value={templateId} onValueChange={setTemplateId} disabled={templates.length === 0}>
                  <SelectTrigger id="form-template"><SelectValue placeholder={templates.length === 0 ? '템플릿을 먼저 등록하세요' : '템플릿 선택'} /></SelectTrigger>
                  <SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
                {templates.length === 0 && <Link href="/templates" className="text-xs underline">템플릿 등록하기</Link>}
              </div>
              <div><Label htmlFor="form-slug">슬러그 (선택, 소문자·숫자·하이픈)</Label><Input id="form-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="자동 생성" /></div>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={!templateId}><Plus className="h-4 w-4" /> 폼 만들기</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>폼 목록</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>폼</TableHead><TableHead>템플릿</TableHead><TableHead>상태</TableHead><TableHead className="text-right">링크</TableHead><TableHead className="text-right">신청</TableHead></TableRow></TableHeader>
              <TableBody>
                {(campaign?.forms ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-gray-400">폼이 없습니다.</TableCell></TableRow>}
                {campaign?.forms?.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell><Link href={`/forms/${f.id}`} className="font-medium hover:underline">{f.name}</Link><div className="text-xs text-gray-500">/{f.slug}</div></TableCell>
                    <TableCell className="text-gray-600">{f.template?.name}</TableCell>
                    <TableCell><StatusBadge status={f.status} /></TableCell>
                    <TableCell className="text-right tabular-nums">{f._count?.links ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{f._count?.submissions ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>이 캠페인의 채널별 성과</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>채널</TableHead><TableHead className="text-right">방문</TableHead><TableHead className="text-right">방문자</TableHead><TableHead className="text-right">신청</TableHead><TableHead className="text-right">전환율</TableHead></TableRow></TableHeader>
              <TableBody>
                {channels.map((c) => (
                  <TableRow key={c.channel}>
                    <TableCell><ChannelBadge channel={c.channel} /></TableCell>
                    <TableCell className="text-right tabular-nums">{c.pageViews}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.VIEW}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.SUBMIT_SUCCESS}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{pct(c.clickToSubmit)}</TableCell>
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
