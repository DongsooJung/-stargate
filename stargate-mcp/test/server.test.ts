import assert from 'node:assert/strict';
import test from 'node:test';
import { createStargateHandler, TOOL_NAMES } from '../src/server.js';

const env = {
  MCP_AUTH_TOKEN: 'test-auth-token-with-enough-entropy',
  SITE_BASE_URL: 'https://site.example',
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_ANON_KEY: 'supabase-test-key',
  GITHUB_TOKEN: 'github-test-token',
  GITHUB_REPOSITORY: 'owner/repository',
  VERCEL_TOKEN: 'vercel-test-token',
  VERCEL_PROJECT_ID: 'project-id',
};

function rpcRequest(body: unknown, token = env.MCP_AUTH_TOKEN): Request {
  return new Request('https://mcp.example/api/mcp', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      host: 'mcp.example',
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

interface RpcBody {
  result: {
    protocolVersion?: string;
    serverInfo?: { name?: string };
    tools?: Array<{ name: string }>;
    isError?: boolean;
    content?: Array<{ text: string }>;
  };
}

async function rpcJson(response: Response): Promise<RpcBody> {
  const text = await response.text();
  if (response.headers.get('content-type')?.includes('text/event-stream')) {
    const data = text.split(/\r?\n/).find((line) => line.startsWith('data:'));
    assert.ok(data, `Expected an SSE data line, received: ${text}`);
    return JSON.parse(data.slice(5).trim()) as RpcBody;
  }
  return JSON.parse(text) as RpcBody;
}

function mockFetch(input: RequestInfo | URL): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : input.toString());
  if (url.origin === 'https://site.example') {
    return Promise.resolve(new Response('<!doctype html><title>Stargate</title>', {
      status: 200,
      headers: { 'content-type': 'text/html', 'x-content-type-options': 'nosniff' },
    }));
  }
  if (url.hostname === 'api.github.com') {
    return Promise.resolve(Response.json({ message: 'Bad credentials' }, { status: 401 }));
  }
  return Promise.resolve(Response.json({}));
}

test('browser GET provides public Korean help without secrets or upstream calls', async () => {
  const handler = createStargateHandler({ env, fetcher: async () => { throw new Error('Public help must not call upstreams'); } });
  try {
    for (const path of ['/', '/api/mcp']) {
      const response = await handler.fetch(new Request(`https://mcp.example${path}`, { headers: { accept: 'text/html' } }));
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type') ?? '', /^text\/html/);
      const text = await response.text();
      assert.match(text, /연결 안내/);
      assert.match(text, /Streamable HTTP/);
      assert.match(text, /POST/);
      assert.match(text, /MCP_AUTH_TOKEN/);
      assert.match(text, /VERCEL_TOKEN/);
      for (const value of Object.values(env)) assert.ok(!text.includes(value), `Help exposed ${value}`);
    }
    const root = await handler.fetch(new Request('https://mcp.example/'));
    assert.match(root.headers.get('content-type') ?? '', /^text\/html/);
    const api = await handler.fetch(new Request('https://mcp.example/api/mcp', { headers: { accept: 'application/json' } }));
    assert.equal(api.status, 200);
    assert.equal((await api.json() as { method: string }).method, 'POST');
  } finally {
    await handler.close();
  }
});

test('explicit SSE GET retains 405 even when HTML or JSON are also accepted', async () => {
  const handler = createStargateHandler({ env });
  try {
    for (const path of ['/', '/api/mcp']) {
      for (const accept of ['text/event-stream', 'application/json, text/event-stream', 'text/html, Text/Event-Stream; charset=utf-8']) {
        const response = await handler.fetch(new Request(`https://mcp.example${path}`, { headers: { accept } }));
        assert.equal(response.status, 405);
        assert.equal(response.headers.get('allow'), 'POST');
        assert.doesNotMatch(response.headers.get('content-type') ?? '', /html|json/);
      }
    }
  } finally {
    await handler.close();
  }
});

test('HEAD returns the help headers with no body', async () => {
  const handler = createStargateHandler({ env });
  try {
    for (const path of ['/', '/api/mcp']) {
      const response = await handler.fetch(new Request(`https://mcp.example${path}`, { method: 'HEAD', headers: { accept: 'text/html' } }));
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type') ?? '', /^text\/html/);
      assert.equal(await response.text(), '');
    }
  } finally {
    await handler.close();
  }
});

