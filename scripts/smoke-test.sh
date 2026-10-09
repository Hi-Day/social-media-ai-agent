#!/usr/bin/env bash
set -euo pipefail

port=3100
log_file=/tmp/socialos-next-start.log
body_file=/tmp/socialos-home.html
headers_file=/tmp/socialos-headers.txt

npm run start -- --hostname 127.0.0.1 --port "$port" >"$log_file" 2>&1 &
server_pid=$!
cleanup() {
  kill "$server_pid" 2>/dev/null || true
  wait "$server_pid" 2>/dev/null || true
}
trap cleanup EXIT

ready=false
for _ in $(seq 1 30); do
  if curl --silent --show-error --fail --max-time 2 "http://127.0.0.1:$port/" -o "$body_file"; then
    ready=true
    break
  fi
  if ! kill -0 "$server_pid" 2>/dev/null; then
    cat "$log_file"
    echo "Production server exited before becoming ready." >&2
    exit 1
  fi
  sleep 2
done

if [ "$ready" != true ]; then
  cat "$log_file"
  echo "Production server did not become ready within 60 seconds." >&2
  exit 1
fi

# Verify the public authentication entry point is served by the production build.
curl --silent --show-error --fail --max-time 5 "http://127.0.0.1:$port/login" -o /tmp/socialos-login.html
grep -qi "<html" /tmp/socialos-login.html

curl --silent --show-error --fail --head "http://127.0.0.1:$port/" >"$headers_file"
grep -iq '^x-content-type-options: nosniff' "$headers_file"
grep -iq '^x-frame-options: DENY' "$headers_file"
grep -iq "^referrer-policy: strict-origin-when-cross-origin" "$headers_file"
grep -iq "^content-security-policy: frame-ancestors 'none'; object-src 'none'; base-uri 'self'" "$headers_file"

echo "Production server smoke test passed: homepage and login route respond; baseline security headers are present."
