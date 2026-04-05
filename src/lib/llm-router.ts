/**
 * LLM Router — Fase 5
 * Orden de prioridad: Anthropic → OpenRouter → Gemini → Ollama local
 * Fallback automático con backoff exponencial y cooldown por proveedor
 */

import Anthropic from '@anthropic-ai/sdk'
import { query } from './db'

// ── Tipos ────────────────────────────────────────────────────────────────────

export type TaskType =
  | 'architecture'     // Sonnet
  | 'strategy'         // Sonnet
  | 'debugging'        // Sonnet
  | 'coordination'     // Haiku
  | 'summary'          // Haiku
  | 'classification'   // Gemini Flash
  | 'routing'          // Gemini Flash
  | 'code'             // Ollama
  | 'scaffold'         // Ollama
  | 'documentation'    // Ollama
  | 'refactor'         // Ollama
  | 'qa'               // Ollama o Haiku
  | 'default'          // Sonnet

export interface LLMRequest {
  system: string
  prompt: string
  taskType: TaskType
  agentKey: string
  project: string
  maxTokens?: number
}

export interface LLMResponse {
  text: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  costUsd: number
  usedFallback: boolean
}

// ── Configuración de proveedores ─────────────────────────────────────────────

interface ProviderConfig {
  name: string
  models: { primary: string; fallback?: string }
  costPer1kInput: number   // USD
  costPer1kOutput: number  // USD
}

const PROVIDERS: Record<string, ProviderConfig> = {
  anthropic: {
    name: 'Anthropic',
    models: { primary: 'claude-sonnet-4-6', fallback: 'claude-haiku-4-5' },
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  openrouter: {
    name: 'OpenRouter',
    models: { primary: 'anthropic/claude-haiku-4-5', fallback: 'meta-llama/llama-3.1-8b-instruct' },
    costPer1kInput: 0.001,
    costPer1kOutput: 0.005,
  },
  gemini: {
    name: 'Google Gemini',
    models: { primary: 'gemini-2.0-flash', fallback: 'gemini-2.0-flash-lite' },
    costPer1kInput: 0.000075,
    costPer1kOutput: 0.0003,
  },
  ollama: {
    name: 'Ollama (local)',
    models: { primary: 'qwen2.5-coder:14b' },
    costPer1kInput: 0,
    costPer1kOutput: 0,
  },
}

// ── Selección de proveedor/modelo por tipo de tarea ──────────────────────────

const TASK_ROUTING: Record<TaskType, { provider: string; model?: string; maxTokens: number }> = {
  architecture:  { provider: 'anthropic', model: 'claude-sonnet-4-6',   maxTokens: 800 },
  strategy:      { provider: 'anthropic', model: 'claude-sonnet-4-6',   maxTokens: 600 },
  debugging:     { provider: 'anthropic', model: 'claude-sonnet-4-6',   maxTokens: 800 },
  coordination:  { provider: 'anthropic', model: 'claude-haiku-4-5',    maxTokens: 400 },
  summary:       { provider: 'anthropic', model: 'claude-haiku-4-5',    maxTokens: 300 },
  classification:{ provider: 'gemini',    model: 'gemini-2.0-flash',    maxTokens: 200 },
  routing:       { provider: 'gemini',    model: 'gemini-2.0-flash',    maxTokens: 150 },
  code:          { provider: 'ollama',    model: 'qwen2.5-coder:14b',   maxTokens: 800 },
  scaffold:      { provider: 'ollama',    model: 'qwen2.5-coder:14b',   maxTokens: 600 },
  documentation: { provider: 'ollama',    model: 'qwen2.5-coder:14b',   maxTokens: 500 },
  refactor:      { provider: 'ollama',    model: 'qwen2.5-coder:14b',   maxTokens: 800 },
  qa:            { provider: 'ollama',    model: 'qwen2.5-coder:14b',   maxTokens: 400 },
  default:       { provider: 'anthropic', model: 'claude-sonnet-4-6',   maxTokens: 600 },
}

// Orden de fallback: si el proveedor primario falla, seguir esta cadena
const FALLBACK_CHAIN: Record<string, string[]> = {
  anthropic:   ['openrouter', 'gemini', 'ollama'],
  openrouter:  ['anthropic', 'gemini', 'ollama'],
  gemini:      ['anthropic', 'openrouter', 'ollama'],
  ollama:      ['anthropic', 'openrouter', 'gemini'],
}

// Estado de cooldown por proveedor (en memoria, se reinicia con el proceso)
const providerCooldown: Record<string, number> = {}
const COOLDOWN_MS = 10 * 60 * 1000 // 10 minutos

function isProviderCooledDown(provider: string): boolean {
  const until = providerCooldown[provider]
  if (!until) return false
  if (Date.now() > until) {
    delete providerCooldown[provider]
    return false
  }
  return true
}

function setCooldown(provider: string) {
  providerCooldown[provider] = Date.now() + COOLDOWN_MS
  console.warn(`[LLMRouter] ${provider} en cooldown por 10 min`)
}

// ── Llamadas por proveedor ───────────────────────────────────────────────────

async function callAnthropic(model: string, system: string, prompt: string, maxTokens: number) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const res = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = res.content[0].type === 'text' ? res.content[0].text : ''
  return { text, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens }
}

