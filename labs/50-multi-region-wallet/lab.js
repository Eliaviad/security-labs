registerLab({
  id: "50-multi-region-wallet",
  order: 50,
  title: "Active-active wallet permits cross-region double spend",
  mysteryTitle: "Global wallet",
  difficulty: "expert",
  category: "logic",
  env: "node",
  mode: "static",
  track: "architecture-review",
  architecture: {
    context: "Players connect to the nearest region. Product wants wallet operations to remain available during a regional partition, with asynchronous replication between regional databases.",
    assets: ["Currency conservation", "Non-negative player balance", "Transfer history", "Regional availability"],
    constraints: ["Active-active regions", "Replication lag up to 10 seconds", "Players may reconnect through another region", "Debits must feel responsive"],
    questions: ["Which invariant conflicts with partition-time availability?", "Where is the single serialization point for a wallet?", "How are retries and regional failover distinguished from new commands?"]
  },
  filename: "design/global-wallet.txt",
  description: "Two regions authorize spending from independently stale replicas and reconcile balances using last-write-wins.",
  code: [
    "Client -> RegionA or RegionB: POST /wallet/spend(commandId, amount)",
    "RegionA WalletDB: balance[alice] = 100",
    "RegionB WalletDB: balance[alice] = 100",
    "Each region: if localBalance >= amount, commit local debit",
    "RegionA: accept spend(cmd-A, 80) during partition",
    "RegionB: accept spend(cmd-B, 80) during partition",
    "Replication recovery: resolve balance conflict by latest timestamp",
    "Entitlement services retain both successful purchase grants"
  ].join("\n"),
  vulnerableLines: [4, 7, 8],
  hints: [
    "Both commands are individually valid against their local snapshots, but evaluate the global invariant.",
    "Last-write-wins can choose a final balance; it cannot undo an entitlement already granted in both regions.",
    "Decide whether the product prefers debit correctness or debit availability during a partition.",
    "Serialize per-wallet commands through a home region, strongly consistent ledger or bounded reservation scheme."
  ],
  vulnerabilityType: "Distributed double spend caused by stale authorization and lossy conflict resolution",
  explanation:
    "<h4>Design failure</h4><p>Each region independently authorizes against a stale balance, so two valid local decisions violate the global non-negative-balance and conservation invariants. Last-write-wins discards one state update but cannot retract both external grants.</p>" +
    "<h4>Trade-off</h4><p>During a network partition, unrestricted debit availability conflicts with strict wallet consistency. The design must state which property wins rather than hiding the choice behind replication.</p>" +
    "<h4>Options</h4><p>Route each wallet to a home region or strongly consistent partition; use a globally serialized append-only ledger; or pre-allocate bounded regional spending rights so the sum of reservations never exceeds funds. Stable command ids prevent retry duplication but do not merge two genuinely different spends.</p>" +
    "<h4>Validation</h4><p>Partition regions, spend concurrently, fail over the home region, replay commands, skew clocks and crash after ledger commit but before entitlement grant. Reconciliation must preserve both financial and external-effect evidence.</p>"
});
