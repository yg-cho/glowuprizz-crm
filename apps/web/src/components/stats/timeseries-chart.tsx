'use client';

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TimeseriesPoint } from '@/lib/api';

const VISITOR_COLOR = '#d4d4d4'; // neutral-300 — 방문자 막대·범례 공용

/** 일별 방문자(회색)·신청(잉크) 막대 + 전환율 점선(우축). */
export function TimeseriesChart({ data }: { data: TimeseriesPoint[] }) {
  const rows = data.map((d) => ({ ...d, label: d.day.slice(5).replace('-', '/'), rate: Math.round(d.conversionRate * 1000) / 10 }));
  return (
    <div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis yAxisId="n" allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={40} />
            <Tooltip cursor={{ fill: 'var(--muted)' }} contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid var(--border)' }}
              formatter={(v: number, name: string) => [name === '전환율' ? `${v}%` : v, name]} />
            <Bar yAxisId="n" dataKey="visitors" name="방문자" fill={VISITOR_COLOR} radius={[2, 2, 0, 0]} />
            <Bar yAxisId="n" dataKey="submissions" name="신청" fill="var(--primary)" radius={[2, 2, 0, 0]} />
            <Line yAxisId="r" type="monotone" dataKey="rate" name="전환율" stroke="var(--muted-foreground)" strokeDasharray="4 3" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-[-1px]" style={{ background: VISITOR_COLOR }} />방문자</span>
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-primary align-[-1px]" />신청</span>
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-muted-foreground align-[-1px]" />전환율</span>
      </div>
    </div>
  );
}
