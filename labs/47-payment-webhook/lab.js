registerLab({
  id: "47-payment-webhook",
  order: 47,
  title: "Untrusted and replayable payment webhook",
  mysteryTitle: "Purchase events",
  difficulty: "hard",
  category: "auth",
  env: "node",
  mode: "static",
  track: "architecture-review",
  architecture: {
    context: "A payment provider sends purchase, refund and chargeback events. Delivery is retryable, order is not guaranteed, and the entitlement service is asynchronous.",
    assets: ["Paid entitlements", "Provider transaction state", "Refund decisions", "Revenue and fraud evidence"],
    constraints: ["Provider retries on timeout", "Events may arrive out of order", "Multiple webhook workers", "Entitlement service may be unavailable"],
    questions: ["How is webhook authenticity verified?", "Where is replay prevented durably?", "Which state machine handles purchase followed by refund or chargeback?"]
  },
  filename: "design/payment-events.txt",
  description: "A webhook pipeline trusts public JSON, deduplicates in process memory and publishes entitlement events before durable state.",
  code: [
    "PaymentProvider -> PublicGateway: POST /webhooks/payment { eventId, type, transactionId, playerId }",
    "PublicGateway -> WebhookWorker: forward parsed JSON body",
    "WebhookWorker: accept when body.type is purchase|refund|chargeback",
    "WebhookWorker: if inMemorySeenIds.has(eventId) return 200; else add(eventId)",
    "WebhookWorker -> EventBus: publish EntitlementChanged(body)",
    "WebhookWorker -> PaymentDB: insert event after publish",
    "EntitlementConsumer: apply event in arrival order"
  ].join("\n"),
  vulnerableLines: [3, 4, 5, 7],
  hints: [
    "A syntactically valid event type says nothing about who sent it.",
    "In-memory deduplication disappears on restart and differs across workers.",
    "Publishing before persistence creates an ambiguous state if the worker crashes between the two operations.",
    "Refund and purchase events require a transaction state machine, not blind arrival-order application."
  ],
  vulnerabilityType: "Missing webhook authenticity, durable replay defense and ordered state transition",
  explanation:
    "<h4>Design failure</h4><p>The worker performs no provider authentication or signature verification. Deduplication is local to one process, publication precedes durable receipt, and consumers trust network arrival order as business order.</p>" +
    "<h4>Proposed design</h4><p>Verify the signature over the exact raw body with timestamp tolerance and the provider's configured key. Persist a unique provider event id and normalized transaction event before acknowledging. Use an outbox to publish, and make consumers idempotent. Model transaction states explicitly and resolve ordering with provider sequence/version data or authoritative lookup.</p>" +
    "<h4>Failure behavior</h4><p>Return success only after durable acceptance, not after downstream completion. Quarantine unverifiable or contradictory events; do not repeatedly grant while waiting for manual review.</p>" +
    "<h4>Validation</h4><p>Test forged signatures, modified raw bodies, stale timestamps, duplicate delivery across workers, crash points, refund-before-purchase, repeated chargebacks and provider reconciliation.</p>"
});
