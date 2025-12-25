import { memo } from 'react';
import { Position } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { BaseNode, type BaseNodeData } from './BaseNode';

export interface ConditionNodeData extends BaseNodeData {
  conditionType?: 'expression' | 'compare';
  expression?: string;
  left?: string;
  operator?: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith' | 'endsWith';
  right?: string;
}

interface ConditionNodeProps {
  id: string;
  data: ConditionNodeData;
  selected?: boolean;
}

const operatorLabels: Record<string, string> = {
  '==': '=',
  '!=': '!=',
  '>': '>',
  '<': '<',
  '>=': '>=',
  '<=': '<=',
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
};

function ConditionNodeComponent({ id, data, selected }: ConditionNodeProps) {
  const { conditionType, expression, left, operator, right } = data;

  const getConditionDisplay = () => {
    if (conditionType === 'expression' && expression) {
      return expression;
    }
    if (conditionType === 'compare' && left && operator && right) {
      return `${left} ${operatorLabels[operator] || operator} ${right}`;
    }
    return null;
  };

  const conditionDisplay = getConditionDisplay();

  return (
    <BaseNode
      id={id}
      data={data}
      selected={selected}
      icon={<GitBranch className="w-4 h-4 text-yellow-100" />}
      accentColor="bg-yellow-600"
      showInputHandle={true}
      showOutputHandle={false}
      outputHandles={[
        { id: 'true', position: Position.Bottom, label: 'True' },
        { id: 'false', position: Position.Bottom, label: 'False' },
      ]}
    >
      <div className="space-y-2">
        {conditionDisplay && (
          <p className="text-xs text-zinc-400 font-mono truncate max-w-[180px]">
            {conditionDisplay}
          </p>
        )}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-zinc-500">True</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-zinc-500">False</span>
          </div>
        </div>
      </div>
    </BaseNode>
  );
}

export const ConditionNode = memo(ConditionNodeComponent);
