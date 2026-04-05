import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { routeLLM, type TaskType } from '@/lib/llm-router'

export const dynamic = 'force-dynamic'

// Agentes que son leads y pueden delegar
const LEAD_AGENTS = new Set(['pm', 'marketing-lead', 'cto'])

// Especialistas disponibles por lead
const LEAD_SPECIALISTS: Record<string, string[]> = {
  'pm': ['strategy', 'research'],
  'marketing-lead': ['seo', 'content-writer', 'social-media', 'image-generator', 'email-marketing'],
  'cto': ['backend', 'pixel', 'qa-func', 'qa-tech', 'devops', 'security'],
}

// Instrucción de delegación que se agrega al prompt de los leads
function getDelegationInstruction(agentKey: string): string {
  const specialists = LEAD_SPECIALISTS[agentKey] || []
  return `

Al final de tu respuesta, SIEMPRE incluye un bloque JSON de delegación con este formato exacto:
\`\`\`delegation
{
  "delegations": [
    { "to": "<specialist_key>", "brief": "<instrucción específica para ese especialista>" }
  ]
}
\`\`\`

Especialistas disponibles para delegar: ${specialists.join(', ')}
- Si una tarea no requiere especialistas, usa: { "delegations": [] }
- Cada brief debe ser autónomo y específico — el especialista no tiene otro contexto.
- Máximo 3 especialistas por tarea.`
}

// Prompts base por rol de agente
const AGENT_PROMPTS: Record<string, string> = {
  pm: `Eres el PM Agent de la Software Factory de Héctor. Tu rol es planificar, priorizar y coordinar el equipo de estrategia.
Cuando recibes una tarea:
1. La descompones en subtareas concretas
2. Asignas cada subtarea al especialista correcto (strategy, research)
3. Defines el orden de ejecución
4. Respondes con un plan claro y accionable en español
Sé directo y específico. Máximo 300 tokens en tu respuesta.`,

  'marketing-lead': `Eres el Marketing Lead de la Software Factory de Héctor. Diriges el equipo de marketing de PetTech Chile.
Cuando recibes una tarea:
1. Defines la estrategia de campaña
2. Decides qué especialistas necesitas (seo, content-writer, social-media, image-generator, email-marketing)
3. Creas el brief para cada uno
4. El Publisher es siempre el último y requiere aprobación de Héctor
Responde en español, directo y accionable. Máximo 400 tokens.`,

  cto: `Eres el CTO Agent de la Software Factory de Héctor. Tomas decisiones técnicas y coordinas el equipo de desarrollo.
Cuando recibes una tarea técnica:
1. Evalúas el alcance (backend, frontend, ambos)
2. Defines la arquitectura o solución
3. Asignas al especialista correcto (backend, pixel, qa-func, qa-tech, devops, security)
4. Priorizas calidad y pragmatismo
Responde en español, técnico pero claro. Máximo 400 tokens.`,

  strategy: `Eres el Strategy Agent. Analizas mercados, defines posicionamiento y apoyas decisiones de negocio para PetTech Chile.
Responde con análisis concreto, datos cuando los tengas, recomendaciones claras. Máximo 300 tokens.`,

  research: `Eres el Research Agent de la Software Factory. Tu trabajo es investigar tendencias, mercado, keywords y competidores.
Responde con hallazgos concretos, bien estructurados. Si no tienes datos en tiempo real, indica qué buscar y dónde. Máximo 300 tokens.`,

  'content-writer': `Eres el Content Writer de PetTech Chile. Escribes copy para blog, email, redes y descripciones de producto.
Tono: cercano, moderno, amante de mascotas. Español chileno. Responde con el contenido listo para usar. Máximo 500 tokens.`,

  'social-media': `Eres el Social Media Agent de PetTech Chile. Adaptas contenido para Instagram, TikTok y Facebook.
Incluye hashtags relevantes, CTA claro, formato nativo de cada red. Español chileno. Máximo 400 tokens.`,

  seo: `Eres el SEO Agent de PetTech Chile. Optimizas para posicionamiento orgánico en Chile.
Incluye keywords target, meta description, estructura de contenido. Máximo 300 tokens.`,

  backend: `Eres el Backend Dev de la Software Factory. Desarrollas APIs, integraciones y flujos en n8n.
Stack: Node.js, Python, PostgreSQL, n8n. Responde con código concreto y explicación breve. Máximo 500 tokens.`,

  pixel: `Eres Pixel, el Frontend/UIUX de la Software Factory. Diseñas e implementas interfaces con React, Next.js y Tailwind.
Responde con código o especificaciones visuales concretas. Máximo 500 tokens.`,

  'qa-func': `Eres el QA Funcional. Diseñas casos de prueba end-to-end desde la perspectiva del usuario.
Responde con lista de casos de prueba, pasos de reproducción y criterios de aceptación. Máximo 300 tokens.`,

  'email-marketing': `Eres el Email Marketing Agent de PetTech Chile. Diseñas campañas de email y flujos automatizados.
Responde con asunto, preview text, estructura del email y CTA. Español chileno. Máximo 400 tokens.`,
}

