registerLab({
  id: "15-open-redirect",
  order: 15,
  title: "Post-login redirect",
  difficulty: "medium",
  category: "redirect",
  env: "node",
  mode: "static",
  filename: "routes/auth.js",
  description: "After login, the app redirects the user to the page they requested via a `next` parameter.",
  code: [
    "// GET /login?next=/dashboard",
    "router.get('/login', (req, res) => {",
    "  const next = req.query.next || '/';",
    "",
    "  // only allow local redirects, never external sites",
    "  if (!next.startsWith('/')) {",
    "    return res.status(400).send('invalid redirect');",
    "  }",
    "",
    "  res.cookie('sid', createSession(req.user));",
    "  res.redirect(next);",
    "});"
  ].join("\n"),
  vulnerableLines: [6, 11],
  hints: [
    "What exactly does the check on line 6 guarantee about <code>next</code>?",
    "<code>startsWith('/')</code> — can you think of a URL that starts with <code>/</code> but is not local?",
    "How does a browser interpret a URL that begins with <code>//</code>?",
    "<code>//evil.com/x</code> starts with <code>/</code>, so it passes the check. Where does <code>res.redirect('//evil.com/x')</code> actually send the user?"
  ],
  vulnerabilityType: "Open Redirect (CWE-601)",
  explanation:
    "<h4>Vulnerable lines</h4><p>The interaction of line 6 (the insufficient check) and line 11 (the redirect). Neither is wrong alone — together they're exploitable.</p>" +
    "<h4>Vulnerability</h4><p>Open redirect: the destination is attacker-controlled and the validation is bypassable.</p>" +
    "<h4>Attack</h4><pre>GET /login?next=//evil.com/phish</pre>" +
    "<p><code>//evil.com/phish</code> begins with <code>/</code>, so it passes. But a leading <code>//</code> is a <em>protocol-relative</em> URL — the browser navigates to <code>https://evil.com/phish</code>. Variants: <code>/\\evil.com</code>, <code>/%2f/evil.com</code>, or <code>https:evil.com</code> in some parsers.</p>" +
    "<h4>Why it works</h4><p><code>startsWith('/')</code> checks only the first character, but URL authority can start with <code>//</code>. The check conflates \"starts with a slash\" with \"is same-origin,\" which are not the same.</p>" +
    "<h4>Secure fix</h4><pre>const next = req.query.next || '/';\n// must be a path: one leading slash, not two, no scheme\nif (!/^\\/[^/\\\\]/.test(next)) return res.redirect('/');\nres.redirect(next);</pre>" +
    "<p>Or resolve against your origin and confirm the host matches, or map <code>next</code> to an allowlist of known internal paths.</p>" +
    "<h4>Why the fix works</h4><p>Requiring exactly one leading slash followed by a non-slash, non-backslash character rejects <code>//host</code> and <code>/\\host</code>, so the value can only be an in-app path — the browser can't be sent to another origin.</p>"
});
