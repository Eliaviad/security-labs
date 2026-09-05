registerLab({
  id: "46-guild-treasury",
  order: 46,
  title: "Tenant isolation failure in a guild treasury",
  mysteryTitle: "Guild treasury",
  difficulty: "hard",
  category: "auth",
  env: "node",
  mode: "static",
  track: "architecture-review",
  architecture: {
    context: "Players belong to guilds that share a treasury. The service uses one database and one Redis cluster for all guilds, while guild membership changes frequently.",
    assets: ["Guild currency", "Membership and roles", "Withdrawal history", "Cross-guild confidentiality"],
    constraints: ["Shared infrastructure", "Low-latency balance reads", "Membership revocation must take effect quickly", "Support staff need audited exceptions"],
    questions: ["Where is tenant identity derived?", "Does every storage key include tenant scope?", "How do role changes invalidate cached authorization?"]
  },
  filename: "design/guild-treasury.txt",
  description: "A multi-tenant treasury authenticates players but loses guild scope in policy, cache and database access.",
  code: [
    "MobileClient -> Gateway: JWT(playerId)",
    "Gateway -> TreasuryAPI: POST /guilds/{body.guildId}/withdraw",
    "TreasuryAPI policy: allow if Membership.exists(playerId)",
    "TreasuryAPI -> Redis: GET treasury:{accountId}",
    "TreasuryAPI -> Database: UPDATE accounts SET balance = balance - amount WHERE id = accountId",
    "TreasuryAPI -> EventBus: TreasuryWithdrawn(playerId, guildId, accountId, amount)",
    "Support override: X-Support-Role=treasury-admin"
  ].join("\n"),
  vulnerableLines: [3, 4, 5, 7],
  hints: [
    "Membership in some guild is not authorization for the guild named in the request.",
    "Trace tenant scope through policy, cache key and database predicate rather than checking only the route.",
    "A globally unique account id may reduce accidental collision but does not enforce authorization.",
    "Support exceptions need verified identity and explicit policy, not a client-selectable role header."
  ],
  vulnerabilityType: "Cross-tenant authorization and namespace isolation failure",
  explanation:
    "<h4>Design failure</h4><p>The policy checks only that the player has any membership. Guild scope disappears from the cache key and database predicate, while a support role can be asserted through a header. Authentication is present but object and tenant authorization are not.</p>" +
    "<h4>Proposed design</h4><p>Derive player identity from verified auth context, resolve guild membership and role for the requested guild, and pass a typed tenant context through every layer. Include <code>guildId</code> in cache keys and database constraints or apply database row-level security. Mutations should use conditional predicates for guild, account and permitted role.</p>" +
    "<h4>Revocation and exceptions</h4><p>Use short authorization-cache lifetimes or versioned membership state. Support access should use workforce identity, scoped roles, a reason/ticket, step-up authentication and immutable audit rather than the public request contract.</p>" +
    "<h4>Validation</h4><p>Test two valid guilds with colliding local identifiers, recently removed members, role downgrade, cache reuse, batch endpoints, support access and every read/write variant.</p>"
});
