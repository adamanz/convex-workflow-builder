import { memo } from 'react';
import { Square } from 'lucide-react';
import { BaseNode, type BaseNodeData } from './BaseNode';

export interface EndNodeData extends BaseNodeData {
  outputMapping?: Record<string, string>;
}

interface EndNodeProps {
  id: string;
  data: EndNodeData;
  selected?: boolean;
}

function EndNodeComponent({ id, data, selected }: EndNodeProps) {
  return (
    <BaseNode
      id={id}
      data={data}
      selected={selected}
      icon={<Square className="w-4 h-4 text-red-100" />}
      accentColor="bg-red-600"
      showInputHandle={true}
      showOutputHandle={false}
    >
      {data.outputMapping && Object.keys(data.outputMapping).length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-zinc-500">Output:</span>
          <div className="flex flex-wrap gap-1">
            {Object.keys(data.outputMapping).slice(0, 3).map((key) => (
              <span
                key={key}
                className="px-1.5 py-0.5 text-xs bg-zinc-800 text-zinc-400 rounded"
              >
                {key}
              </span>
            ))}
            {Object.keys(data.outputMapping).length > 3 && (
              <span className="px-1.5 py-0.5 text-xs bg-zinc-800 text-zinc-500 rounded">
                +{Object.keys(data.outputMapping).length - 3}
              </span>
            )}
          </div>
        </div>
      )}
    </BaseNode>
  );
}

export const EndNode = memo(EndNodeComponent);
