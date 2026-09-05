registerLab({
  id: "53-secure-ledger-design",
  order: 53,
  title: "Secure player-economy ledger design",
  mysteryTitle: "Economy ledger review",
  difficulty: "hard",
  category: "logic",
  env: "node",
  mode: "static",
  track: "architecture-review",
  safe: true,
  architecture: {
    context: "A proposed economy service must support purchases, rewards, support adjustments and incident reconstruction while preventing duplicate effects and direct balance mutation.",
    assets: ["Currency conservation", "Ledger integrity", "Command authorization", "Forensic reconstruction"],
    constraints: ["Horizontal workers", "Retryable callers", "Asynchronous downstream inventory", "Support actions require controlled exceptions"],
    questions: ["Are authority and idempotency enforced before mutation?", "Can balances be changed outside the ledger?", "Can every resulting entitlement be traced to one committed command?"]
  },
  filename: "design/secure-ledger.txt",
  description: "A candidate design uses verified command context, unique business keys, an append-only double-entry ledger and transactional event publication.",
  code: [
    "Gateway -> EconomyService: Command(id, verifiedActor, playerId, type, typedPayload)",
    "EconomyService policy: authorize actor + command type + target; load server-owned rules",
    "LedgerDB transaction: insert unique Command.id or return established result",
    "LedgerDB transaction: append balanced debit/credit entries; no UPDATE balance API",
    "LedgerDB transaction: insert OutboxEvent(commandId, effect) before commit",
    "OutboxWorker -> EventBus: publish with commandId; consumers insert unique inbox key",
    "Reconciler: compare commands, balanced entries, outbox delivery and entitlements",
    "Support commands: verified employee, ticket binding, bounded amount, approval and audit"
  ].join("\n"),
  vulnerableLines: [],
  hints: [
    "Do not invent a vulnerability because the exercise belongs to a security track. Evaluate the stated invariants.",
    "Identity, policy, idempotency, ledger mutation and event publication are all placed before or inside the transaction boundary.",
    "Consumers remain retryable because the command id becomes a durable inbox key.",
    "Mark secure for the described properties, then state what implementation evidence would still be required."
  ],
  vulnerabilityType: "Secure design — authoritative, idempotent and auditable economy state transition",
  explanation:
    "<h4>Verdict</h4><p>The design is sound for the reviewed authority, duplicate-effect, conservation and audit properties. Verified identity and server rules precede mutation; a unique command, balanced entries and outbox are committed together; consumers deduplicate the resulting effect.</p>" +
    "<h4>Why this is stronger than a balance table</h4><p>An append-only double-entry ledger makes currency creation visible and reconstructable. Removing a general balance-update API narrows the mutation surface, while reconciliation checks that committed economic intent matches external entitlements.</p>" +
    "<h4>Review limits</h4><p>A diagram is not implementation proof. Review database constraints, transaction isolation, canonical command serialization, policy adapters, outbox leasing, support approval and access to administrative database credentials.</p>" +
    "<h4>Validation</h4><p>Use duplicate and concurrent commands, worker crashes at every boundary, partial dependency failure, unauthorized actors, negative/boundary amounts, out-of-order events and reconciliation drills. A secure verdict should remain scoped to evidence actually observed.</p>"
});
