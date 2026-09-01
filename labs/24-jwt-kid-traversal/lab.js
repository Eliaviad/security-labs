registerLab({
  id: "24-jwt-kid-traversal",
  order: 24,
  title: "Multi-key JWT verification",
  difficulty: "expert",
  category: "auth",
  env: "node",
  mode: "static",
  filename: "lib/verifyToken.js",
  description: "Tokens carry a `kid` (key id) header telling the server which public key to verify with.",
  code: [
    "const jwt = require('jsonwebtoken');",
    "const fs = require('fs');",
    "const path = require('path');",
    "",
    "// header.kid selects which key file to load for verification",
    "function verifyToken(token) {",
    "  const { header } = jwt.decode(token, { complete: true });",
    "  const keyPath = path.join('/etc/app/keys', header.kid);",
    "  const key = fs.readFileSync(keyPath);",
    "  return jwt.verify(token, key, { algorithms: ['RS256'] });",
    "}"
  ].join("\n"),
  vulnerableLines: [8, 9],
  hints: [
    "The <code>kid</code> selects the verification key. Where does <code>kid</code> come from, and is anything about the token trusted at this point?",
    "<code>header</code> is read via <code>jwt.decode</code> — that runs <em>before</em> any signature check. How trustworthy is its content?",
    "<code>kid</code> flows into <code>path.join('/etc/app/keys', kid)</code>. What if it contains enough <code>../</code> segments to escape that directory?",
    "If the attacker can point <code>kid</code> at a file whose contents they can predict or control, they choose the verification key — then sign a token with that same key and it verifies. What's missing is validating <code>kid</code> against a fixed set of key ids."
  ],
  vulnerabilityType: "JWT kid Path Traversal → key injection (CWE-22 + CWE-347)",
  explanation:
    "<h4>Vulnerable lines</h4><p>Line 8 builds a filesystem path from the attacker-controlled <code>kid</code>, and line 9 loads whatever that resolves to and trusts it as the verification key.</p>" +
    "<h4>Vulnerability</h4><p>Path traversal in the <code>kid</code> header leading to key confusion / signature bypass. The header is read <em>before</em> verification, so it is fully attacker-controlled.</p>" +
    "<h4>Attack</h4><p>Because the algorithm is pinned to <code>RS256</code>, the loaded file must be a real RSA public key whose <em>private</em> half the attacker holds. So the attacker needs <code>kid</code> to traverse to key material they control — typically a file some other endpoint let them write (an uploaded avatar, a cache entry, a seeded log). They place a PEM public key there, forge a token whose <code>kid</code> points at it, and sign it with the matching private key:</p>" +
    "<pre>// attacker first writes a PEM public key to a known path via some upload, then:\nkid = \"../../../var/www/uploads/av/1337.png\"   // their PEM (the extension is irrelevant)</pre>" +
    "<p><code>jwt.verify</code> then checks the forged token against the attacker's own public key and it passes, minting any claims (e.g. <code>role: 'admin'</code>).</p>" +
    "<p><b>What does <em>not</em> work:</b> using a leading slash does not replace the base in Node's <code>path.join</code>; traversal segments are needed. Traversing to <code>../../../proc/self/environ</code> also fails because those bytes are not a valid RSA public key. The target file is consumed as a verification key rather than returned, so this is key injection—not direct arbitrary file disclosure absent a separate oracle.</p>" +
    "<h4>Why it works</h4><p><code>jwt.decode</code> exposes the header without authenticating it, and <code>path.join</code> resolves <code>..</code>. Deriving a trust anchor (the key) from unauthenticated, traversable input inverts the whole security model.</p>" +
    "<h4>Secure fix</h4><pre>const KEYS = {              // fixed allowlist: kid -> key\n  '2024-rsa': fs.readFileSync('/etc/app/keys/2024-rsa.pem'),\n  '2025-rsa': fs.readFileSync('/etc/app/keys/2025-rsa.pem')\n};\nconst { header } = jwt.decode(token, { complete: true }) || {};\nconst key = KEYS[header && header.kid];\nif (!key) throw new Error('unknown kid');\nreturn jwt.verify(token, key, { algorithms: ['RS256'] });</pre>" +
    "<h4>Why the fix works</h4><p>Mapping <code>kid</code> through a fixed allowlist means the header can only ever select one of a handful of known-good keys — it can't reference the filesystem, so traversal and key injection are impossible. Unknown key ids are rejected outright.</p>"
});
