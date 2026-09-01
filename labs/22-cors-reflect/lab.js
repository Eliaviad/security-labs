registerLab({
  id: "22-cors-reflect",
  order: 22,
  title: "API CORS handler",
  difficulty: "medium",
  category: "cors",
  env: "node",
  mode: "static",
  filename: "middleware/cors.js",
  description: "Global CORS handling for a cookie-authenticated API.",
  code: [
    "// applied to every /api route; session cookie is SameSite=None; Secure",
    "app.use((req, res, next) => {",
    "  const origin = req.headers.origin;",
    "  if (origin) {",
    "    res.setHeader('Access-Control-Allow-Origin', origin);",
    "    res.setHeader('Access-Control-Allow-Credentials', 'true');",
    "  }",
    "  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');",
    "  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');",
    "  next();",
    "});"
  ].join("\n"),
  vulnerableLines: [5, 6],
  hints: [
    "Which origins are permitted to make credentialed cross-origin requests to this API?",
    "Line 5 echoes back whatever <code>Origin</code> the request sent. What does line 6 add on top of that?",
    "The API authenticates with cookies. If any origin is allowed <em>with credentials</em>, what can a malicious site do to a logged-in victim?",
    "<code>Allow-Origin: &lt;reflected&gt;</code> + <code>Allow-Credentials: true</code> lets evil.com read authenticated responses in the victim's session."
  ],
  vulnerabilityType: "CORS Misconfiguration (CWE-942)",
  explanation:
    "<h4>Vulnerable lines</h4><p>Line 5 reflects the request's <code>Origin</code>, and line 6 sets <code>Allow-Credentials: true</code>. Together they permit credentialed reads from <em>any</em> origin.</p>" +
    "<h4>Vulnerability</h4><p>Overly permissive CORS: dynamically reflecting the Origin while allowing credentials effectively trusts every website.</p>" +
    "<h4>Attack</h4><p>A victim who is logged in visits <code>evil.com</code>, which runs:</p>" +
    "<pre>fetch('https://api.example.com/api/me', { credentials: 'include' })\n  .then(r => r.text()).then(steal);</pre>" +
    "<p>Because the cookie is explicitly <code>SameSite=None; Secure</code>, the browser can attach it. The API responds with <code>Access-Control-Allow-Origin: https://evil.com</code> and <code>Allow-Credentials: true</code>, so evil.com's JavaScript may <em>read</em> the authenticated response and exfiltrate its data.</p>" +
    "<h4>Why it works</h4><p>Reflecting the Origin is equivalent to <code>Allow-Origin: *</code>, except the wildcard is <em>illegal</em> with credentials for exactly this reason. Reflection sneaks past that restriction while keeping the danger.</p>" +
    "<p><b>Cookie boundary:</b> CORS does not override or “defeat” <code>SameSite</code>; they are separate browser gates. The stated <code>SameSite=None; Secure</code> cookie satisfies the cookie-sending gate, while the reflected CORS headers satisfy the response-reading gate. <code>Lax</code> normally blocks cookies on a cross-site fetch, although same-site but cross-origin subdomain scenarios require separate analysis.</p>" +
    "<p><b>CORS versus CSRF:</b> this finding proves cross-origin response disclosure. Some state-changing requests can be sent cross-origin even when their response is unreadable, while non-simple requests may be stopped by preflight. CSRF risk therefore also depends on method, content type, preflight handling and anti-CSRF defenses; it should not be inferred solely from this readable-response proof.</p>" +
    "<h4>Secure fix</h4><pre>const ALLOWED = new Set(['https://app.example.com']);\nconst origin = req.headers.origin;\nif (origin && ALLOWED.has(origin)) {\n  res.setHeader('Access-Control-Allow-Origin', origin);\n  res.setHeader('Vary', 'Origin');\n  res.setHeader('Access-Control-Allow-Credentials', 'true');\n}</pre>" +
    "<h4>Why the fix works</h4><p>Only origins on an explicit allowlist ever receive permissive CORS headers, so an attacker's site is never authorized to read credentialed responses. <code>Vary: Origin</code> keeps caches from serving one origin's headers to another.</p>"
});
