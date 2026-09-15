'use client';

import { useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/error-text';
import { ApiError } from '@/lib/api';

type ButtonProps = React.ComponentProps<typeof Button>;

interface Props extends Omit<ButtonProps, 'onClick'> {
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}

/** window.confirm 대체. 실패하면 대화상자를 닫지 않고 에러를 보여준다. */
export function ConfirmButton({ title, description, confirmLabel = '삭제', onConfirm, children, ...btn }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (e: React.MouseEvent) => {
    e.preventDefault(); // Radix 가 즉시 닫지 않도록 — 성공 시에만 닫는다
    setBusy(true); setError(null);
    try { await onConfirm(); setOpen(false); }
    catch (err) { setError(err instanceof ApiError ? err.message : '처리하지 못했습니다.'); }
    finally { setBusy(false); }
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null); }}>
      <AlertDialogTrigger asChild><Button {...btn}>{children}</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <ErrorText>{error}</ErrorText>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>취소</AlertDialogCancel>
          <AlertDialogAction onClick={run} disabled={busy}>{busy ? '처리 중…' : confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
