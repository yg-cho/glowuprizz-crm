'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Copy, ExternalLink, Pause, Play, Plus, Trash2 } from 'lucide-react';
import { Shell, PageTitle } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ChannelBadge, StatusBadge } from '@/components/channel-badge';
import { CHANNEL_OPTIONS, type Channel } from '@glowuprizz/shared';
import { api, ApiError, FormRow, Link as DistLink, Submission } from '@/lib/api';
import { fmtDate } from '@/lib/utils';


export default function FormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<FormRow | null>(null);
  const [links, setLinks] = useState<DistLink[]>([]);
  const [subs, setSubs] = useState<{ total: number; items: Submission[] } | null>(null);
  const [channel, setChannel] = useState<Channel>('INSTAGRAM');
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [f, l, s] = await Promise.all([
      api.get<FormRow>(`/forms/${id}`),
      api.get<DistLink[]>(`/links?formId=${id}`),
      api.get<{ total: number; items: Submission[] }>(`/submissions?formId=${id}&pageSize=50`),
    ]);
    setForm(f); setLinks(l); setSubs(s);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const createLink = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    try { await api.post('/links', { formId: id, channel }); await load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : '생성 실패'); }
  };
  const removeLink = async (l: DistLink) => {
    if (!confirm('링크를 삭제할까요? 기존 방문/신청 데이터는 유지됩니다.')) return;
    await api.del(`/links/${l.id}`); await load();
  };
  const copy = async (l: DistLink) => { await navigator.clipboard.writeText(l.url); setCopied(l.id); setTimeout(() => setCopied(null), 1500); };
  const toggle = async () => {
    if (!form) return;
    await api.patch(`/forms/${id}`, { status: form.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }); await load();
  };
  const removeForm = async () => {
    if (!confirm('폼과 링크/신청 데이터가 삭제됩니다. 계속할까요?')) return;
    await api.del(`/forms/${id}`); router.push(form?.campaign ? `/campaigns/${form.campaign.id}` : '/campaigns');
  };

  const fieldKeys = Array.from(new Set((subs?.items ?? []).flatMap((s) => Object.keys(s.payload)))).slice(0, 6);

  return (
    <Shell>
      <PageTitle
        title={form?.name ?? '…'}
        desc={form ? `캠페인: ${form.campaign?.name} · 템플릿: ${form.template?.name} · /${form.slug}` : undefined}
        right={form && (
          <div className="flex items-center gap-2">
            <StatusBadge status={form.status} />
            <Button size="sm" variant="outline" onClick={toggle}>{form.status === 'ACTIVE' ? <><Pause className="h-3.5 w-3.5" /> 일시중지</> : <><Play className="h-3.5 w-3.5" /> 재개</>}</Button>
            <Button size="sm" variant="destructive" onClick={removeForm}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        )}
      />
      {form?.campaign && <Link href={`/campaigns/${form.campaign.id}`} className="mb-4 inline-block text-sm text-gray-500 hover:underline">← {form.campaign.name}</Link>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>배포 링크 만들기</CardTitle><CardDescription>채널별 고유 URL. 채널명은 URL에 노출되지 않습니다.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={createLink} className="flex flex-col gap-3">
              <div>
                <Label htmlFor="link-channel">채널</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                  <SelectTrigger id="link-channel"><SelectValue /></SelectTrigger>
                  <SelectContent>{CHANNEL_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <Button type="submit"><Plus className="h-4 w-4" /> 링크 생성</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>배포 링크</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>채널</TableHead><TableHead>URL</TableHead><TableHead>생성일</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {links.length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-gray-400">링크가 없습니다.</TableCell></TableRow>}
                {links.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell><ChannelBadge channel={l.channel} /></TableCell>
                    <TableCell><code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{l.url}</code></TableCell>
                    <TableCell className="text-gray-500 whitespace-nowrap">{fmtDate(l.createdAt)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => copy(l)}><Copy className="h-3.5 w-3.5" /> {copied === l.id ? '복사됨' : '복사'}</Button>
                      <a href={l.url} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="ghost"><ExternalLink className="h-3.5 w-3.5" /></Button></a>
                      <Button size="sm" variant="ghost" onClick={() => removeLink(l)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>신청 명단 <span className="text-gray-400 font-normal">({subs?.total ?? 0})</span></CardTitle><CardDescription>최근 50건. 전체는 CRM 명단 메뉴에서.</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>일시</TableHead><TableHead>채널</TableHead>{fieldKeys.map((k) => <TableHead key={k}>{k}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {(subs?.items ?? []).length === 0 && <TableRow><TableCell colSpan={2 + fieldKeys.length} className="py-8 text-center text-gray-400">신청이 없습니다.</TableCell></TableRow>}
                {subs?.items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-gray-500 whitespace-nowrap">{fmtDate(s.createdAt)}</TableCell>
                    <TableCell>{s.link ? <ChannelBadge channel={s.link.channel} /> : <span className="text-xs text-gray-400">직접</span>}</TableCell>
                    {fieldKeys.map((k) => <TableCell key={k} className="max-w-48 truncate">{Array.isArray(s.payload[k]) ? (s.payload[k] as string[]).join(', ') : s.payload[k] ?? ''}</TableCell>)}
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
