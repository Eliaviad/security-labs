registerLab({
  id: "11-ssrf-allowlist-bypass",
  order: 11,
  title: "SSRF via a bypassable host allowlist",
  difficulty: "hard",
  category: "ssrf",
  env: "node",
  mode: "static",
  description: "An image proxy only wants to fetch from a trusted CDN, so it checks the URL prefix before fetching.",
  code: [
    "const { fetch } = require('undici');",
    "",
    "// POST /fetch-image  { url }  — proxy an external image",
    "async function fetchImage(req, res) {",
    "  const url = req.body.url;",
    "  // only allow images from our trusted CDN",
    "  if (!url.startsWith('https://cdn.trusted.com')) {",
    "    return res.status(400).send('untrusted host');",
    "  }",
    "  const upstream = await fetch(url);",
    "  res.send(await upstream.body);",
    "}"
  ].join("\n"),
  vulnerableLines: [7],
  hints: [
    "The allowlist matches on the raw URL STRING, not the parsed host. Is a string prefix the same as the hostname?",
    "Think about URL userinfo (<code>user@host</code>) and lookalike subdomains. What host does the browser/undici actually connect to?",
    "<code>https://cdn.trusted.com@169.254.169.254/</code> starts with the allowed prefix, but the real host is 169.254.169.254."
  ],
  vulnerabilityType: "Server-Side Request Forgery (SSRF) via weak URL validation",
  explanation:
    "<h4>Why it's vulnerable</h4>" +
    "<p>The check uses <code>String.startsWith</code> on the full URL instead of parsing it and comparing the <em>hostname</em>. " +
    "URL syntax lets an attacker keep the trusted string as a prefix while pointing the actual request somewhere else.</p>" +
    "<h4>Exploit</h4>" +
    "<p>Several bypasses all satisfy <code>startsWith('https://cdn.trusted.com')</code>:</p>" +
    "<pre>https://cdn.trusted.com@169.254.169.254/latest/meta-data/   (userinfo — real host is the IP)\nhttps://cdn.trusted.com.attacker.com/x                        (lookalike subdomain)\nhttps://cdn.trusted.com.attacker.com/#@cdn.trusted.com        (fragment tricks)</pre>" +
    "<p>The first reaches the cloud metadata endpoint (<code>169.254.169.254</code>) and can steal IAM credentials.</p>" +
    "<h4 class='badge-impact'>Impact</h4>" +
    "<p>Access to internal services, cloud metadata/credentials, port scanning of the private network, and pivoting — SSRF is a frequent critical finding.</p>" +
    "<h4 class='badge-fix'>Fix</h4>" +
    "<p>Parse the URL and compare the exact host against an allowlist; force https:</p>" +
    "<pre>const u = new URL(url);\nif (u.protocol !== 'https:' || u.hostname !== 'cdn.trusted.com')\n  return res.status(400).send('untrusted host');</pre>" +
    "<p>Then resolve DNS and block private/link-local ranges (to defeat DNS rebinding), disable redirects to non-allowlisted hosts, and prefer an egress proxy.</p>"
});
