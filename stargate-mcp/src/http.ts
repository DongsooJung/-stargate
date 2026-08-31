const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_BYTES = 512 * 1024;

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
  maxBytes?: number;
}

export async function safeFetch(
  fetcher: typeof fetch,
  url: URL | string,
  options: SafeFetchOptions = {},
): Promise<{ response: Response; text: string }> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, maxBytes = DEFAULT_MAX_BYTES, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, { ...init, signal: controller.signal });
    if (init.method?.toUpperCase() === 'HEAD') return { response, text: '' };
    const declared = Number(response.headers.get('content-length') ?? 0);
    if (declared > maxBytes) {
      throw new UpstreamError(`Upstream response exceeded the ${maxBytes}-byte safety limit.`, response.status);
    }

    if (response.body === null) return { response, text: '' };
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new UpstreamError(`Upstream response exceeded the ${maxBytes}-byte safety limit.`, response.status);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { response, text: new TextDecoder().decode(bytes) };
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw new UpstreamError(`Upstream request timed out after ${timeoutMs} ms. Check provider availability and network egress.`);
    }
    const reason = error instanceof Error ? error.message : 'unknown network failure';
    throw new UpstreamError(`Upstream request failed: ${reason}. Check the provider URL, credentials, and egress.`);
  } finally {
    clearTimeout(timer);
  }
}

export function parseJson(text: string, provider: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new UpstreamError(`${provider} returned invalid JSON. Verify the endpoint and provider status.`);
  }
}
