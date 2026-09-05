registerLab({
  id: "38-receipt-binding",
  order: 38,
  title: "Unbound in-app purchase receipt",
  mysteryTitle: "Purchase verification",
  difficulty: "hard",
  category: "auth",
  env: "node",
  mode: "static",
  track: "our-next-job",
  filename: "routes/iap.ts",
  description: "A valid store receipt grants an entitlement without binding the transaction to the player or enforcing single use.",
  build: {
    scenario: "Model server-side verification of an app-store receipt. Focus on what a cryptographic validity response proves and what business bindings remain your responsibility.",
    requirements: ["Accept a receipt", "Verify it through a payment adapter", "Grant the verified product", "Return the entitlement"],
    acceptance: ["Invalid receipts are rejected", "A valid receipt grants its product", "The payment adapter is mockable", "Tests do not call a real store"],
    prompt: "Build a small TypeScript endpoint for validating a mocked mobile in-app-purchase receipt and granting the returned product to the authenticated player. Add functional tests for a valid and invalid receipt. Keep store verification behind an interface. Do not conduct a security review yet."
  },
  code: [
    "app.post('/iap/verify', requirePlayer, async (req, res) => {",
    "  const result = await appStore.verify(req.body.receipt);",
    "  if (!result.valid) return res.status(400).json({ error: 'invalid receipt' });",
    "  const product = await catalog.findByStoreProduct(result.productId);",
    "  await entitlements.grant(req.player.id, product.id);",
    "  return res.json({ granted: product.id, transactionId: result.transactionId });",
    "});"
  ].join("\n"),
  vulnerableLines: [5],
  hints: [
    "A store's valid signature proves origin and integrity, but does it prove who may redeem the transaction in this game account?",
    "List the fields that should be bound: application, environment, product, purchaser/account and transaction identifier.",
    "What happens if Alice submits Bob's valid receipt, or submits the same receipt again?",
    "The grant needs an atomic uniqueness decision on the verified transaction id and the intended account binding."
  ],
  vulnerabilityType: "Missing transaction replay and account binding in purchase validation (CWE-345 / CWE-841)",
  explanation:
    "<h4>Root cause</h4><p>Line 5 treats generic receipt validity as authorization to grant an entitlement to the current player. No check binds the verified purchase to the expected app, environment and account, and no durable uniqueness constraint consumes the transaction exactly once.</p>" +
    "<h4>Attack</h4><p>An attacker can replay their own valid receipt across accounts or reuse a leaked transaction. The precise fields differ by payment provider, so the adapter should normalize them into an internal verified-purchase command rather than exposing loosely interpreted provider data.</p>" +
    "<h4>Fix</h4><p>Validate every expected binding, then atomically insert the provider transaction id into a consumed-transactions table and grant the entitlement in the same transaction. A duplicate should return the previously established outcome without granting again.</p>" +
    "<h4>Regression tests</h4><p>Cover wrong app/environment/product, another account's receipt, sequential and concurrent replay, refunded or revoked transactions, delayed callbacks and rollback when entitlement creation fails.</p>"
});
