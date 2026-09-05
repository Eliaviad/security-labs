registerLab({
  id: "43-secure-agent-gateway",
  order: 43,
  title: "Capability-scoped agent tool gateway",
  mysteryTitle: "Tool gateway review",
  difficulty: "hard",
  category: "auth",
  env: "node",
  mode: "static",
  track: "our-next-job",
  safe: true,
  filename: "ai/compensation-gateway.ts",
  description: "A deterministic gateway binds a proposed agent action to verified ticket context, policy and approval state.",
  build: {
    scenario: "Refactor an agent mutation into recommendation plus deterministic execution. The exercise is to recognize a secure design and avoid manufacturing a finding.",
    requirements: ["Bind actor, ticket and player from verified server context", "Validate a narrow reason and amount", "Require approval above threshold", "Enforce idempotency"],
    acceptance: ["The model cannot select another player", "Duplicate execution has one effect", "Denied actions are audited", "Positive and negative tests exist"],
    prompt: "Refactor a support-agent compensation flow so the model only proposes amount and reason. Implement a deterministic TypeScript gateway that binds employee, ticket and player from server context, enforces policy and idempotency, and requires human approval above a threshold. Add positive and adversarial tests."
  },
  code: [
    "async function executeCompensation(ctx, proposal) {",
    "  requireRole(ctx.employee, 'support-compensation');",
    "  const ticket = await tickets.getOpenForPlayer(ctx.ticketId, ctx.playerId);",
    "  const amount = parseIntegerInRange(proposal.amount, 1, 1000);",
    "  const reason = allowlistedReason(proposal.reason);",
    "  if (amount > 100) await approvals.require(ctx.employee.id, ticket.id, amount);",
    "  return db.transaction(async tx => {",
    "    await tx.compensations.insertUnique({ key: ticket.id, actor: ctx.employee.id });",
    "    await tx.wallets.credit(ctx.playerId, amount, reason);",
    "    await tx.audit.append({ actor: ctx.employee.id, player: ctx.playerId, ticket: ticket.id, amount });",
    "  });",
    "}"
  ].join("\n"),
  vulnerableLines: [],
  hints: [
    "Do not assume all agentic code is vulnerable. Trace where identity and target values originate.",
    "The proposal controls amount and reason, but deterministic functions constrain both before any mutation.",
    "The player and ticket come from verified context, while approval and idempotency are enforced outside the model.",
    "Mark secure for the reviewed authorization property, then document residual risks such as database enforcement and adapter correctness."
  ],
  vulnerabilityType: "Secure implementation — scoped capability with deterministic policy enforcement",
  explanation:
    "<h4>Verdict</h4><p>The reviewed flow is secure against the confused-deputy property shown in the previous lab. The model proposal cannot choose employee, ticket or player; deterministic code validates its remaining fields before mutation.</p>" +
    "<h4>Why it works</h4><p>Role, ticket binding, bounded values, approval, transactionality, unique execution and audit are independent of model obedience. Malicious conversation content may produce a bad proposal, but the proposal cannot bypass these controls by instruction alone.</p>" +
    "<h4>Scope</h4><p>This does not prove the adapters, database constraints or approval service are correctly implemented. It also does not address privacy of prompts, model-provider retention or denial-of-service. A precise secure verdict states what was reviewed.</p>" +
    "<h4>Regression tests</h4><p>Keep valid low-value compensation, high-value approval, cross-player attempts, invalid reasons, boundary amounts, duplicates, closed tickets, revoked roles, transaction rollback and immutable audit assertions.</p>"
});
