registerLab({
  id: "35-authoritative-pricing",
  order: 35,
  title: "Client-controlled store pricing",
  mysteryTitle: "Store checkout",
  difficulty: "medium",
  category: "logic",
  env: "node",
  mode: "static",
  track: "our-next-job",
  filename: "routes/store.ts",
  description: "A mobile-game store charges a wallet and grants an item using checkout data supplied by the client.",
  build: {
    scenario: "Build a minimal game-store endpoint before reviewing the supplied implementation. Use AI for scaffolding, but personally trace every input and state change.",
    requirements: ["Load a product by SKU", "Charge the authenticated player's wallet", "Grant the purchased item", "Return the remaining balance"],
    acceptance: ["A known SKU can be purchased", "Insufficient funds returns 402", "Functional tests pass", "You can explain the request flow without AI"],
    prompt: "Build a small Express/TypeScript POST /store/purchase endpoint with an in-memory product catalog and wallet. Add functional tests for a valid purchase and insufficient funds. Keep the implementation under 100 lines, explain the files before editing, and do not perform a security review yet."
  },
  code: [
    "// POST /store/purchase { sku, quantity, unitPrice }",
    "app.post('/store/purchase', requirePlayer, async (req, res) => {",
    "  const { sku, quantity, unitPrice } = req.body;",
    "  const product = await catalog.findBySku(sku);",
    "  if (!product) return res.status(404).json({ error: 'unknown item' });",
    "  const total = unitPrice * quantity;",
    "  if (req.player.balance < total) return res.status(402).json({ error: 'funds' });",
    "  await wallets.debit(req.player.id, total);",
    "  await inventory.grant(req.player.id, product.id, quantity);",
    "  return res.json({ purchased: product.id, charged: total });",
    "});"
  ].join("\n"),
  vulnerableLines: [3, 6],
  hints: [
    "Separate identifiers the client must choose from values the server must authoritatively decide.",
    "The catalog record is loaded, but which of its fields actually participates in the charge?",
    "Try a valid SKU with a unit price of zero or a small fraction of the catalog price.",
    "The server grants the catalog item but calculates payment from attacker-controlled <code>unitPrice</code>."
  ],
  vulnerabilityType: "Client-side price manipulation / business-logic trust failure (CWE-602)",
  explanation:
    "<h4>Security invariant</h4><p>The server must grant an item only after charging the authenticated player the current authoritative price for that SKU and a bounded positive quantity.</p>" +
    "<h4>Root cause</h4><p>Lines 3 and 6 accept <code>unitPrice</code> from the mobile client and use it for the debit even though the trusted catalog record is already available. A modified client can submit zero, a fraction, or a negative value.</p>" +
    "<h4>Proof</h4><p>Compare a normal purchase with the same SKU and quantity but <code>unitPrice: 0</code>. Receiving the item with no debit proves an authority failure; merely observing that the field is client-controlled is only a hypothesis.</p>" +
    "<h4>Fix</h4><pre>const quantity = parseBoundedQuantity(req.body.quantity);\nconst total = product.serverPrice * quantity;\nawait purchaseAtomically(req.player.id, product.id, quantity, total);</pre><p>Do not compare the supplied price and then continue using it. Remove it from the command contract, compute the amount server-side, and make debit plus grant one atomic state transition.</p>" +
    "<h4>Regression tests</h4><p>Test the catalog price, zero/negative/fractional quantities, an extra unitPrice field, insufficient balance, price changes between requests, and rollback when inventory grant fails.</p>"
});