test('public help still rejects untrusted origins and mismatched hosts', async () => {
  const handler = createStargateHandler({ env });
  try {
    for (const path of ['/', '/api/mcp']) {
      for (const headers of [{ origin: 'https://evil.example' }, { host: 'evil.example' }]) {
        const response = await handler.fetch(new Request(`https://mcp.example${path}`, { headers }));
        assert.equal(response.status, 403);
      }
    }
    const allowed = await handler.fetch(new Request('https://mcp.example/api/mcp', { headers: { origin: env.SITE_BASE_URL } }));
    assert.equal(allowed.status, 200);
  } finally {
    await handler.close();
  }
});

test('unknown paths and unsupported methods do not receive public help', async () => {
  const handler = createStargateHandler({ env });
  try {
    const missing = await handler.fetch(new Request('https://mcp.example/missing'));
    assert.equal(missing.status, 404);
    const unsupported = await handler.fetch(new Request('https://mcp.example/api/mcp', { method: 'DELETE' }));
    assert.equal(unsupported.status, 405);
  } finally {
    await handler.close();
  }
});

test('public help does not allow unauthenticated POST', async () => {
  const handler = createStargateHandler({ env });
  try {
    const request = rpcRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    request.headers.delete('authorization');
    const response = await handler.fetch(request);
    assert.equal(response.status, 401);
    assert.match(response.headers.get('www-authenticate') ?? '', /^Bearer/);
  } finally {
    await handler.close();
  }
});

test('rejects invalid authentication with HTTP 401', async () => {
  const handler = createStargateHandler({ env, fetcher: mockFetch });
  const request = rpcRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, 'wrong-token');
  const response = await handler.fetch(request);
  assert.equal(response.status, 401);
  assert.match(response.headers.get('www-authenticate') ?? '', /^Bearer/);
  await handler.close();
});

test('negotiates initialize and returns a protocolVersion', async () => {
  const handler = createStargateHandler({ env, fetcher: mockFetch });
  const response = await handler.fetch(rpcRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' },
    },
  }));
  assert.equal(response.status, 200);
  const body = await rpcJson(response);
  assert.equal(typeof body.result.protocolVersion, 'string');
  assert.equal(body.result.serverInfo?.name, 'stargate-mcp');
  await handler.close();
});

test('lists exactly the 12 required tools', async () => {
  const handler = createStargateHandler({ env, fetcher: mockFetch });
  const response = await handler.fetch(rpcRequest({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
  const body = await rpcJson(response);
  const tools = body.result.tools ?? [];
  const names = tools.map((tool) => tool.name);
  assert.deepEqual(names.sort(), [...TOOL_NAMES].sort());
  assert.equal(tools.length, 12);
  await handler.close();
});

test('rejects unknown strict tool input', async () => {
  const handler = createStargateHandler({ env, fetcher: mockFetch });
  const response = await handler.fetch(rpcRequest({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'site_health', arguments: { unexpected: true } },
  }));
  const body = await rpcJson(response);
  assert.equal(body.result.isError, true);
  assert.match(body.result.content?.[0]?.text ?? '', /validation|unrecognized|invalid/i);
  await handler.close();
});

test('site_health reports a mocked successful round trip', async () => {
  const handler = createStargateHandler({ env, fetcher: mockFetch });
  const response = await handler.fetch(rpcRequest({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: { name: 'site_health', arguments: { path: '/' } },
  }));
  const body = await rpcJson(response);
  assert.notEqual(body.result.isError, true);
  const payload = JSON.parse(body.result.content?.[0]?.text ?? '{}') as Record<string, unknown>;
  assert.equal(payload.ok, true);
  assert.equal(payload.status, 200);
  assert.equal(payload['상태코드'], 200);
  assert.equal(payload.url, 'https://site.example');
  assert.equal(typeof payload.responseTimeMs, 'number');
  await handler.close();
});

test('site_health returns isError for HTTP 503', async () => {
  const handler = createStargateHandler({
    env,
    fetcher: () => Promise.resolve(new Response('maintenance', { status: 503 })),
  });
  const response = await handler.fetch(rpcRequest({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'site_health', arguments: { path: '/' } } }));
  const body = await rpcJson(response);
  assert.equal(body.result.isError, true);
  assert.match(body.result.content?.[0]?.text ?? '', /HTTP 503/);
  await handler.close();
});

test('db_tables returns isError when Supabase rejects credentials', async () => {
  const handler = createStargateHandler({
    env,
    fetcher: () => Promise.resolve(Response.json({ message: 'Invalid API key' }, { status: 401 })),
  });
  const response = await handler.fetch(rpcRequest({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'db_tables', arguments: {} } }));
  const body = await rpcJson(response);
  assert.equal(body.result.isError, true);
  assert.match(body.result.content?.[0]?.text ?? '', /Supabase.*HTTP 401/);
  await handler.close();
});

