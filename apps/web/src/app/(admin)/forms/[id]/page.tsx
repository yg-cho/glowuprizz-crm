'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Pause, Play, Plus, Trash2 } from 'lucide-react';
import { CHANNEL_OPTIONS, type Channel } from '@glowuprizz/shared';
import { PageTitle } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/channel-badge';
import { ConfirmButton } from '@/components/confirm-button';
import { ErrorText } from '@/components/error-text';
import { Section } from '@/components/stats/section';
import { LinkTable } from '@/components/stats/link-table';
import { SubmittedList } from '@/components/crm/submitted-list';
import { useApi, useAction } from '@/lib/use-api';
import { usePublicOrigin } from '@/lib/use-public-origin';
import { api, FormRow, LinkStats } from '@/lib/api';

export default function FormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const form = useApi<FormRow>(`/forms/${id}`);
  const links = useApi<LinkStats[]>(`/stats/links?range=all&formId=${id}`);
  const publicOrigin = usePublicOrigin();
  const [channel, setChannel] = useState<Channel>('INSTAGRAM');

  const createLink = useAction(async () => { await api.post('/links', { formId: id, channel }); links.reload(); form.reload(); }, '링크를 만들지 못했습니다.');
  const removeLink = async (l: LinkStats) => { await api.del(`/links/${l.linkId}`); links.reload(); form.reload(); };
  const toggle = useAction(async () => {
    if (!form.data) return;
    await api.patch(`/forms/${id}`, { status: form.data.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' });
    form.reload();
  }, '상태를 바꾸지 못했습니다.');
  const removeForm = async () => { await api.del(`/forms/${id}`); router.push(form.data?.campaign ? `/campaigns/${form.data.campaign.id}` : '/campaigns'); };

  const f = form.data;
  return (
    <>
      {f?.campaign && <div className="mb-1 text-sm text-muted-foreground"><Link href={`/campaigns/${f.campaign.id}`} className="hover:underline">{f.campaign.name}</Link> / 폼</div>}
      <PageTitle
        title={f?.name ?? '…'}
        desc={f ? `템플릿: ${f.template?.name} · /${f.slug}` : undefined}
        right={f && (
          <div className="flex items-center gap-2">
            <StatusBadge status={f.status} />
            <Button size="sm" variant="outline" onClick={() => toggle.run()} disabled={toggle.busy}>{f.status === 'ACTIVE' ? <><Pause /> 일시중지</> : <><Play /> 재개</>}</Button>
            <ConfirmButton size="icon-sm" variant="destructive" aria-label="폼 삭제" title="폼을 삭제할까요?" description="링크·이벤트·신청 데이터가 함께 삭제됩니다." onConfirm={removeForm}><Trash2 /></ConfirmButton>
          </div>
        )}
      />

      <ErrorText>{form.error ?? toggle.error}</ErrorText>
      <div className="grid gap-3 lg:grid-cols-3">
        <Section title="배포 링크 만들기" desc="채널별 고유 URL. 채널명은 URL에 노출되지 않습니다.">
          <form onSubmit={(e) => { e.preventDefault(); createLink.run(); }} className="flex flex-col gap-3">
            <FormField htmlFor="link-channel" label="채널">
              <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                <SelectTrigger id="link-channel" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNEL_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <ErrorText>{createLink.error}</ErrorText>
            <Button type="submit" disabled={createLink.busy}><Plus /> 링크 생성</Button>
          </form>
        </Section>

        <Section title="배포 링크" desc="전 기간 단계 수. 복사해서 각 채널에 게시." className="lg:col-span-2" state={links}>
          <LinkTable rows={links.data} publicOrigin={publicOrigin} onDelete={removeLink} />
        </Section>

        <Section title="신청 명단" desc="이 폼으로 들어온 신청. 행을 펼치면 방문자 여정." className="lg:col-span-3">
          <SubmittedList formId={id} compact />
        </Section>
      </div>
    </>
  );
}
