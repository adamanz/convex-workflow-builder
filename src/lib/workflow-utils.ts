/**
 * Workflow-specific utility functions
 *
 * Provides utilities for workflow validation, node traversal,
 * topological sorting, and graph analysis.
 */

import type { WorkflowNode, WorkflowEdge, NodeType } from '../types/workflow';

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  code: string;
  message: string;
  nodeId?: string;
}

/**
 * Node with connection info
 */
export interface NodeWithConnections {
  node: WorkflowNode;
  incomingEdges: WorkflowEdge[];
  outgoingEdges: WorkflowEdge[];
  predecessors: WorkflowNode[];
  successors: WorkflowNode[];
}

/**
 * Validate a workflow structure
 *
 * Checks for:
 * - Required start and end nodes
 * - Orphan nodes (no connections)
 * - Invalid connections
 * - Cycles (if not allowed)
 * - Required node configurations
 */
export function validateWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: { allowCycles?: boolean } = {}
): ValidationResult {
  const { allowCycles = false } = options;
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check for empty workflow
  if (nodes.length === 0) {
    errors.push({
      code: 'EMPTY_WORKFLOW',
      message: 'Workflow must have at least one node',
    });
    return { isValid: false, errors, warnings };
  }

  // Check for start node
  const startNodes = nodes.filter((n) => n.type === 'start');
  if (startNodes.length === 0) {
    errors.push({
      code: 'NO_START_NODE',
      message: 'Workflow must have a Start node',
    });
  } else if (startNodes.length > 1) {
    errors.push({
      code: 'MULTIPLE_START_NODES',
      message: 'Workflow can only have one Start node',
    });
  }

  // Check for end node
  const endNodes = nodes.filter((n) => n.type === 'end');
  if (endNodes.length === 0) {
    errors.push({
      code: 'NO_END_NODE',
      message: 'Workflow must have an End node',
    });
  } else if (endNodes.length > 1) {
    warnings.push({
      code: 'MULTIPLE_END_NODES',
      message: 'Workflow has multiple End nodes',
    });
  }

  // Build node map for quick lookup
  const nodeMap = new Map<string, WorkflowNode>();
  for (const node of nodes) {
    if (nodeMap.has(node.id)) {
      errors.push({
        code: 'DUPLICATE_NODE_ID',
        message: `Duplicate node ID: ${node.id}`,
        nodeId: node.id,
      });
    }
    nodeMap.set(node.id, node);
  }

  // Validate edges
  const edgeSet = new Set<string>();
  for (const edge of edges) {
    // Check for duplicate edges
    const edgeKey = `${edge.source}-${edge.target}`;
    if (edgeSet.has(edgeKey)) {
      errors.push({
        code: 'DUPLICATE_EDGE',
        message: `Duplicate edge from ${edge.source} to ${edge.target}`,
        edgeId: edge.id,
      });
    }
    edgeSet.add(edgeKey);

    // Check for self-loops
    if (edge.source === edge.target) {
      errors.push({
        code: 'SELF_LOOP',
        message: `Self-loop detected on node ${edge.source}`,
        edgeId: edge.id,
        nodeId: edge.source,
      });
    }

    // Check for valid source node
    if (!nodeMap.has(edge.source)) {
      errors.push({
        code: 'INVALID_SOURCE',
        message: `Edge references non-existent source node: ${edge.source}`,
        edgeId: edge.id,
      });
    }

    // Check for valid target node
    if (!nodeMap.has(edge.target)) {
      errors.push({
        code: 'INVALID_TARGET',
        message: `Edge references non-existent target node: ${edge.target}`,
        edgeId: edge.id,
      });
    }
  }

  // Check for orphan nodes
  const connectedNodeIds = new Set<string>();
  for (const edge of edges) {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  }

  for (const node of nodes) {
    if (node.type !== 'start' && node.type !== 'end' && !connectedNodeIds.has(node.id)) {
      warnings.push({
        code: 'ORPHAN_NODE',
        message: `Node "${node.data.label}" is not connected to any other node`,
        nodeId: node.id,
      });
    }
  }

  // Check for unreachable nodes from start
  if (startNodes.length === 1) {
    const reachable = getReachableNodes(startNodes[0].id, nodes, edges);
    for (const node of nodes) {
      if (node.type !== 'start' && !reachable.has(node.id)) {
        warnings.push({
          code: 'UNREACHABLE_NODE',
          message: `Node "${node.data.label}" is not reachable from Start`,
          nodeId: node.id,
        });
      }
    }
  }

  // Check for nodes that cannot reach end
  if (endNodes.length >= 1) {
    const endReachable = new Set<string>();
    for (const endNode of endNodes) {
      const reaching = getNodesReachingTarget(endNode.id, nodes, edges);
      for (const nodeId of reaching) {
        endReachable.add(nodeId);
      }
    }

    for (const node of nodes) {
      if (node.type !== 'end' && !endReachable.has(node.id)) {
        warnings.push({
          code: 'DEAD_END_NODE',
          message: `Node "${node.data.label}" cannot reach any End node`,
          nodeId: node.id,
        });
      }
    }
  }

  // Check for cycles
  if (!allowCycles) {
    const cycleNodes = detectCycles(nodes, edges);
    if (cycleNodes.length > 0) {
      errors.push({
        code: 'CYCLE_DETECTED',
        message: `Cycle detected involving nodes: ${cycleNodes.join(', ')}`,
      });
    }
  }

  // Validate node configurations
  for (const node of nodes) {
    const nodeErrors = validateNodeConfig(node);
    for (const error of nodeErrors) {
      errors.push({
        ...error,
        nodeId: node.id,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate node configuration based on node type
 */
function validateNodeConfig(node: WorkflowNode): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = node.data.config;

  switch (node.type) {
    case 'action':
      if (!config.actionType) {
        errors.push({
          code: 'MISSING_ACTION_TYPE',
          message: `Action node "${node.data.label}" is missing action type`,
        });
      }
      if (config.actionType === 'http' && !config.url) {
        errors.push({
          code: 'MISSING_URL',
          message: `HTTP action node "${node.data.label}" is missing URL`,
        });
      }
      break;

    case 'condition':
      if (!config.conditionType) {
        errors.push({
          code: 'MISSING_CONDITION_TYPE',
          message: `Condition node "${node.data.label}" is missing condition type`,
        });
      }
      break;

    case 'delay':
      if (!config.delayType) {
        errors.push({
          code: 'MISSING_DELAY_TYPE',
          message: `Delay node "${node.data.label}" is missing delay type`,
        });
      }
      if (config.delayType === 'duration' && !config.durationMs) {
        errors.push({
          code: 'MISSING_DURATION',
          message: `Delay node "${node.data.label}" is missing duration`,
        });
      }
      break;

    case 'ai':
      if (!config.prompt) {
        errors.push({
          code: 'MISSING_PROMPT',
          message: `AI node "${node.data.label}" is missing prompt`,
        });
      }
      break;
  }

  return errors;
}

/**
 * Find a node by ID
 */
export function findNode(nodes: WorkflowNode[], nodeId: string): WorkflowNode | undefined {
  return nodes.find((n) => n.id === nodeId);
}

/**
 * Find a node by type
 */
export function findNodeByType(nodes: WorkflowNode[], type: NodeType): WorkflowNode | undefined {
  return nodes.find((n) => n.type === type);
}

/**
 * Find all nodes of a specific type
 */
export function findNodesByType(nodes: WorkflowNode[], type: NodeType): WorkflowNode[] {
  return nodes.filter((n) => n.type === type);
}

/**
 * Get connected nodes (both predecessors and successors)
 */
export function getConnectedNodes(
  nodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): NodeWithConnections | null {
  const node = findNode(nodes, nodeId);
  if (!node) return null;

  const incomingEdges = edges.filter((e) => e.target === nodeId);
  const outgoingEdges = edges.filter((e) => e.source === nodeId);

  const predecessorIds = incomingEdges.map((e) => e.source);
  const successorIds = outgoingEdges.map((e) => e.target);

  const predecessors = nodes.filter((n) => predecessorIds.includes(n.id));
  const successors = nodes.filter((n) => successorIds.includes(n.id));

  return {
    node,
    incomingEdges,
    outgoingEdges,
    predecessors,
    successors,
  };
}

/**
 * Get predecessor nodes (nodes that connect to this node)
 */
export function getPredecessors(
  nodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowNode[] {
  const incomingEdges = edges.filter((e) => e.target === nodeId);
  const predecessorIds = incomingEdges.map((e) => e.source);
  return nodes.filter((n) => predecessorIds.includes(n.id));
}

/**
 * Get successor nodes (nodes that this node connects to)
 */
export function getSuccessors(
  nodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowNode[] {
  const outgoingEdges = edges.filter((e) => e.source === nodeId);
  const successorIds = outgoingEdges.map((e) => e.target);
  return nodes.filter((n) => successorIds.includes(n.id));
}

/**
 * Get all reachable nodes from a starting node
 */
export function getReachableNodes(
  startNodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Set<string> {
  const reachable = new Set<string>();
  const queue = [startNodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (reachable.has(current)) continue;
    reachable.add(current);

    const successors = getSuccessors(current, nodes, edges);
    for (const successor of successors) {
      if (!reachable.has(successor.id)) {
        queue.push(successor.id);
      }
    }
  }

  return reachable;
}

/**
 * Get all nodes that can reach a target node
 */
export function getNodesReachingTarget(
  targetNodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Set<string> {
  const reaching = new Set<string>();
  const queue = [targetNodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (reaching.has(current)) continue;
    reaching.add(current);

    const predecessors = getPredecessors(current, nodes, edges);
    for (const predecessor of predecessors) {
      if (!reaching.has(predecessor.id)) {
        queue.push(predecessor.id);
      }
    }
  }

  return reaching;
}

/**
 * Perform topological sort on workflow nodes
 *
 * Returns nodes in execution order (from Start to End).
 * Returns null if a cycle is detected.
 */
export function topologicalSort(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowNode[] | null {
  // Build adjacency list and in-degree map
  const adjacencyList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    adjacencyList.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    const neighbors = adjacencyList.get(edge.source);
    if (neighbors) {
      neighbors.push(edge.target);
    }
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  // Find all nodes with in-degree 0
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  // Process nodes
  const sorted: WorkflowNode[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodeMap.get(nodeId);
    if (node) {
      sorted.push(node);
    }

    const neighbors = adjacencyList.get(nodeId) ?? [];
    for (const neighborId of neighbors) {
      const newDegree = (inDegree.get(neighborId) ?? 1) - 1;
      inDegree.set(neighborId, newDegree);
      if (newDegree === 0) {
        queue.push(neighborId);
      }
    }
  }

  // Check if all nodes were processed (no cycle)
  if (sorted.length !== nodes.length) {
    return null; // Cycle detected
  }

  return sorted;
}

/**
 * Detect cycles in the workflow graph
 *
 * Returns array of node IDs that are part of a cycle
 */
export function detectCycles(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
  const sorted = topologicalSort(nodes, edges);
  if (sorted !== null) {
    return []; // No cycles
  }

  // Find nodes that are part of cycles using DFS
  const adjacencyList = new Map<string, string[]>();
  for (const node of nodes) {
    adjacencyList.set(node.id, []);
  }
  for (const edge of edges) {
    const neighbors = adjacencyList.get(edge.source);
    if (neighbors) {
      neighbors.push(edge.target);
    }
  }

  const cycleNodes = new Set<string>();
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacencyList.get(nodeId) ?? [];
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        if (dfs(neighborId)) {
          cycleNodes.add(nodeId);
          return true;
        }
      } else if (recursionStack.has(neighborId)) {
        cycleNodes.add(nodeId);
        cycleNodes.add(neighborId);
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  }

  return Array.from(cycleNodes);
}

/**
 * Get the execution path from start to a specific node
 */
export function getExecutionPath(
  targetNodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowNode[] {
  // Find start node
  const startNode = findNodeByType(nodes, 'start');
  if (!startNode) return [];

  // BFS to find shortest path
  const queue: { nodeId: string; path: string[] }[] = [
    { nodeId: startNode.id, path: [startNode.id] },
  ];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { nodeId, path } = queue.shift()!;

    if (nodeId === targetNodeId) {
      return path.map((id) => findNode(nodes, id)!).filter(Boolean);
    }

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const successors = getSuccessors(nodeId, nodes, edges);
    for (const successor of successors) {
      if (!visited.has(successor.id)) {
        queue.push({
          nodeId: successor.id,
          path: [...path, successor.id],
        });
      }
    }
  }

  return [];
}

/**
 * Calculate workflow statistics
 */
export function getWorkflowStats(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): {
  nodeCount: number;
  edgeCount: number;
  nodesByType: Record<NodeType, number>;
  maxDepth: number;
  averageBranching: number;
} {
  const nodesByType: Record<string, number> = {};

  for (const node of nodes) {
    nodesByType[node.type] = (nodesByType[node.type] ?? 0) + 1;
  }

  // Calculate max depth from start
  let maxDepth = 0;
  const startNode = findNodeByType(nodes, 'start');
  if (startNode) {
    const depths = new Map<string, number>();
    const queue = [{ nodeId: startNode.id, depth: 0 }];

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;
      if (depths.has(nodeId)) continue;

      depths.set(nodeId, depth);
      maxDepth = Math.max(maxDepth, depth);

      const successors = getSuccessors(nodeId, nodes, edges);
      for (const successor of successors) {
        if (!depths.has(successor.id)) {
          queue.push({ nodeId: successor.id, depth: depth + 1 });
        }
      }
    }
  }

  // Calculate average branching factor
  let totalOutgoing = 0;
  let nodesWithOutgoing = 0;
  for (const node of nodes) {
    const outgoing = edges.filter((e) => e.source === node.id).length;
    if (outgoing > 0) {
      totalOutgoing += outgoing;
      nodesWithOutgoing++;
    }
  }

  const averageBranching = nodesWithOutgoing > 0 ? totalOutgoing / nodesWithOutgoing : 0;

  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodesByType: nodesByType as Record<NodeType, number>,
    maxDepth,
    averageBranching,
  };
}

/**
 * Check if a connection is valid
 */
export function isValidConnection(
  sourceId: string,
  targetId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): { valid: boolean; reason?: string } {
  const sourceNode = findNode(nodes, sourceId);
  const targetNode = findNode(nodes, targetId);

  if (!sourceNode) {
    return { valid: false, reason: 'Source node not found' };
  }

  if (!targetNode) {
    return { valid: false, reason: 'Target node not found' };
  }

  // Cannot connect to start node
  if (targetNode.type === 'start') {
    return { valid: false, reason: 'Cannot connect to Start node' };
  }

  // Cannot connect from end node
  if (sourceNode.type === 'end') {
    return { valid: false, reason: 'Cannot connect from End node' };
  }

  // Check for self-loop
  if (sourceId === targetId) {
    return { valid: false, reason: 'Cannot connect node to itself' };
  }

  // Check for duplicate connection
  const existingEdge = edges.find((e) => e.source === sourceId && e.target === targetId);
  if (existingEdge) {
    return { valid: false, reason: 'Connection already exists' };
  }

  // Check if connection would create a cycle
  const testEdges = [...edges, { id: 'test', source: sourceId, target: targetId }];
  const cycles = detectCycles(nodes, testEdges);
  if (cycles.length > 0) {
    return { valid: false, reason: 'Connection would create a cycle' };
  }

  return { valid: true };
}

/**
 * Get all edges for a specific node
 */
export function getNodeEdges(
  nodeId: string,
  edges: WorkflowEdge[]
): { incoming: WorkflowEdge[]; outgoing: WorkflowEdge[] } {
  return {
    incoming: edges.filter((e) => e.target === nodeId),
    outgoing: edges.filter((e) => e.source === nodeId),
  };
}

/**
 * Get the edge between two nodes
 */
export function getEdgeBetween(
  sourceId: string,
  targetId: string,
  edges: WorkflowEdge[]
): WorkflowEdge | undefined {
  return edges.find((e) => e.source === sourceId && e.target === targetId);
}

/**
 * Clone a workflow structure with new IDs
 */
export function cloneWorkflowStructure(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): { nodes: WorkflowNode[]; edges: WorkflowEdge[]; idMapping: Map<string, string> } {
  const idMapping = new Map<string, string>();

  // Generate new IDs for all nodes
  for (const node of nodes) {
    const newId = `${node.id}_copy_${Date.now().toString(36)}`;
    idMapping.set(node.id, newId);
  }

  // Clone nodes with new IDs
  const newNodes = nodes.map((node) => ({
    ...node,
    id: idMapping.get(node.id)!,
    position: {
      x: node.position.x + 50,
      y: node.position.y + 50,
    },
  }));

  // Clone edges with updated references
  const newEdges = edges.map((edge) => ({
    ...edge,
    id: `${edge.id}_copy_${Date.now().toString(36)}`,
    source: idMapping.get(edge.source) ?? edge.source,
    target: idMapping.get(edge.target) ?? edge.target,
  }));

  return { nodes: newNodes, edges: newEdges, idMapping };
}
