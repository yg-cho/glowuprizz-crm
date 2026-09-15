import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** 성과 화면의 카드 섹션 공통 틀 */
export function Section({ title, desc, className, children }: { title: string; desc?: string; className?: string; children: React.ReactNode }) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <h3 className="text-sm font-semibold leading-none">{title}</h3>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
