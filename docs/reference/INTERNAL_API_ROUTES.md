---
title: "Internal API Routes Reference"
version: 3.8.16
lastUpdated: 2026-06-08
---

# Internal API Routes Reference

> **TL;DR**: Beyond the public `/v1/*` OpenAI-compatible routes, OmniRoute exposes **~488 internal routes** for management, settings, webhooks, CLI tools, and admin operations. This is the reference.

**Source:** `src/app/api/**/route.ts` (~53 route.ts files, 488 total routes with dynamic segments)

**Related:**
- [API_REFERENCE.md](./API_REFERENCE.md) — public `/v1/*` routes
- [BACKUP_RESTORE.md](../ops/BACKUP_RESTORE.md) — `/api/db-backups` routes

---

## Auth Levels

Internal routes use 3 auth levels:

| Level | Header | Use case |
|-------|--------|----------|
| **Public** | None (or `Authorization: Bearer <user-key>`) | Most routes — user API key required |
| **Management** | `Authorization: Bearer $MANAGEMENT_KEY` | Admin/operations (backup, settings) |
| **Service** | `X-Service-Token: $SERVICE_TOKEN` | Internal service-to-service |

Management routes return `403` if the key lacks the `admin` scope.

---

## Admin & Database Routes

### Backup & Restore

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/db-backups` | List auto-backups + status |
| PUT | `/api/db-backups` | Create new backup |
| POST | `/api/db-backups` | Restore from backup |
| GET | `/api/db-backups/export` | Export as JSON |
| POST | `/api/db-backups/import` | Import from JSON |
| GET | `/api/db-backups/exportAll` | Export all data (unrestricted) |


### Database Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/db/health` | DB integrity + FK + artifact check |

### Database Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings/database` | Database config + stats |
| POST | `/api/settings/database/refresh-stats` | Refresh DB statistics |
| POST | `/api/settings/database/vacuum` | Run `VACUUM` to reclaim space |

### Pricing

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/pricing` | Pricing config |
| GET | `/api/pricing/defaults` | Default pricing |
| GET | `/api/pricing/models` | Model pricing |
| POST | `/api/pricing/sync` | Trigger pricing sync |

### Cache

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings/cache-config` | Cache config |
| GET | `/api/settings/cache-metrics` | Cache metrics |
| GET | `/api/cache/stats` | Hit/miss/eviction by namespace |
| POST | `/api/cache/flush` | Flush all namespaces |
| POST | `/api/cache/invalidate` | Invalidate by key pattern |

See [API_REFERENCE.md](./API_REFERENCE.md) for full schema details.

---

## Settings Routes (`/api/settings/*`)

### Per-Scope Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings` | All settings |
| GET | `/api/settings/[key]` | Single setting |
| PATCH | `/api/settings/[key]` | Update setting |
| DELETE | `/api/settings/[key]` | Delete setting |

### Compression

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings/compression` | Compression config |
| PATCH | `/api/settings/compression` | Update config |
| GET | `/api/settings/compression/combos` | List compression combos |
| POST | `/api/settings/compression/combos` | Create combo |
| PATCH | `/api/settings/compression/combos/[id]` | Update combo |
| DELETE | `/api/settings/compression/combos/[id]` | Delete combo |

### Quota

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings/quota/[apiKeyId]` | Quota settings for key |
| PATCH | `/api/settings/quota/[apiKeyId]` | Update quota limits |
| GET | `/api/settings/quota/snapshots` | Recent snapshots |

