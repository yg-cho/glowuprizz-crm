import { Fragment } from 'react';
import type { Heatmap as HeatmapData } from '@/lib/api';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const SHADES = ['bg-muted', 'bg-neutral-300', 'bg-neutral-400', 'bg-neutral-500', 'bg-neutral-700', 'bg-neutral-900'];

/** 요일 × 시간(KST) 클릭 수. 회색 농도 6단계. */
export function Heatmap({ data }: { data: HeatmapData }) {
  const shade = (v: number) => (v === 0 || data.max === 0 ? SHADES[0] : SHADES[Math.min(5, 1 + Math.floor((v / data.max) * 4.99))]);
  return (
    <div>
      <div className="grid gap-0.5 text-[10px] text-muted-foreground" style={{ gridTemplateColumns: '24px repeat(24, 1fr)' }}>
        <span />
        {Array.from({ length: 24 }, (_, h) => <span key={h} className="text-center">{h % 3 === 0 ? h : ''}</span>)}
        {data.grid.map((row, d) => (
          <Fragment key={d}>
            <span className="leading-3">{DOW[d]}</span>
            {row.map((v, h) => <i key={h} title={`${DOW[d]} ${h}시 · ${v}`} className={`block h-3 rounded-[2px] ${shade(v)}`} />)}
          </Fragment>
        ))}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">최대 {data.max}회 · 진할수록 많음</div>
    </div>
  );
}
