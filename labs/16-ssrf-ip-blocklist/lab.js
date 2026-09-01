registerLab({
  id: "16-ssrf-ip-blocklist",
  order: 16,
  title: "Link preview fetcher",
  difficulty: "hard",
  category: "ssrf",
  env: "node",
  mode: "static",
  filename: "services/preview.js",
  description: "A link-preview service fetches a user-supplied URL server-side, blocking internal hosts.",
  code: [
    "const { fetch } = require('undici');",
    "const BLOCKED = ['127.0.0.1', 'localhost', '169.254.169.254'];",
    "",
    "// POST /api/link-preview  { url }",
    "async function preview(req, res) {",
    "  const target = new URL(req.body.url);",
    "",
    "  if (target.protocol !== 'http:' && target.protocol !== 'https:') {",
    "    return res.status(400).send('bad scheme');",
    "  }",
    "  if (BLOCKED.includes(target.hostname)) {",
    "    return res.status(400).send('blocked host');",
    "  }",
    "",
    "  const r = await fetch(target.href);",
    "  res.send(await r.text());",
    "}"
  ].join("\n"),
  vulnerableLines: [2, 11],
  hints: [
    "The scheme check is fine. Focus on the host check — is a hostname string the same thing as the IP the request ultimately reaches?",
    "How many different ways can you write the loopback address (127.0.0.1) as a URL host?",
    "Think <code>0.0.0.0</code> and <code>[::1]</code> — or a hostname you control that resolves to an internal IP. Are any of those in the blocklist?",
    "Even if you enumerated every loopback spelling, what about a DNS name <em>you</em> control that resolves to an internal IP (or flips after the check)?"
  ],
  vulnerabilityType: "SSRF via incomplete host validation (CWE-918)",
  explanation:
    "<h4>Vulnerable lines</h4><p>Line 2 (the denylist) together with line 11 (matching on the raw hostname string). The flaw is the approach, spread across both.</p>" +
    "<h4>Vulnerability</h4><p>Server-Side Request Forgery. A denylist of a few textual host spellings does not cover the address space it's trying to protect.</p>" +
    "<h4>Attack</h4><pre>{ \"url\": \"http://0.0.0.0:8080/admin\" }          // 0.0.0.0 == local host, not in list\n{ \"url\": \"http://[::1]/metadata\" }               // IPv6 loopback, not in list\n{ \"url\": \"http://169.254.169.254.nip.io/\" }      // DNS name resolving to the metadata IP</pre>" +
    "<p>None of these hostnames appear in <code>BLOCKED</code>, so the fetch proceeds to an internal target — cloud metadata (IAM credentials), internal admin panels, or other private services.</p>" +
    "<h4>Why it works</h4><p>The check compares the literal <code>hostname</code> string, but the same host has many representations, and DNS names can resolve to internal IPs (and can be rebound between the check and the fetch). A denylist enumerates the infinite set of \"bad\" — impossible to complete. Subtle point: <code>new URL()</code> normalizes IPv4 shorthands like <code>127.1</code> and the decimal <code>2130706433</code> back to <code>127.0.0.1</code>, so those happen to be caught here — proving the fragility, since whether a spelling is blocked depends on parser quirks rather than a real boundary.</p>" +
    "<h4>Secure fix</h4><p>Prefer an <em>allowlist</em> of destinations. If you must fetch arbitrary URLs: resolve DNS yourself, reject any address in private/loopback/link-local ranges (IPv4 and IPv6, including IPv4-mapped), pin the connection to that resolved IP to defeat rebinding, disable redirects to non-allowlisted hosts, and require http/https.</p>" +
    "<h4>Why the fix works</h4><p>Validating the <em>resolved IP</em> against range rules (not the textual host) covers every spelling at once, and pinning the socket to that IP removes the time-of-check/time-of-use gap that DNS rebinding abuses.</p>"
});
