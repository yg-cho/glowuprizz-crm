import { serverGet } from '@/lib/api-server';
import type { Template } from '@/lib/api';
import { TemplatesView } from './view';

/** 목록을 서버에서 먼저 받아 첫 화면부터 채워진 표를 보낸다. 실패하면 null → 클라이언트가 다시 부른다. */
export default async function TemplatesPage() {
  const templates = await serverGet<Template[]>('/templates');
  return <TemplatesView initialTemplates={templates} />;
}
