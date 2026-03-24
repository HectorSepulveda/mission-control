import { query } from '@/lib/db'

const CLP_RATE = 950

interface CostRow {
  provider: string
  model: string
  tokens: string
  cost: string
}

interface DailyCost {
  date: string
  cost: string
}

async function getCosts(): Promise<CostRow[]> {
  try {
    return await query<CostRow>(`
      SELECT 
        COALESCE(provider, 'unknown') as provider,
        COALESCE(model, 'unknown') as model,
        SUM(COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)) as tokens,
        SUM(COALESCE(cost_usd, 0)) as cost
      FROM token_usage
      GROUP BY provider, model
      ORDER BY cost DESC
    `)
  } catch {
    return []
  }
}

async function getDailyCosts(): Promise<DailyCost[]> {
  try {
    return await query<DailyCost>(`
      SELECT 
        DATE(created_at) as date,
        SUM(COALESCE(cost_usd, 0)) as cost
      FROM token_usage
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `)
  } catch {
    return []
  }
}

function formatTokens(n: string): string {
  const num = parseInt(n) || 0
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

function providerStyle(provider: string) {
  switch (provider?.toLowerCase()) {
    case 'anthropic':
      return { color: '#fb923c', bg: 'rgba(230,126,34,0.1)', border: 'rgba(230,126,34,0.3)' }
    case 'openai':
      return { color: '#4ade80', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' }
    case 'google':
      return { color: '#60a5fa', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' }
    default:
      return { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' }
  }
}

export const dynamic = 'force-dynamic'

export default async function CostsPage() {
  const [costs, dailyCosts] = await Promise.all([getCosts(), getDailyCosts()])

  const totalUsd = costs.reduce((sum, r) => sum + parseFloat(r.cost || '0'), 0)
  const totalClp = Math.round(totalUsd * CLP_RATE)
  const totalTokens = costs.reduce((sum, r) => sum + parseInt(r.tokens || '0'), 0)

  const maxCost = Math.max(...dailyCosts.map((d) => parseFloat(d.cost || '0')), 0.001)

  const summaryCards = [
    {
      label: 'Total USD',
      value: `$${totalUsd.toFixed(4)}`,
      icon: '💵',
      variant: 'orange' as const,
      sub: 'Acumulado histórico',
    },
    {
      label: 'Total CLP',
      value: `$${totalClp.toLocaleString('es-CL')}`,
      icon: '🇨🇱',
      variant: 'green' as const,
      sub: `≈ ${CLP_RATE} CLP/USD`,
    },
    {
      label: 'Tokens Totales',
      value: formatTokens(totalTokens.toString()),
      icon: '⚡',
      variant: 'blue' as const,
      sub: 'Input + Output',
    },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <h1
          className="text-2xl font-bold"
          style={{
            background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Costos IA
        </h1>
        <p className="text-sm mt-1" style={{ color: '#64748b' }}>Uso y gasto por proveedor y modelo</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {summaryCards.map((card) => {
          const borderColor = {
            orange: 'rgba(230,126,34,0.35)',
            green: 'rgba(26,107,60,0.35)',
            blue: 'rgba(59,130,246,0.3)',
          }[card.variant]
          const iconBg = {
            orange: 'rgba(230,126,34,0.12)',
            green: 'rgba(34,197,94,0.12)',
            blue: 'rgba(59,130,246,0.12)',
          }[card.variant]

          return (
            <div key={card.label} className="card card-lift" style={{ borderColor }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: '#64748b' }}>
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>{card.value}</p>
                  {card.sub && <p className="text-xs mt-1" style={{ color: '#475569' }}>{card.sub}</p>}
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: iconBg }}
                >
                  {card.icon}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bar Chart */}
      {dailyCosts.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#94a3b8' }}>
            Últimos 7 días (USD)
          </h2>
          <div className="flex items-end gap-2 h-28">
            {dailyCosts.map((d) => {
              const cost = parseFloat(d.cost || '0')
              const heightPct = Math.max((cost / maxCost) * 100, 3)
              const dateLabel = new Date(d.date).toLocaleDateString('es-CL', {
                month: 'short',
                day: 'numeric',
              })
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px]" style={{ color: '#64748b' }}>${cost.toFixed(3)}</span>
                  <div
                    className="w-full rounded-t-lg transition-all"
                    style={{
                      height: `${heightPct}%`,
                      background: 'linear-gradient(180deg, rgba(230,126,34,0.8), rgba(230,126,34,0.4))',
                    }}
                    title={`${dateLabel}: $${cost.toFixed(4)}`}
                  />
                  <span className="text-[10px]" style={{ color: '#475569' }}>{dateLabel}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Costs Table */}
      <div className="card">
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#94a3b8' }}>
          Por Proveedor / Modelo
        </h2>

        {costs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-5xl mb-4 animate-float">💰</div>
            <p className="font-semibold" style={{ color: '#64748b' }}>Sin datos de costos aún</p>
            <p className="text-sm mt-1 text-center max-w-xs" style={{ color: '#334155' }}>
              Cuando los agentes comiencen a operar, los costos aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <th className="pb-3 text-left text-xs font-semibold" style={{ color: '#475569' }}>Proveedor</th>
                  <th className="pb-3 text-left text-xs font-semibold" style={{ color: '#475569' }}>Modelo</th>
                  <th className="pb-3 text-right text-xs font-semibold" style={{ color: '#475569' }}>Tokens</th>
                  <th className="pb-3 text-right text-xs font-semibold" style={{ color: '#475569' }}>USD</th>
                  <th className="pb-3 text-right text-xs font-semibold" style={{ color: '#475569' }}>CLP</th>
                  <th className="pb-3 text-right text-xs font-semibold" style={{ color: '#475569' }}>% del total</th>
                </tr>
              </thead>
              <tbody>
                {costs.map((row, i) => {
                  const costUsd = parseFloat(row.cost || '0')
                  const pct = totalUsd > 0 ? (costUsd / totalUsd) * 100 : 0
                  const costClp = Math.round(costUsd * CLP_RATE)
                  const pStyle = providerStyle(row.provider)
                  const isEven = i % 2 === 0

                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: isEven ? 'transparent' : 'rgba(255,255,255,0.015)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isEven ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                    >
                      <td className="py-3">
                        <span
                          className="text-xs px-2.5 py-1 rounded-lg font-medium"
                          style={{ color: pStyle.color, background: pStyle.bg, border: `1px solid ${pStyle.border}` }}
                        >
                          {row.provider}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-xs" style={{ color: '#94a3b8' }}>{row.model}</td>
                      <td className="py-3 text-right text-xs" style={{ color: '#94a3b8' }}>{formatTokens(row.tokens)}</td>
                      <td className="py-3 text-right text-sm font-semibold" style={{ color: '#f1f5f9' }}>${costUsd.toFixed(4)}</td>
                      <td className="py-3 text-right text-xs" style={{ color: '#64748b' }}>${costClp.toLocaleString('es-CL')}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.07)' }}>
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: 'linear-gradient(90deg, rgba(230,126,34,0.8), rgba(230,126,34,0.4))',
                              }}
                            />
                          </div>
                          <span className="text-xs w-8" style={{ color: '#64748b' }}>{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                  <td colSpan={2} className="pt-3 text-xs font-semibold" style={{ color: '#94a3b8' }}>Total</td>
                  <td className="pt-3 text-right text-xs" style={{ color: '#94a3b8' }}>{formatTokens(totalTokens.toString())}</td>
                  <td className="pt-3 text-right text-sm font-bold" style={{ color: '#f1f5f9' }}>${totalUsd.toFixed(4)}</td>
                  <td className="pt-3 text-right text-xs" style={{ color: '#64748b' }}>${totalClp.toLocaleString('es-CL')}</td>
                  <td className="pt-3 text-right text-xs" style={{ color: '#64748b' }}>100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
