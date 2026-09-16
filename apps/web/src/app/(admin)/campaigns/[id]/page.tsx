'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { PageTitle } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/channel-badge';
import { ConfirmButton } from '@/components/confirm-button';
import { ErrorText } from '@/components/error-text';
import { EmptyRow } from '@/components/empty-row';
import { FiltersBar } from '@/components/stats/filters-bar';
import { StageCards } from '@/components/stats/stage-cards';
import { LinkTable } from '@/components/stats/link-table';
import { FormCompare } from '@/components/stats/form-compare';
import { Heatmap } from '@/components/stats/heatmap';
import { FailuresTable, QualityList } from '@/components/stats/quality';
import { Section } from '@/components/stats/section';
import { useStatsFilters } from '@/lib/stats-filters';
import { useApi, useAction } from '@/lib/use-api';
import { usePublicOrigin } from '@/lib/use-public-origin';
import { api, Campaign, Failure, FormStats, Funnel, Heatmap as HeatmapData, LinkStats, Quality, Template } from '@/lib/api';

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { filters, set, query } = useStatsFilters({ range: '7d', compare: true });
  const q = query({ campaignId: id });

  const { data: campaign } = useApi<Campaign>(`/campaigns/${id}`);
  const { data: templates } = useApi<Template[]>('/templates');
  const funnelQ = useApi<Funnel>(`/stats/funnel?${q}`);
  const linksQ = useApi<LinkStats[]>(`/stats/links?${q}`);
  const formsQ = useApi<FormStats[]>(`/stats/forms?${q}`);
  const heatmapQ = useApi<HeatmapData>(`/stats/heatmap?${q}`);
  const failuresQ = useApi<Failure[]>(`/stats/failures?${q}`);
  const qualityQ = useApi<Quality>(`/stats/quality?${q}`);
  const publicOrigin = usePublicOrigin();
  const funnel = funnelQ.data;

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [templateId, setTemplateId] = useState('');
  useEffect(() => { if (!templateId && templates?.[0]) setTemplateId(templates[0].id); }, [templates, templateId]);

  const createForm = useAction(async () => {
    const f = await api.post<{ id: string }>('/forms', { campaignId: id, templateId, name, slug: slug || undefined });
    router.push(`/forms/${f.id}`);
  }, '폼을 만들지 못했습니다.');
  const removeCampaign = async () => { await api.del(`/campaigns/${id}`); router.push('/campaigns'); };

  const formOptions = campaign?.forms ?? [];

  return (
    <>
      <div className="mb-1 text-sm text-muted-foreground"><Link href={`/?range=${filters.range}`} className="hover:underline">대시보드</Link> / 캠페인</div>
      <PageTitle
        title={campaign?.name ?? '…'}
        desc={campaign?.description ?? undefined}
        right={<ConfirmButton variant="destructive" size="sm" title="캠페인을 삭제할까요?" description="하위 폼·링크·이벤트·신청 데이터가 모두 삭제됩니다." onConfirm={removeCampaign}><Trash2 /> 캠페인 삭제</ConfirmButton>}
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

      {funnelQ.error && <ErrorText>{funnelQ.error}</ErrorText>}
      {funnel && <StageCards funnel={funnel.current} previous={funnel.previous} />}

      <div className="mb-3 grid gap-3 lg:grid-cols-5">
        <Section title="링크별 성과" desc="같은 채널 안에서도 게시 위치별로." className="lg:col-span-3" state={linksQ}>
          <LinkTable rows={linksQ.data} publicOrigin={publicOrigin} showForm={formOptions.length > 1} />
        </Section>
        <Section title="폼 비교" desc="템플릿을 여러 개 붙이면 그대로 A/B 비교." className="lg:col-span-2" state={formsQ}>
          <FormCompare rows={formsQ.data} />
        </Section>
      </div>

      <div className="mb-8 grid gap-3 lg:grid-cols-3">
        <Section title="시간대별 클릭" desc="요일 × 시간(KST). 게시 타이밍 참고." state={heatmapQ}>{heatmapQ.data && <Heatmap data={heatmapQ.data} />}</Section>
        <Section title="제출 실패" desc="제출 시도 → 완료 사이" state={failuresQ}><FailuresTable rows={failuresQ.data} /></Section>
        <Section title="방문자 품질" desc="재방문과 중복" state={qualityQ}>{qualityQ.data && <QualityList q={qualityQ.data} />}</Section>
      </div>

      <h2 className="mb-3 text-base font-semibold">폼 관리</h2>
      <div className="grid gap-3 lg:grid-cols-3">
        <Section title="새 신청 폼" desc="HTML 템플릿을 선택해 이 캠페인의 폼을 만듭니다.">
          <form onSubmit={(e) => { e.preventDefault(); createForm.run(); }} className="flex flex-col gap-3">
            <FormField htmlFor="form-name" label="폼 이름"><Input id="form-name" value={name} onChange={(e) => setName(e.target.value)} required /></FormField>
            <FormField
              htmlFor="form-template" label="HTML 템플릿"
              hint={templates?.length === 0 && <Link href="/templates" className="text-xs underline">템플릿 등록하기</Link>}
            >
              <Select value={templateId} onValueChange={setTemplateId} disabled={!templates?.length}>
                <SelectTrigger id="form-template" className="w-full"><SelectValue placeholder={templates?.length === 0 ? '템플릿을 먼저 등록하세요' : '템플릿 선택'} /></SelectTrigger>
                <SelectContent>{templates?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField htmlFor="form-slug" label="슬러그 (선택, 소문자·숫자·하이픈)"><Input id="form-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="자동 생성" /></FormField>
            <ErrorText>{createForm.error}</ErrorText>
            <Button type="submit" disabled={!templateId || createForm.busy}><Plus /> 폼 만들기</Button>
          </form>
        </Section>
        <Section title="폼 목록" className="lg:col-span-2">
          <Table>
            <TableHeader><TableRow><TableHead>폼</TableHead><TableHead>템플릿</TableHead><TableHead>상태</TableHead><TableHead className="text-right">링크</TableHead><TableHead className="text-right">신청</TableHead></TableRow></TableHeader>
            <TableBody>
              {formOptions.length === 0 && <EmptyRow colSpan={5} loading={campaign === null}>폼이 없습니다.</EmptyRow>}
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

