'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, FileCode2, FolderKanban, ListChecks, Loader2, LogOut, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const nav = [
  { href: '/', label: '대시보드', icon: BarChart3 },
  { href: '/templates', label: 'HTML 템플릿', icon: FileCode2 },
  { href: '/campaigns', label: '캠페인 · 폼', icon: FolderKanban },
  { href: '/submissions', label: 'CRM 명단', icon: Users },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const logout = async () => {
    await api.post('/auth/logout');
    router.push('/login');
  };
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r bg-card p-4">
        <div className="mb-6 flex items-center gap-2 px-2 text-sm font-semibold">
          <ListChecks className="h-5 w-5" /> 리드마그넷 CRM
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => {
            const active = n.href === '/' ? path === '/' : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href}
                className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm', active ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:bg-muted')}
                aria-current={active ? 'page' : undefined}>
                <n.icon className="h-4 w-4" /> {n.label}
                <NavPending />
              </Link>
            );
          })}
        </nav>
        <button onClick={logout} className="mt-8 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
          <LogOut className="h-4 w-4" /> 로그아웃
        </button>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

/**
 * 이동 중인 링크에만 도는 표시. 서버에서 첫 데이터를 받아오는 동안 이전 화면을 그대로 두기 때문에
 * (라우트 폴백을 쓰지 않는다) 누른 링크에 진행 중임을 알리는 표시가 필요하다.
 */
function NavPending() {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" role="status" aria-label="이동 중" /> : null;
}

export function PageTitle({ title, desc, right }: { title: string; desc?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      </div>
      {right}
    </div>
  );
}
