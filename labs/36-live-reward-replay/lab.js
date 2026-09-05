registerLab({
  id: "36-live-reward-replay",
  order: 36,
  title: "Replayable daily-reward claim",
  mysteryTitle: "Daily reward",
  difficulty: "medium",
  category: "logic",
  env: "http",
  mode: "http",
  track: "our-next-job",
  filename: "routes/rewards.ts",
  description: "A reward service credits the player before recording a claim, without enforcing uniqueness.",
  build: {
    scenario: "Build a daily-reward endpoint and its happy-path tests. Then treat retries, duplicated mobile traffic and deliberate replay as first-class inputs.",
    requirements: ["Authenticate the player", "Accept a reward identifier", "Credit the configured reward amount", "Record the claim"],
    acceptance: ["A first valid claim succeeds", "Unknown rewards are rejected", "A claim appears in history", "You can reset local state"],
    prompt: "Build an Express/TypeScript daily reward service with POST /rewards/claim, an in-memory wallet and claim history. Add only functional happy-path and unknown-reward tests. Explain the state transition before coding and do not discuss vulnerabilities yet."
  },
  code: [
    "app.post('/rewards/claim', requirePlayer, async (req, res) => {",
    "  const reward = await rewards.findById(req.body.rewardId);",
    "  if (!reward) return res.status(404).json({ error: 'unknown reward' });",
    "  await wallets.increment(req.player.id, reward.amount);",
    "  await claims.insert({ playerId: req.player.id, rewardId: reward.id });",
    "  return res.json({ credited: reward.amount });",
    "});"
  ].join("\n"),
  vulnerableLines: [4, 5],
  hints: [
    "Write the invariant using the words player, reward and maximum number of successful claims.",
    "What happens if the same valid request is sent twice sequentially? No concurrency is required.",
    "The claim history records an event, but does anything consult or constrain it before crediting?",
    "A unique key on <code>(playerId, rewardId)</code> must participate in the same atomic transaction as the wallet credit."
  ],
  vulnerabilityType: "Replay / missing idempotency in an economic state transition (CWE-294 / CWE-841)",
  http: {
    basePath: "/lab-api/36-live-reward-replay",
    statusPath: "/__lab/status/36-live-reward-replay",
    resetPath: "/__lab/reset/36-live-reward-replay",
    goal: "Credit the same authenticated player for the same daily reward more than once.",
    requests: [{ name: "Claim reward", method: "POST", path: "/lab-api/36-live-reward-replay/claim", headers: "Content-Type: application/json\nX-Lab-User: alice", body: "{\"rewardId\":\"daily-2026-09-05\"}" }]
  },
  explanation:
    "<h4>Root cause</h4><p>The handler performs an irreversible credit before creating a non-unique history row. It neither checks prior state nor asks the database to enforce a single transition.</p>" +
    "<h4>Proof and limits</h4><p>Send the identical authenticated request twice and observe a balance above the configured reward. Network retries make replay plausible even without a malicious client. Rate limiting may reduce volume but does not restore the once-per-player invariant.</p>" +
    "<h4>Secure design</h4><p>Give the claim a stable business key such as <code>(playerId, rewardId)</code>, enforce it with a unique constraint, and insert the claim plus wallet ledger entry in one transaction. Return the original result for a repeated idempotency key rather than applying the effect again.</p>" +
    "<h4>Regression tests</h4><p>Test first claim, sequential duplicate, concurrent duplicate, same reward for another player, a new reward for the same player, unknown reward, and rollback when either ledger write fails.</p>"
});
