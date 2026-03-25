'use client'

import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  NodeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useEffect, useCallback, useMemo } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Agent {
  id: number
  agent_key: string
  name: string
  role: string
  team: string
  level: string
  reports_to: string | null
  model: string | null
  status: string
  tokens_used: number
  last_active: string | null
  cost_per_1k_tokens: number | null
  phase: number
  is_blocked: boolean
}

interface Message {
  id: number
  from_agent: string | null
  to_agent: string | null
  status: string
  content: string
}

interface AgentNodeData {
  name: string
  role: string
  status: string
  team: string
  phase: number
  is_blocked: boolean
  cost_per_1k_tokens: number | null
  emoji: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  hector: { x: 580, y: 0 },
  astro: { x: 580, y: 150 },
  'prompt-engineer': { x: 850, y: 150 },
  pm: { x: 180, y: 320 },
  'marketing-lead': { x: 580, y: 320 },
  cto: { x: 980, y: 320 },
  strategy: { x: 60, y: 490 },
  research: { x: 260, y: 490 },
  seo: { x: 360, y: 490 },
  'content-writer': { x: 500, y: 490 },
  'social-media': { x: 640, y: 490 },
  'image-generator': { x: 780, y: 490 },
  'email-marketing': { x: 920, y: 490 },
  'campaign-analyst': { x: 1060, y: 490 },
  publisher: { x: 1200, y: 490 },
  backend: { x: 820, y: 490 },
  pixel: { x: 960, y: 490 },
  'qa-func': { x: 1100, y: 490 },
  'qa-tech': { x: 1240, y: 490 },
  devops: { x: 1380, y: 490 },
  security: { x: 1520, y: 490 },
}

const HIERARCHY_EDGES = [
  { source: 'hector', target: 'astro' },
  { source: 'astro', target: 'prompt-engineer' },
  { source: 'astro', target: 'pm' },
  { source: 'astro', target: 'marketing-lead' },
  { source: 'astro', target: 'cto' },
  { source: 'pm', target: 'strategy' },
  { source: 'pm', target: 'research' },
  { source: 'marketing-lead', target: 'seo' },
  { source: 'marketing-lead', target: 'content-writer' },
  { source: 'marketing-lead', target: 'social-media' },
  { source: 'marketing-lead', target: 'image-generator' },
  { source: 'marketing-lead', target: 'email-marketing' },
  { source: 'marketing-lead', target: 'campaign-analyst' },
  { source: 'marketing-lead', target: 'publisher' },
  { source: 'cto', target: 'backend' },
  { source: 'cto', target: 'pixel' },
  { source: 'cto', target: 'qa-func' },
  { source: 'cto', target: 'qa-tech' },
  { source: 'cto', target: 'devops' },
  { source: 'cto', target: 'security' },
]

const TEAM_GRADIENTS: Record<string, { from: string; to: string }> = {
  core: { from: '#1A6B3C', to: '#22c55e' },
  strategy: { from: '#1e40af', to: '#3b82f6' },
  marketing: { from: '#9f1239', to: '#f43f5e' },
  dev: { from: '#5b21b6', to: '#8b5cf6' },
}

const TEAM_EMOJIS: Record<string, string> = {
  core: '⭐',
  strategy: '🧠',
  marketing: '📣',
  dev: '⚙️',
}

const AGENT_EMOJIS: Record<string, string> = {
  hector: '👑',
  astro: '⭐',
  'prompt-engineer': '✍️',
  pm: '📋',
  'marketing-lead': '📣',
  cto: '⚙️',
  strategy: '🧠',
  research: '🔍',
  seo: '🔎',
  'content-writer': '✏️',
  'social-media': '📱',
  'image-generator': '🎨',
  'email-marketing': '📧',
  'campaign-analyst': '📊',
  publisher: '🚀',
  backend: '🖥️',
  pixel: '🎯',
  'qa-func': '🧪',
  'qa-tech': '🔬',
  devops: '🔧',
  security: '🔒',
}

// ─── AgentNode custom component ──────────────────────────────────────────────

