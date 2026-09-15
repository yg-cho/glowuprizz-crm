'use client';

import { useRef, useState } from 'react';
import { Upload, Trash2, Eye } from 'lucide-react';
import { Shell, PageTitle } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ConfirmButton } from '@/components/confirm-button';
import { ErrorText } from '@/components/error-text';
import { Section } from '@/components/stats/section';
import { useApi, useAction } from '@/lib/use-api';
import { api, Template } from '@/lib/api';
import { fmtDate } from '@/lib/format';

export default function TemplatesPage() {
  const list = useApi<Template[]>('/templates');
  const [name, setName] = useState('');
  const [preview, setPreview] = useState<Template | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = useAction(async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) throw new Error('파일을 선택하세요.');
    const fd = new FormData();
    fd.append('file', file);
    if (name.trim()) fd.append('name', name.trim());
    await api.upload('/templates', fd);
    setName(''); if (fileRef.current) fileRef.current.value = '';
    list.reload();
  }, '업로드에 실패했습니다.');
  const remove = useAction(async (t: Template) => { await api.del(`/templates/${t.id}`); list.reload(); }, '삭제하지 못했습니다.');
  const show = async (t: Template) => setPreview(await api.get<Template>(`/templates/${t.id}`));

  const items = list.data ?? [];
  return (
    <Shell>
      <PageTitle title="HTML 템플릿" desc="AI로 만든 단일 .html 파일을 등록합니다. <form> 요소가 포함되어야 합니다." />
      <div className="grid gap-3 lg:grid-cols-3">
        <Section title="새 템플릿 등록" desc=".html, 최대 512KB">
          <form onSubmit={(e) => { e.preventDefault(); upload.run(); }} className="flex flex-col gap-3">
            <div><Label htmlFor="tpl-name">이름 (선택)</Label><Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="미입력 시 파일명" /></div>
            <div><Label htmlFor="tpl-file">HTML 파일</Label><Input id="tpl-file" ref={fileRef} type="file" accept=".html,.htm,text/html" className="py-1.5" /></div>
            <ErrorText>{upload.error}</ErrorText>
            <Button type="submit" disabled={upload.busy}><Upload /> {upload.busy ? '업로드 중…' : '등록'}</Button>
          </form>
        </Section>

        <Section title="등록된 템플릿" className="lg:col-span-2">
          <ErrorText>{remove.error}</ErrorText>
          <Table>
            <TableHeader><TableRow><TableHead>이름</TableHead><TableHead className="text-right">크기</TableHead><TableHead className="text-right">사용 폼</TableHead><TableHead>등록일</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {items.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">아직 없습니다.</TableCell></TableRow>}
              {items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{(t.sizeBytes / 1024).toFixed(1)} KB</TableCell>
                  <TableCell className="text-right tabular-nums">{t._count?.forms ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(t.createdAt)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button size="xs" variant="ghost" onClick={() => show(t)}><Eye /> 소스</Button>
                    <ConfirmButton size="icon-xs" variant="ghost" aria-label="삭제" disabled={(t._count?.forms ?? 0) > 0} title={`"${t.name}" 을 삭제할까요?`} onConfirm={() => remove.run(t)}><Trash2 /></ConfirmButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      </div>

      {preview && (
        <Section title={`${preview.name} — 소스`} desc="보안상 관리자 화면에서는 렌더하지 않고 소스만 표시합니다." className="mt-3">
          <div className="mb-2 text-right"><Button size="xs" variant="outline" onClick={() => setPreview(null)}>닫기</Button></div>
          <pre className="max-h-96 overflow-auto rounded-md bg-neutral-950 p-4 text-xs text-neutral-100">{preview.html}</pre>
        </Section>
      )}
    </Shell>
  );
}
