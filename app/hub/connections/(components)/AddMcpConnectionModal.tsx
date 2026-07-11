'use client'

/**
 * Add-MCP-connection bottom dialog.
 *
 * Form-only modal (no OAuth dance) for connecting any remote MCP
 * (Model Context Protocol) server. v1 covers ~80% of real MCPs:
 *   - None          → public/relay endpoints, no credentials.
 *   - Bearer token  → `Authorization: Bearer <token>` (most paid MCPs).
 *   - Custom header → user-supplied header name + value (rare but
 *                     common enough for providers using `X-Api-Key`,
 *                     etc.).
 *
 * Save flow: `POST /connections` with `type='mcp'` and a `config`
 * payload that carries the URL + auth shape. The backend
 * (`connections.service.ts → insertTypeConfig`) validates against
 * the live server (initialize + tools/list) BEFORE persisting, so a
 * 400 here means the connection didn't work — we surface the
 * backend's message verbatim in the toast. On success we close,
 * refresh the connections list, and (per product call) DON'T show
 * the discovered tool list — just "connected".
 *
 * OAuth deliberately not in v1 — pre-obtained access tokens can be
 * pasted into the Bearer field and the form handles them as plain
 * tokens.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { BottomDialog } from '@/components/ui/Dialog/BottomDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ALGORITHM } from '@/lib/api'
import { useDashboard } from '@/contexts/DashboardContext'
import { Cpu } from '@phosphor-icons/react'

type AuthType = 'none' | 'bearer' | 'custom_header'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  container?: HTMLElement | null
}

export function AddMcpConnectionModal({ open, onOpenChange, container }: Props) {
  const { connections, projects } = useDashboard()

  // ── Form state ────────────────────────────────────────────────────
  // Initial state is "blank form, Common scope, bearer auth" — bearer
  // is the most common shape so default-selecting it shortens the
  // typical add flow by one click.
  const [name, setName] = useState('')
  const [serverUrl, setServerUrl] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [authType, setAuthType] = useState<AuthType>('bearer')
  const [authCredential, setAuthCredential] = useState('')
  const [authHeaderName, setAuthHeaderName] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset on open so re-opening after a successful add starts fresh.
  // Guard on `open` so closing-then-reopening triggers it, but a
  // mid-edit re-render doesn't wipe the user's typing.
  const handleOpenChange = (next: boolean) => {
    if (next && !open) {
      setName('')
      setServerUrl('')
      setProjectId(null)
      setAuthType('bearer')
      setAuthCredential('')
      setAuthHeaderName('')
    }
    onOpenChange(next)
  }

  // ── Validation (client-side, "can we submit?") ────────────────────
  // Bare-minimum checks so the Save button reflects "this submission
  // can possibly succeed" — the server still runs the real validation
  // against the live MCP. URL is checked via the URL constructor so a
  // typo'd protocol fails fast.
  const urlLooksValid = (() => {
    if (!serverUrl.trim()) return false
    try {
      const u = new URL(serverUrl.trim())
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
      return false
    }
  })()
  const credentialFilled =
    authType === 'none' ||
    (authType === 'bearer' && authCredential.trim().length > 0) ||
    (authType === 'custom_header' &&
      authCredential.trim().length > 0 &&
      authHeaderName.trim().length > 0)
  const canSave = !saving && name.trim().length > 0 && urlLooksValid && credentialFilled

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await ALGORITHM.createConnection({
        name: name.trim(),
        type: 'mcp',
        projectId,
        config: {
          serverUrl: serverUrl.trim(),
          authType,
          authCredential:
            authType === 'none' ? null : authCredential.trim(),
          authHeaderName:
            authType === 'custom_header' ? authHeaderName.trim() : null,
        },
      })
      toast.success('MCP connection added')
      onOpenChange(false)
      // Refresh the dashboard's connections cache so the new row
      // appears in the list immediately (no manual reload).
      connections.loadConnections()
    } catch (err) {
      // Backend returns either a validation error from the MCP server
      // ("Couldn't reach…", "MCP server rejected the credentials…")
      // or a config-shape error. Surface the message verbatim — it's
      // already user-readable by the time it lands here.
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Couldn't add MCP connection"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomDialog open={open} onOpenChange={handleOpenChange} container={container}>
      <BottomDialog.Page
        title="Add MCP connection"
        bodyMaxWidth="36rem"
        headerRight={() => (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!canSave}>
              {saving ? 'Connecting…' : 'Add connection'}
            </Button>
          </div>
        )}
      >
        <div className="flex items-start gap-3 mb-5 -mt-1">
          <span className="flex items-center justify-center rounded-full bg-surface border border-stroke p-2 shrink-0">
            <Cpu size={18} weight="bold" className="text-foreground" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connect any remote MCP server so the Agent can use the tools
              it exposes. We'll test the connection now and only save it
              if your credentials work.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <Field label="Name" required>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Beehiiv MCP"
              disabled={saving}
            />
          </Field>

          {/* Server URL */}
          <Field
            label="Server URL"
            required
            hint="The MCP server endpoint. Usually starts with https://"
          >
            <Input
              value={serverUrl}
              onChange={e => setServerUrl(e.target.value)}
              placeholder="https://api.example.com/mcp"
              disabled={saving}
              spellCheck={false}
              autoCapitalize="off"
            />
            {serverUrl.trim() && !urlLooksValid && (
              <p className="mt-1 text-xs text-amber-600">
                Doesn't look like a valid http(s) URL.
              </p>
            )}
          </Field>

          {/* Scope */}
          <Field
            label="Available in"
            hint="Common is available across every project; project-scoped is only available in the one you pick."
          >
            <select
              value={projectId ?? ''}
              onChange={e => setProjectId(e.target.value === '' ? null : e.target.value)}
              disabled={saving}
              className="w-full rounded-md border border-stroke bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-60"
            >
              <option value="">Common (every project)</option>
              {projects.projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>

          {/* Auth type */}
          <Field label="Authentication">
            <div className="grid grid-cols-3 gap-2">
              <AuthOption
                value="none"
                current={authType}
                label="None"
                desc="No credentials"
                onPick={setAuthType}
                disabled={saving}
              />
              <AuthOption
                value="bearer"
                current={authType}
                label="Bearer"
                desc="Authorization: Bearer …"
                onPick={setAuthType}
                disabled={saving}
              />
              <AuthOption
                value="custom_header"
                current={authType}
                label="Custom header"
                desc="e.g. X-Api-Key"
                onPick={setAuthType}
                disabled={saving}
              />
            </div>
          </Field>

          {/* Credentials (conditional on auth type) */}
          {authType === 'bearer' && (
            <Field label="Token" required>
              <Input
                type="password"
                value={authCredential}
                onChange={e => setAuthCredential(e.target.value)}
                placeholder="paste your access token"
                disabled={saving}
                spellCheck={false}
                autoCapitalize="off"
              />
            </Field>
          )}
          {authType === 'custom_header' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Header name" required>
                <Input
                  value={authHeaderName}
                  onChange={e => setAuthHeaderName(e.target.value)}
                  placeholder="e.g. X-Api-Key"
                  disabled={saving}
                  spellCheck={false}
                  autoCapitalize="off"
                />
              </Field>
              <Field label="Header value" required>
                <Input
                  type="password"
                  value={authCredential}
                  onChange={e => setAuthCredential(e.target.value)}
                  placeholder="paste the value"
                  disabled={saving}
                  spellCheck={false}
                  autoCapitalize="off"
                />
              </Field>
            </div>
          )}
        </div>
      </BottomDialog.Page>
    </BottomDialog>
  )
}

// ── Small local helpers ────────────────────────────────────────────

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
        {label}
        {required && <span className="ml-0.5 text-primary">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </div>
  )
}

function AuthOption({
  value,
  current,
  label,
  desc,
  onPick,
  disabled,
}: {
  value: AuthType
  current: AuthType
  label: string
  desc: string
  onPick: (v: AuthType) => void
  disabled?: boolean
}) {
  const active = value === current
  return (
    <button
      type="button"
      onClick={() => onPick(value)}
      disabled={disabled}
      className={`text-left rounded-md border px-3 py-2 transition-colors disabled:opacity-60 ${
        active
          ? 'border-primary bg-primary/5 text-foreground'
          : 'border-stroke bg-white text-foreground hover:bg-surface'
      }`}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="text-[11px] text-subtle leading-tight mt-0.5">{desc}</p>
    </button>
  )
}
