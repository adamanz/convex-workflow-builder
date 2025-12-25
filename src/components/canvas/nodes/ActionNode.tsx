import { memo } from 'react';
import { Zap, Globe, Code, Box } from 'lucide-react';
import { BaseNode, type BaseNodeData } from './BaseNode';

export interface ActionNodeData extends BaseNodeData {
  actionType?: 'http' | 'custom' | 'internal';
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url?: string;
  functionPath?: string;
}

interface ActionNodeProps {
  id: string;
  data: ActionNodeData;
  selected?: boolean;
}

const methodColors: Record<string, string> = {
  GET: 'text-emerald-400',
  POST: 'text-blue-400',
  PUT: 'text-yellow-400',
  DELETE: 'text-red-400',
  PATCH: 'text-purple-400',
};

function ActionNodeComponent({ id, data, selected }: ActionNodeProps) {
  const { actionType, method, url, functionPath } = data;

  const getActionIcon = () => {
    switch (actionType) {
      case 'http':
        return <Globe className="w-4 h-4 text-blue-100" />;
      case 'custom':
        return <Code className="w-4 h-4 text-blue-100" />;
      case 'internal':
        return <Box className="w-4 h-4 text-blue-100" />;
      default:
        return <Zap className="w-4 h-4 text-blue-100" />;
    }
  };

  const getDisplayInfo = () => {
    if (actionType === 'http' && url) {
      try {
        const parsedUrl = new URL(url);
        return parsedUrl.hostname + parsedUrl.pathname;
      } catch {
        return url;
      }
    }
    if (actionType === 'internal' && functionPath) {
      return functionPath;
    }
    return null;
  };

  const displayInfo = getDisplayInfo();

  return (
    <BaseNode
      id={id}
      data={data}
      selected={selected}
      icon={getActionIcon()}
      accentColor="bg-blue-600"
      showInputHandle={true}
      showOutputHandle={true}
    >
      <div className="space-y-1.5">
        {actionType === 'http' && method && (
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs font-mono font-semibold ${methodColors[method] || 'text-zinc-400'}`}
            >
              {method}
            </span>
          </div>
        )}
        {displayInfo && (
          <p className="text-xs text-zinc-400 font-mono truncate max-w-[180px]">
            {displayInfo}
          </p>
        )}
        {actionType && !displayInfo && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">Type:</span>
            <span className="text-xs text-zinc-300 capitalize">{actionType}</span>
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export const ActionNode = memo(ActionNodeComponent);
