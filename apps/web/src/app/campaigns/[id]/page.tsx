'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Shell, PageTitle } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/channel-badge';
import { FiltersBar } from '@/components/stats/filters-bar';
import { StageCards } from '@/components/stats/stage-cards';
import { LinkTable } from '@/components/stats/link-table';
import { FormCompare } from '@/components/stats/form-compare';
import { Heatmap } from '@/components/stats/heatmap';
import { FailuresTable, QualityList } from '@/components/stats/quality';
import { Section } from '@/components/stats/section';
import { useStatsFilters } from '@/lib/stats-filters';
import { api, ApiError, Campaign, Failure, FormStats, Funnel, Heatmap as HeatmapData, LinkStats, Quality, Template } from '@/lib/api';

function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { filters, set, query } = useStatsFilters({ range: '7d', compare: true });

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [publicOrigin, setPublicOrigin] = useState('');
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [links, setLinks] = useState<LinkStats[]>([]);
  const [forms, setForms] = useState<FormStats[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [quality, setQuality] = useState<Quality | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadCampaign = useCallback(async () => {
    const [c, t] = await Promise.all([api.get<Campaign>(`/campaigns/${id}`), api.get<Template[]>('/templates')]);
    setCampaign(c); setTemplates(t);
  }, [id]);
  useEffect(() => { loadCampaign(); }, [loadCampaign]);
  // 템플릿이 로드되면 첫 항목을 기본 선택
  useEffect(() => { if (!templateId && templates[0]) setTemplateId(templates[0].id); }, [templates, templateId]);

  useEffect(() => {
    const q = query({ campaignId: id });
    api.get<Funnel>(`/stats/funnel?${q}`).then(setFunnel);
    api.get<LinkStats[]>(`/stats/links?${q}`).then((rows) => { setLinks(rows); });
    api.get<FormStats[]>(`/stats/forms?${q}`).then(setForms);
    api.get<HeatmapData>(`/stats/heatmap?${q}`).then(setHeatmap);
    api.get<Failure[]>(`/stats/failures?${q}`).then(setFailures);
    api.get<Quality>(`/stats/quality?${q}`).then(setQuality);
  }, [query, id]);

  // 공개 폼 origin: 링크 응답 url 에서 추출 (api 가 FORMS_PUBLIC_ORIGIN 기준으로 만든다)
  useEffect(() => {
    if (!campaign?.forms?.[0]) return;
    api.get<{ url: string }[]>(`/links?formId=${campaign.forms[0].id}`).then((ls) => { if (ls[0]) setPublicOrigin(new URL(ls[0].url).origin); }).catch(() => {});
  }, [campaign]);

  const createForm = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    try {
      const f = await api.post<{ id: string }>('/forms', { campaignId: id, templateId, name, slug: slug || undefined });
      router.push(`/forms/${f.id}`);
    } catch (err) { setError(err instanceof ApiError ? err.message : '생성 실패'); }
  };
  const removeCampaign = async () => {
    if (!confirm('캠페인과 하위 폼/링크/이벤트/신청 데이터가 모두 삭제됩니다. 계속할까요?')) return;
    await api.del(`/campaigns/${id}`);
    router.push('/campaigns');
  };

  const formOptions = campaign?.forms ?? [];

  return (
    <>
      <div className="mb-1 text-sm text-muted-foreground"><Link href={`/?range=${filters.range}`} className="hover:underline">대시보드</Link> / 캠페인</div>
      <PageTitle
        title={campaign?.name ?? '…'}
        desc={campaign?.description ?? undefined}
        right={<Button variant="destructive" size="sm" onClick={removeCampaign}><Trash2 /> 캠페인 삭제</Button>}
      />

      <FiltersBar
        filters={filters} onChange={set} hideCampaign
        right={formOptions.length > 1 && (
          <Select value={filters.formId ?? 'all'} onValueChange={(v) => set({ formId: v === 'all' ? undefined : v })}>
            <SelectTrigger className="w-40" aria-label="폼"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 폼</SelectItem>
              {formOptions.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      />

      {funnel && <StageCards funnel={funnel.current} previous={funnel.previous} />}

      <div className="mb-3 grid gap-3 lg:grid-cols-5">
        <Section title="링크별 성과" desc="같은 채널 안에서도 게시 위치별로." className="lg:col-span-3">
          <LinkTable rows={links} publicOrigin={publicOrigin} showForm={formOptions.length > 1} />
        </Section>
        <Section title="폼 비교" desc="템플릿을 여러 개 붙이면 그대로 A/B 비교." className="lg:col-span-2">
          <FormCompare rows={forms} />
        </Section>
      </div>

      <div className="mb-8 grid gap-3 lg:grid-cols-3">
        <Section title="시간대별 클릭" desc="요일 × 시간(KST). 게시 타이밍 참고.">
          {heatmap && <Heatmap data={heatmap} />}
        </Section>
        <Section title="제출 실패" desc="제출 시도 → 완료 사이">
          <FailuresTable rows={failures} />
        </Section>
        <Section title="방문자 품질" desc="재방문과 중복">
          {quality && <QualityList q={quality} />}
        </Section>
      </div>

      <h2 className="mb-3 text-base font-semibold">폼 관리</h2>
      <div className="grid gap-3 lg:grid-cols-3">
        <Section title="새 신청 폼" desc="HTML 템플릿을 선택해 이 캠페인의 폼을 만듭니다.">
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
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={!templateId}><Plus /> 폼 만들기</Button>
          </form>
        </Section>
        <Section title="폼 목록" className="lg:col-span-2">
          <Table>
            <TableHeader><TableRow><TableHead>폼</TableHead><TableHead>템플릿</TableHead><TableHead>상태</TableHead><TableHead className="text-right">링크</TableHead><TableHead className="text-right">신청</TableHead></TableRow></TableHeader>
            <TableBody>
              {formOptions.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">폼이 없습니다.</TableCell></TableRow>}
              {formOptions.map((f) => (
                <TableRow key={f.id}>
                  <TableCell><Link href={`/forms/${f.id}`} className="font-medium hover:underline">{f.name}</Link><div className="text-xs text-muted-foreground">/{f.slug}</div></TableCell>
                  <TableCell className="text-muted-foreground">{f.template?.name}</TableCell>
                  <TableCell><StatusBadge status={f.status} /></TableCell>
                  <TableCell className="text-right tabular-nums">{f._count?.links ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">{f._count?.submissions ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      </div>
    </>
  );
}

export default function CampaignDetailPage() {
  return (
    <Shell>
      <Suspense><CampaignDetail /></Suspense>
    </Shell>
  );
}
