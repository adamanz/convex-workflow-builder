import {
  StartNode,
  EndNode,
  ActionNode,
  MutationNode,
  QueryNode,
  ConditionNode,
  DelayNode,
  ParallelNode,
  LoopNode,
  AINode,
} from './CustomNodes'

export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  action: ActionNode,
  mutation: MutationNode,
  query: QueryNode,
  condition: ConditionNode,
  delay: DelayNode,
  parallel: ParallelNode,
  loop: LoopNode,
  ai: AINode,
}
