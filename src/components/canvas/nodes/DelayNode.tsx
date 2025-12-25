import { memo } from 'react';
import { Clock, Calendar } from 'lucide-react';
import { BaseNode, type BaseNodeData } from './BaseNode';
import { formatDuration } from '@/lib/utils';

export interface DelayNodeData extends BaseNodeData {
  delayType?: 'duration' | 'until';
  durationMs?: number;
  untilTimestamp?: number;
}

interface DelayNodeProps {
  id: string;
  data: DelayNodeData;
  selected?: boolean;
}

function DelayNodeComponent({ id, data, selected }: DelayNodeProps) {
  const { delayType, durationMs, untilTimestamp } = data;

  const getDelayDisplay = () => {
    if (delayType === 'duration' && durationMs) {
      return formatDuration(durationMs);
    }
    if (delayType === 'until' && untilTimestamp) {
      const date = new Date(untilTimestamp);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return null;
  };

  const delayDisplay = getDelayDisplay();

  return (
    <BaseNode
      id={id}
      data={data}
      selected={selected}
      icon={
        delayType === 'until' ? (
          <Calendar className="w-4 h-4 text-purple-100" />
        ) : (
          <Clock className="w-4 h-4 text-purple-100" />
        )
      }
      accentColor="bg-purple-600"
      showInputHandle={true}
      showOutputHandle={true}
    >
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500">
            {delayType === 'until' ? 'Wait until:' : 'Wait for:'}
          </span>
        </div>
        {delayDisplay ? (
          <p className="text-sm font-medium text-zinc-200">{delayDisplay}</p>
        ) : (
          <p className="text-xs text-zinc-500 italic">Not configured</p>
        )}
      </div>
    </BaseNode>
  );
}

export const DelayNode = memo(DelayNodeComponent);
