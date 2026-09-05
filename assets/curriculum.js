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
  },
  {
    id: "our-next-job",
    order: 8,
    title: "Our Next Job",
    eyebrow: "CAREER TRACK",
    description: "AI-assisted AppSec ownership for a high-scale mobile-game backend: build, break, fix and defend.",
    color: "purple"
  },
  {
    id: "architecture-review",
    order: 9,
    title: "Architecture & Design Review",
    eyebrow: "SYSTEM THINKING",
    description: "Find security failures in distributed systems, trust boundaries and privileged workflows before code exists.",
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
  "34-safe-ownership": { track: "web-auth", mysteryTitle: "Invoice API review II", skills: ["secure-review", "authorization-tests", "anti-false-positive"], estimatedTime: 20 },
  "35-authoritative-pricing": { track: "our-next-job", mysteryTitle: "Store checkout", skills: ["server-authority", "economy-invariant", "code-review"], estimatedTime: 35 },
  "36-live-reward-replay": { track: "our-next-job", mysteryTitle: "Daily reward", skills: ["replay", "idempotency", "state-transition"], estimatedTime: 45 },
  "37-live-wallet-race": { track: "our-next-job", mysteryTitle: "Wallet transfer", skills: ["concurrency", "double-spend", "atomicity"], estimatedTime: 50 },
  "38-receipt-binding": { track: "our-next-job", mysteryTitle: "Purchase verification", skills: ["receipt-binding", "entitlements", "server-validation"], estimatedTime: 40 },
  "39-leaderboard-trust": { track: "our-next-job", mysteryTitle: "Score submission", skills: ["client-trust", "abuse-case", "telemetry"], estimatedTime: 35 },
  "40-economy-architecture": { track: "our-next-job", mysteryTitle: "Economy service design", skills: ["threat-model", "trust-boundary", "blast-radius"], estimatedTime: 50 },
  "41-rag-instruction-injection": { track: "our-next-job", mysteryTitle: "Knowledge-assisted reviewer", skills: ["rag", "prompt-injection", "data-provenance"], estimatedTime: 45 },
  "42-agent-confused-deputy": { track: "our-next-job", mysteryTitle: "Support automation", skills: ["agent-tools", "authorization", "least-privilege"], estimatedTime: 45 },
  "43-secure-agent-gateway": { track: "our-next-job", mysteryTitle: "Tool gateway review", skills: ["secure-review", "capability-design", "human-approval"], estimatedTime: 35 },
  "44-pipeline-fail-open": { track: "our-next-job", mysteryTitle: "Security review workflow", skills: ["automation", "fail-open", "delivery"], estimatedTime: 40 },
  "45-season-reward-pipeline": { track: "architecture-review", mysteryTitle: "Season rewards", skills: ["event-driven", "idempotency", "reconciliation"], estimatedTime: 45 },
  "46-guild-treasury": { track: "architecture-review", mysteryTitle: "Guild treasury", skills: ["tenant-isolation", "authorization", "cache-boundary"], estimatedTime: 50 },
  "47-payment-webhook": { track: "architecture-review", mysteryTitle: "Purchase events", skills: ["webhook-trust", "replay", "ordering"], estimatedTime: 45 },
  "48-remote-config": { track: "architecture-review", mysteryTitle: "Live configuration", skills: ["supply-chain", "signing", "rollback"], estimatedTime: 45 },
  "49-admin-control-plane": { track: "architecture-review", mysteryTitle: "Player support console", skills: ["control-plane", "blast-radius", "approvals"], estimatedTime: 50 },
  "50-multi-region-wallet": { track: "architecture-review", mysteryTitle: "Global wallet", skills: ["distributed-state", "consistency", "double-spend"], estimatedTime: 55 },
  "51-multitenant-rag": { track: "architecture-review", mysteryTitle: "Internal knowledge assistant", skills: ["rag", "tenant-isolation", "data-leakage"], estimatedTime: 50 },
  "52-agentic-incident-response": { track: "architecture-review", mysteryTitle: "Automated containment", skills: ["agent-security", "incident-response", "human-control"], estimatedTime: 55 },
  "53-secure-ledger-design": { track: "architecture-review", mysteryTitle: "Economy ledger review", skills: ["secure-design", "auditability", "anti-false-positive"], estimatedTime: 45 }
};
