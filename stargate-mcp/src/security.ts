const encoder = new TextEncoder();

export async function constantTimeEqual(actual: string, expected: string): Promise<boolean> {
  const [actualHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(actual)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const left = new Uint8Array(actualHash);
  const right = new Uint8Array(expectedHash);
  let difference = actual.length ^ expected.length;
  for (let index = 0; index < left.length; index += 1) difference |= left[index]! ^ right[index]!;
  return difference === 0;
}

export async function hasValidBearer(request: Request, expected: string | undefined): Promise<boolean> {
  const authorization = request.headers.get('authorization') ?? '';
  const prefix = 'Bearer ';
  const supplied = authorization.startsWith(prefix) ? authorization.slice(prefix.length) : '';
  return Boolean(expected) && constantTimeEqual(supplied, expected!);
}

export function sameOriginUrl(baseValue: string, path = '/'): URL {
  let base: URL;
  try {
    base = new URL(baseValue);
  } catch {
    throw new Error('SITE_BASE_URL must be an absolute HTTP(S) URL.');
  }
  if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password) {
    throw new Error('SITE_BASE_URL must use HTTP(S) and must not contain credentials.');
  }
  let decodedPath = path;
  try {
    for (let pass = 0; pass < 3; pass += 1) decodedPath = decodeURIComponent(decodedPath);
  } catch {
    throw new Error('Asset path contains invalid percent encoding.');
  }
  const segments = decodedPath.replaceAll('\\', '/').split('/');
  if (!path.startsWith('/') || path.startsWith('//') || decodedPath.includes('\\') || segments.includes('..')) {
    throw new Error('Asset paths must be same-origin absolute paths beginning with one slash.');
  }
  const target = new URL(path, base);
  if (target.origin !== base.origin) throw new Error('Cross-origin and SSRF targets are blocked.');
  return target;
}

export function redact(value: unknown, secrets: Array<string | undefined>): unknown {
  const active = secrets.filter((secret): secret is string => Boolean(secret && secret.length >= 4));
  const scrub = (text: string) => active.reduce((result, secret) => result.split(secret).join('[REDACTED]'), text);
  if (typeof value === 'string') return scrub(value);
  if (Array.isArray(value)) return value.map((item) => redact(item, active));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        /token|secret|password|authorization|apikey/i.test(key) ? '[REDACTED]' : key,
        /token|secret|password|authorization|apikey/i.test(key) ? '[REDACTED]' : redact(item, active),
      ]),
    );
  }
  return value;
}
