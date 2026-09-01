/* Curriculum metadata is deliberately separate from the lab answer keys.
   Challenge mode can show neutral titles without loading vulnerability labels. */
window.SECURITY_PATHS = [
  {
    id: "web-foundations",
    order: 1,
    title: "Web Foundations",
    eyebrow: "PATH 01",
    description: "HTTP, browser trust boundaries, input handling and the reviewer mindset.",
    color: "blue"
  },
  {
    id: "web-injection",
    order: 2,
    title: "Injection & Data Flow",
    eyebrow: "PATH 02",
    description: "Trace untrusted data into SQL, shells, templates, paths and powerful interpreters.",
    color: "orange"
  },
  {
    id: "web-auth",
    order: 3,
    title: "Identity, Sessions & Access",
    eyebrow: "PATH 03",
    description: "Authentication, authorization, multi-tenant boundaries, JWT and session state.",
    color: "purple"
  },
  {
    id: "web-server",
    order: 4,
    title: "Server-side Boundaries",
    eyebrow: "PATH 04",
    description: "SSRF, files, archives, URL parsing, deserialization and server-side state.",
    color: "green"
  },
  {
    id: "web-browser",
    order: 5,
    title: "Browser Exploitation",
    eyebrow: "PATH 05",
    description: "XSS, CORS, CSRF, postMessage and browser-enforced security controls.",
    color: "cyan"
  },
  {
    id: "web-logic",
    order: 6,
    title: "Business Logic & Concurrency",
    eyebrow: "PATH 06",
    description: "Economic invariants, workflow abuse, race conditions and resource exhaustion.",
    color: "red"
  },
  {
    id: "web-advanced",
    order: 7,
    title: "Advanced Web Research",
    eyebrow: "PATH 07",
    description: "Parser differentials, chained flaws, patch review, CVE reconstruction and mystery labs.",
    color: "gold"
  }
];

