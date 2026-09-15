'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, Eye } from 'lucide-react';
import { Shell, PageTitle } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { api, ApiError, Template } from '@/lib/api';
import { fmtDate } from '@/lib/utils';

export default function TemplatesPage() {
  const [items, setItems] = useState<Template[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Template | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => api.get<Template[]>('/templates').then(setItems);
  useEffect(() => { load(); }, []);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setError('파일을 선택하세요.');
    setBusy(true); setError(null);
    const fd = new FormData();
    fd.append('file', file);
    if (name.trim()) fd.append('name', name.trim());
    try {
      await api.upload('/templates', fd);
      setName(''); if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '업로드 실패');
    } finally { setBusy(false); }
  };

  const remove = async (t: Template) => {
    if (!confirm(`"${t.name}" 삭제할까요?`)) return;
    try { await api.del(`/templates/${t.id}`); await load(); }
    catch (err) { alert(err instanceof ApiError ? err.message : '삭제 실패'); }
  };

  const show = async (t: Template) => setPreview(await api.get<Template>(`/templates/${t.id}`));

  return (
    <Shell>
      <PageTitle title="HTML 템플릿" desc="AI로 만든 단일 .html 파일을 등록합니다. <form> 요소가 포함되어야 합니다." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>새 템플릿 등록</CardTitle><CardDescription>.html, 최대 512KB</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={upload} className="flex flex-col gap-3">
              <div><Label htmlFor="tpl-name">이름 (선택)</Label><Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="미입력 시 파일명" /></div>
              <div><Label htmlFor="tpl-file">HTML 파일</Label><Input id="tpl-file" ref={fileRef} type="file" accept=".html,.htm,text/html" className="py-1.5" /></div>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={busy}><Upload className="h-4 w-4" /> {busy ? '업로드 중…' : '등록'}</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>등록된 템플릿</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>이름</TableHead><TableHead className="text-right">크기</TableHead><TableHead className="text-right">사용 폼</TableHead><TableHead>등록일</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {items.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-gray-400">아직 없습니다.</TableCell></TableRow>}
                {items.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{(t.sizeBytes / 1024).toFixed(1)} KB</TableCell>
                    <TableCell className="text-right tabular-nums">{t._count?.forms ?? 0}</TableCell>
                    <TableCell className="text-gray-500">{fmtDate(t.createdAt)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => show(t)}><Eye className="h-3.5 w-3.5" /> 소스</Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(t)} disabled={(t._count?.forms ?? 0) > 0}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {preview && (
        <Card className="mt-6">
          <CardHeader className="flex-row items-center justify-between">
            <div><CardTitle>{preview.name} — 소스</CardTitle><CardDescription>보안상 관리자 화면에서는 렌더하지 않고 소스만 표시합니다.</CardDescription></div>
            <Button size="sm" variant="outline" onClick={() => setPreview(null)}>닫기</Button>
          </CardHeader>
          <CardContent><pre className="max-h-96 overflow-auto rounded-md bg-gray-950 p-4 text-xs text-gray-100">{preview.html}</pre></CardContent>
        </Card>
      )}
    </Shell>
  );
}
