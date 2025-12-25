import { memo } from 'react';
import { Play } from 'lucide-react';
import { BaseNode, type BaseNodeData } from './BaseNode';

export interface StartNodeData extends BaseNodeData {
  triggerType?: 'manual' | 'schedule' | 'webhook';
}

interface StartNodeProps {
  id: string;
  data: StartNodeData;
  selected?: boolean;
}

function StartNodeComponent({ id, data, selected }: StartNodeProps) {
  return (
    <BaseNode
      id={id}
      data={data}
      selected={selected}
      icon={<Play className="w-4 h-4 text-emerald-100" />}
      accentColor="bg-emerald-600"
      showInputHandle={false}
      showOutputHandle={true}
    >
      {data.triggerType && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500">Trigger:</span>
          <span className="text-xs text-zinc-300 capitalize">
            {data.triggerType}
          </span>
        </div>
      )}
    </BaseNode>
  );
}

export const StartNode = memo(StartNodeComponent);
