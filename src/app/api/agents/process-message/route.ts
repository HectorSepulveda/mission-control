import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

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

    // 5. Construir el system prompt
    const basePrompt = AGENT_PROMPTS[msg.to_agent] || agent.personality || `Eres ${agent.name}. Responde en español.`
    const systemPrompt = `${basePrompt}\n\nEres parte de la Software Factory de Héctor Sepúlveda, emprendedor chileno.`

    // 6. Llamar al modelo del agente
    const apiKey = process.env.ANTHROPIC_API_KEY!
    const client = new Anthropic({ apiKey })

    // Usar el modelo del agente (defaultear a haiku si es desconocido)
    let model = 'claude-haiku-4-5'
    if (agent.model?.includes('sonnet')) model = 'claude-sonnet-4-6'
    else if (agent.model?.includes('opus')) model = 'claude-opus-4-6'
    else if (agent.model?.includes('haiku')) model = 'claude-haiku-4-5'

    const userMessage = `${msg.content}${taskContext}`

    const response = await client.messages.create({
      model,
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })

    const result = response.content[0].type === 'text' ? response.content[0].text : ''
    const tokens = response.usage.input_tokens + response.usage.output_tokens

    // 7. Guardar resultado en agent_messages como respuesta
    await query(
      `INSERT INTO agent_messages (from_agent, to_agent, task_id, message_type, content, payload, status)
       VALUES ($1, 'astro', $2, 'result', $3, $4, 'pending')`,
      [
        msg.to_agent,
        msg.task_id,
        `[${agent.name}] ${result.slice(0, 500)}`,
        JSON.stringify({ full_result: result, tokens_used: tokens, original_message_id: message_id })
      ]
    )

    // 8. Actualizar la tarea con el output
    if (msg.task_id) {
      await query(
        `UPDATE tasks SET pipeline_output = pipeline_output || $1::jsonb, updated_at = now()
         WHERE id = $2`,
        [JSON.stringify({ [msg.to_agent]: result.slice(0, 1000) }), msg.task_id]
      )
    }

    // 9. Marcar mensaje original como procesado
    await query(`UPDATE agent_messages SET status = 'processed' WHERE id = $1`, [message_id])

    // 10. Actualizar actividad del agente
    await query(
      `INSERT INTO agent_activity (agent_id, project, task_title, current_step, status, tokens_this_task, started_at, updated_at)
       VALUES ($1, 'pettech', $2, 'Completado', 'active', $3, NOW(), NOW())
       ON CONFLICT (agent_id) DO UPDATE SET
         current_step = 'Completado', status = 'active', tokens_this_task = $3, updated_at = NOW()`,
      [msg.to_agent, msg.content.slice(0, 60), tokens]
    )

    // 11. Registrar tokens
    await query(
      `INSERT INTO token_usage (agent_id, provider, model, input_tokens, output_tokens, cost_usd, project, phase, created_at)
       VALUES ($1, 'anthropic', $2, $3, $4, $5, 'pettech', 'operation', NOW())`,
      [
        msg.to_agent, model,
        response.usage.input_tokens, response.usage.output_tokens,
        ((response.usage.input_tokens * 0.00000025) + (response.usage.output_tokens * 0.00000125)).toFixed(8)
      ]
    )

    return NextResponse.json({
      success: true,
      agent: agent.name,
      model,
      tokens_used: tokens,
      result_preview: result.slice(0, 200)
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
