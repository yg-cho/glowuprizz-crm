import { Label } from '@/components/ui/label';

interface Props {
  /** 연결할 입력의 id */
  htmlFor: string;
  label: string;
  /** 입력 아래 도움말·링크 */
  hint?: React.ReactNode;
  children: React.ReactNode;
}

/** 라벨 + 입력 한 묶음. 간격을 한곳에서 정한다(shadcn Label 은 자체 마진이 없다). */
export function FormField({ htmlFor, label, hint, children }: Props) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint}
    </div>
  );
}
