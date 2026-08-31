import { createMcpHandler, McpServer, type StandardSchemaWithJSON } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { parseJson, safeFetch, UpstreamError } from './http.js';
import { constantTimeEqual, hasValidBearer, redact, sameOriginUrl } from './security.js';

export const TOOL_NAMES = [
  'site_health',
  'site_asset_status',
  'site_security_headers',
  'db_tables',
  'db_table_count',
  'db_recent_kstartup',
  'list_workflow_runs',
  'get_workflow_run',
  'list_workflows',
  'list_deployments',
  'get_deployment',
  'list_project_domains',
] as const;

export const TABLE_ALLOWLIST = [
  'class_bookings',
  'class_attendance',
  'class_daily_reports',
  'dday_events',
  'kstartup_announcements',
  'kstartup_business',
  'kstartup_contents',
  'kstartup_statistics',
  'kstartup_fetch_logs',
] as const;

type Environment = Record<string, string | undefined>;

export interface ServerOptions {
  env?: Environment;
  fetcher?: typeof fetch;
}

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

const emptyInput = z.object({}).strict();
const siteHealthInput = z.object({
  path: z.string().min(1).max(300).regex(/^\/(?!\/)/, 'Path must begin with one slash.').default('/'),
}).strict();
const assetInput = z.object({
  paths: z.array(z.string().min(1).max(300).regex(/^\/(?!\/)/, 'Each path must begin with one slash.')).min(1).max(12),
}).strict();
const tableInput = z.object({ table: z.enum(TABLE_ALLOWLIST) }).strict();
const recentInput = z.object({ limit: z.number().int().min(1).max(25).default(10) }).strict();
const workflowRunsInput = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  status: z.enum(['completed', 'action_required', 'cancelled', 'failure', 'in_progress', 'queued', 'requested', 'waiting', 'success']).optional(),
}).strict();
const runInput = z.object({ run_id: z.number().int().positive() }).strict();
const deploymentsInput = z.object({ limit: z.number().int().min(1).max(50).default(20) }).strict();
const deploymentInput = z.object({ deployment_id: z.string().min(1).max(150).regex(/^[A-Za-z0-9_-]+$/) }).strict();

function required(env: Environment, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`${name} is not configured. Add it to the Vercel project environment and redeploy.`);
  return value;
}

type TextToolResult = {
  isError: boolean;
  content: Array<{ type: 'text'; text: string }>;
};

function result(data: unknown, env: Environment): TextToolResult {
  const safe = redact(data, [env.MCP_AUTH_TOKEN, env.SUPABASE_ANON_KEY, env.GITHUB_TOKEN, env.VERCEL_TOKEN]);
  return { isError: false, content: [{ type: 'text' as const, text: JSON.stringify(safe, null, 2) }] };
}

function toolError(error: unknown, env: Environment): TextToolResult {
  const message = error instanceof Error ? error.message : 'Unexpected tool failure.';
  return {
    isError: true,
    content: [{ type: 'text' as const, text: JSON.stringify(redact({ error: message }, [env.MCP_AUTH_TOKEN, env.SUPABASE_ANON_KEY, env.GITHUB_TOKEN, env.VERCEL_TOKEN])) }],
  };
}

function jsonOrError(text: string, provider: string): unknown {
  return parseJson(text, provider);
}

function assertOk(response: Response, text: string, provider: string): void {
  if (!response.ok) {
    let detail = text.slice(0, 500);
    try {
      const parsed = JSON.parse(text) as { message?: string; error?: { message?: string } };
      detail = parsed.message ?? parsed.error?.message ?? detail;
    } catch { /* text fallback */ }
    throw new UpstreamError(`${provider} returned HTTP ${response.status}: ${detail || response.statusText}. Check credentials, scopes, and identifiers.`, response.status);
  }
}

