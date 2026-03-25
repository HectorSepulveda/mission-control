import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  let lastId: number | null = null
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: unknown) =>
        new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)

      // Send initial batch
      try {
        const rows = await query<{ id: number; from_agent: string; to_agent: string; message_type: string; content: string; created_at: string }>(
          `SELECT id, from_agent, to_agent, message_type, content, created_at
           FROM agent_messages
           ORDER BY created_at DESC
           LIMIT 10`
        )
        if (rows.length > 0) {
          lastId = Math.max(...rows.map(r => r.id))
          for (const row of rows.reverse()) {
            controller.enqueue(encode(row))
          }
        }
      } catch {
        // ignore initial error
      }

      // Poll every 2s for new messages
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval)
          return
        }
        try {
          const params = lastId ? [lastId] : []
          const whereClause = lastId ? 'WHERE id > $1' : ''
          const rows = await query<{ id: number; from_agent: string; to_agent: string; message_type: string; content: string; created_at: string }>(
            `SELECT id, from_agent, to_agent, message_type, content, created_at
             FROM agent_messages
             ${whereClause}
             ORDER BY created_at ASC
             LIMIT 20`,
            params
          )
          if (rows.length > 0) {
            lastId = Math.max(...rows.map(r => r.id))
            for (const row of rows) {
              controller.enqueue(encode(row))
            }
          }
        } catch {
          // ignore polling errors
        }
      }, 2000)

      // Keep alive ping every 15s
      const pingInterval = setInterval(() => {
        if (closed) {
          clearInterval(pingInterval)
          return
        }
        try {
          controller.enqueue(new TextEncoder().encode(': ping\n\n'))
        } catch {
          clearInterval(pingInterval)
        }
      }, 15000)
    },
    cancel() {
      closed = true
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
