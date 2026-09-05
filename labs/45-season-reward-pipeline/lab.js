registerLab({
  id: "45-season-reward-pipeline",
  order: 45,
  title: "Duplicate effects in a season-reward pipeline",
  mysteryTitle: "Season rewards",
  difficulty: "hard",
  category: "logic",
  env: "node",
  mode: "static",
  track: "architecture-review",
  architecture: {
    context: "A game processes millions of match events and distributes season rewards through an at-least-once event bus. Workers may restart and messages may be duplicated or delayed.",
    assets: ["Player progression", "Season rank", "Premium-currency rewards", "Audit trail"],
    constraints: ["At-least-once delivery", "Workers scale horizontally", "A season payout may be retried", "The game cannot globally lock all players"],
    questions: ["Which operations must be exactly-once in effect?", "Where is the durable idempotency boundary?", "How will reconciliation detect missed or duplicated rewards?"]
  },
  filename: "design/season-rewards.txt",
  description: "An event-driven season pipeline applies duplicate messages and retryable payouts without durable idempotency.",
  code: [
    "MatchService -> EventBus: MatchCompleted(eventId, playerId, points)",
    "EventBus -> ProgressConsumer: at-least-once delivery",
    "ProgressConsumer -> PlayerDB: progress[playerId] += event.points",
    "SeasonScheduler -> RewardJob: pay(seasonId, finalRanking)",
    "RewardJob -> WalletService: credit(playerId, rewardAmount)",
    "RewardJob -> NotificationService: send(playerId, 'reward granted')",
    "Worker policy: retry any timeout from the previous dependency"
  ].join("\n"),
  vulnerableLines: [2, 3, 5],
  hints: [
    "At-least-once describes delivery, not exactly-once business effect.",
    "An additive update is not naturally idempotent. Which stable event key could guard it?",
    "A timeout from WalletService is ambiguous: the credit may have committed even when the response was lost.",
    "Use durable inbox/outbox records, business idempotency keys and reconciliation rather than trusting retry behavior."
  ],
  vulnerabilityType: "Non-idempotent event processing and ambiguous payout retries",
  explanation:
    "<h4>Design failure</h4><p>Lines 2 and 3 combine duplicate delivery with an additive update that has no durable event-consumption record. Line 5 performs a valuable payout without a stable key, so an ambiguous timeout can cause duplicate credit.</p>" +
    "<h4>Proposed design</h4><p>Persist each consumed <code>eventId</code> in the same transaction as the progression change. Generate a payout id such as <code>seasonId:playerId:tier</code>; WalletService must enforce it uniquely and return the established result on retry. Publish downstream notifications through a transactional outbox.</p>" +
    "<h4>Operational controls</h4><p>Reconcile the immutable match-event stream, progression totals and payout ledger. Alert on duplicate business keys, payout-count drift and a season job that produces different recipient sets across retries.</p>" +
    "<h4>Validation</h4><p>Inject duplicate, delayed and out-of-order messages; crash workers before and after commit; lose acknowledgements; rerun the complete season job; and verify that progression and currency effects occur exactly once while notifications may safely retry.</p>"
});
