import type { NextRequest } from "next/server";
import { buildSafeRequestErrorEvent } from "@/lib/observability";

type RequestErrorContext = {
  routerKind: string;
  routePath: string;
  routeType: string;
  renderSource?: string;
  revalidateReason?: string;
};

/**
 * Next.js request-error hook. Keep this payload intentionally metadata-only:
 * never log raw error messages, stacks, request headers, query strings, or bodies.
 */
export function onRequestError(
  error: Error,
  request: NextRequest,
  context: RequestErrorContext,
) {
  const event = buildSafeRequestErrorEvent({
    errorName: error.name,
    errorDigest: "digest" in error && typeof error.digest === "string" ? error.digest : undefined,
    method: request.method,
    pathname: new URL(request.url).pathname,
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
    renderSource: context.renderSource,
    revalidateReason: context.revalidateReason,
  });

  console.error(JSON.stringify(event));
}
