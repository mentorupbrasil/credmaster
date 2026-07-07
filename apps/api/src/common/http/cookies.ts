import type { CookieOptions, Response } from 'express';

/** Compatível com Express (res.cookie) e Next.js API routes (Set-Cookie header). */
export function setCookie(
  res: Response,
  name: string,
  value: string,
  options: CookieOptions,
): void {
  if (typeof res.cookie === 'function') {
    res.cookie(name, value, options);
    return;
  }

  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.floor(Number(options.maxAge) / 1000)}`);
  }
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) {
    const sameSite =
      typeof options.sameSite === 'boolean'
        ? options.sameSite
          ? 'Strict'
          : 'Lax'
        : options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1);
    parts.push(`SameSite=${sameSite}`);
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearCookie(res: Response, name: string, options: CookieOptions): void {
  if (typeof res.clearCookie === 'function') {
    res.clearCookie(name, options);
    return;
  }

  setCookie(res, name, '', {
    ...options,
    maxAge: 0,
    expires: new Date(0),
  });
}
