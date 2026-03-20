/**
 * Next.js Compatibility Shims for Vite/Tauri mode
 *
 * Provides no-op or minimal implementations of Next.js APIs
 * so existing components compile without changes.
 *
 * These are only used when building with Vite (Tauri mode).
 * When running with Next.js dev server, the real implementations are used.
 */

// next/image → standard <img> tag
export function NextImage(props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) {
  const { fill, priority, ...rest } = props;
  return <img {...rest} />;
}

// next/link → standard <a> tag
export function NextLink(props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a {...props} />;
}

// next/navigation → no-op router
export function useRouter() {
  return {
    push: (path: string) => { window.location.href = path; },
    replace: (path: string) => { window.location.href = path; },
    back: () => { window.history.back(); },
    forward: () => { window.history.forward(); },
    refresh: () => { window.location.reload(); },
    prefetch: () => {},
  };
}

export function usePathname() {
  return window.location.pathname;
}

export function useSearchParams() {
  return new URLSearchParams(window.location.search);
}

// next/server → only used in API routes (not needed in Tauri)
export class NextRequest extends Request {}
export class NextResponse extends Response {
  static json(body: unknown, init?: ResponseInit) {
    return new Response(JSON.stringify(body), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  }
}
