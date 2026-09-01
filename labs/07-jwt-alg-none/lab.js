registerLab({
  id: "07-jwt-alg-none",
  order: 7,
  title: "JWT claims trusted without verification",
  difficulty: "medium",
  category: "auth",
  env: "node",
  mode: "static",
  description: "An auth middleware reads the role claim from a JWT to gate an admin route.",
  code: [
    "const jwt = require('jsonwebtoken');",
    "const SECRET = process.env.JWT_SECRET;",
    "",
    "function verifyToken(token) {",
    "  // decode and trust the token's claims",
    "  const decoded = jwt.decode(token);",
    "  return decoded;",
    "}",
    "",
    "function requireAdmin(req, res, next) {",
    "  const token = req.headers.authorization.split(' ')[1];",
    "  const user = verifyToken(token);",
    "  if (user && user.role === 'admin') return next();",
    "  return res.status(403).send('forbidden');",
    "}"
  ].join("\n"),
  vulnerableLines: [6],
  hints: [
    "There's a subtle difference between two jsonwebtoken functions. Which one checks the signature?",
    "<code>jwt.decode()</code> only base64-decodes the token. It never validates the signature or algorithm.",
    "Because the signature is never checked, an attacker can forge any claims — including <code>role: 'admin'</code>."
  ],
  vulnerabilityType: "Broken Authentication — unverified JWT claims (CWE-345)",
  explanation:
    "<h4>Why it's vulnerable</h4>" +
    "<p><code>jwt.decode()</code> merely base64url-decodes the payload; it does <em>not</em> verify the signature or the algorithm. " +
    "The <code>SECRET</code> is imported but never used. So the server trusts whatever the client puts in the token.</p>" +
    "<h4>Exploit</h4>" +
    "<p>The attacker crafts any syntactically valid three-part JWT whose payload contains the desired claim. The signature bytes and declared algorithm are irrelevant because this code never verifies either:</p>" +
    "<pre>header:  { \"alg\": \"HS256\", \"typ\": \"JWT\" }\npayload: { \"sub\": \"attacker\", \"role\": \"admin\" }\ntoken:   base64url(header) + '.' + base64url(payload) + '.not-a-valid-signature'</pre>" +
    "<p><code>decode()</code> returns the attacker-controlled claims and the admin check passes. An <code>alg: none</code> token may also decode, but algorithm acceptance is not the root cause—the complete absence of verification is.</p>" +
    "<h4 class='badge-impact'>Impact</h4>" +
    "<p>Trivial privilege escalation to admin and full authentication bypass.</p>" +
    "<h4 class='badge-fix'>Fix</h4>" +
    "<p>Always <code>verify</code> with an explicit algorithm allowlist:</p>" +
    "<pre>const decoded = jwt.verify(token, SECRET, { algorithms: ['HS256'] });</pre>" +
    "<p>Pin the expected algorithm, validate issuer/audience/expiry as required by the application, and handle verification failure as a 401. Algorithm pinning also prevents separate algorithm-confusion classes; it does not repair code that only calls <code>decode</code>.</p>"
});
