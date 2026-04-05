import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface AgentActivityRow {
  agent_id: string
  agent_name: string | null
  status: string
  current_step: string | null
  task_title: string | null
  project: string | null
  tokens_this_task: number
  updated_at: string
  started_at: string
}

interface LlmRouterStateRow {
  active_provider: string | null
  active_model: string | null
  updated_at: string | null
}

export async function GET() {
  try {
    const [activityRows, llmRows] = await Promise.all([
      query<AgentActivityRow>(
        `SELECT aa.agent_id, COALESCE(a.name, aa.agent_id) as agent_name,
                aa.status, aa.current_step, aa.task_title, aa.project,
                aa.tokens_this_task, aa.updated_at, aa.started_at
         FROM agent_activity aa
         LEFT JOIN agents a ON a.id::text = aa.agent_id OR a.name = aa.agent_id
         WHERE aa.agent_id ILIKE '%astro%' OR (a.name IS NOT NULL AND a.name ILIKE '%astro%')
         ORDER BY aa.updated_at DESC
         LIMIT 1`
      ),
      query<LlmRouterStateRow>(
        `SELECT active_provider, active_model, updated_at
         FROM core.llm_router_state
         LIMIT 1`
      ).catch(() => [] as LlmRouterStateRow[]),
    ])

    const activity = activityRows[0] ?? null
    const llm = llmRows[0] ?? null

    return NextResponse.json({
      agent: activity
        ? {
            agent_id: activity.agent_id,
            agent_name: activity.agent_name,
            status: activity.status,
            current_step: activity.current_step,
            task_title: activity.task_title,
            project: activity.project,
            tokens_this_task: activity.tokens_this_task,
            updated_at: activity.updated_at,
            started_at: activity.started_at,
          }
        : null,
      llm: llm
        ? {
            active_provider: llm.active_provider,
            active_model: llm.active_model,
            updated_at: llm.updated_at,
          }
        : null,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'error' },
      { status: 500 }
    )
  }
}