export function buildServer(options: ServerOptions = {}): McpServer {
  const env = options.env ?? process.env;
  const fetcher = options.fetcher ?? fetch;
  const server = new McpServer({ name: 'stargate-mcp', version: '1.0.0' }, { capabilities: { tools: {} } });

  const register = <Schema extends z.ZodObject>(
    name: (typeof TOOL_NAMES)[number],
    title: string,
    description: string,
    inputSchema: Schema,
    handler: (args: z.output<Schema>) => Promise<unknown>,
  ) => server.registerTool(name, { title, description, inputSchema: inputSchema as StandardSchemaWithJSON, annotations: readOnlyAnnotations }, async (args) => {
    try {
      return result(await handler(inputSchema.parse(args) as z.output<Schema>), env);
    } catch (error) {
      return toolError(error, env);
    }
  });

  register('site_health', 'Site health', 'Checks a same-origin Stargate site path and reports HTTP status and latency.', siteHealthInput, async ({ path }: z.infer<typeof siteHealthInput>) => {
    const url = sameOriginUrl(required(env, 'SITE_BASE_URL'), path);
    const startedAt = Date.now();
    const { response, text } = await safeFetch(fetcher, url, { headers: { accept: 'text/html,application/json' }, maxBytes: 64 * 1024, redirect: 'manual' });
    assertOk(response, text, 'Stargate site');
    return { ok: true, status: response.status, '상태코드': response.status, responseTimeMs: Date.now() - startedAt, checkedAt: new Date().toISOString(), url: url.origin };
  });

  register('site_asset_status', 'Site asset status', 'Checks bounded same-origin asset paths; cross-origin and SSRF targets are rejected.', assetInput, async ({ paths }: z.infer<typeof assetInput>) => {
    const base = required(env, 'SITE_BASE_URL');
    const statuses = await Promise.all(paths.map(async (path) => {
      const url = sameOriginUrl(base, path);
      const startedAt = Date.now();
      const { response } = await safeFetch(fetcher, url, { method: 'HEAD', maxBytes: 1, redirect: 'manual' });
      return { path, status: response.status, ok: response.ok, responseTimeMs: Date.now() - startedAt };
    }));
    return { checkedAt: new Date().toISOString(), assets: statuses };
  });

  register('site_security_headers', 'Site security headers', 'Reads security-related response headers from the configured site root.', emptyInput, async () => {
    const url = sameOriginUrl(required(env, 'SITE_BASE_URL'));
    const { response, text } = await safeFetch(fetcher, url, { maxBytes: 64 * 1024, redirect: 'manual' });
    assertOk(response, text, 'Stargate site');
    const names = ['content-security-policy', 'strict-transport-security', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy'];
    return { status: response.status, headers: Object.fromEntries(names.map((name) => [name, response.headers.get(name)])) };
  });

  const supabaseHeaders = () => ({ apikey: required(env, 'SUPABASE_ANON_KEY'), authorization: `Bearer ${required(env, 'SUPABASE_ANON_KEY')}` });
  const supabaseUrl = (table: string, query: string) => new URL(`/rest/v1/${table}?${query}`, required(env, 'SUPABASE_URL'));

  register('db_tables', 'Database table access', 'Probes only the fixed Supabase allowlist and reports which tables are accessible; no rows are returned.', emptyInput, async () => {
    const tables = await Promise.all(TABLE_ALLOWLIST.map(async (table) => {
      const { response } = await safeFetch(fetcher, supabaseUrl(table, 'select=*&limit=1'), { method: 'HEAD', headers: { ...supabaseHeaders(), prefer: 'count=exact' }, maxBytes: 1, redirect: 'error' });
      if (response.status === 401 || response.status === 403) {
        throw new UpstreamError(`Supabase returned HTTP ${response.status} while probing ${table}. Check SUPABASE_ANON_KEY and RLS read policies.`, response.status);
      }
      return { table, accessible: response.ok, status: response.status };
    }));
    if (!tables.some((table) => table.accessible)) {
      throw new UpstreamError('No allowlisted Supabase table is accessible. Check SUPABASE_URL, SUPABASE_ANON_KEY, and RLS read policies.');
    }
    return { mode: '읽기 전용', tables };
  });

  register('db_table_count', 'Database table count', 'Returns a count for an allowlisted table without reading row contents.', tableInput, async ({ table }: z.infer<typeof tableInput>) => {
    const { response, text } = await safeFetch(fetcher, supabaseUrl(table, 'select=*'), { method: 'HEAD', headers: { ...supabaseHeaders(), prefer: 'count=exact' }, maxBytes: 1, redirect: 'error' });
    assertOk(response, text, 'Supabase');
    const range = response.headers.get('content-range');
    const count = range?.split('/')[1];
    return { table, count: count && count !== '*' ? Number(count) : null };
  });

  register('db_recent_kstartup', 'Recent K-Startup announcements', 'Returns bounded public announcement metadata only; personal-data tables and raw payloads cannot be queried.', recentInput, async ({ limit }: z.infer<typeof recentInput>) => {
    const columns = 'pbanc_sn,biz_pbanc_nm,supt_biz_clsfc,supt_regin,pbanc_rcpt_bgng_dt,pbanc_rcpt_end_dt,pbanc_ntrp_nm,sprv_inst,biz_gdnc_url,biz_aply_url,detl_pg_url,fetched_at';
    const { response, text } = await safeFetch(fetcher, supabaseUrl('kstartup_announcements', `select=${columns}&order=fetched_at.desc&limit=${limit}`), { headers: supabaseHeaders(), redirect: 'error' });
    assertOk(response, text, 'Supabase');
    return { announcements: jsonOrError(text, 'Supabase') };
  });

  const githubRequest = async (path: string, query = '') => {
    const repository = required(env, 'GITHUB_REPOSITORY');
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('GITHUB_REPOSITORY must use owner/repository format.');
    const url = new URL(`/repos/${repository}${path}${query}`, 'https://api.github.com');
    const { response, text } = await safeFetch(fetcher, url, { headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${required(env, 'GITHUB_TOKEN')}`, 'x-github-api-version': '2022-11-28', 'user-agent': 'stargate-mcp' }, redirect: 'error' });
    assertOk(response, text, 'GitHub');
    return jsonOrError(text, 'GitHub');
  };

  register('list_workflow_runs', 'List workflow runs', 'Lists recent GitHub Actions workflow runs for the configured repository.', workflowRunsInput, async ({ limit, status }: z.infer<typeof workflowRunsInput>) => {
    const query = new URLSearchParams({ per_page: String(limit), ...(status ? { status } : {}) });
    return githubRequest('/actions/runs', `?${query}`);
  });
  register('get_workflow_run', 'Get workflow run', 'Gets one GitHub Actions workflow run by numeric ID.', runInput, async ({ run_id }: z.infer<typeof runInput>) => githubRequest(`/actions/runs/${run_id}`));
  register('list_workflows', 'List workflows', 'Lists GitHub Actions workflows for the configured repository.', emptyInput, async () => githubRequest('/actions/workflows', '?per_page=100'));

  const vercelRequest = async (path: string, query: Record<string, string> = {}) => {
    const params = new URLSearchParams(query);
    const url = new URL(`${path}?${params}`, 'https://api.vercel.com');
    const { response, text } = await safeFetch(fetcher, url, { headers: { authorization: `Bearer ${required(env, 'VERCEL_TOKEN')}` }, redirect: 'error' });
    assertOk(response, text, 'Vercel');
    return jsonOrError(text, 'Vercel');
  };

  register('list_deployments', 'List deployments', 'Lists recent Vercel deployments for the configured project.', deploymentsInput, async ({ limit }: z.infer<typeof deploymentsInput>) => vercelRequest('/v6/deployments', { projectId: required(env, 'VERCEL_PROJECT_ID'), limit: String(limit) }));
  register('get_deployment', 'Get deployment', 'Gets one Vercel deployment by deployment ID.', deploymentInput, async ({ deployment_id }: z.infer<typeof deploymentInput>) => vercelRequest(`/v13/deployments/${deployment_id}`));
  register('list_project_domains', 'List project domains', 'Lists domains assigned to the configured Vercel project.', emptyInput, async () => vercelRequest(`/v9/projects/${encodeURIComponent(required(env, 'VERCEL_PROJECT_ID'))}/domains`, { limit: '100' }));

  return server;
}

export function createStargateHandler(options: ServerOptions = {}) {
  const env = options.env ?? process.env;
  const mcp = createMcpHandler(() => buildServer({ env, ...(options.fetcher ? { fetcher: options.fetcher } : {}) }));
  return {
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);
      if (url.pathname !== '/api/mcp') return new Response('Not found', { status: 404 });
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
      const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
      if (contentType !== 'application/json') return Response.json({ error: 'Content-Type must be application/json' }, { status: 415 });
      const declaredLength = Number(request.headers.get('content-length') ?? 0);
      if (declaredLength > 128 * 1024) return Response.json({ error: 'Request body exceeds 128 KiB' }, { status: 413 });
      const host = request.headers.get('host');
      if (host && host.toLowerCase() !== url.host.toLowerCase()) return Response.json({ error: 'Host header mismatch' }, { status: 403 });
      const origin = request.headers.get('origin');
      if (origin) {
        let siteOrigin: string;
        try {
          siteOrigin = new URL(required(env, 'SITE_BASE_URL')).origin;
        } catch (error) {
          return Response.json({ error: error instanceof Error ? error.message : 'Invalid SITE_BASE_URL' }, { status: 500 });
        }
        if (origin !== url.origin && origin !== siteOrigin) return Response.json({ error: 'Origin not allowed' }, { status: 403 });
      }
      if (!(await hasValidBearer(request, env.MCP_AUTH_TOKEN))) {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: { 'www-authenticate': 'Bearer realm="stargate-mcp"', 'cache-control': 'no-store' } });
      }
      const body = await request.arrayBuffer();
      if (body.byteLength > 128 * 1024) return Response.json({ error: 'Request body exceeds 128 KiB' }, { status: 413 });
      return mcp.fetch(new Request(request, { body }));
    },
    close: mcp.close,
  };
}

export { constantTimeEqual };
