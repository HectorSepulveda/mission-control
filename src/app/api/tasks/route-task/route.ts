import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

// Mapa de clasificación → agente + equipo + pipeline
const ROUTING_MAP = {
  dev: {
    team: 'dev',
    sub_orchestrator: 'cto',
    pipeline: ['cto', 'backend', 'pixel', 'qa-func'],
    description: 'Tareas de desarrollo: código, APIs, UI, bugs, deploys'
  },
  marketing: {
    team: 'marketing',
    sub_orchestrator: 'marketing-lead',
    pipeline: ['research', 'marketing-lead', 'content-writer', 'publisher'],
    description: 'Tareas de marketing: contenido, RRSS, email, SEO, campañas'
  },
  strategy: {
    team: 'strategy',
    sub_orchestrator: 'pm',
    pipeline: ['pm', 'strategy', 'research'],
    description: 'Tareas de estrategia: planificación, análisis, decisiones de negocio'
  },
  research: {
    team: 'strategy',
    sub_orchestrator: 'research',
    pipeline: ['research'],
    description: 'Investigación pura: tendencias, mercado, keywords, competidores'
  },
  simple: {
    team: 'core',
    sub_orchestrator: 'astro',
    pipeline: ['astro'],
    description: 'Tarea simple que Astro resuelve solo'
  }
}

type RouteKey = keyof typeof ROUTING_MAP

export async function POST(req: NextRequest) {
  try {
    const { instruction, project = 'general' } = await req.json()

    if (!instruction) {
      return NextResponse.json({ error: 'instruction is required' }, { status: 400 })
    }

    // Usar Haiku para clasificar — barato, rápido
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })
    }

    const client = new Anthropic({ apiKey })

    const classifyPrompt = `Clasifica esta instrucción en UNA de estas categorías: dev, marketing, strategy, research, simple.

Categorías:
- dev: código, API, bug, deploy, UI, base de datos, integración técnica
- marketing: contenido, post, RRSS, email, SEO, campaña, imagen, copy
- strategy: planificación, negocio, análisis, decisión estratégica, sprint, backlog
- research: investigar, tendencias, buscar, analizar mercado, keywords, competidores
- simple: pregunta directa, consulta de estado, tarea trivial de 1 paso

Instrucción: "${instruction}"

Responde SOLO con el JSON: {"category": "dev|marketing|strategy|research|simple", "title": "título corto de la tarea (máx 60 chars)", "priority": 1-3, "reason": "por qué esta categoría"}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      messages: [{ role: 'user', content: classifyPrompt }]
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    
    // Parse JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'No se pudo clasificar la tarea', raw: rawText }, { status: 500 })
    }

    const classification = JSON.parse(jsonMatch[0])
    const route = ROUTING_MAP[classification.category as RouteKey] || ROUTING_MAP.simple

    // Crear tarea en BD con pipeline asignado
    const taskRows = await query<{ id: string }>(
      `INSERT INTO tasks (title, description, status, priority, assigned_to, project, pipeline, current_step, pipeline_output, created_at, updated_at)
       VALUES ($1, $2, 'todo', $3, $4, $5, $6, 0, '{}', NOW(), NOW())
       RETURNING id`,
      [
        classification.title || instruction.slice(0, 60),
        instruction,
        classification.priority || 2,
        route.sub_orchestrator,
        project,
        JSON.stringify(route.pipeline)
      ]
    )

    const taskId = taskRows[0]?.id

    // Registrar mensaje en agent_messages para The Office
    await query(
      `INSERT INTO agent_messages (from_agent, to_agent, task_id, message_type, content, payload, status)
       VALUES ('astro', $1, $2, 'handoff', $3, $4, 'pending')`,
      [
        route.sub_orchestrator,
        taskId,
        `Nueva tarea asignada: ${classification.title || instruction.slice(0, 60)}`,
        JSON.stringify({
          instruction,
          category: classification.category,
          pipeline: route.pipeline,
          reason: classification.reason
        })
      ]
    )

    // Actualizar actividad de Astro
    await query(
      `INSERT INTO agent_activity (agent_id, agent_name, project, task_title, current_step, status, tokens_this_task, started_at, updated_at)
       VALUES ('astro', 'Astro', $1, $2, 'Enrutando tarea', 'active', $3, NOW(), NOW())
       ON CONFLICT (agent_id) DO UPDATE SET
         project=$1, task_title=$2, current_step='Enrutando tarea',
         status='active', tokens_this_task=$3, updated_at=NOW()`,
      [project, classification.title || instruction.slice(0, 60), response.usage.input_tokens + response.usage.output_tokens]
    )

    // Registrar tokens usados
    await query(
      `INSERT INTO token_usage (agent_id, task_id, model, input_tokens, output_tokens, total_tokens, cost_usd, phase, created_at)
       VALUES ('astro', $1, 'claude-haiku-4-5', $2, $3, $4, $5, 'operation', NOW())`,
      [
        taskId,
        response.usage.input_tokens,
        response.usage.output_tokens,
        response.usage.input_tokens + response.usage.output_tokens,
        ((response.usage.input_tokens * 0.00000025) + (response.usage.output_tokens * 0.00000125)).toFixed(8)
      ]
    )

    return NextResponse.json({
      success: true,
      task_id: taskId,
      classification: classification.category,
      assigned_to: route.sub_orchestrator,
      team: route.team,
      pipeline: route.pipeline,
      title: classification.title,
      reason: classification.reason,
      tokens_used: response.usage.input_tokens + response.usage.output_tokens
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
