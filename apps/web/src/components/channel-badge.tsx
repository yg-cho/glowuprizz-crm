import { cn } from '@/lib/utils';
import type { Channel } from '@/lib/api';

// 채널은 색점 + 텍스트로만 구분한다. 색은 채널 식별 신호이며 표·차트 범례와 동일하게 쓴다.
const channelDot: Record<Channel, string> = {
  INSTAGRAM: 'bg-pink-600',
  X: 'bg-gray-900',
  YOUTUBE: 'bg-red-700',
  THREADS: 'bg-gray-500',
};
const channelLabel: Record<Channel, string> = { INSTAGRAM: '인스타그램', X: 'X', YOUTUBE: '유튜브', THREADS: '스레드' };

export function ChannelBadge({ channel }: { channel: Channel }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <i aria-hidden className={cn('h-2 w-2 rounded-full', channelDot[channel])} />
      {channelLabel[channel]}
    </span>
  );
}

// 상태는 색 없이 글자 무게로만. 일시중지가 눈에 띄어야 하므로 그쪽만 잉크.
export function StatusBadge({ status }: { status: 'ACTIVE' | 'PAUSED' }) {
  return (
    <span className={cn('text-xs font-medium', status === 'ACTIVE' ? 'text-muted-foreground' : 'text-foreground')}>
      {status === 'ACTIVE' ? '활성' : '일시중지'}
    </span>
  );
}