window.LAB_CURRICULUM = {
  "01-reflected-xss": { track: "web-browser", mysteryTitle: "Personalized greeting", skills: ["source-to-sink", "browser-context"], estimatedTime: 10 },
  "02-client-secret": { track: "web-foundations", mysteryTitle: "Dashboard configuration", skills: ["trust-boundary", "secret-handling"], estimatedTime: 8 },
  "03-regex-validation-bypass": { track: "web-foundations", mysteryTitle: "Username policy", skills: ["validation", "negative-testing"], estimatedTime: 12 },
  "04-path-traversal": { track: "web-server", mysteryTitle: "Document download", skills: ["path-normalization", "containment"], estimatedTime: 15 },
  "05-nosql-injection": { track: "web-injection", mysteryTitle: "Account sign-in", skills: ["type-confusion", "query-shape"], estimatedTime: 18 },
  "06-command-injection": { track: "web-injection", mysteryTitle: "Network diagnostics", skills: ["shell-boundary", "payload-design"], estimatedTime: 15 },
  "07-jwt-alg-none": { track: "web-auth", mysteryTitle: "Bearer-token gate", skills: ["authentication", "token-verification"], estimatedTime: 12 },
  "08-mass-assignment": { track: "web-auth", mysteryTitle: "Profile update", skills: ["object-boundary", "field-authorization"], estimatedTime: 15 },
  "09-race-condition": { track: "web-logic", mysteryTitle: "Coupon redemption", skills: ["concurrency", "atomicity"], estimatedTime: 20 },
  "10-prototype-pollution": { track: "web-server", mysteryTitle: "Configuration merge", skills: ["prototype-chain", "gadget-thinking"], estimatedTime: 25 },
  "11-ssrf-allowlist-bypass": { track: "web-server", mysteryTitle: "Image proxy", skills: ["url-parsing", "ssrf"], estimatedTime: 20 },
  "12-redos": { track: "web-logic", mysteryTitle: "Tag validation", skills: ["complexity", "resource-exhaustion"], estimatedTime: 20 },
  "13-sql-injection": { track: "web-injection", mysteryTitle: "User search", skills: ["query-boundary", "sql"], estimatedTime: 10 },
  "14-parameterized-safe": { track: "web-injection", mysteryTitle: "Product lookup", skills: ["secure-review", "parameterization"], estimatedTime: 8 },
  "15-open-redirect": { track: "web-browser", mysteryTitle: "Post-login navigation", skills: ["url-parsing", "redirects"], estimatedTime: 15 },
  "16-ssrf-ip-blocklist": { track: "web-server", mysteryTitle: "Link preview", skills: ["dns", "ip-ranges", "ssrf"], estimatedTime: 25 },
  "17-idor-ownership": { track: "web-auth", mysteryTitle: "Invoice retrieval", skills: ["object-authorization", "multi-tenant"], estimatedTime: 15 },
  "18-jwt-verify-safe": { track: "web-auth", mysteryTitle: "Token authentication", skills: ["secure-review", "jwt"], estimatedTime: 10 },
  "19-middleware-ordering": { track: "web-auth", mysteryTitle: "Admin API routing", skills: ["framework-semantics", "function-authorization"], estimatedTime: 20 },
  "20-argument-injection": { track: "web-advanced", mysteryTitle: "Repository cloning", skills: ["argv", "option-injection"], estimatedTime: 30 },
  "21-zip-slip": { track: "web-server", mysteryTitle: "Archive extraction", skills: ["path-containment", "file-write"], estimatedTime: 25 },
  "22-cors-reflect": { track: "web-browser", mysteryTitle: "Cross-origin API policy", skills: ["browser-policy", "credentials"], estimatedTime: 18 },
  "23-negative-quantity": { track: "web-logic", mysteryTitle: "Cart checkout", skills: ["business-invariant", "numeric-input"], estimatedTime: 15 },
  "24-jwt-kid-traversal": { track: "web-advanced", mysteryTitle: "Multi-key token verification", skills: ["trust-anchor", "path-containment", "preconditions"], estimatedTime: 30 },
  "25-stored-xss": { track: "web-browser", mysteryTitle: "Community comments", skills: ["stored-xss", "browser-sinks", "impact-proof"], estimatedTime: 25 },
  "26-reset-poisoning": { track: "web-auth", mysteryTitle: "Forgot-password email", skills: ["host-header", "password-reset", "preconditions"], estimatedTime: 30 },
  "27-live-bola": { track: "web-auth", mysteryTitle: "Invoice API", skills: ["object-authorization", "id-enumeration", "negative-testing"], estimatedTime: 20 },
  "28-mime-upload": { track: "web-server", mysteryTitle: "Profile image upload", skills: ["file-upload", "content-type", "active-content"], estimatedTime: 30 },
  "29-live-ssrf": { track: "web-server", mysteryTitle: "Remote link preview", skills: ["ssrf", "ip-representation", "egress-policy"], estimatedTime: 35 },
  "30-live-ssti": { track: "web-injection", mysteryTitle: "Email template preview", skills: ["ssti", "fingerprinting", "impact-escalation"], estimatedTime: 35 },
  "31-oauth-linking": { track: "web-advanced", mysteryTitle: "Connect an external identity", skills: ["oauth", "state-binding", "account-linking"], estimatedTime: 45 },
  "32-excessive-data": { track: "web-foundations", mysteryTitle: "Profile bootstrap API", skills: ["api-response", "data-minimization", "schema-review"], estimatedTime: 15 },
  "33-live-race": { track: "web-logic", mysteryTitle: "Single-use coupon", skills: ["concurrency", "atomicity", "burst-testing"], estimatedTime: 35 },
  "34-safe-ownership": { track: "web-auth", mysteryTitle: "Invoice API review II", skills: ["secure-review", "authorization-tests", "anti-false-positive"], estimatedTime: 20 }
};
