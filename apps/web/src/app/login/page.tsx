'use client';

import { Suspense, useState } from 'react';
import { useAction } from '@/lib/use-api';
import { ErrorText } from '@/components/error-text';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/form-field';

/** 같은 사이트의 경로만 허용 (// 나 절대 URL 은 오픈 리다이렉트) */
const safeNext = (v: string | null) => (v && v.startsWith('/') && !v.startsWith('//') ? v : '/');

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useAction(async () => {
    try {
      await api.post('/auth/login', { email, password });
    } catch (err) {
      throw err instanceof ApiError && err.status === 401 ? new ApiError(401, '이메일 또는 비밀번호가 올바르지 않습니다.') : err;
    }
    router.push(safeNext(params.get('next')));
  }, '로그인에 실패했습니다.');

  return (
    <form onSubmit={(e) => { e.preventDefault(); login.run(); }} className="flex flex-col gap-4">
      <FormField htmlFor="email" label="이메일">
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
      </FormField>
      <FormField htmlFor="password" label="비밀번호">
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
      </FormField>
      <ErrorText>{login.error}</ErrorText>
      <Button type="submit" disabled={login.busy}>{login.busy ? '로그인 중…' : '로그인'}</Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>운영자 로그인</CardTitle>
          <CardDescription>리드마그넷 CRM 관리자</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense><LoginForm /></Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
