/** 0~1 비율을 작은 막대 + 퍼센트로. */
export function ShareBar({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs tabular-nums">
      <span className="inline-block h-1.5 w-20 overflow-hidden rounded-full bg-muted"><i className="block h-full bg-primary" style={{ width: `${Math.round(value * 100)}%` }} /></span>
      {Math.round(value * 100)}%
    </span>
  );
}
