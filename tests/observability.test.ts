import { describe, expect, it } from "vitest";
import { buildSafeRequestErrorEvent } from "../lib/observability";

describe("safe request error telemetry", () => {
  it("records useful request metadata without query strings or raw error text", () => {
    const event = buildSafeRequestErrorEvent({
      errorName: "TypeError",
      errorDigest: "abc123",
      method: "POST",
      pathname: "/api/campaign?access_token=secret",
      routePath: "/api/campaign",
      routeType: "route",
      routerKind: "App Router",
      renderSource: "server",
    });
    expect(event).toMatchObject({
      event: "request_error",
      errorName: "TypeError",
      errorDigest: "abc123",
      method: "POST",
      pathname: "/api/campaign",
      routePath: "/api/campaign",
    });
    expect(JSON.stringify(event)).not.toContain("secret");
    expect(JSON.stringify(event)).not.toContain("stack");
  });

  it("uses safe defaults for incomplete request metadata", () => {
    expect(buildSafeRequestErrorEvent({})).toEqual({
      event: "request_error",
      errorName: "Error",
      method: "UNKNOWN",
      pathname: "/",
      routePath: "unknown",
      routeType: "unknown",
      routerKind: "unknown",
    });
  });
});
