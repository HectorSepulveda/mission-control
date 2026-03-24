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

function providerColor(provider: string): string {
  switch (provider?.toLowerCase()) {
    case 'anthropic': return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    case 'openai': return 'bg-green-500/20 text-green-300 border-green-500/30'
    case 'google': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  }
}

export const dynamic = 'force-dynamic'

export default async function CostsPage() {
  const [costs, dailyCosts] = await Promise.all([getCosts(), getDailyCosts()])

  const totalUsd = costs.reduce((sum, r) => sum + parseFloat(r.cost || '0'), 0)
  const totalClp = Math.round(totalUsd * CLP_RATE)
  const totalTokens = costs.reduce((sum, r) => sum + parseInt(r.tokens || '0'), 0)

  // Bar chart data
  const maxCost = Math.max(...dailyCosts.map((d) => parseFloat(d.cost || '0')), 0.001)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Costos IA 💰</h1>
        <p className="text-gray-500 mt-1">Uso y gasto por proveedor y modelo</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card border border-brand-orange/30">
          <p className="text-xs text-gray-500 mb-1">Total USD</p>
          <p className="text-2xl font-bold text-white">${totalUsd.toFixed(4)}</p>
        </div>
        <div className="card border border-brand-green/30">
          <p className="text-xs text-gray-500 mb-1">Total CLP</p>
          <p className="text-2xl font-bold text-white">${totalClp.toLocaleString('es-CL')}</p>
          <p className="text-xs text-gray-500 mt-0.5">≈ {CLP_RATE} CLP/USD</p>
        </div>
        <div className="card border border-blue-500/30">
          <p className="text-xs text-gray-500 mb-1">Tokens Totales</p>
          <p className="text-2xl font-bold text-white">{formatTokens(totalTokens.toString())}</p>
        </div>
      </div>

      {/* Bar Chart - últimos 7 días */}
      {dailyCosts.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-base font-semibold text-white mb-4">Últimos 7 días (USD)</h2>
          <div className="flex items-end gap-2 h-32">
            {dailyCosts.map((d) => {
              const cost = parseFloat(d.cost || '0')
              const heightPct = Math.max((cost / maxCost) * 100, 2)
              const dateLabel = new Date(d.date).toLocaleDateString('es-CL', {
                month: 'short',
                day: 'numeric',
              })
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">${cost.toFixed(3)}</span>
                  <div
                    className="w-full bg-brand-orange/70 hover:bg-brand-orange rounded-t transition-colors"
                    style={{ height: `${heightPct}%` }}
                    title={`${dateLabel}: $${cost.toFixed(4)}`}
                  />
                  <span className="text-xs text-gray-600">{dateLabel}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Costs Table */}
      <div className="card">
        <h2 className="text-base font-semibold text-white mb-4">Por Proveedor / Modelo</h2>
        {costs.length === 0 ? (
          <p className="text-gray-600 text-sm py-8 text-center">Sin datos de costos aún</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border text-left">
                  <th className="pb-3 text-gray-500 font-medium">Proveedor</th>
                  <th className="pb-3 text-gray-500 font-medium">Modelo</th>
                  <th className="pb-3 text-gray-500 font-medium text-right">Tokens</th>
                  <th className="pb-3 text-gray-500 font-medium text-right">USD</th>
                  <th className="pb-3 text-gray-500 font-medium text-right">CLP</th>
                  <th className="pb-3 text-gray-500 font-medium text-right">% del total</th>
                </tr>
              </thead>
              <tbody>
                {costs.map((row, i) => {
                  const costUsd = parseFloat(row.cost || '0')
                  const pct = totalUsd > 0 ? (costUsd / totalUsd) * 100 : 0
                  const costClp = Math.round(costUsd * CLP_RATE)
                  return (
                    <tr key={i} className="border-b border-dark-border/50 hover:bg-dark-muted/10">
                      <td className="py-3">
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${providerColor(row.provider)}`}>
                          {row.provider}
                        </span>
                      </td>
                      <td className="py-3 text-gray-300 font-mono text-xs">{row.model}</td>
                      <td className="py-3 text-gray-300 text-right">{formatTokens(row.tokens)}</td>
                      <td className="py-3 text-white font-medium text-right">${costUsd.toFixed(4)}</td>
                      <td className="py-3 text-gray-400 text-right">${costClp.toLocaleString('es-CL')}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-dark-muted/30 rounded-full h-1.5">
                            <div
                              className="bg-brand-orange/70 h-1.5 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-gray-500 text-xs w-8">{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-dark-border">
                  <td colSpan={2} className="pt-3 text-gray-400 font-medium">Total</td>
                  <td className="pt-3 text-gray-300 text-right">{formatTokens(totalTokens.toString())}</td>
                  <td className="pt-3 text-white font-bold text-right">${totalUsd.toFixed(4)}</td>
                  <td className="pt-3 text-gray-400 text-right">${totalClp.toLocaleString('es-CL')}</td>
                  <td className="pt-3 text-gray-500 text-right">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