function AgentNode({ data }: NodeProps<AgentNodeData>) {
  const grad = TEAM_GRADIENTS[data.team] || TEAM_GRADIENTS.core

  const borderColor =
    data.is_blocked
      ? '#ef4444'
      : data.status === 'active'
      ? '#22c55e'
      : data.status === 'working'
      ? '#fb923c'
      : 'rgba(255,255,255,0.12)'

  const borderAnim =
    data.status === 'active'
      ? '0 0 0 2px rgba(34,197,94,0.4)'
      : data.status === 'working'
      ? '0 0 0 2px rgba(251,146,60,0.4)'
      : data.is_blocked
      ? '0 0 0 2px rgba(239,68,68,0.4)'
      : 'none'

  const statusDot =
    data.status === 'active'
      ? '#22c55e'
      : data.status === 'working'
      ? '#fb923c'
      : data.status === 'error'
      ? '#ef4444'
      : '#64748b'

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${grad.from}22, ${grad.to}11)`,
        border: `1.5px solid ${borderColor}`,
        boxShadow: `${borderAnim}, 0 4px 24px rgba(0,0,0,0.5)`,
        borderRadius: 12,
        padding: '10px 14px',
        minWidth: 130,
        maxWidth: 160,
        position: 'relative',
        backdropFilter: 'blur(8px)',
        opacity: data.phase > 1 ? 0.6 : 1,
      }}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: grad.to, border: `2px solid ${grad.from}`, width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: grad.to, border: `2px solid ${grad.from}`, width: 8, height: 8 }}
      />

      {/* Phase badge */}
      {data.phase > 1 && (
        <div
          style={{
            position: 'absolute',
            top: -10,
            right: 8,
            background: 'rgba(0,0,0,0.7)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6,
            padding: '1px 6px',
            fontSize: 9,
            color: '#94a3b8',
            fontWeight: 600,
            letterSpacing: '0.05em',
          }}
        >
          Sem {data.phase}
        </div>
      )}

      {/* Blocked icon overlay */}
      {data.is_blocked && (
        <div style={{ position: 'absolute', top: 6, right: 6, fontSize: 12 }}>🔒</div>
      )}

      {/* Header: emoji + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>{data.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: '#f1f5f9',
              fontWeight: 700,
              fontSize: 11,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {data.name}
          </div>
          <div
            style={{
              color: '#94a3b8',
              fontSize: 9,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {data.role}
          </div>
        </div>
      </div>

      {/* Status + cost */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: statusDot,
              display: 'inline-block',
              boxShadow: data.status === 'active' ? `0 0 6px ${statusDot}` : 'none',
            }}
          />
          <span style={{ color: '#64748b', fontSize: 9, textTransform: 'capitalize' }}>
            {data.status}
          </span>
        </div>
        {data.cost_per_1k_tokens != null && (
          <span style={{ color: '#475569', fontSize: 9 }}>
            ${data.cost_per_1k_tokens}/1k
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Builder functions ────────────────────────────────────────────────────────

function buildNodes(agents: Agent[]): Node[] {
  const nodes: Node[] = []
  let fallbackX = 0

  // Héctor node (not in DB)
  nodes.push({
    id: 'hector',
    type: 'agentNode',
    position: NODE_POSITIONS['hector'] || { x: 580, y: 0 },
    data: {
      name: 'Héctor',
      role: 'Founder & CEO',
      status: 'active',
      team: 'core',
      phase: 1,
      is_blocked: false,
      cost_per_1k_tokens: null,
      emoji: '👑',
    } as AgentNodeData,
  })

  for (const agent of agents) {
    const key = agent.agent_key
    const pos = NODE_POSITIONS[key] || { x: fallbackX++ * 180, y: 700 }
    const emoji = AGENT_EMOJIS[key] || TEAM_EMOJIS[agent.team] || '🤖'

    nodes.push({
      id: key,
      type: 'agentNode',
      position: pos,
      data: {
        name: agent.name,
        role: agent.role,
        status: agent.status,
        team: agent.team,
        phase: agent.phase,
        is_blocked: agent.is_blocked,
        cost_per_1k_tokens: agent.cost_per_1k_tokens,
        emoji,
      } as AgentNodeData,
    })
  }

  return nodes
}

function buildEdges(agents: Agent[], messages: Message[]): Edge[] {
  const edges: Edge[] = []
  const agentKeys = new Set(agents.map((a) => a.agent_key))
  agentKeys.add('hector')

  // Hierarchy edges
  for (const e of HIERARCHY_EDGES) {
    edges.push({
      id: `hier-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      style: {
        stroke: '#1A6B3C',
        strokeWidth: 1.5,
        opacity: 0.4,
      },
    })
  }

  // Message edges (animated)
  const activeMessages = messages.filter(
    (m) => m.status === 'pending' || m.status === 'read'
  )

  for (const msg of activeMessages) {
    if (!msg.from_agent || !msg.to_agent) continue
    if (!agentKeys.has(msg.from_agent) || !agentKeys.has(msg.to_agent)) continue

    const edgeId = `msg-${msg.id}`
    edges.push({
      id: edgeId,
      source: msg.from_agent,
      target: msg.to_agent,
      animated: true,
      style: {
        stroke: '#fb923c',
        strokeWidth: 2.5,
        strokeDasharray: '8 4',
      },
    })
  }

  return edges
}

// ─── Main Canvas component ────────────────────────────────────────────────────

const nodeTypes = { agentNode: AgentNode }

interface AgentFlowCanvasProps {
  initialAgents: Agent[]
  initialMessages: Message[]
}

export default function AgentFlowCanvas({
  initialAgents,
  initialMessages,
}: AgentFlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    buildNodes(initialAgents)
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    buildEdges(initialAgents, initialMessages)
  )

  const refresh = useCallback(async () => {
    try {
      const [agentsRes, messagesRes] = await Promise.all([
        fetch('/api/agents'),
        fetch('/api/messages'),
      ])
      const agents: Agent[] = await agentsRes.json()
      const messages: Message[] = await messagesRes.json()

      if (Array.isArray(agents)) {
        setNodes(buildNodes(agents))
        setEdges(buildEdges(agents, Array.isArray(messages) ? messages : []))
      }
    } catch {
      // silently skip on network errors
    }
  }, [setNodes, setEdges])

  useEffect(() => {
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [refresh])

  const miniMapNodeColor = useCallback((node: Node) => {
    const team = (node.data as AgentNodeData)?.team || 'core'
    const grad = TEAM_GRADIENTS[team] || TEAM_GRADIENTS.core
    return grad.to
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', background: '#060608' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1a1a1a" gap={20} />
        <Controls
          style={{
            background: 'rgba(13,13,16,0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
          }}
        />
        <MiniMap
          nodeColor={miniMapNodeColor}
          style={{
            background: 'rgba(13,13,16,0.85)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
          }}
          maskColor="rgba(6,6,8,0.7)"
        />
      </ReactFlow>
    </div>
  )
}