async function callOpenRouter(model: string, system: string, prompt: string, maxTokens: number) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no configurada')
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`)
  const d = await res.json()
  return {
    text: d.choices?.[0]?.message?.content || '',
    inputTokens: d.usage?.prompt_tokens || 0,
    outputTokens: d.usage?.completion_tokens || 0,
  }
}

async function callGemini(model: string, system: string, prompt: string, maxTokens: number) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada')
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`)
  const d = await res.json()
  const text = d.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const inputTokens = d.usageMetadata?.promptTokenCount || 0
  const outputTokens = d.usageMetadata?.candidatesTokenCount || 0
  return { text, inputTokens, outputTokens }
}

async function callOllama(model: string, system: string, prompt: string, maxTokens: number) {
  const base = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      options: { num_predict: maxTokens },
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`)
  const d = await res.json()
  return {
    text: d.message?.content || '',
    inputTokens: d.prompt_eval_count || 0,
    outputTokens: d.eval_count || 0,
  }
}

// ── Llamada unificada con backoff ─────────────────────────────────────────────

async function callProvider(
  provider: string,
  model: string,
  system: string,
  prompt: string,
  maxTokens: number,
  retries = 3
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  let lastErr: Error = new Error('unknown')

  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) {
      const wait = Math.pow(3, attempt) * 1000 // 3s → 9s
      await new Promise(r => setTimeout(r, wait))
    }
    try {
      switch (provider) {
        case 'anthropic':   return await callAnthropic(model, system, prompt, maxTokens)
        case 'openrouter':  return await callOpenRouter(model, system, prompt, maxTokens)
        case 'gemini':      return await callGemini(model, system, prompt, maxTokens)
        case 'ollama':      return await callOllama(model, system, prompt, maxTokens)
        default: throw new Error(`Proveedor desconocido: ${provider}`)
      }
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err))
      const msg = lastErr.message
      // Errores de cuota/rate → cooldown inmediato, no reintentar
      if (msg.includes('402') || msg.includes('529') || msg.includes('quota')) {
        setCooldown(provider)
        throw lastErr
      }
      console.warn(`[LLMRouter] ${provider} intento ${attempt + 1}/${retries}: ${msg}`)
    }
  }

  setCooldown(provider)
  throw lastErr
}

// ── Función principal: routear + fallback + logging ───────────────────────────

export async function routeLLM(req: LLMRequest): Promise<LLMResponse> {
  const route = TASK_ROUTING[req.taskType] || TASK_ROUTING.default
  const maxTokens = req.maxTokens || route.maxTokens
  const primaryProvider = route.provider
  const primaryModel = route.model || PROVIDERS[primaryProvider].models.primary

  const providersToTry = [
    { provider: primaryProvider, model: primaryModel },
    ...FALLBACK_CHAIN[primaryProvider].map(p => ({
      provider: p,
      model: PROVIDERS[p].models.primary,
    })),
  ]

  let lastErr: Error = new Error('Todos los proveedores fallaron')
  let usedFallback = false

  for (const { provider, model } of providersToTry) {
    if (isProviderCooledDown(provider)) {
      console.warn(`[LLMRouter] ${provider} en cooldown, saltando`)
      continue
    }

    try {
      const start = Date.now()
      const result = await callProvider(provider, model, req.system, req.prompt, maxTokens)
      const elapsed = Date.now() - start

      const cfg = PROVIDERS[provider]
      const costUsd =
        (result.inputTokens / 1000) * cfg.costPer1kInput +
        (result.outputTokens / 1000) * cfg.costPer1kOutput

      // Loguear en PostgreSQL
      await logUsage({
        agentKey: req.agentKey,
        provider,
        model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd,
        project: req.project,
        taskType: req.taskType,
        elapsedMs: elapsed,
        usedFallback,
      }).catch(e => console.error('[LLMRouter] Error logueando:', e))

      return {
        text: result.text,
        provider,
        model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd,
        usedFallback,
      }
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err))
      console.error(`[LLMRouter] ${provider} falló: ${lastErr.message}`)
      usedFallback = true
    }
  }

  throw lastErr
}

// ── Logging a PostgreSQL ──────────────────────────────────────────────────────

async function logUsage(data: {
  agentKey: string; provider: string; model: string
  inputTokens: number; outputTokens: number; costUsd: number
  project: string; taskType: string; elapsedMs: number; usedFallback: boolean
}) {
  await query(
    `INSERT INTO token_usage
       (agent_id, provider, model, input_tokens, output_tokens, cost_usd, project, phase, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [
      data.agentKey,
      data.provider,
      data.model,
      data.inputTokens,
      data.outputTokens,
      data.costUsd.toFixed(8),
      data.project,
      data.taskType,
    ]
  )
}

// ── Estado de proveedores (para dashboard) ────────────────────────────────────

export function getProviderStatus() {
  return Object.entries(PROVIDERS).map(([key, cfg]) => ({
    key,
    name: cfg.name,
    cooledDown: isProviderCooledDown(key),
    cooldownUntil: providerCooldown[key] || null,
    primaryModel: cfg.models.primary,
  }))
}
