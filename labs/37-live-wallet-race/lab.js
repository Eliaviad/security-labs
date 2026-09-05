registerLab({
  id: "37-live-wallet-race",
  order: 37,
  title: "Concurrent wallet double-spend",
  mysteryTitle: "Wallet transfer",
  difficulty: "hard",
  category: "logic",
  env: "http",
  mode: "http",
  track: "our-next-job",
  filename: "services/wallet-transfer.ts",
  description: "A transfer service checks a balance and updates two wallets in separate asynchronous operations.",
  build: {
    scenario: "Build a wallet transfer that appears correct under sequential requests, then examine the invariant under concurrency and partial failure.",
    requirements: ["Transfer positive integer credits", "Reject insufficient balance", "Expose balances for the local lab", "Record transfer identifiers"],
    acceptance: ["A normal transfer preserves total currency", "Insufficient balance is rejected", "Functional tests cover both outcomes", "The implementation remains small"],
    prompt: "Build a minimal Express/TypeScript wallet transfer service with Alice starting at 100 credits and Bob at 0. Use async repository methods and add sequential tests for success and insufficient funds. Explain the read/write sequence before editing. Do not perform a concurrency review yet."
  },
  code: [
    "async function transfer(fromId, toId, amount) {",
    "  const from = await wallets.get(fromId);",
    "  if (from.balance < amount) throw new Error('insufficient');",
    "  await audit.prepare({ fromId, toId, amount });",
    "  await wallets.setBalance(fromId, from.balance - amount);",
    "  await wallets.increment(toId, amount);",
    "  return { transferred: amount };",
    "}"
  ].join("\n"),
  vulnerableLines: [3, 5, 6],
  hints: [
    "A sequential test proves only one interleaving. Mark every await between the check and final writes.",
    "Two requests can both read Alice's original balance before either writes it.",
    "If both source writes use the same stale value while both destination increments apply, what happens to total currency?",
    "The invariant must be enforced by a database transaction or atomic ledger operation, not by an in-process flag."
  ],
  vulnerabilityType: "Race condition / stale-read double spend (CWE-362)",
  http: {
    basePath: "/lab-api/37-live-wallet-race",
    statusPath: "/__lab/status/37-live-wallet-race",
    resetPath: "/__lab/reset/37-live-wallet-race",
    goal: "Use concurrent transfers to make Bob receive more currency than Alice actually loses.",
    requests: [
      { name: "Single transfer", method: "POST", path: "/lab-api/37-live-wallet-race/transfer", headers: "Content-Type: application/json\nX-Lab-User: alice", body: "{\"to\":\"bob\",\"amount\":10}" },
      { name: "Concurrent probe", method: "POST", path: "/lab-api/37-live-wallet-race/transfer", headers: "Content-Type: application/json\nX-Lab-User: alice", body: "{\"to\":\"bob\",\"amount\":40}", repeat: 3 }
    ]
  },
  explanation:
    "<h4>Root cause</h4><p>The balance check and both writes are not one atomic operation. Concurrent requests read the same source balance; stale absolute writes overwrite one another while destination increments accumulate.</p>" +
    "<h4>Evidence</h4><p>A burst of transfers should never make the sum of all balances exceed the initial total. The lab grades conservation of currency, which is stronger evidence than counting HTTP 200 responses.</p>" +
    "<h4>Fix</h4><p>Use an append-only double-entry ledger or a database transaction that locks the source wallet, performs a conditional debit, credits the destination, and records a unique transfer id before commit. An in-memory mutex is insufficient across multiple service instances.</p>" +
    "<h4>Regression tests</h4><p>Run concurrent transfers whose combined amount is below, equal to and above the balance. Assert conservation, non-negative balances, exactly-once transfer ids, rollback on credit failure and correct behavior across multiple workers.</p>"
});
