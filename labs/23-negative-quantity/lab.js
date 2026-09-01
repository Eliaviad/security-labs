registerLab({
  id: "23-negative-quantity",
  order: 23,
  title: "Cart checkout",
  difficulty: "medium",
  category: "logic",
  env: "node",
  mode: "static",
  filename: "routes/checkout.js",
  description: "Checkout totals a cart of items and charges the user's prepaid wallet.",
  code: [
    "// POST /api/cart/checkout  { items: [{ sku, qty }] }",
    "async function checkout(req, res) {",
    "  let total = 0;",
    "  for (const item of req.body.items) {",
    "    const product = await Product.findBySku(item.sku);",
    "    total += product.price * item.qty;",
    "  }",
    "  if (total <= req.user.walletBalance) {",
    "    await charge(req.user, total);",
    "    return res.json({ charged: total });",
    "  }",
    "  return res.status(402).json({ error: 'insufficient funds' });",
    "}"
  ].join("\n"),
  vulnerableLines: [6, 8],
  hints: [
    "Which fields in the request body are trusted without any validation?",
    "<code>item.qty</code> arrives straight from the client. What values could it hold besides positive integers?",
    "What is <code>total</code> if one <code>qty</code> is negative? Now trace it into the check on line 8.",
    "A negative <code>qty</code> makes <code>total</code> negative, which passes <code>total &lt;= balance</code> and even <em>credits</em> the user via <code>charge</code>. What validation is missing?"
  ],
  vulnerabilityType: "Business Logic flaw — unvalidated quantity (CWE-840 / CWE-20)",
  explanation:
    "<h4>Vulnerable lines</h4><p>Line 6 multiplies <code>price</code> by an unvalidated client <code>qty</code>, and line 8's check trusts the resulting <code>total</code>.</p>" +
    "<h4>Vulnerability</h4><p>Business-logic / input-validation flaw. Nothing constrains <code>qty</code> to a positive integer, so the economic invariant (\"you pay a non-negative amount\") can be violated.</p>" +
    "<h4>Attack</h4><pre>POST /api/cart/checkout\n{ \"items\": [ { \"sku\": \"GIFT\", \"qty\": 1 },\n              { \"sku\": \"GIFT\", \"qty\": -1000 } ] }</pre>" +
    "<p>The negative line item drives <code>total</code> below zero. The balance check passes trivially, and <code>charge(user, -N)</code> effectively <em>adds</em> funds to the attacker's wallet — free money, or free goods when combined with a positive item that nets negative.</p>" +
    "<h4>Why it works</h4><p>The code assumes quantities are positive, but the client controls them. Arithmetic faithfully produces a negative total, and a single <code>&lt;=</code> comparison can't distinguish \"cheap\" from \"pays the customer.\"</p>" +
    "<h4>Secure fix</h4><pre>for (const item of req.body.items) {\n  if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 100) {\n    return res.status(400).json({ error: 'invalid quantity' });\n  }\n  const product = await Product.findBySku(item.sku);\n  total += product.price * item.qty;\n}\nif (total <= 0) return res.status(400).json({ error: 'invalid order' });</pre>" +
    "<h4>Why the fix works</h4><p>Validating each <code>qty</code> as a bounded positive integer removes the ability to inject negative or absurd values, and asserting <code>total &gt; 0</code> enforces the invariant directly, so no combination of items can produce a credit.</p>"
});
