registerLab({
  id: "40-economy-architecture",
  order: 40,
  title: "Game-economy trust-boundary collapse",
  mysteryTitle: "Economy service design",
  difficulty: "hard",
  category: "logic",
  env: "node",
  mode: "static",
  track: "our-next-job",
  filename: "architecture/economy-flow.txt",
  description: "A proposed mobile-game architecture forwards client-selected identity and economic values into a privileged service.",
  build: {
    scenario: "Draw a small data-flow diagram for a mobile game's store, rewards, wallet, inventory and admin operations. Then convert assumptions into explicit trust boundaries and invariants.",
    requirements: ["Include mobile client, API, economy service, wallet database and event bus", "Show identity propagation", "Show purchase and reward commands", "Show an administrative adjustment path"],
    acceptance: ["Every data flow has a protocol and identity", "Sensitive assets are named", "Trust boundaries are visible", "At least five abuse cases are recorded"],
    prompt: "Create a concise Mermaid data-flow diagram for a high-scale mobile game with mobile client, API gateway, auth service, economy service, wallet DB, inventory worker, event bus and support admin portal. List assets, trust boundaries and five security invariants. Do not identify vulnerabilities in the reference design yet."
  },
  code: [
    "MobileClient -> API: POST /purchase { playerId, sku, unitPrice, qty }",
    "API -> AuthService: validate bearer token",
    "API -> EconomyService: forward body.playerId, sku, unitPrice, qty",
    "EconomyService -> WalletDB: debit(body.playerId, unitPrice * qty)",
    "EconomyService -> EventBus: publish ItemGranted after wallet write",
    "InventoryWorker -> InventoryDB: grant(event.playerId, event.sku)",
    "AdminPortal -> EconomyService: credit(playerId, amount, sharedStaticToken)",
    "EconomyService -> Logs: { playerId, action, result }"
  ].join("\n"),
  vulnerableLines: [3, 4, 7],
  hints: [
    "Authentication occurs, but trace whether the verified identity replaces or merely accompanies client-selected identity.",
    "Mark which service is authoritative for player identity, price and entitlement state.",
    "What is the blast radius of a reusable admin credential that reaches a direct credit capability?",
    "Also note consistency risk between wallet debit and asynchronous grant, but distinguish it from the primary authorization and authority failures."
  ],
  vulnerabilityType: "Architecture-level authority confusion and over-privileged administrative capability",
  explanation:
    "<h4>Primary findings</h4><p>Lines 3 and 4 propagate attacker-selected player identity and price into the privileged economy service instead of deriving identity from verified authentication context and price from the catalog. Line 7 exposes an unrestricted credit primitive protected by one reusable shared secret.</p>" +
    "<h4>Threat model</h4><p>The mobile client is outside the server trust boundary. The economy service should accept a narrow command containing verified actor context and product identifiers, then enforce price, balance, eligibility and idempotency itself. Administrative adjustments need individual identity, scoped roles, reason codes, approval thresholds and auditability.</p>" +
    "<h4>Additional risk</h4><p>Wallet debit and inventory grant span asynchronous components, so failures and duplicate events need an outbox, idempotent consumer and reconciliation. This is a separate availability/consistency threat rather than proof of the identity flaw.</p>" +
    "<h4>Validation</h4><p>Architecture tests should include forged player ids and prices, compromised worker credentials, duplicate/out-of-order events, admin-token theft, partial failure and forensic reconstruction of a disputed adjustment.</p>"
});