// Parsea el bloque ```delegation ... ``` de la respuesta del lead
function parseDelegations(text: string): Array<{ to: string; brief: string }> {
  const match = text.match(/```delegation\s*([\s\S]*?)```/)
  if (!match) return []
  try {
    const json = JSON.parse(match[1].trim())
    if (!Array.isArray(json.delegations)) return []
    return json.delegations.filter(
      (d: unknown) =>
        d &&
        typeof d === 'object' &&
        typeof (d as Record<string, unknown>).to === 'string' &&
        typeof (d as Record<string, unknown>).brief === 'string' &&
        ((d as Record<string, unknown>).brief as string).length <= 500  // Fix CTO: anti-injection max length
    ).map((d: unknown) => {
      const del = d as Record<string, unknown>
      return {
        to: (del.to as string).trim().toLowerCase().slice(0, 50), // sanitizar key
        brief: (del.brief as string).trim().slice(0, 500)
      }
    })
  } catch {
    return []
  }
}

// Limpia el bloque ```delegation``` del texto de resultado visible
function cleanResult(text: string): string {
  return text.replace(/```delegation[\s\S]*?```/g, '').trim()
}

export async function POST(req: NextRequest) {
  try {
    const { message_id } = await req.json()
    if (!message_id) return NextResponse.json({ error: 'message_id requerido' }, { status: 400 })

    // 1. Cargar el mensaje
    const messages = await query<{
      id: string; from_agent: string; to_agent: string;
      message_type: string; content: string; payload: Record<string, unknown>; task_id: string
    }>('SELECT * FROM agent_messages WHERE id = $1', [message_id])

    if (!messages.length) return NextResponse.json({ error: 'mensaje no encontrado' }, { status: 404 })
    const msg = messages[0]

    // 2. Marcar como "en proceso" para evitar doble ejecución
    await query(`UPDATE agent_messages SET status = 'processing' WHERE id = $1`, [message_id])

    // 2b. Marcar agente como "working" en tiempo real (visible en dashboard antes de que responda)
    await query(
      `INSERT INTO agent_activity (agent_id, project, task_title, current_step, status, tokens_this_task, started_at, updated_at)
       VALUES ($1, 'pettech', $2, 'Procesando...', 'working', 0, NOW(), NOW())
       ON CONFLICT (agent_id) DO UPDATE SET
         current_step = 'Procesando...', status = 'working', updated_at = NOW()`,
      [msg.to_agent, msg.content.slice(0, 60)]
    )
    // Fix race condition (CTO review): UPDATE condicional — solo si no está ya working
    // Si retorna 0 filas, el agente ya está ocupado con otra tarea
    const updateResult = await query<{ agent_key: string }>(
      `UPDATE agents SET status = 'working', last_active = NOW()
       WHERE agent_key = $1 AND status != 'working'
       RETURNING agent_key`,
      [msg.to_agent]
    )
    if (!updateResult.length) {
      // Agente ocupado: reencolar el mensaje para el próximo ciclo del dispatcher
      await query(`UPDATE agent_messages SET status = 'pending' WHERE id = $1`, [message_id])
      return NextResponse.json({ queued: true, reason: `Agente ${msg.to_agent} ocupado, mensaje reencolado` })
    }

    // 3. Cargar el agente destino
    const agents = await query<{
      agent_key: string; name: string; model: string; personality: string
    }>(`SELECT agent_key, name, model, personality FROM agents WHERE agent_key = $1`, [msg.to_agent])

    const agent = agents[0]
    if (!agent) {
      await query(`UPDATE agent_messages SET status = 'error' WHERE id = $1`, [message_id])
      return NextResponse.json({ error: `Agente ${msg.to_agent} no encontrado` }, { status: 404 })
    }

    // 4. Cargar contexto de la tarea si existe
    let taskContext = ''
    if (msg.task_id) {
      const tasks = await query<{ title: string; description: string; pipeline: unknown[] }>(
        'SELECT title, description, pipeline FROM tasks WHERE id = $1', [msg.task_id]
      )
      if (tasks.length) {
        taskContext = `\nContexto de la tarea: "${tasks[0].title}"\n${tasks[0].description || ''}`
      }
    }

    // 5. Construir el system prompt (leads reciben instrucción de delegación)
    const isLead = LEAD_AGENTS.has(msg.to_agent)
    const basePrompt = AGENT_PROMPTS[msg.to_agent] || agent.personality || `Eres ${agent.name}. Responde en español.`
    const delegationBlock = isLead ? getDelegationInstruction(msg.to_agent) : ''
    const systemPrompt = `${basePrompt}${delegationBlock}\n\nEres parte de la Software Factory de Héctor Sepúlveda, emprendedor chileno.`

    // 6. Determinar taskType para el router LLM
    const taskTypeMap: Record<string, TaskType> = {
      'cto':             'architecture',
      'pm':              'coordination',
      'marketing-lead':  'strategy',
      'strategy':        'strategy',
      'research':        'summary',
      'backend':         'code',
      'pixel':           'code',
      'qa-func':         'qa',
      'qa-tech':         'qa',
      'content-writer':  'default',
      'seo':             'default',
      'social-media':    'default',
      'email-marketing': 'default',
    }
    const taskType: TaskType = taskTypeMap[msg.to_agent] || 'default'
    const userMessage = `${msg.content}${taskContext}`

    // 7. Llamar al LLM via Router (con fallback automático)
    const llmResponse = await routeLLM({
      system: systemPrompt,
      prompt: userMessage,
      taskType,
      agentKey: msg.to_agent,
      project: 'pettech',
      maxTokens: isLead ? 800 : 600,
    })

    const rawResult = llmResponse.text
    const tokens = llmResponse.inputTokens + llmResponse.outputTokens
    const model = llmResponse.model

    // 7. Si es lead: parsear delegaciones y crear mensajes para especialistas
    let delegationsCreated = 0
    if (isLead) {
      const delegations = parseDelegations(rawResult)
      const validSpecialists = LEAD_SPECIALISTS[msg.to_agent] || []

      for (const delegation of delegations) {
        if (!validSpecialists.includes(delegation.to)) continue  // seguridad: solo especialistas permitidos

        await query(
          `INSERT INTO agent_messages (from_agent, to_agent, task_id, message_type, content, payload, status)
           VALUES ($1, $2, $3, 'handoff', $4, $5, 'pending')`,
          [
            msg.to_agent,
            delegation.to,
            msg.task_id,
            delegation.brief,
            JSON.stringify({
              delegated_by: msg.to_agent,
              parent_message_id: message_id,
              original_request: msg.content.slice(0, 300)
            })
          ]
        )
        delegationsCreated++
      }
    }

    // 8. Guardar resultado limpio en agent_messages como respuesta a astro
    const cleanedResult = isLead ? cleanResult(rawResult) : rawResult
    const resultContent = isLead && delegationsCreated > 0
      ? `[${agent.name}] Plan listo. Delegando a ${delegationsCreated} especialista(s).\n\n${cleanedResult.slice(0, 400)}`
      : `[${agent.name}] ${cleanedResult.slice(0, 500)}`

    await query(
      `INSERT INTO agent_messages (from_agent, to_agent, task_id, message_type, content, payload, status)
       VALUES ($1, 'astro', $2, 'result', $3, $4, 'pending')`,
      [
        msg.to_agent,
        msg.task_id,
        resultContent,
        JSON.stringify({
          full_result: cleanedResult,
          tokens_used: tokens,
          original_message_id: message_id,
          delegations_created: delegationsCreated,
          is_lead: isLead
        })
      ]
    )

    // 9. Actualizar la tarea con el output
    if (msg.task_id) {
      await query(
        `UPDATE tasks SET pipeline_output = pipeline_output || $1::jsonb, updated_at = now()
         WHERE id = $2`,
        [JSON.stringify({ [msg.to_agent]: cleanedResult.slice(0, 1000) }), msg.task_id]
      )
    }

    // 10. Marcar mensaje original como procesado
    await query(`UPDATE agent_messages SET status = 'processed' WHERE id = $1`, [message_id])

    // 11. Actualizar actividad del agente
    const stepLabel = isLead && delegationsCreated > 0
      ? `Delegando a ${delegationsCreated} especialista(s)`
      : 'Completado'

    await query(
      `INSERT INTO agent_activity (agent_id, project, task_title, current_step, status, tokens_this_task, started_at, updated_at)
       VALUES ($1, 'pettech', $2, $3, 'active', $4, NOW(), NOW())
       ON CONFLICT (agent_id) DO UPDATE SET
         current_step = $3, status = 'active', tokens_this_task = $4, updated_at = NOW()`,
      [msg.to_agent, msg.content.slice(0, 60), stepLabel, tokens]
    )

    // 12. Token usage ya registrado por el LLM Router (llm-router.ts)

    return NextResponse.json({
      success: true,
      agent: agent.name,
      is_lead: isLead,
      model,
      tokens_used: tokens,
      delegations_created: delegationsCreated,
      result_preview: cleanedResult.slice(0, 200)
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/agents/process-message — chequear mensajes pendientes (para el dispatcher de n8n)
export async function GET() {
  try {
    const pending = await query<{
      id: string; from_agent: string; to_agent: string; content: string; created_at: string
    }>(`
      SELECT id, from_agent, to_agent, content, created_at
      FROM agent_messages
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT 10
    `)
    return NextResponse.json({ count: pending.length, messages: pending })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'DB error' }, { status: 500 })
  }
}
