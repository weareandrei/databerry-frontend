import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const BACKEND = process.env.NEXT_PUBLIC_API_URL!

interface Connection {
  id: string
  name: string
  type: string
}

async function backendFetch<T>(path: string, authToken: string): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`, {
    headers: { Authorization: authToken, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Backend error ${res.status} for ${path}`)
  return res.json() as Promise<T>
}

function buildTools(connections: Connection[]): Anthropic.Tool[] {
  const tools: Anthropic.Tool[] = []

  const stripeConn = connections.find(c => c.type === 'stripe_manual')
  if (stripeConn) {
    tools.push({
      name: 'get_stripe_revenue',
      description:
        'Fetch Stripe revenue. Use period="today" for today\'s gross, period="week" for this week\'s gross.',
      input_schema: {
        type: 'object' as const,
        properties: {
          period: {
            type: 'string',
            enum: ['today', 'week'],
            description: 'The time period to fetch revenue for.',
          },
        },
        required: ['period'],
      },
    })
  }

  const calendlyConn = connections.find(c => c.type === 'calendly')
  if (calendlyConn) {
    tools.push({
      name: 'get_calendly_meetings',
      description: "Fetch today's Calendly meetings including attendees and times.",
      input_schema: {
        type: 'object' as const,
        properties: {},
        required: [],
      },
    })
  }

  return tools
}

async function executeTool(
  toolName: string,
  input: Record<string, string>,
  connections: Connection[],
  authToken: string,
): Promise<unknown> {
  if (toolName === 'get_stripe_revenue') {
    const conn = connections.find(c => c.type === 'stripe_manual')
    if (!conn) return { error: 'No Stripe connection found' }
    const viewType = input.period === 'week' ? 'stripe_gross_week' : 'stripe_gross_today'
    const data = await backendFetch<{ value: string }>(
      `/stripe/views/live-value?connectionId=${conn.id}&viewType=${viewType}`,
      authToken,
    )
    const cents = parseInt(data.value, 10)
    return { amount_usd: (cents / 100).toFixed(2), period: input.period }
  }

  if (toolName === 'get_calendly_meetings') {
    const conn = connections.find(c => c.type === 'calendly')
    if (!conn) return { error: 'No Calendly connection found' }
    const data = await backendFetch<{ meetings: unknown[] }>(
      `/calendly/meetings-list?connectionId=${conn.id}`,
      authToken,
    )
    return { meetings: data.meetings, count: data.meetings.length }
  }

  return { error: `Unknown tool: ${toolName}` }
}

export async function POST(req: NextRequest) {
  const authToken = req.headers.get('authorization')
  if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages } = await req.json()
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
  }

  // Fetch user's connections to determine available tools
  let connections: Connection[] = []
  try {
    connections = await backendFetch<Connection[]>('/connections', authToken)
  } catch {
    // Proceed without tools if connections can't be fetched
  }

  const tools = buildTools(connections)

  // Agentic loop — keep going until Claude gives a final text answer
  let currentMessages: Anthropic.MessageParam[] = messages

  for (let i = 0; i < 5; i++) {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system:
        'You are a helpful business intelligence assistant for Databerry. You help founders understand their business data — revenue, meetings, product metrics, and more. When you have tools available, use them to fetch real data before answering. Be concise and direct. Format currency as USD.',
      tools: tools.length > 0 ? tools : undefined,
      messages: currentMessages,
    })

    // Final answer
    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text')
      return NextResponse.json({ reply: (textBlock as Anthropic.TextBlock)?.text ?? '' })
    }

    // Tool calls — execute and feed results back
    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = await executeTool(
            block.name,
            block.input as Record<string, string>,
            connections,
            authToken,
          )
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          })
        }
      }

      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ]
      continue
    }

    break
  }

  return NextResponse.json({ error: 'No response from Claude' }, { status: 500 })
}
