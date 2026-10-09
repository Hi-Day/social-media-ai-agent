export type SafeRequestErrorInput = {
  errorName?: string;
  errorDigest?: string;
  method?: string;
  pathname?: string;
  routePath?: string;
  routeType?: string;
  routerKind?: string;
  renderSource?: string;
  revalidateReason?: string;
};

export type SafeRequestErrorEvent = {
  event: "request_error";
  errorName: string;
  errorDigest?: string;
  method: string;
  pathname: string;
  routePath: string;
  routeType: string;
  routerKind: string;
  renderSource?: string;
  revalidateReason?: string;
};

/** Build a structured event without raw exception messages, stacks, headers, or query strings. */
export function buildSafeRequestErrorEvent(input: SafeRequestErrorInput): SafeRequestErrorEvent {
  const pathname = input.pathname?.startsWith("/") ? input.pathname.split("?")[0] : "/";
  const event: SafeRequestErrorEvent = {
    event: "request_error",
    errorName: input.errorName || "Error",
    method: input.method || "UNKNOWN",
    pathname,
    routePath: input.routePath || "unknown",
    routeType: input.routeType || "unknown",
    routerKind: input.routerKind || "unknown",
  };

  if (input.errorDigest) event.errorDigest = input.errorDigest;
  if (input.renderSource) event.renderSource = input.renderSource;
  if (input.revalidateReason) event.revalidateReason = input.revalidateReason;
  return event;
}
