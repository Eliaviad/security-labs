registerLab({
  id: "26-reset-poisoning",
  order: 26,
  title: "Password reset host poisoning",
  mysteryTitle: "Forgot-password email",
  difficulty: "hard",
  category: "auth",
  env: "http",
  mode: "http",
  track: "web-auth",
  skills: ["host-header", "password-reset", "preconditions"],
  estimatedTime: 30,
  prerequisites: ["15-open-redirect"],
  filename: "routes/password-reset.js",
  description: "A reverse-proxied application constructs account-recovery links for email delivery.",
  code: [
    "app.post('/forgot-password', async (req, res) => {",
    "  const user = await Users.findByEmail(req.body.email);",
    "  if (user) {",
    "    const token = await ResetTokens.issue(user.id);",
    "    const host = req.get('x-forwarded-host') || req.get('host');",
    "    const link = `https://${host}/reset?token=${token}`;",
    "    await mailer.send(user.email, 'Reset password', link);",
    "  }",
    "  res.status(202).json({ message: 'If the account exists, an email was sent' });",
    "});"
  ].join("\n"),
  vulnerableLines: [5, 6],
  hints: [
    "The reset token may be random and still be exposed. Which other value controls where the email link sends the victim?",
    "Treat forwarded headers as input from the network unless a trusted proxy strips and rewrites them.",
    "Compare a normal request with one carrying a different <code>X-Forwarded-Host</code>. The public 202 response intentionally does not reveal the generated link.",
    "After sending the request, inspect the lab outbox for Alice. Prove that the secret reset token was placed in a URL whose authority is attacker-controlled."
  ],
  vulnerabilityType: "Password reset poisoning via untrusted Host header (CWE-346)",
  http: {
    basePath: "/lab-api/26-reset-poisoning",
    statusPath: "/__lab/status/26-reset-poisoning",
    resetPath: "/__lab/reset/26-reset-poisoning",
    goal: "Cause Alice's reset message to contain a tokenized link on a host not controlled by the application.",
    requests: [
      {
        name: "Request reset",
        method: "POST",
        path: "/lab-api/26-reset-poisoning/request",
        headers: "Content-Type: application/json\nX-Forwarded-Host: lab.local",
        body: "{\n  \"email\": \"alice@lab.local\"\n}"
      },
      {
        name: "Inspect outbox",
        method: "GET",
        path: "/lab-api/26-reset-poisoning/outbox?email=alice%40lab.local",
        headers: "",
        body: ""
      }
    ]
  },
  explanation:
    "<h4>Root cause</h4><p>Lines 5–6 turn a request header into the authority component of a security-sensitive URL. The token is strong, but it is delivered to an origin chosen by the request sender.</p>" +
    "<h4>Exploit chain</h4><p>An attacker submits a reset request for the victim while supplying a poisoned forwarded host. If the proxy passes it through, the victim receives a legitimate email whose link contains the reset token but points to the attacker. A click leaks the token in the request path; the attacker can then use it on the real reset endpoint.</p>" +
    "<h4>Preconditions</h4><p>The application must trust the header, the edge proxy must fail to overwrite it, and the email must be built from the affected value. The lab outbox makes the normally external email side effect observable without sending real mail.</p>" +
    "<h4>What is not proof</h4><p>A 202 response is expected for both existing and missing accounts and proves nothing. Merely changing <code>Host</code> in an environment whose reverse proxy overwrites it also does not establish exploitability. The evidence is the poisoned link itself.</p>" +
    "<h4>Secure fix</h4><pre>const PUBLIC_ORIGIN = new URL(process.env.PUBLIC_ORIGIN);\nconst link = new URL(`/reset?token=${encodeURIComponent(token)}`, PUBLIC_ORIGIN);</pre><p>Configure a canonical origin outside request data. At the edge, accept forwarded headers only from trusted proxies and reject unexpected hostnames.</p>" +
    "<h4>Regression tests</h4><p>Send requests with altered <code>Host</code>, <code>X-Forwarded-Host</code> and port values; every generated email must retain the configured HTTPS origin. Confirm the generic response still prevents account enumeration.</p>"
});
