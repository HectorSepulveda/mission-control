import { query } from '@/lib/db'
import OfficeClient from '@/components/OfficeClient'

export const dynamic = 'force-dynamic'

interface AgentRow {
  id: string
  name: string
  role: string
  model: string
  status: string
}

interface ActivityRow {
  agent_id: string
  status: string
  task_title: string | null
  current_step: string | null
  tokens_this_task: number
  updated_at: string
}

interface MessageRow {
  id: string
  from_agent: string
  to_agent: string
  message_type: string
  content: string
  status: string
  created_at: string
}

async function getData() {
  try {
    const [agents, activity, messages] = await Promise.all([
      query<AgentRow>('SELECT id, name, role, model, status FROM agents ORDER BY name'),
      query<ActivityRow>('SELECT agent_id, status, task_title, current_step, tokens_this_task, updated_at FROM agent_activity ORDER BY updated_at DESC'),
      query<MessageRow>('SELECT id, from_agent, to_agent, message_type, content, status, created_at FROM agent_messages ORDER BY created_at DESC LIMIT 20'),
    ])
    return { agents, activity, messages }
  } catch {
    return { agents: [], activity: [], messages: [] }
  }
}

export default async function OfficePage() {
  const { agents, activity, messages } = await getData()
  return <OfficeClient agents={agents} activity={activity} messages={messages} />
}
