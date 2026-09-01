registerLab({
  id: "18-jwt-verify-safe",
  order: 18,
  title: "Bearer token authentication",
  difficulty: "medium",
  category: "auth",
  env: "node",
  mode: "static",
  safe: true,
  filename: "middleware/auth.js",
  description: "Express middleware that authenticates requests using a signed JWT.",
  code: [
    "const jwt = require('jsonwebtoken');",
    "const SECRET = process.env.JWT_SECRET;",
    "",
    "function authenticate(req, res, next) {",
    "  const header = req.headers.authorization || '';",
    "  const token = header.replace(/^Bearer /, '');",
    "  try {",
    "    const claims = jwt.verify(token, SECRET, {",
    "      algorithms: ['HS256'],",
    "      issuer: 'api.example.com',",
    "      audience: 'example-web'",
    "    });",
    "    req.user = { id: claims.sub, role: claims.role };",
    "    next();",
    "  } catch (e) {",
    "    return res.status(401).send('unauthorized');",
    "  }",
    "}"
  ].join("\n"),
  vulnerableLines: [],
  hints: [
    "Trace how the token is validated. Is this <code>decode</code> (no signature check) or <code>verify</code>?",
    "<code>verify</code> checks the signature. Is the algorithm constrained here? What does pinning <code>HS256</code> prevent?",
    "Are issuer and audience validated? What confused-deputy attacks do those checks stop?",
    "You may be tempted to flag <code>claims.role</code>. But the token is signature-verified — can a client change <code>role</code> without knowing the secret?"
  ],
  vulnerabilityType: "None — correct JWT verification (secure)",
  explanation:
    "<h4>Verdict: secure</h4><p>No exploitable flaw. The right answer is <b>Mark as secure</b>.</p>" +
    "<h4>Why it's safe</h4><p>It uses <code>jwt.verify</code> (not <code>decode</code>), so the signature is actually checked. It <em>pins</em> <code>algorithms: ['HS256']</code>, which blocks the <code>alg:none</code> bypass and RS256→HS256 key-confusion. It validates <code>issuer</code> and <code>audience</code>, preventing tokens minted for a different service from being accepted. Verification failures are caught and turned into 401s.</p>" +
    "<h4>What you might have wrongly flagged</h4><p><em>\"It trusts <code>claims.role</code>!\"</em> — but the claims come from a signature-verified token, so a client cannot alter <code>role</code> without <code>JWT_SECRET</code>. <em>\"The Bearer regex is sloppy\"</em> — a malformed header just yields a token that fails verification. Neither is exploitable.</p>" +
    "<h4>How to be sure</h4><p>Compare against the real bugs: <code>jwt.decode</code> instead of verify, a missing <code>algorithms</code> option, or no issuer/audience checks. None of those are present. When code does the right things and you can't construct a concrete forgery, call it secure — and be able to say <em>why</em>.</p>"
});
