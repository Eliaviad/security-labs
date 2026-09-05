registerLab({
  id: "42-agent-confused-deputy",
  order: 42,
  title: "Support agent as a confused deputy",
  mysteryTitle: "Support automation",
  difficulty: "hard",
  category: "auth",
  env: "node",
  mode: "static",
  track: "our-next-job",
  filename: "ai/support-agent.ts",
  description: "An authenticated support session gives an agent a broad currency-credit tool whose arguments come from untrusted conversation text.",
  build: {
    scenario: "Build a support assistant that can look up an account and draft a compensation recommendation. Only after it works should you consider whether it should be allowed to execute the adjustment.",
    requirements: ["Authenticate the support employee", "Load a ticket", "Look up a player summary", "Return a structured recommendation"],
    acceptance: ["Ticket and player data have provenance", "The default workflow is read-only", "Recommendations have reason and evidence", "No production mutation is needed for the happy path"],
    prompt: "Build a TypeScript support-assistant workflow that reads a ticket, looks up a limited player summary and returns a structured compensation recommendation. Use mocked adapters and tests. Keep the initial version read-only and explain every tool's authority."
  },
  code: [
    "app.post('/support/chat', requireSupportEmployee, async (req, res) => {",
    "  const result = await supportAgent.run(req.body.message, {",
    "    lookupPlayer: ({ playerId }) => players.fullRecord(playerId),",
    "    grantCurrency: ({ playerId, amount, reason }) =>",
    "      economy.credit(playerId, amount, reason),",
    "    closeTicket: ({ ticketId }) => tickets.close(ticketId)",
    "  });",
    "  return res.json(result);",
    "});"
  ].join("\n"),
  vulnerableLines: [2, 4, 5],
  hints: [
    "Authenticating the employee does not authorize every action the model may choose during the session.",
    "Which tool arguments are bound to verified ticket context, and which can be invented from message text?",
    "The model can select an arbitrary player and amount for a direct economic mutation.",
    "Move policy enforcement outside the model and replace broad tools with narrow, scoped capabilities."
  ],
  vulnerabilityType: "Confused deputy / excessive agency with missing tool-level authorization (CWE-441 / CWE-862)",
  explanation:
    "<h4>Root cause</h4><p>The application treats employee authentication as blanket authorization and delegates the action, target and amount to probabilistic model output. Untrusted ticket text can steer a privileged deputy into crediting an arbitrary player.</p>" +
    "<h4>Secure workflow</h4><p>Bind the verified employee, ticket and player before model execution. Let the model produce a recommendation, then pass it through deterministic limits, role checks, reason-code validation, idempotency and approval thresholds. Expose a narrow capability token for one ticket and player rather than a general economy API.</p>" +
    "<h4>Data minimization</h4><p>The lookup tool should return only fields required for the case; a full player record may contain secrets or unrelated personal data.</p>" +
    "<h4>Regression tests</h4><p>Use malicious ticket instructions, cross-player ids, excessive and negative amounts, repeated tool calls, stale tickets, revoked employees, model timeouts and an approval rejection. Assert that policy code—not the model—determines the result.</p>"
});
