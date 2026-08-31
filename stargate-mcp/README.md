# Stargate MCP

Read-only MCP server for runtime verification of the Stargate site, its allowlisted Supabase tables, GitHub Actions, and Vercel deployments. It uses `createMcpHandler(factory)` from the MCP TypeScript SDK v2; the factory creates a fresh `McpServer` for every request and Vercel mounts the Web Standard default `{ fetch }` export at `api/mcp.ts`.

## Security model

- Every `POST /api/mcp` request requires `Authorization: Bearer <MCP_AUTH_TOKEN>`; comparison uses fixed-length SHA-256 digests and a constant-time XOR pass.
- The site tools derive targets only from `SITE_BASE_URL` and reject protocol-relative, credential-bearing, cross-origin, and backslash paths.
- Supabase access is restricted to the source-controlled table allowlist. Table discovery uses real `HEAD` probes. Row reads are available only for selected public K-Startup announcement fields; booking, attendance, reports, D-Day rows, and raw provider payloads cannot be read.
- All upstream requests have an 8-second timeout and a 512 KiB response limit. Tool errors are returned with `isError: true`, actionable text, and configured secrets redacted.
- All 12 tools have strict Zod object inputs and read-only/idempotent MCP annotations.

## Environment

Exactly these eight variables are required in the Vercel project:

1. `MCP_AUTH_TOKEN`
2. `SITE_BASE_URL`
3. `SUPABASE_URL`
4. `SUPABASE_ANON_KEY`
5. `GITHUB_TOKEN`
6. `GITHUB_REPOSITORY` (`owner/repository`)
7. `VERCEL_TOKEN`
8. `VERCEL_PROJECT_ID`

Copy `.env.example` locally and never commit real values. The server reads no additional environment variables, keeping the deployment contract at exactly eight.

Recommended token scopes are read-only where the provider supports them: GitHub Actions/repository metadata read, and Vercel project/deployment read.

## Tools

`site_health`, `site_asset_status`, `site_security_headers`, `db_tables`, `db_table_count`, `db_recent_kstartup`, `list_workflow_runs`, `get_workflow_run`, `list_workflows`, `list_deployments`, `get_deployment`, and `list_project_domains`.

## Local verification

Opening `/api/mcp` in a browser now shows a public Korean connection guide; `/` also shows the guide. These GET/HEAD responses expose no environment values or tool data and do not indicate upstream health. Actual MCP calls still require POST with `Authorization: Bearer <MCP_AUTH_TOKEN>` using Streamable HTTP. `VERCEL_TOKEN` is only for the server's Vercel API calls, not client authentication. Explicit GET requests accepting `text/event-stream` return 405 because the server does not provide a separate SSE stream.

```powershell
npm install
npm run build
npm test
```

Example initialize request after deployment:

```powershell
$headers = @{ Authorization = "Bearer $env:MCP_AUTH_TOKEN"; Accept = "application/json, text/event-stream"; "Content-Type" = "application/json" }
$body = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"gate2","version":"1.0.0"}}}'
Invoke-WebRequest -Method Post -Uri "https://YOUR-PROJECT.vercel.app/api/mcp" -Headers $headers -Body $body
```

Set the Vercel project root directory to `stargate-mcp`. `vercel.json` pins the function to `icn1` with a 30-second maximum duration. No deploy, push, or credential provisioning is performed by this package.
