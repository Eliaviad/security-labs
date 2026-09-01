registerLab({
  id: "29-live-ssrf",
  order: 29,
  title: "SSRF denylist bypass",
  mysteryTitle: "Remote link preview",
  difficulty: "hard",
  category: "ssrf",
  env: "http",
  mode: "http",
  track: "web-server",
  skills: ["ssrf", "ip-representation", "egress-policy"],
  estimatedTime: 35,
  prerequisites: ["16-ssrf-ip-blocklist"],
  filename: "services/preview.js",
  description: "A server-side link previewer blocks several sensitive host strings before fetching a URL.",
  code: [
    "async function preview(rawUrl) {",
    "  const target = new URL(rawUrl);",
    "  const blocked = ['127.0.0.1', 'localhost', '169.254.169.254'];",
    "  if (blocked.includes(target.hostname)) {",
    "    throw new Error('blocked host');",
    "  }",
    "  const response = await fetch(target.href);",
    "  return await response.text();",
    "}"
  ].join("\n"),
  vulnerableLines: [3, 4, 7],
  hints: [
    "The policy compares host strings, while the network connects to addresses. Are those representations one-to-one?",
    "Establish that the obvious loopback form is blocked, then look for another hostname or IP notation that reaches the same trust zone.",
    "Loopback is a range and hosts can resolve or normalize in multiple ways. The blocklist also says nothing about redirects or DNS rebinding in a real fetcher.",
    "In this deterministic lab, the internal metadata mock recognizes <code>0.0.0.0</code>, IPv6 loopback, and <code>metadata.internal</code>. No request is sent to the real network."
  ],
  vulnerabilityType: "Server-Side Request Forgery via incomplete denylist (CWE-918)",
  http: {
    basePath: "/lab-api/29-live-ssrf",
    statusPath: "/__lab/status/29-live-ssrf",
    resetPath: "/__lab/reset/29-live-ssrf",
    goal: "Reach the simulated internal metadata service despite the hostname denylist and obtain its credential marker.",
    requests: [
      {
        name: "Public preview",
        method: "POST",
        path: "/lab-api/29-live-ssrf/preview",
        headers: "Content-Type: application/json",
        body: "{\n  \"url\": \"https://example.test/article\"\n}"
      },
      {
        name: "Blocked loopback",
        method: "POST",
        path: "/lab-api/29-live-ssrf/preview",
        headers: "Content-Type: application/json",
        body: "{\n  \"url\": \"http://127.0.0.1/admin\"\n}"
      }
    ]
  },
  explanation:
    "<h4>Root cause</h4><p>A short string denylist is used as network authorization. It misses equivalent addresses, DNS answers, redirects and whole private/link-local ranges. Validation occurs before the connection, but the resolved destination is what matters.</p>" +
    "<h4>Proof strategy</h4><p>Use the blocked request as a negative control, change only the URL representation, and require a server-only credential marker in the response. A generic 200 preview is not enough.</p>" +
    "<h4>Safety model</h4><p>The local lab does not perform outbound HTTP at all. It deterministically simulates public and internal targets, which preserves the parsing and policy lesson without turning the platform into an SSRF relay or probing the learner's machine/cloud metadata.</p>" +
    "<h4>Secure fix</h4><p>Prefer a strict allowlist of schemes and destination origins. Otherwise resolve DNS, classify every returned address with a vetted IP library, reject loopback/private/link-local/multicast/reserved ranges for both IPv4 and IPv6, connect to the validated address, verify redirects at every hop, and enforce egress firewall policy. Re-check after DNS changes and avoid forwarding sensitive headers.</p>" +
    "<h4>Regression tests</h4><p>Cover alternative numeric notations supported by the runtime, IPv4-mapped IPv6, IPv6 loopback, private/link-local ranges, userinfo tricks, redirects to internal targets, multi-answer DNS and rebinding. Keep a legitimate public allowlisted URL as the positive control.</p>"
});