### MCP

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings/mcp` | MCP server config |
| PATCH | `/api/settings/mcp` | Update config |
| POST | `/api/settings/mcp/regenerate-token` | New MCP token |

See [WEBHOOKS.md](../frameworks/WEBHOOKS.md) for webhook CRUD, delivery logs, and supported events.


## CLI Tools Routes (`/api/cli-tools/*`)

### Runtime

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cli-tools` | List installed CLI tools |
| GET | `/api/cli-tools/runtime/[tool]` | Runtime health for a tool |
| POST | `/api/cli-tools/runtime/[tool]` | Update runtime config |
| GET | `/api/cli-tools/claude-settings` | Claude Code config |
| GET | `/api/cli-tools/codex-settings` | Codex config |
| GET | `/api/cli-tools/openclaw-settings` | OpenClaw config |

### Installation

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/cli-tools/install` | Install a CLI tool |
| DELETE | `/api/cli-tools/[tool]` | Uninstall a tool |
| POST | `/api/cli-tools/[tool]/upgrade` | Upgrade to latest version |
| POST | `/api/cli-tools/[tool]/restart` | Restart CLI process |

### State

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cli-tools/state` | Persistent state across restarts |
| POST | `/api/cli-tools/state/reset` | Clear state |
| GET | `/api/cli-tools/state/[key]` | Specific state key |

---

## Skills Routes (`/api/skills/*`)

### CRUD

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/skills` | List installed skills |
| POST | `/api/skills/install` | Install from marketplace |
| DELETE | `/api/skills/[id]` | Uninstall |
| POST | `/api/skills/[id]/enable` | Enable |
| POST | `/api/skills/[id]/disable` | Disable |

### Execution

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/skills/[id]/execute` | Run skill with input |
| GET | `/api/skills/[id]/executions` | Execution history |
| GET | `/api/skills/executions/[execId]` | Single execution detail |

### Config

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/skills/config` | Global skills config |
| PATCH | `/api/skills/config` | Update config |
| GET | `/api/skills/sources` | Available skill sources |

See [SKILLS.md](../frameworks/SKILLS.md) for skill framework details.

---

## Agent Skills Routes (`/api/agent-skills/*`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agent-skills` | List agent skills |
| POST | `/api/agent-skills` | Create custom skill |
| GET | `/api/agent-skills/[id]` | Get skill manifest |
| PATCH | `/api/agent-skills/[id]` | Update skill |
| DELETE | `/api/agent-skills/[id]` | Delete skill |
| POST | `/api/agent-skills/[id]/execute` | Run skill |
| GET | `/api/agent-skills/[id]/history` | Execution history |
| POST | `/api/agent-skills/[id]/test` | Test mode (dry run) |

See [AGENT-SKILLS.md](../frameworks/AGENT-SKILLS.md).

---

## Memory Routes (`/api/memory/*`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/memory` | List memories |
| POST | `/api/memory` | Create memory |
| GET | `/api/memory/[id]` | Get memory |
| PATCH | `/api/memory/[id]` | Update memory |
| DELETE | `/api/memory/[id]` | Delete memory |
| GET | `/api/memory/search` | Search memories |
| GET | `/api/memory/retrieve` | Retrieve (with scoring) |
| POST | `/api/memory/summarize` | Trigger summarization |
| GET | `/api/memory/settings` | Memory config |
| PATCH | `/api/memory/settings` | Update config |

See [MEMORY.md](../frameworks/MEMORY.md).

---

## Cache Routes (`/api/cache/*`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cache/stats` | Hit/miss/eviction by namespace |
| POST | `/api/cache/flush` | Flush all namespaces |
| POST | `/api/cache/flush/[namespace]` | Flush specific namespace |
| POST | `/api/cache/invalidate` | Invalidate by key pattern |
| GET | `/api/cache/keys` | List keys (with pattern) |

---

## Plugins Routes (`/api/plugins/*`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/plugins` | List installed plugins |
| POST | `/api/plugins/install` | Install from local path or URL |
| DELETE | `/api/plugins/[id]` | Uninstall |
| POST | `/api/plugins/[id]/enable` | Enable |
| POST | `/api/plugins/[id]/disable` | Disable |
| POST | `/api/plugins/[id]/reload` | Hot reload (dev mode) |
| GET | `/api/plugins/[id]/config` | Plugin config |
| PATCH | `/api/plugins/[id]/config` | Update config |
| POST | `/api/plugins/[id]/test` | Test plugin (dry run) |
| GET | `/api/plugins/marketplace` | Browse marketplace |
| GET | `/api/plugins/marketplace/search` | Search marketplace |
| GET | `/api/plugins/doctors` | Run doctor on all plugins |
| GET | `/api/plugins/doctors/[id]` | Run doctor on one plugin |

See [PLUGIN_SDK.md](../plugins/PLUGIN_SDK.md) and [PLUGIN_DEVELOPMENT.md](../plugins/PLUGIN_DEVELOPMENT.md).

---
## ACP Routes (`/api/acp/*`)

Only **one agent management endpoint** exists:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/acp/agents` | List available CLI agents + their installation status |
| POST | `/api/acp/agents` | Register a custom ACP agent |
| GET | `/api/acp/agents/[id]` | Get agent configuration |

> ACP sessions are **in-memory** (managed by `src/lib/acp/manager.ts`), not exposed over HTTP. No `/api/acp/sessions/*` or `/api/acp/spawn` endpoints exist.

See [ACP.md](../frameworks/ACP.md) and [ACP_INTEGRATION.md](../frameworks/ACP_INTEGRATION.md).

---

## Cloud Agent Routes (`/api/v1/agents/*`)

Cloud agent task management is at `/api/v1/agents/`, not `/api/cloud/*`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/agents/tasks` | List cloud agent tasks (filter: provider, status, limit ≤ 500) |
| POST | `/api/v1/agents/tasks` | Create task (dispatch to upstream provider + persist) |
| GET | `/api/v1/agents/tasks/[id]` | Get task + lazy-sync status from upstream |
| POST | `/api/v1/agents/tasks/[id]` | Action: `approve` / `message` / `cancel` |
| DELETE | `/api/v1/agents/tasks/[id]` | Delete task by ID |
| GET | `/api/v1/agents/credentials` | List cloud agent credentials (metadata only) |

> The `/api/cloud/*` routes are **limited to auth, credentials/update, models/alias, model/resolve only**.
> These are internal helper endpoints, not the main Cloud Agent API.

See [CLOUD_AGENT.md](../frameworks/CLOUD_AGENT.md).

---

## Concurrency Routes (`/api/admin/concurrency*`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/concurrency` | Current concurrency settings |
| PATCH | `/api/admin/concurrency` | Update limits |
| GET | `/api/admin/concurrency/stats` | Active requests by category |

---

## Files API (`/api/files/*`)

See [FILES_API.md](./FILES_API.md) (when published).

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/files` | Upload file |
| GET | `/api/files` | List files |
| GET | `/api/files/[id]` | Get file metadata |
| GET | `/api/files/[id]/content` | Download |
| DELETE | `/api/files/[id]` | Delete |

---

## Batches API (`/api/batches/*`)

See [BATCHES_API.md](./BATCHES_API.md) (when published).

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/batches` | Create batch |
| GET | `/api/batches` | List batches |
| GET | `/api/batches/[id]` | Batch detail |
| POST | `/api/batches/[id]/cancel` | Cancel |
| GET | `/api/batches/[id]/results` | Batch results |

---

## Analytics Routes (`/api/analytics/*`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics/auto-routing` | Auto-combo scoring distribution |
| GET | `/api/analytics/compression` | Compression savings |
| GET | `/api/analytics/diversity` | Provider/model diversity |


## Monitoring Routes (`/api/monitoring/*`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/monitoring/health` | System health snapshot |

See [MONITORING_GUIDE.md](../ops/MONITORING_GUIDE.md) for full details.

---

## Context Routes (`/api/context/*`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/context/caveman` | Caveman config + stats |
| PATCH | `/api/context/caveman` | Update config |
| GET | `/api/context/rtk` | RTK config + filters |
| PATCH | `/api/context/rtk` | Update config |
| GET | `/api/context/combos` | Compression combos |
| GET | `/api/context/preview` | Preview compression on sample text |

---

## Compliance Routes (`/api/compliance/*`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/compliance/audit-log` | Audit log entries |

See [COMPLIANCE.md](../security/COMPLIANCE.md).


---

## A2A Routes (`/api/a2a/*`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/a2a` | JSON-RPC 2.0 endpoint |
| GET | `/api/a2a/status` | A2A status |
| GET | `/api/a2a/tasks` | List A2A tasks |
| GET | `/api/a2a/tasks/[id]` | Task detail |
| POST | `/api/a2a/tasks/[id]/cancel` | Cancel task |

See [A2A-SERVER.md](../frameworks/A2A-SERVER.md).

---

## MCP Server Routes

See [MCP-SERVER.md](../frameworks/MCP-SERVER.md) — 3 transports, 30+ tools, 13 scopes.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/mcp/stream` | Streamable HTTP transport |
| GET | `/api/mcp/sse` | SSE transport |
| GET | `/.well-known/mcp.json` | Server metadata |

---

## Usage Routes

See [USAGE_QUOTA_GUIDE.md](../features/USAGE_QUOTA_GUIDE.md).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/usage` | List usage records |
| GET | `/api/usage/analytics` | Aggregated stats |
| GET | `/api/usage/export` | Export to CSV/JSON |
| GET | `/api/usage/top-keys` | Top consumers |

---

## Common Patterns

### Pagination

All list endpoints support `?limit=N&offset=M`:

```bash
GET /api/plugins?limit=50&offset=100
```

Response includes:

```json
{
  "items": [...],
  "total": 1234,
  "limit": 50,
  "offset": 100
}
```

### Filtering

Most list endpoints accept filter params:

```bash
GET /api/usage?provider=openai&range=7d&apiKeyId=key-123
GET /api/webhooks?event=request.completed&enabled=true
```

### Error Format

Errors return a consistent shape:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Plugin 'foo' not found",
    "details": { "id": "foo" }
  }
}
```

Common codes:
- `400` — `VALIDATION_ERROR`
- `401` — `UNAUTHORIZED`
- `403` — `FORBIDDEN` (insufficient scope)
- `404` — `RESOURCE_NOT_FOUND`
- `409` — `CONFLICT` (duplicate, etc.)
- `429` — `RATE_LIMITED`
- `500` — `INTERNAL_ERROR`
- `503` — `SERVICE_UNAVAILABLE`

### Rate Limiting

Internal routes are rate-limited per-API-key:

- Default: 100 requests / 60s / key
- Configurable per-key in `apiKeys` table
- Returns `429` with `Retry-After` header

---

## See Also

- [API_REFERENCE.md](./API_REFERENCE.md) — public routes
- [BACKUP_RESTORE.md](../ops/BACKUP_RESTORE.md) — backup API
- [DATABASE_GUIDE.md](../ops/DATABASE_GUIDE.md) — DB operations
- [MONITORING_GUIDE.md](../ops/MONITORING_GUIDE.md) — monitoring API
- Source: `src/app/api/**/route.ts`