test('rejects a cross-origin browser request with HTTP 403', async () => {
  const handler = createStargateHandler({ env, fetcher: mockFetch });
  const request = rpcRequest({ jsonrpc: '2.0', id: 8, method: 'tools/list' });
  request.headers.set('origin', 'https://evil.example');
  const response = await handler.fetch(request);
  assert.equal(response.status, 403);
  await handler.close();
});

test('provider failures return isError with actionable redacted details', async () => {
  const handler = createStargateHandler({ env, fetcher: mockFetch });
  const response = await handler.fetch(rpcRequest({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: { name: 'list_workflows', arguments: {} },
  }));
  const body = await rpcJson(response);
  assert.equal(body.result.isError, true);
  assert.match(body.result.content?.[0]?.text ?? '', /GitHub.*HTTP 401.*credentials/i);
  assert.doesNotMatch(body.result.content?.[0]?.text ?? '', /github-test-token/);
  await handler.close();
});

test('runs the exact Verify_MCP.ps1 T1-T7 JSON-RPC sequence', async () => {
  const gateFetch: typeof fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (url.origin === 'https://site.example') {
      return new Response('<!doctype html><title>Stargate</title>', { status: 200, headers: { 'content-type': 'text/html' } });
    }
    if (url.origin === 'https://project.supabase.co' && init?.method === 'HEAD') {
      return new Response(null, { status: 200, headers: { 'content-range': '0-0/1' } });
    }
    if (url.href.startsWith('https://api.github.com/repos/owner/repository/actions/runs')) {
      return Response.json({ total_count: 1, workflow_runs: [{ id: 101, status: 'completed', conclusion: 'success' }] });
    }
    if (url.href.startsWith('https://api.vercel.com/v6/deployments')) {
      return Response.json({ deployments: [{ uid: 'dpl_test', state: 'READY' }] });
    }
    return Response.json({ message: 'Unexpected mock request' }, { status: 500 });
  };
  const handler = createStargateHandler({ env, fetcher: gateFetch });
  const request = (payload: unknown, authenticated = true) => {
    const headers: Record<string, string> = {
      host: 'mcp.example',
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
    };
    if (authenticated) headers.authorization = `Bearer ${env.MCP_AUTH_TOKEN}`;
    return new Request('https://mcp.example/api/mcp', { method: 'POST', headers, body: JSON.stringify(payload) });
  };

  // T1: Invoke-Mcp -Method "tools/list" -NoAuth
  const t1 = await handler.fetch(request({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, false));
  assert.equal(t1.status, 401);

  // T2: the exact initialize payload emitted by Verify_MCP.ps1.
  const t2 = await rpcJson(await handler.fetch(request({
    jsonrpc: '2.0',
    id: 2,
    method: 'initialize',
    params: {
      protocolVersion: '2026-07-28',
      capabilities: {},
      clientInfo: { name: 'gate2-verifier', version: '1.0.0' },
    },
  })));
  assert.ok(t2.result.protocolVersion);

  // T3: Invoke-Mcp -Method "tools/list".
  const t3 = await rpcJson(await handler.fetch(request({ jsonrpc: '2.0', id: 3, method: 'tools/list' })));
  assert.equal(t3.result.tools?.length, 12);

  // T4-T7: exact names and arguments from the script's $calls array.
  const calls = [
    { id: 4, name: 'site_health', arguments: { path: '/' } },
    { id: 5, name: 'db_tables', arguments: {} },
    { id: 6, name: 'list_workflow_runs', arguments: { limit: 3 } },
    { id: 7, name: 'list_deployments', arguments: { limit: 3 } },
  ] as const;
  const results: RpcBody[] = [];
  for (const call of calls) {
    results.push(await rpcJson(await handler.fetch(request({
      jsonrpc: '2.0',
      id: call.id,
      method: 'tools/call',
      params: { name: call.name, arguments: call.arguments },
    }))));
  }
  assert.equal(results[0]?.result.isError, false);
  assert.match(results[1]?.result.content?.[0]?.text ?? '', /읽기/);
  assert.equal(results[2]?.result.isError, false);
  assert.equal(results[3]?.result.isError, false);
  await handler.close();
});
